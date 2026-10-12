"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import type { Product, EditorialReview } from "@/types/product";
import { generateSmartReview } from "@/lib/smart-review";

/**
 * Legacy filename retained to avoid changing imports, but this is fully local:
 * no API key, network request, subscription, or remote model call is used.
 */
export default function AIReviewButton({ product }: { product: Product }) {
  const [review, setReview] = useState<EditorialReview | null>(null);
  const [expanded, setExpanded] = useState(false);

  function generate() {
    // Pure deterministic rules operate on the catalogue record in the browser.
    setReview(generateSmartReview(product));
    setExpanded(true);
  }

  return <div className="mt-4">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200"><ShieldCheck size={13}/> No API key needed</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white/70 px-2.5 py-1 text-indigo-800 dark:border-indigo-400/20 dark:bg-slate-950/40 dark:text-indigo-200"><Zap size={13}/> Runs instantly</span>
    </div>
    <button type="button" onClick={generate} aria-expanded={expanded} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition duration-200 hover:bg-indigo-700 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
      {review ? <RefreshCw size={16}/> : <Sparkles size={16}/>} {review ? "Refresh Smart Review" : "Generate Smart Review"}
    </button>
    {review && expanded && <div className="pw-review-result mt-5 space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300"><Sparkles size={14}/> Free specification analysis <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">Local rules</span></div>
      <p className="text-sm leading-6">{review.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-bold">Best for</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.bestFor}</p></div><div><h3 className="font-bold">Not ideal for</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.notIdealFor}</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-bold text-emerald-700 dark:text-emerald-300">Strengths</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.strengths.map((x, i) => <li key={`${i}-${x}`}>{x}</li>)}</ul></div><div><h3 className="font-bold text-rose-700 dark:text-rose-300">Limitations</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.limitations.map((x, i) => <li key={`${i}-${x}`}>{x}</li>)}</ul></div></div>
      <div><h3 className="font-bold">Check before buying</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.verifyBeforeBuying.map((x, i) => <li key={`${i}-${x}`}>{x}</li>)}</ul></div>
      <p className="text-xs text-slate-500">Generated locally from PickWise catalogue data using transparent rules. No OpenAI API call is made. Catalogue data is not a hands-on test; verify missing details, seller claims and final prices.</p>
    </div>}
  </div>;
}
