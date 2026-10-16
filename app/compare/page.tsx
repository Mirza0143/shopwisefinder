"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, GitCompareArrows, Search, Trophy, X } from "lucide-react";
import productsData from "@/data/products.json";
import type { Product } from "@/types/product";
import { formatINR } from "@/lib/products";
import { getProductProvider, getProviderLabel } from "@/lib/marketplaces";
import MarketplaceBadge from "@/components/MarketplaceBadge";
import { matchesSearchQuery } from "@/lib/search";
import { buildProductSearchIndex } from "@/lib/product-search-index";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

const initialItems = (productsData as unknown as Product[]).filter((product) => !product.isDemoData);
const ALL_CATEGORIES = "All categories";
function monthlyChange(product: Product) {
  const observations = [...(product.priceHistory?.observations || [])]
    .filter((entry) => Number.isFinite(entry.price) && !Number.isNaN(new Date(entry.date).getTime()))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = new Map<string, { price: number; date: string }>();
  for (const observation of observations) byMonth.set(observation.date.slice(0, 7), observation);
  const months = [...byMonth.values()];
  if (months.length < 2) return null;
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  return { amount: current.price - previous.price, currentPrice: current.price, previousPrice: previous.price, date: current.date };
}

function prettyMonth(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default function ComparePage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>(initialItems);
  const categories = useMemo(() => Array.from(new Set(items.map((product) => product.category))).sort(), [items]);
  const searchableBySlug = useMemo(() => new Map<string, string>(items.map((product): [string, string] => [product.slug, buildProductSearchIndex(product)])), [items]);
  useEffect(() => {
    let active = true;
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("catalog fetch failed"); return response.json(); })
      .then((payload: { products?: Product[] }) => { if (active && Array.isArray(payload.products)) setItems(payload.products); })
      .catch(() => { /* Keep the built-in catalogue if the optional database is offline. */ });
    return () => { active = false; };
  }, []);
  // Start broad so search can find any category; selection narrows to one category after the first pick.
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("items");
    const matches = (requested || "").split(",").map((slug) => items.find((product) => product.slug === slug)).filter((product): product is Product => Boolean(product));
    if (matches.length >= 2) {
      const sameCategory = matches.every((product) => product.category === matches[0].category);
      setCategory(sameCategory ? matches[0].category : ALL_CATEGORIES);
      setSelectedSlugs(matches.slice(0, 3).map((product) => product.slug));
      setNotice(sameCategory ? "Loaded your Quick Compare picks." : "Loaded products across categories. Shared and product-specific specifications are shown where available.");
    }
  }, [items]);

  const categoryItems = useMemo(
    () => category === ALL_CATEGORIES ? items : items.filter((product) => product.category === category),
    [items, category],
  );
  const results = useMemo(() => categoryItems.filter((product) =>
    matchesSearchQuery(searchableBySlug.get(product.slug) || "", deferredQuery)
  ), [categoryItems, deferredQuery, searchableBySlug]);
  const chosen = useMemo(() => selectedSlugs.map((slug) => items.find((product) => product.slug === slug)).filter((product): product is Product => Boolean(product)), [items, selectedSlugs]);
  const displayedResults = useMemo(() => {
    // When no query is entered, keep the initial full-catalog view light. A real query searches every record.
    return deferredQuery.trim() ? results.slice(0, 24) : results.slice(0, 9);
  }, [results, deferredQuery]);
  const specKeys = useMemo(() => Array.from(new Set(chosen.flatMap((product) => Object.keys(product.specs || {})))), [chosen]);
  const lowest = chosen.length ? Math.min(...chosen.map((product) => product.price)) : null;

  function changeCategory(value: string) {
    setCategory(value);
    setQuery("");
    setNotice(value === ALL_CATEGORIES
      ? "Search across the full catalogue. Your current selections are kept."
      : `Showing ${value} in the search results. Your current selections are kept.`);
  }
  function addProduct(slug: string) {
    const product = items.find((item) => item.slug === slug);
    if (!product || selectedSlugs.includes(slug)) return;
    if (selectedSlugs.length >= 3) {
      setNotice("You can compare up to three products. Remove one first.");
      return;
    }
    setSelectedSlugs((current) => [...current, slug]);
    trackAnalyticsEvent("compare_select", { productSlug: slug, pagePath: window.location.pathname });
    setNotice(selectedSlugs.length > 0 && !selectedSlugs.every((selectedSlug) => items.find((item) => item.slug === selectedSlug)?.category === product.category)
      ? "Products from different categories are kept selected; compare the fields available for each item."
      : "");
  }
  function removeProduct(slug: string) {
    setSelectedSlugs((current) => current.filter((item) => item !== slug));
  }

  return (
    <main className="pw-page-enter mx-auto min-w-0 min-h-screen w-full max-w-7xl px-4 py-6 sm:px-5 sm:py-10 lg:px-8 lg:py-14">
      <header className="pw-enter flex flex-col gap-5 border-b border-slate-200/80 pb-8 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300"><GitCompareArrows size={15}/> Make the right pick</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Compare products your way</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Search by name, add up to three items, and compare listed prices and available specifications side by side.</p>
        </div>
        <label className="grid gap-2 text-xs font-bold text-slate-500">Category
          <select value={category} onChange={(event) => changeCategory(event.target.value)} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 sm:w-auto sm:min-w-52 dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <option value={ALL_CATEGORIES}>{ALL_CATEGORIES}</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </header>

      <section className="mt-7 rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-lg shadow-slate-900/[.035] backdrop-blur-sm dark:border-white/10 dark:bg-white/[.035] sm:p-5" aria-label="Search products to compare">
        <div className="relative">
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={category === ALL_CATEGORIES ? "Search the full catalogue by name, price, specification, feature or review…" : `Search ${category.toLowerCase()} by name, price, specification or review…`} aria-label="Search products to compare" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-950" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">{results.length} result{results.length === 1 ? "" : "s"} · {selectedSlugs.length}/3 selected</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setSelectedSlugs([]); setNotice("Selection cleared. Search and add new products."); }} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10">Clear selection</button>
            <Link href="/products" className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">Browse full catalog ↗</Link>
          </div>
        </div>
        {notice && <p role="status" className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">{notice}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayedResults.map((product) => {
            const selected = selectedSlugs.includes(product.slug);
            const disabled = (!selected && selectedSlugs.length >= 3);
            return (
              <article key={product.slug} className={`flex min-w-0 gap-3 rounded-2xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-400/30 dark:bg-indigo-500/[.08]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40"}`}>
                <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-900" />
                <div className="min-w-0 flex-1">
                  <strong className="line-clamp-2 text-sm leading-5">{product.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">{product.brand} · {product.category}</p>
                  <p className="mt-1 font-black">{formatINR(product.price)}</p>
                  <button type="button" disabled={selected || disabled} onClick={() => addProduct(product.slug)} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-indigo-600 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-indigo-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500">
                    {selected ? <><CheckCircle2 size={13}/> Added</> : disabled ? "Limit reached" : "+ Add to compare"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {results.length > displayedResults.length && <p className="mt-3 text-center text-xs text-slate-500">Showing {displayedResults.length} of {results.length} matches. Add a search term to narrow the list.</p>}
        {results.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">No product found for “{query}” {category === ALL_CATEGORIES ? "in the catalogue" : `in ${category}`}. Try a price, specification, brand or another category.</div>}
      </section>

      <section className="mt-9" aria-labelledby="selected-products-heading">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">Your shortlist</p><h2 id="selected-products-heading" className="mt-1 text-2xl font-black">Selected products</h2></div><p className="text-xs text-slate-500">Choose 2–3 items. Cross-category comparisons are supported; missing specifications show as dashes.</p></div>
        {chosen.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{chosen.map((product) => <article key={product.slug} className="group relative rounded-3xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-900/[.03] transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[.035]"><button type="button" onClick={() => removeProduct(product.slug)} aria-label={`Remove ${product.title}`} className="absolute right-6 top-6 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-600 shadow transition hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-950"><X size={15}/></button><img src={product.image} alt={product.title} loading="lazy" decoding="async" className="mb-4 aspect-[5/3] w-full rounded-2xl bg-slate-100 object-cover transition duration-500 group-hover:scale-[1.01] dark:bg-slate-900"/><div className="text-xs font-bold text-slate-500">{product.brand} · {product.category}</div><div className="mt-2"><MarketplaceBadge provider={getProductProvider(product)} compact /></div><h3 className="mt-1 pr-7 text-lg font-black leading-6">{product.title}</h3><div className="mt-3 text-2xl font-black">{formatINR(product.price)}</div>{product.isDemoData && <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Illustrative price, not live retailer data</p>}<div className="mt-4 flex flex-wrap items-center gap-3"><Link href={`/products/${product.slug}`} prefetch onMouseEnter={() => router.prefetch(`/products/${product.slug}`)} onFocus={() => router.prefetch(`/products/${product.slug}`)} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-300">Read review ↗</Link><Link href={`/go/${product.slug}`} target="_blank" rel="sponsored nofollow noopener" data-provider={getProductProvider(product)} className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600">Shop at {getProviderLabel(getProductProvider(product))} ↗</Link></div></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-9 text-center dark:border-white/10 dark:bg-white/[.025]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><Search size={21}/></div><h3 className="mt-3 font-black">Start with a product search</h3><p className="mt-1 text-sm text-slate-500">Search above, then press “Add to compare” on two or three products.</p></div>}
      </section>

      {chosen.length >= 2 ? (
        <section className="mt-10" aria-labelledby="comparison-table-heading">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">Side-by-side matrix</p><h2 id="comparison-table-heading" className="mt-1 text-2xl font-black">Price & specification comparison</h2></div><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Trophy size={14}/> Lowest value is marked—not an overall quality verdict</span></div>
          {/* Small screens use stacked product-spec cards so visitors never need horizontal swiping. */}
          <div className="space-y-3 lg:hidden">
            {chosen.map((product) => {
              const diff = product.originalPrice > product.price ? product.originalPrice - product.price : null;
              const pct = diff ? Math.round((diff / product.originalPrice) * 100) : null;
              const change = monthlyChange(product);
              const rows: { label: string; value: string; note?: string; emphasis?: boolean }[] = [
                { label: "Displayed price", value: formatINR(product.price), note: product.isDemoData ? "Illustrative demo value" : undefined, emphasis: lowest === product.price },
                { label: "List/reference price", value: formatINR(product.originalPrice), note: diff && pct ? `${formatINR(diff)} (${pct}%) below sample list price` : "No verified discount" },
                { label: "Last month", value: product.priceHistory?.lastMonthPrice != null ? formatINR(product.priceHistory.lastMonthPrice) : "No verified record" },
                { label: "30-day average", value: product.priceHistory?.avg30DayPrice != null ? formatINR(product.priceHistory.avg30DayPrice) : "No verified record" },
                { label: "Latest monthly movement", value: change ? `${change.amount < 0 ? "↓ Down " : change.amount > 0 ? "↑ Up " : "No change "}${formatINR(Math.abs(change.amount))}` : "Need 2 months of observations" },
                ...specKeys.map((spec) => ({ label: spec, value: product.specs?.[spec] || "—" })),
              ];
              return (
                <article key={product.slug} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                  <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
                    <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-900" />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-black leading-5">{product.title}</h3>
                      <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-400">{product.brand} · {product.category}</p>
                      <p className={`mt-1 text-lg font-black ${lowest === product.price ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{formatINR(product.price)}</p>
                    </div>
                  </div>
                  <dl className="mt-1 divide-y divide-slate-200 dark:divide-white/10">
                    {rows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-3 text-sm">
                        <dt className="min-w-0 break-words font-semibold text-slate-600 dark:text-slate-300">{row.label}</dt>
                        <dd className={`min-w-0 break-words text-right font-medium ${row.emphasis ? "font-black text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"}`}>
                          {row.value}
                          {row.note && <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">{row.note}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
                    <Link href={`/products/${product.slug}`} prefetch onMouseEnter={() => router.prefetch(`/products/${product.slug}`)} onFocus={() => router.prefetch(`/products/${product.slug}`)} className="inline-flex min-h-10 items-center rounded-lg text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-300">Read review ↗</Link>
                    <Link href={`/go/${product.slug}`} target="_blank" rel="sponsored nofollow noopener" data-provider={getProductProvider(product)} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white hover:bg-orange-600">Shop at {getProviderLabel(getProductProvider(product))} ↗</Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Keep the dense side-by-side matrix on larger screens. */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[.035] dark:border-white/10 dark:bg-slate-950/50 lg:block">
            <div className="overflow-x-auto"><table className="w-full min-w-[740px] border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[.04]"><th className="sticky left-0 z-10 bg-slate-50 p-4 text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:p-5">Feature</th>{chosen.map((product) => <th key={product.slug} className="min-w-52 p-4 sm:p-5"><div className="break-words text-sm font-black">{product.title}</div><div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">{product.brand}</div></th>)}</tr></thead><tbody>
              <tr className="border-b border-slate-200 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">Displayed price</th>{chosen.map((product) => <td key={product.slug} className={`p-4 text-lg font-black sm:p-5 ${lowest === product.price ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{formatINR(product.price)}{product.isDemoData && <div className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Demo value</div>}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">List/reference price</th>{chosen.map((product) => { const diff = product.originalPrice > product.price ? product.originalPrice - product.price : null; const pct = diff ? Math.round(diff / product.originalPrice * 100) : null; return <td key={product.slug} className="p-4 sm:p-5">{formatINR(product.originalPrice)}<div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{diff && pct ? `${formatINR(diff)} (${pct}%) below sample list price` : "No verified discount"}</div></td>; })}</tr>
              <tr className="border-b border-slate-200 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">Last month</th>{chosen.map((product) => <td key={product.slug} className="p-4 sm:p-5">{product.priceHistory?.lastMonthPrice != null ? formatINR(product.priceHistory.lastMonthPrice) : <span className="text-xs text-slate-600 dark:text-slate-400">No verified record</span>}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">30-day average</th>{chosen.map((product) => <td key={product.slug} className="p-4 sm:p-5">{product.priceHistory?.avg30DayPrice != null ? formatINR(product.priceHistory.avg30DayPrice) : <span className="text-xs text-slate-600 dark:text-slate-400">No verified record</span>}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">Latest monthly movement</th>{chosen.map((product) => { const change = monthlyChange(product); return <td key={product.slug} className="p-4 sm:p-5">{change ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${change.amount < 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : change.amount > 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{change.amount < 0 ? <ArrowDownRight size={14}/> : change.amount > 0 ? <ArrowUpRight size={14}/> : null}{change.amount < 0 ? "Down " : change.amount > 0 ? "Up " : "No change "}{formatINR(Math.abs(change.amount))}</span> : <span className="text-xs text-slate-600 dark:text-slate-400">Need 2 months of observations</span>}</td>; })}</tr>
              {specKeys.map((spec) => <tr key={spec} className="border-b border-slate-200 last:border-0 dark:border-white/10"><th className="sticky left-0 bg-white p-4 text-sm font-bold dark:bg-slate-950 sm:p-5">{spec}</th>{chosen.map((product) => <td key={product.slug} className="p-4 text-sm sm:p-5">{product.specs?.[spec] || "—"}</td>)}</tr>)}
            </tbody></table></div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 className="mt-0.5 shrink-0" size={15}/>Demo/sample prices are illustrative. Other catalogue prices may be manually entered or API-sourced as identified on each product page, and can change before checkout; verify the current price with the retailer. Monthly movement only appears when at least two months of dated observations exist.</p>
        </section>
      ) : <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-white/[.04] dark:text-slate-300">Add one more product to unlock the comparison matrix.</p>}
    </main>
  );
}
