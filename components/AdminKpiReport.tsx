"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowDownToLine, MousePointerClick, RefreshCw, Users, Eye, FileText } from "lucide-react";
import { getProviderLabel, normalizeProvider } from "@/lib/marketplaces";

type EventRow = { id: number; event_type: string; session_id: string; page_path: string; product_slug: string | null; link_url: string | null; metadata: Record<string, unknown> | null; created_at: string };
const eventLabels: Record<string, string> = { page_view: "Page view", review_click: "Read Review click", affiliate_click: "Affiliate click", banner_view: "Banner shown", banner_click: "Banner click", compare_select: "Compare selected" };
function topCounts(rows: EventRow[], keyFor: (row: EventRow) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) { const key = keyFor(row); if (key) counts.set(key, (counts.get(key) || 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}
function dateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

export default function AdminKpiReport() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { events?: EventRow[]; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "KPI data could not be loaded.");
      setEvents(Array.isArray(payload.events) ? payload.events : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "KPI data could not be loaded."); setEvents([]); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    const ofType = (type: string) => events.filter((event) => event.event_type === type);
    const views = ofType("page_view");
    const affiliates = ofType("affiliate_click");
    const reviews = ofType("review_click");
    const sessions = new Set(views.map((event) => event.session_id)).size;
    return {
      visits: views.length,
      visitors: sessions,
      affiliateClicks: affiliates.length,
      reviewClicks: reviews.length,
      bannerViews: ofType("banner_view").length,
      bannerClicks: ofType("banner_click").length,
      compareSelections: ofType("compare_select").length,
      activeSessions: new Set(events.filter((event) => Date.now() - new Date(event.created_at).getTime() <= 15 * 60_000).map((event) => event.session_id)).size,
      topPages: topCounts(views, (event) => event.page_path || "/"),
      topLinks: topCounts(affiliates, (event) => event.product_slug || event.link_url || String(event.metadata?.linkText || "Affiliate link")),
      topProviders: topCounts(affiliates, (event) => {
        const raw = String(event.metadata?.provider || "").trim();
        const normalized = normalizeProvider(raw);
        return normalized ? getProviderLabel(normalized) : (raw || "Unknown / legacy");
      }),
      topReviews: topCounts(reviews, (event) => event.product_slug || String(event.metadata?.productName || "Product review")),
      recent: events.slice(0, 15),
    };
  }, [events]);

  function exportCsv() {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["timestamp", "event_type", "page_path", "product_slug", "provider", "link_url", "session_id"], ...events.map((event) => [event.created_at, event.event_type, event.page_path, event.product_slug || "", String(event.metadata?.provider || ""), event.link_url || "", event.session_id])];
    const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `shopwisefinder-kpi-${days}days.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  const Stat = ({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: ReactNode }) => <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><span className="text-indigo-600 dark:text-indigo-300">{icon}</span></div><p className="mt-2 text-3xl font-black tabular-nums">{loading ? "—" : value.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;

  return (
    <section id="kpi-report" className="mb-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900/50 sm:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><Activity size={15}/> Site analytics</p><h2 className="mt-2 text-2xl font-black">KPI report</h2><p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Page views, unique browser sessions, affiliate clicks, review interest, and top-performing pages/links.</p></div>
        <div className="flex flex-wrap gap-2"><select aria-label="KPI date range" value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)} className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold dark:border-white/10 dark:bg-slate-950"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold disabled:opacity-60 dark:border-white/10 dark:bg-slate-950"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button><button type="button" onClick={exportCsv} disabled={!events.length} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-indigo-500"><ArrowDownToLine size={14}/> Export CSV</button></div>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"><strong>Analytics needs setup.</strong><p className="mt-1">{error}</p><p className="mt-1 text-xs">Run <code>supabase/admin-enhancements-v3.sql</code> in Supabase SQL Editor. Analytics begins collecting after the new tracker is deployed; historical visits cannot be recreated.</p></div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Page views" value={metrics.visits} detail={`All recorded pages · ${days} days`} icon={<Eye size={18}/>} />
        <Stat label="Unique browser sessions" value={metrics.visitors} detail="Session-based estimate, not verified people" icon={<Users size={18}/>} />
        <Stat label="Active sessions (15m)" value={metrics.activeSessions} detail="Sessions with recent recorded activity" icon={<Activity size={18}/>} />
        <Stat label="Affiliate clicks" value={metrics.affiliateClicks} detail="Product & outbound affiliate links" icon={<MousePointerClick size={18}/>} />
        <Stat label="Read Review clicks" value={metrics.reviewClicks} detail="Clicks to individual product reviews" icon={<FileText size={18}/>} />
        <Stat label="Banner impressions" value={metrics.bannerViews} detail="Welcome popup shown" icon={<Eye size={18}/>} />
        <Stat label="Banner clicks" value={metrics.bannerClicks} detail="Call-to-action click-throughs" icon={<MousePointerClick size={18}/>} />
        <Stat label="Compare selections" value={metrics.compareSelections} detail="Products added to compare" icon={<Activity size={18}/>} />
        <Stat label="Events recorded" value={events.length} detail="All tracked event types" icon={<Activity size={18}/>} />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {[{title:"Most visited pages", rows:metrics.topPages, hint:"Page path"},{title:"Most clicked affiliate links", rows:metrics.topLinks, hint:"Product slug or link"},{title:"Clicks by marketplace", rows:metrics.topProviders, hint:"Provider / retailer"},{title:"Most opened Read Reviews", rows:metrics.topReviews, hint:"Product slug"}].map((table) => <div key={table.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"><h3 className="font-black">{table.title}</h3><p className="mt-1 text-xs text-slate-500">{table.hint} · clicks/views</p><div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">{table.rows.length ? table.rows.map(([label, count]) => <div key={label} className="flex items-start justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 break-all font-medium">{label}</span><strong className="shrink-0 tabular-nums">{count.toLocaleString("en-IN")}</strong></div>) : <p className="py-4 text-xs text-slate-500">No events yet.</p>}</div></div>)}
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950"><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10"><h3 className="font-black">Recent activity</h3><span className="text-xs text-slate-500">Latest {metrics.recent.length} events</span></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-50 dark:bg-white/[.04]"><tr>{["Time", "Event", "Page", "Product / link"].map((label) => <th key={label} className="px-4 py-3 font-black uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{metrics.recent.map((event) => <tr key={event.id} className="border-t border-slate-100 dark:border-white/10"><td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateTime(event.created_at)}</td><td className="px-4 py-3 font-bold">{eventLabels[event.event_type] || event.event_type}</td><td className="max-w-52 break-all px-4 py-3">{event.page_path}</td><td className="max-w-60 break-all px-4 py-3">{event.product_slug || event.link_url || String(event.metadata?.bannerId || event.metadata?.linkText || "—")}</td></tr>)}</tbody></table></div></div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Privacy note: this report stores random session IDs and event details, not IP addresses or names. Browser privacy settings/ad blockers and failed requests can mean some visits/clicks are not recorded.</p>
    </section>
  );
}
