import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, Star, X } from "lucide-react";
import { getProductBySlug, getProducts } from "@/lib/products";

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="mb-6 text-sm text-slate-500"><Link href="/products" className="hover:text-indigo-600">Products</Link> / {product.title}</div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-white/5">
          <img src={product.image} alt={product.title} className="aspect-square w-full rounded-[1.5rem] object-cover"/>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {product.badges.map((badge) => <span key={badge} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{badge}</span>)}
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[.18em] text-slate-500">{product.brand} · {product.category}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{product.title}</h1>
          <div className="mt-4 flex items-center gap-2"><Star size={18} fill="currentColor"/> <strong>{product.rating}</strong><span className="text-slate-500">({product.reviewCount.toLocaleString()} ratings)</span></div>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{product.description}</p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black">${product.price.toFixed(2)}</span>
              <span className="pb-1 text-slate-400 line-through">${product.originalPrice.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-sm text-emerald-600">Prices may change. Check Amazon for the current price.</p>
            <Link
              href={`/go/${product.slug}`}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              Check price on Amazon <ArrowUpRight size={19}/>
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">Affiliate link · Opens in a new tab</p>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
          <h2 className="text-2xl font-black">Pros & Cons</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div><h3 className="font-bold">Pros</h3><ul className="mt-3 space-y-3">{product.pros.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><Check className="shrink-0 text-emerald-500" size={18}/>{x}</li>)}</ul></div>
            <div><h3 className="font-bold">Cons</h3><ul className="mt-3 space-y-3">{product.cons.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><X className="shrink-0 text-rose-500" size={18}/>{x}</li>)}</ul></div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
          <h2 className="text-2xl font-black">Key specifications</h2>
          <div className="mt-5 divide-y divide-slate-200 dark:divide-white/10">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-5 py-3 text-sm">
                <span className="font-semibold text-slate-500">{key}</span><span className="text-right font-bold">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-100 p-7 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-2xl font-black">Video review</h2>
        <div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-slate-300">
          YouTube review placeholder
        </div>
      </section>
    </main>
  );
}