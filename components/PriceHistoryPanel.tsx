import type { PriceObservation, Product } from "@/types/product";
import { formatINR } from "@/lib/products";
import { Activity, ArrowDownRight, ArrowUpRight, CalendarClock, Info } from "lucide-react";

function monthLabel(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}
function dateLabel(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function monthMovements(observations: PriceObservation[]) {
  const sorted = [...observations].filter((x) => Number.isFinite(x.price) && x.price >= 0 && !Number.isNaN(new Date(x.date).getTime())).sort((a, b) => a.date.localeCompare(b.date));
  const monthEnds = new Map<string, PriceObservation>();
  for (const observation of sorted) monthEnds.set(observation.date.slice(0, 7), observation);
  const points = [...monthEnds.entries()].map(([month, observation]) => ({ month, ...observation }));
  return points.map((point, index) => {
    const previous = points[index - 1];
    return { ...point, previousPrice: previous?.price ?? null, change: previous ? point.price - previous.price : null };
  }).reverse();
}

export default function PriceHistoryPanel({ product }: { product: Product }) {
  const observations = (product.priceHistory?.observations || [])
    .filter((observation) => Number.isFinite(observation.price) && observation.price >= 0 && !Number.isNaN(new Date(observation.date).getTime()))
    .sort((a, b) => a.date.localeCompare(b.date));
  const movements = monthMovements(observations);
  const hasChart = observations.length >= 2;
  const prices = observations.map((x) => x.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const range = max - min || Math.max(max * 0.08, 1);
  const coordinates = observations.map((observation, index) => ({
    x: observations.length <= 1 ? 350 : 28 + (index / (observations.length - 1)) * 644,
    y: 160 - ((observation.price - min) / range) * 120,
  }));
  const points = coordinates.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[.035] dark:border-white/10 dark:bg-white/[.04] sm:p-8" aria-labelledby="price-history-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300"><Activity size={14}/> Price intelligence</span>
          <h2 id="price-history-heading" className="mt-2 text-2xl font-black tracking-tight">Price history & monthly changes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">See dated price observations and the month-to-month movement when recorded data is available.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"><CalendarClock size={14}/>{observations.length} observations</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.04]"><span className="text-xs text-slate-500">Displayed price</span><strong className="mt-1 block text-xl">{formatINR(product.price)}</strong><span className="mt-1 block text-xs text-slate-500">{product.isDemoData ? "Illustrative demo value" : "Current listed value"}</span></div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.04]"><span className="text-xs text-slate-500">Verified launch price</span><strong className="mt-1 block text-xl">{product.launchPrice != null ? formatINR(product.launchPrice) : "Not recorded"}</strong><span className="mt-1 block text-xs text-slate-500">{product.launchDate ? `Recorded ${dateLabel(product.launchDate)}` : "Need a source with launch-date evidence"}</span></div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.04]"><span className="text-xs text-slate-500">Latest dated observation</span><strong className="mt-1 block text-xl">{observations.length ? formatINR(observations[observations.length - 1].price) : "Not recorded"}</strong><span className="mt-1 block text-xs text-slate-500">{observations.length ? dateLabel(observations[observations.length - 1].date) : "No verified price history yet"}</span></div>
      </div>

      {hasChart ? (
        <>
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-indigo-50/60 to-white p-3 dark:border-white/10 dark:from-indigo-500/[.07] dark:to-slate-950/20 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500"><span>Observed price (INR)</span><span>{dateLabel(observations[0].date)} — {dateLabel(observations[observations.length - 1].date)}</span></div>
            <svg viewBox="0 0 700 190" role="img" aria-label={`Recorded price history chart for ${product.title}`} className="h-48 w-full overflow-visible">
              {[40, 80, 120, 160].map((y) => <line key={y} x1="28" y1={y} x2="672" y2={y} stroke="currentColor" strokeOpacity=".10" strokeDasharray="4 5" />)}
              <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {coordinates.map((point, index) => <circle key={`${observations[index].date}-${index}`} cx={point.x} cy={point.y} r="5" fill="#4f46e5" stroke="white" strokeWidth="2"><title>{`${dateLabel(observations[index].date)}: ${formatINR(observations[index].price)}`}</title></circle>)}
            </svg>
            <div className="flex justify-between text-xs font-semibold text-slate-500"><span>Low {formatINR(min)}</span><span>High {formatINR(max)}</span></div>
          </div>
          <div className="mt-6">
            <h3 className="font-black">Month-by-month movement</h3>
            <div className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
              {movements.map((movement) => (
                <div key={movement.month} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><strong className="block text-sm">{monthLabel(`${movement.month}-01`)}</strong><span className="text-xs text-slate-500">Observed {dateLabel(movement.date)}</span></div>
                  <div className="flex items-center gap-3"><strong>{formatINR(movement.price)}</strong>{movement.change != null ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${movement.change < 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : movement.change > 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{movement.change < 0 ? <ArrowDownRight size={14}/> : movement.change > 0 ? <ArrowUpRight size={14}/> : null}{movement.change < 0 ? "Down " : movement.change > 0 ? "Up " : "No change "}{formatINR(Math.abs(movement.change))}</span> : <span className="text-xs text-slate-500">First recorded month</span>}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : observations.length === 1 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[.025]">
          <div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" size={20}/><div><h3 className="font-black">First price observation recorded</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">On {dateLabel(observations[0].date)}, the manually checked price was {formatINR(observations[0].price)}. Check and record the price again on another date to calculate a change and draw the history chart.</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">This is a dated manual observation, not an automatic price feed.</p></div></div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[.025]">
          <div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" size={20}/><div><h3 className="font-black">No recorded price observations yet</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Tick “I personally checked this price today” while saving a product after checking the current Amazon listing. The page records the date and price; after observations from at least two dates, it can show changes and a chart.</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">PickWise will not invent historical prices or claim automatic updates without an approved API source.</p></div></div>
        </div>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Tracking needs an authorised retailer price source and persistent storage/scheduled collection. A product's list price is not proof of its original launch price.</p>
    </section>
  );
}
