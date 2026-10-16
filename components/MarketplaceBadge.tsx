"use client";

import { useState } from "react";
import type { ProductProvider } from "@/types/product";
import { getProviderDomain, getProviderLabel, MARKETPLACES, normalizeProvider } from "@/lib/marketplaces";

export default function MarketplaceBadge({ provider, compact = false }: { provider: ProductProvider | string | undefined; compact?: boolean }) {
  const normalized = normalizeProvider(provider) || "amazon";
  const meta = MARKETPLACES.find((item) => item.value === normalized) || MARKETPLACES[0];
  const [failed, setFailed] = useState(false);
  const domain = getProviderDomain(normalized);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : "";
  const initials = meta.label === "Amazon India" ? "a" : meta.label.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
  return (
    <span title={`Provider: ${getProviderLabel(normalized)}`} className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200 ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}>
      {faviconUrl && !failed ? <img src={faviconUrl} alt="" width={compact ? 15 : 18} height={compact ? 15 : 18} loading="lazy" className="shrink-0 rounded-full" onError={() => setFailed(true)} /> : <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ width: compact ? 15 : 18, height: compact ? 15 : 18, backgroundColor: meta.color }}>{initials}</span>}
      <span className="truncate">{getProviderLabel(normalized)}</span>
    </span>
  );
}
