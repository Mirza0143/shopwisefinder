import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type BannerStatus = "draft" | "published" | "archived";
type BannerRow = {
  id: string; title: string; subtitle: string; message: string; image_url: string; link_url: string; button_label: string;
  status: BannerStatus; enabled: boolean; sort_order: number; starts_at: string | null; ends_at: string | null;
  created_at: string; updated_at: string;
};
const slugify = (value: string) => value.normalize("NFKD").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
function authorized(request: NextRequest) { return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value); }
function safeLink(value: unknown): string {
  const link = typeof value === "string" && value.trim() ? value.trim() : "/products";
  if (link.startsWith("/") && !link.startsWith("//")) return link.slice(0, 500);
  let url: URL;
  try { url = new URL(link); } catch { throw new Error("Banner link must be a local path or full HTTPS URL."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Banner link must use HTTPS and must not include embedded credentials.");
  return url.toString().slice(0, 500);
}
function plain(value: unknown, label: string, max: number, required = false): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const records = await supabaseRest<BannerRow[]>("swf_banners?select=*&order=sort_order.asc,updated_at.desc");
    return NextResponse.json({ records: Array.isArray(records) ? records : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load banners. Run admin-enhancements-v3.sql first." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = plain(body.title, "Banner title", 180, true);
    const id = slugify(plain(body.id, "Banner id", 100) || title);
    if (id.length < 2) throw new Error("Could not create a valid banner ID.");
    const imageUrl = plain(body.image_url, "Banner image URL", 1500, true);
    const parsedImage = new URL(imageUrl);
    if (parsedImage.protocol !== "https:" || parsedImage.username || parsedImage.password) throw new Error("Banner image must use an HTTPS URL. Upload a banner image or enter a safe URL.");
    const status: BannerStatus = body.status === "published" ? "published" : body.status === "archived" ? "archived" : "draft";
    const sortOrder = body.sort_order == null || body.sort_order === "" ? 100 : Number(body.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 1_000_000) throw new Error("Display order must be a positive whole number.");
    const startsAt = plain(body.starts_at, "Start date", 50) || null;
    const endsAt = plain(body.ends_at, "End date", 50) || null;
    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) throw new Error("Start date is invalid.");
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) throw new Error("End date is invalid.");
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) throw new Error("End date must be after the start date.");
    const row = {
      id, title, subtitle: plain(body.subtitle, "Subtitle", 220), message: plain(body.message, "Banner message", 1000), image_url: parsedImage.toString(),
      link_url: safeLink(body.link_url), button_label: plain(body.button_label, "Button label", 60) || "Explore products", status,
      enabled: body.enabled === true || body.enabled === "true", sort_order: sortOrder, starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString(),
    };
    await supabaseRest("swf_banners?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([row]) });
    return NextResponse.json({ ok: true, id, status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save banner." }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { id?: unknown };
    const id = typeof body.id === "string" ? slugify(body.id) : "";
    if (!id) return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
    await supabaseRest(`swf_banners?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete banner." }, { status: 400 }); }
}
