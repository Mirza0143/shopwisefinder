 "use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import products from "@/data/products.json";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/product";

export default function ProductsPage() {
  const items = products as Product[];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(600);

  const categories = ["All", ...Array.from(new Set(items.map((p) => p.category)))];

  const filtered = useMemo(() => items.filter((p) => {
    const matchesQuery = `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    const matchesPrice = p.price <= maxPrice;
    return matchesQuery && matchesCategory && matchesPrice;
  }), [items, query, category, maxPrice]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">Product library</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Explore products</h1>
        <p className="mt-3 max-w-2xl text-slate-500">Search, filter and open detailed product reviews.</p>
      </div>

      <div className="mb-8 grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="w-full rounded-xl border border-slate-200 bg-white px-11 py-3 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"/>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none dark:border-white/10 dark:bg-slate-950">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 dark:border-white/10">
          <SlidersHorizontal size={17}/>
          <span className="whitespace-nowrap text-sm font-semibold">Max ${maxPrice}</span>
          <input type="range" min="50" max="600" step="10" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}/>
        </label>
      </div>

      <div className="mb-5 text-sm text-slate-500">{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-white/10">
          <p className="font-bold">No products match your filters.</p>
          <Link href="/products" className="mt-3 inline-block text-sm font-bold text-indigo-600">Reset</Link>
        </div>
      )}
    </main>
  );
}