import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { sameOriginMutationAllowed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED = new Set(["page_view", "review_click", "affiliate_click", "banner_view", "banner_click", "compare_select"]);
const writesPerMinute = new Map<string, { at: number; count: number }>();

function cleanPath(value: unknown): string {
  const raw = typeof value === "string" ? value : "/";
  const path = raw.split(/[?#]/, 1)[0];
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 300) : "/";
}
function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,100}$/.test(slug) ? slug : null;
}
function cleanLink(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Do not retain query strings, which can carry tracking tokens or unrelated visitor data.
    return url.origin === "https://local.invalid" ? url.pathname.slice(0, 500) : `${url.origin}${url.pathname}`.slice(0, 500);
  } catch { return null; }
}
function clientKey(request: NextRequest) {
  return (request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-real-ip") || "unknown").slice(0, 80);
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, disabled: true }, { status: 202 });
  const now = Date.now();
  const key = clientKey(request);
  const previous = writesPerMinute.get(key);
  if (previous && now - previous.at < 60_000 && previous.count >= 120) return NextResponse.json({ ok: false, limited: true }, { status: 429 });
  if (writesPerMinute.size > 1000) {
    for (const [entryKey, entry] of writesPerMinute) if (now - entry.at >= 60_000) writesPerMinute.delete(entryKey);
  }
  if (!previous || now - previous.at >= 60_000) writesPerMinute.set(key, { at: now, count: 1 });
  else writesPerMinute.set(key, { ...previous, count: previous.count + 1 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!ALLOWED.has(eventType) || !/^[A-Za-z0-9_-]{8,80}$/.test(sessionId)) return NextResponse.json({ ok: false }, { status: 400 });
  const metadataInput = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {};
  const metadata: Record<string, string | number | boolean | null> = {};
  for (const [name, value] of Object.entries(metadataInput).slice(0, 8)) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(name)) continue;
    if (typeof value === "string") metadata[name] = value.trim().slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) metadata[name] = value;
    else if (typeof value === "boolean" || value === null) metadata[name] = value;
  }
  try {
    await supabaseRest("swf_analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        event_type: eventType,
        session_id: sessionId,
        page_path: cleanPath(body.pagePath),
        product_slug: cleanSlug(body.productSlug),
        link_url: cleanLink(body.linkUrl),
        metadata,
      }]),
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    // Analytics is best-effort: a missing migration must not block visitors.
    return NextResponse.json({ ok: false, disabled: true }, { status: 202 });
  }
}
