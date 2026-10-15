import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportRow = {
  telegram_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  telegram_enabled?: boolean | null;
  whatsapp_enabled?: boolean | null;
  instagram_enabled?: boolean | null;
};
const EMPTY_LINKS = { telegramUrl: "", whatsappUrl: "", instagramUrl: "" };

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ links: EMPTY_LINKS }, { headers: { "Cache-Control": "no-store" } });
  try {
    const rows = await supabaseRest<SupportRow[]>("swf_support_settings?select=telegram_url,whatsapp_url,instagram_url,telegram_enabled,whatsapp_enabled,instagram_enabled&id=eq.1&limit=1");
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return NextResponse.json({ links: row ? {
      telegramUrl: row.telegram_enabled === false ? "" : row.telegram_url || "",
      whatsappUrl: row.whatsapp_enabled === false ? "" : row.whatsapp_url || "",
      instagramUrl: row.instagram_enabled === false ? "" : row.instagram_url || "",
    } : EMPTY_LINKS }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Public site must continue working when optional support settings aren't migrated yet.
    return NextResponse.json({ links: EMPTY_LINKS }, { headers: { "Cache-Control": "no-store" } });
  }
}
