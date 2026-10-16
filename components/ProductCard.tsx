"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, GitCompareArrows, Sparkles, Star } from "lucide-react";
import type { Product } from "@/types/product";
import { useQuickCompare } from "@/components/QuickCompareProvider";
import { formatINR, getProductBadges } from "@/lib/products";
import { getProductProvider, getProviderLabel } from "@/lib/marketplaces";
import MarketplaceBadge from "@/components/MarketplaceBadge";

export default function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice > product.price && product.originalPrice > 0
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const router = useRouter();
  const prefetchReview = () => router.prefetch(`/products/${product.slug}`);
  const { isSelected, toggle } = useQuickCompare();
  const selected = isSelected(product.slug);
  const badges = getProductBadges(product);

  return (
    <article className="pw-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-md shadow-slate-900/[.04] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/[.08] dark:border-white/10 dark:bg-slate-950/70">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-slate-950/5 opacity-70 transition-opacity group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
          {badges.slice(0, 2).map((badge) => (
            <span key={badge} className="rounded-full border border-white/20 bg-slate-950/85 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-md">{badge}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          aria-pressed={selected}
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold shadow-lg transition duration-200 hover:-translate-y-0.5 active:scale-95 ${selected ? "bg-indigo-600 text-white shadow-indigo-900/20" : "border border-white/70 bg-white/95 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-slate-950/90 dark:text-white"}`}
        >
          <GitCompareArrows size={14} />{selected ? "Selected" : "Compare"}
        </button>
        {product.isDemoData && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-amber-100/95 px-2.5 py-1.5 text-[10px] font-black text-amber-900 shadow-sm backdrop-blur">Sample prices & specs</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-slate-500 dark:text-slate-400">{product.brand}</p>
          <MarketplaceBadge provider={getProductProvider(product)} compact />
        </div>
        <div className="mt-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{product.category}</span></div>
        <Link href={`/products/${product.slug}`} prefetch onMouseEnter={prefetchReview} onFocus={prefetchReview} className="mt-2 block">
          <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 tracking-tight text-slate-950 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">{product.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500 dark:text-slate-400">{product.description}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {product.reviewCount > 0 && product.rating > 0 && (product.ratingSource === "manual_checked" || product.ratingSource === "amazon_creators_api") ? (
            <><span className="inline-flex items-center gap-1 font-bold"><Star size={14} fill="currentColor" className="text-amber-500" />{product.rating.toFixed(1)}</span><span className="text-xs text-slate-500">({product.reviewCount.toLocaleString()} ratings)</span></>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"><Sparkles size={13} /> Rating not verified</span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{product.isDemoData ? "Illustrative price" : "Listed price"}</span>
              <span className="mt-0.5 block text-2xl font-black tracking-tight text-slate-950 dark:text-white">{formatINR(product.price)}</span>
              {product.originalPrice > product.price && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 line-through">{formatINR(product.originalPrice)}</span>
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{discount}% below sample list</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[.9fr_1.1fr] gap-2">
            <Link href={`/products/${product.slug}`} prefetch onMouseEnter={prefetchReview} onFocus={prefetchReview} aria-label={`Read review for ${product.title}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-indigo-400/30">
              Read review <ArrowUpRight size={14} />
            </Link>
            <Link href={`/go/${product.slug}`} target="_blank" rel="sponsored nofollow noopener" data-provider={getProductProvider(product)} aria-label={`Shop ${product.title} at ${getProviderLabel(getProductProvider(product))}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-orange-500/15 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg active:translate-y-0">
              Shop at {getProviderLabel(getProductProvider(product))} <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400">
            {product.priceHistory?.observations?.length ? `${product.priceHistory.observations.length} dated price observations · View timeline in review` : "Dated price history not connected yet"}
          </div>
        </div>
      </div>
    </article>
  );
}
