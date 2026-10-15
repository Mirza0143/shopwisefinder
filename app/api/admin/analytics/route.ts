import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type EventRow = { id: number; event_type: string; session_id: string; page_path: string; product_slug: string | null; link_url: string | null; metadata: Record<string, unknown> | null; created_at: string };

export async function GET(request: NextRequest) {
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const rawDays = Number(request.nextUrl.searchParams.get("days") || 30);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    const events = await supabaseRest<EventRow[]>(`swf_analytics_events?select=id,event_type,session_id,page_path,product_slug,link_url,metadata,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=10000`);
    return NextResponse.json({ days, since, events: Array.isArray(events) ? events : [], truncated: Array.isArray(events) && events.length === 10000 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load KPI events. Run admin-enhancements-v3.sql in Supabase first." }, { status: 503 });
  }
}
