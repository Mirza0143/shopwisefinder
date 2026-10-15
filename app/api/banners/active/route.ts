import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type BannerRow = { id: string; title: string; subtitle: string; message: string; image_url: string; link_url: string; button_label: string; status: string; enabled: boolean; sort_order: number; starts_at: string | null; ends_at: string | null };
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ banner: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const rows = await supabaseRest<BannerRow[]>("swf_banners?select=id,title,subtitle,message,image_url,link_url,button_label,status,enabled,sort_order,starts_at,ends_at&status=eq.published&enabled=eq.true&order=sort_order.asc,updated_at.desc&limit=20");
    const now = Date.now();
    const active = (Array.isArray(rows) ? rows : []).find((row) => {
      const start = row.starts_at ? new Date(row.starts_at).getTime() : -Infinity;
      const end = row.ends_at ? new Date(row.ends_at).getTime() : Infinity;
      return (!row.starts_at || Number.isFinite(start)) && (!row.ends_at || Number.isFinite(end)) && start <= now && end > now;
    }) || null;
    return NextResponse.json({ banner: active }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    // No published banner or a missing migration should never break the public site.
    return NextResponse.json({ banner: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
