 "use client";

import { useMemo, useState } from "react";
import products from "@/data/products.json";
import { Product } from "@/types/product";
import Link from "next/link";

export default function ComparePage() {
  const items = products as Product[];
  const [selected, setSelected] = useState(items.slice(0, 3).map((x) => x.slug));

  const chosen = useMemo(() => selected.map((slug) => items.find((x) => x.slug === slug)).filter(Boolean) as Product[], [selected, items]);

  function update(index: number, slug: string) {
    const next = [...selected];
    next[index] = slug;
    setSelected(next);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">Comparison tool</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Compare up to 3 products</h1>
      <p className="mt-3 text-slate-500">Choose products to see their key differences side by side.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <select key={index} value={selected[index] ?? ""} onChange={(e) => update(index, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold dark:border-white/10 dark:bg-slate-950">
            {items.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead><tr className="border-b border-slate-200 dark:border-white/10"><th className="p-5">Feature</th>{chosen.map((p) => <th key={p.id} className="p-5">{p.title}</th>)}</tr></thead>
          <tbody>
            {["price", "rating", "category"].map((field) => (
              <tr key={field} className="border-b border-slate-200 dark:border-white/10">
                <td className="p-5 font-bold capitalize">{field}</td>
                {chosen.map((p) => <td key={p.id} className="p-5">{field === "price" ? `$${p.price.toFixed(2)}` : field === "rating" ? `${p.rating} / 5` : p.category}</td>)}
              </tr>
            ))}
            {Array.from(new Set(chosen.flatMap((p) => Object.keys(p.specs)))).map((spec) => (
              <tr key={spec} className="border-b border-slate-200 dark:border-white/10">
                <td className="p-5 font-bold">{spec}</td>
                {chosen.map((p) => <td key={p.id} className="p-5">{p.specs[spec] ?? "—"}</td>)}
              </tr>
            ))}
            <tr>
              <td className="p-5 font-bold">Review</td>
              {chosen.map((p) => <td key={p.id} className="p-5"><Link className="font-bold text-indigo-600" href={`/products/${p.slug}`}>Open review →</Link></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}