import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportRow = {
  id: number;
  telegram_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  telegram_enabled?: boolean | null;
  whatsapp_enabled?: boolean | null;
  instagram_enabled?: boolean | null;
  updated_at: string | null;
};
type SupportChannel = "telegram" | "whatsapp" | "instagram";
type Links = { telegramUrl: string; whatsappUrl: string; instagramUrl: string; telegramEnabled: boolean; whatsappEnabled: boolean; instagramEnabled: boolean };

function authorized(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function normalizeSupportUrl(value: unknown, channel: SupportChannel): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (raw.length > 500) throw new Error(`${channel} URL must be 500 characters or fewer.`);
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error(`Enter a full HTTPS ${channel} link.`); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${channel} link must use HTTPS and must not contain credentials.`);
  const hostname = url.hostname.toLowerCase();
  const allowlists: Record<SupportChannel, string[]> = {
    telegram: ["t.me", "telegram.me"],
    whatsapp: ["wa.me", "whatsapp.com", "api.whatsapp.com"],
    instagram: ["instagram.com", "www.instagram.com"],
  };
  if (!allowlists[channel].includes(hostname)) throw new Error(`Use an official ${channel} link (${allowlists[channel].join(" or ")}).`);
  if (url.pathname === "/" || url.pathname.length < 2) throw new Error(`The ${channel} link needs a username, phone number or profile path.`);
  url.hash = "";
  return url.toString().slice(0, 500);
}

function readBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}
function rowToLinks(row?: SupportRow): Links {
  return {
    telegramUrl: row?.telegram_url || "",
    whatsappUrl: row?.whatsapp_url || "",
    instagramUrl: row?.instagram_url || "",
    // Backward-compatible default: existing links remain visible after the toggle migration.
    telegramEnabled: row?.telegram_enabled ?? true,
    whatsappEnabled: row?.whatsapp_enabled ?? true,
    instagramEnabled: row?.instagram_enabled ?? true,
  };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const rows = await supabaseRest<SupportRow[]>("swf_support_settings?select=id,telegram_url,whatsapp_url,instagram_url,telegram_enabled,whatsapp_enabled,instagram_enabled,updated_at&id=eq.1&limit=1");
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return NextResponse.json({ links: rowToLinks(row), updatedAt: row?.updated_at || null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load support settings. Run the latest support/bundle repair migration first." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const telegramUrl = normalizeSupportUrl(body.telegramUrl, "telegram");
    const whatsappUrl = normalizeSupportUrl(body.whatsappUrl, "whatsapp");
    const instagramUrl = normalizeSupportUrl(body.instagramUrl, "instagram");
    const telegramEnabled = readBoolean(body.telegramEnabled);
    const whatsappEnabled = readBoolean(body.whatsappEnabled);
    const instagramEnabled = readBoolean(body.instagramEnabled);
    const updatedAt = new Date().toISOString();
    await supabaseRest("swf_support_settings?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: 1, telegram_url: telegramUrl, whatsapp_url: whatsappUrl, instagram_url: instagramUrl, telegram_enabled: telegramEnabled, whatsapp_enabled: whatsappEnabled, instagram_enabled: instagramEnabled, updated_at: updatedAt }]),
    });
    return NextResponse.json({ ok: true, links: { telegramUrl, whatsappUrl, instagramUrl, telegramEnabled, whatsappEnabled, instagramEnabled }, updatedAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save support settings." }, { status: 400 });
  }
}
