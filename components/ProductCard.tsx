import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Product } from "@/types/product";

export default function ProductCard({ product }: { product: Product }) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/70 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.badges.slice(0, 2).map((badge) => (
            <span key={badge} className="rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{product.brand}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-2 line-clamp-2 text-lg font-bold tracking-tight text-slate-950 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">
            {product.title}
          </h3>
        </Link>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1 font-semibold"><Star size={15} fill="currentColor" /> {product.rating}</span>
          <span className="text-slate-500">({product.reviewCount.toLocaleString()})</span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <span className="text-2xl font-black">${product.price.toFixed(2)}</span>
            <span className="ml-2 text-sm text-slate-400 line-through">${product.originalPrice.toFixed(2)}</span>
            <div className="mt-1 text-xs font-bold text-emerald-600">{discount}% off</div>
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-600"
          >
            Review <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}