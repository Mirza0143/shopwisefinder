"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

type QuickCompareContextValue = {
  selectedSlugs: string[];
  notice: string | null;
  toggle: (slug: string) => void;
  isSelected: (slug: string) => boolean;
  clear: () => void;
};
const QuickCompareContext = createContext<QuickCompareContextValue | null>(null);

export function useQuickCompare() {
  const value = useContext(QuickCompareContext);
  if (!value) throw new Error("useQuickCompare must be used within QuickCompareProvider");
  return value;
}

export default function QuickCompareProvider({ children }: { children: React.ReactNode }) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = useCallback((slug: string) => {
    if (selectedSlugs.includes(slug)) {
      setSelectedSlugs(selectedSlugs.filter((item) => item !== slug));
      setNotice(null);
      return;
    }

    if (selectedSlugs.length >= 3) {
      setNotice("Quick Compare supports up to three products. Remove one pick first.");
      return;
    }

    // Keep previous choices even when products come from different categories.
    // The compare page shows all available specifications and marks missing fields with a dash.
    setSelectedSlugs([...selectedSlugs, slug]);
    trackAnalyticsEvent("compare_select", { productSlug: slug, pagePath: window.location.pathname });
    setNotice(null);
  }, [selectedSlugs]);

  const isSelected = useCallback((slug: string) => selectedSlugs.includes(slug), [selectedSlugs]);
  const clear = useCallback(() => {
    setSelectedSlugs([]);
    setNotice(null);
  }, []);
  const value = useMemo(() => ({ selectedSlugs, notice, toggle, isSelected, clear }), [selectedSlugs, notice, toggle, isSelected, clear]);

  return (
    <QuickCompareContext.Provider value={value}>
      {children}
      <QuickCompareBar selected={selectedSlugs} notice={notice} clear={clear} />
    </QuickCompareContext.Provider>
  );
}

function QuickCompareBar({ selected, notice, clear }: { selected: string[]; notice: string | null; clear: () => void }) {
  const router = useRouter();
  if (!selected.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-indigo-200/80 bg-white/95 p-3 shadow-[0_-14px_45px_rgba(15,23,42,.12)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-black">Quick Compare</strong><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{selected.length} / 3 selected</span></div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{notice || (selected.length < 2 ? "Choose one more product to compare." : "Ready to compare selected products side by side.")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={clear} className="rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white">Clear</button>
          <button type="button" disabled={selected.length < 2} onClick={() => router.push(`/compare?items=${encodeURIComponent(selected.join(","))}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-400">Compare selected <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>
  );
}
