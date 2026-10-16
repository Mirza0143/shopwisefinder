import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <main role="status" aria-live="polite" aria-busy="true" className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="animate-pulse">
        <div className="h-3 w-40 rounded bg-indigo-100 dark:bg-white/10" />
        <div className="mt-4 h-10 max-w-xl rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="mt-3 h-4 max-w-2xl rounded bg-slate-100 dark:bg-white/[.06]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.03]"><div className="aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-white/[.05]"/><div className="mt-4 h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[.06]"/><div className="mt-3 h-4 w-1/3 rounded bg-slate-100 dark:bg-white/[.06]"/></div>)}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500"><Sparkles size={16} className="text-indigo-600"/> Loading ShopWiseFinder…</p>
      </div>
    </main>
  );
}
