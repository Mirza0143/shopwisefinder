"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, RotateCcw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import products from "@/data/products.json";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";
import { formatINR } from "@/lib/products";
import { matchesSearchQuery, normalizeSearchText } from "@/lib/search";

type SortMode = "featured" | "price-low" | "price-high" | "rating";

const items = products as unknown as Product[];
// Build each product's searchable text once instead of rebuilding it on every keystroke.
const searchableItems = items.map((product) => ({
  product,
  searchIndex: normalizeSearchText([
    product.title,
    product.brand,
    product.category,
    product.description,
    ...(product.pros || []),
    ...(product.cons || []),
    ...(product.badges || []),
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [key, String(value)]),
    product.review?.summary || "",
    product.review?.bestFor || "",
    ...(product.review?.strengths || []),
    ...(product.review?.limitations || []),
  ].join(" ")),
}));
const spotlightCategories = [
  "Mobile Accessories",
  "Fashion & Footwear",
  "Grooming",
  "Everyday Essentials",
  "Audio",
  "Phones",
  "PCs",
  "Monitors",
  "Keyboards",
  "Office",
];

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(200000);
  const [sortMode, setSortMode] = useState<SortMode>("featured");

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((p) => p.category)))], []);
  // Next client navigation may change the query string while this page stays mounted.
  const searchKey = typeof window !== "undefined" ? window.location.search : "";

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const requestedCategory = params.get("category");
    const requestedQuery = params.get("q");
    if (requestedCategory && categories.includes(requestedCategory)) setCategory(requestedCategory);
    else setCategory("All");
    setQuery(requestedQuery || "");
  }, [categories, searchKey]);

  const filtered = useMemo(() => {
    const matched = searchableItems
      .filter(({ product, searchIndex }) => {
        const matchesQuery = matchesSearchQuery(searchIndex, deferredQuery);
        const matchesCategory = category === "All" || product.category === category;
        const matchesPrice = product.price <= maxPrice;
        return matchesQuery && matchesCategory && matchesPrice;
      })
      .map(({ product }) => product);

    return matched.sort((a, b) => {
      if (sortMode === "price-low") return a.price - b.price;
      if (sortMode === "price-high") return b.price - a.price;
      if (sortMode === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount;
      return Number(Boolean(b.featured || b.editorChoice || b.trending)) - Number(Boolean(a.featured || a.editorChoice || a.trending));
    });
  }, [deferredQuery, category, maxPrice, sortMode]);

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setMaxPrice(200000);
    setSortMode("featured");
    if (typeof window !== "undefined") window.history.replaceState(null, "", "/products");
  };

  return (
    <main className="pw-page-enter mx-auto min-h-screen max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <header className="pw-enter mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-300"><Sparkles size={14} /> The PickWise product library</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.035em] text-slate-950 dark:text-white sm:text-5xl">Useful picks. Smarter buys.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">From mobile-gaming accessories and wardrobe basics to cables, audio gear and everyday essentials.</p>
        </div>
        <Link href="/bundles" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:self-auto">
          Explore curated kits <ArrowDownWideNarrow size={16} />
        </Link>
      </header>

      <section className="pw-enter sticky top-[76px] z-30 mb-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-3 shadow-lg shadow-slate-900/[.04] dark:border-white/10 dark:bg-slate-950 sm:p-4" aria-label="Product filters">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <span className="sr-only">Search products, features and use cases</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cables, phone cooler, earbuds, perfume..." className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-11 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-900" />
          </label>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900">
            <ArrowDownWideNarrow size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Sort products</span>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-full min-w-32 bg-transparent text-sm font-semibold outline-none">
              <option value="featured">Featured first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top ratings</option>
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-900">
            <SlidersHorizontal size={17} className="shrink-0 text-slate-500" />
            <span className="whitespace-nowrap text-sm font-semibold">Up to {formatINR(maxPrice, true)}</span>
            <input aria-label="Maximum budget in Indian rupees" type="range" min="500" max="300000" step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-24 accent-indigo-600 sm:w-32" />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Popular categories">
          <button type="button" onClick={() => setCategory("All")} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition duration-200 ${category === "All" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>All picks</button>
          {spotlightCategories.filter((c) => categories.includes(c)).map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition duration-200 ${category === c ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>{c}</button>
          ))}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500"><span className="font-black text-slate-950 dark:text-white">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""} found <span className="font-normal">· sample catalog</span></p>
        {(query || category !== "All" || maxPrice !== 200000 || sortMode !== "featured") && (
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"><RotateCcw size={13} /> Reset filters</button>
        )}
      </div>

      <p className="mb-6 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">Some entries are demo records. The iPhone prices are estimates converted from supplied AED listings, not verified Indian retail prices. Confirm the exact model, seller, live price, condition and warranty before buying.</p>

      {filtered.length > 0 ? (
        <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => <div key={product.id}><ProductCard product={product} /></div>)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-white/10 dark:bg-white/[.025]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><Search size={23} /></div>
          <p className="mt-4 text-lg font-black">No picks match those filters</p>
          <p className="mt-2 text-sm text-slate-500">Try another search term or raise your budget.</p>
          <button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 dark:bg-indigo-500">Clear filters</button>
        </div>
      )}

      <section className="pw-enter mt-12 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
        <h2 className="text-lg font-black">A good shortlist starts with the use case</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <div><strong className="block text-slate-950 dark:text-white">Check compatibility</strong>Adapters, phone coolers and chargers need to match your exact device.</div>
          <div><strong className="block text-slate-950 dark:text-white">Compare total value</strong>Consider comfort, durability, return policy and useful features—not just a discount.</div>
          <div><strong className="block text-slate-950 dark:text-white">Verify before checkout</strong>Use the retailer page to confirm today’s price, availability and product specifications.</div>
        </div>
      </section>
    </main>
  );
}
