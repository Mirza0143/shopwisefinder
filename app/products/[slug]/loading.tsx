import { LoaderCircle } from "lucide-react";

export default function ProductReviewLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300"><LoaderCircle size={17} className="animate-spin"/> Preparing the product review…</div>
      <div className="grid animate-pulse gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="aspect-square rounded-3xl bg-slate-200 dark:bg-white/10" />
        <div className="space-y-4 py-2"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10"/><div className="h-10 w-4/5 rounded-xl bg-slate-200 dark:bg-white/10"/><div className="h-5 w-2/5 rounded bg-slate-200 dark:bg-white/10"/><div className="h-24 rounded-2xl bg-slate-200 dark:bg-white/10"/><div className="h-12 w-full max-w-sm rounded-xl bg-slate-200 dark:bg-white/10"/></div>
      </div>
    </main>
  );
}
