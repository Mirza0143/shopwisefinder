import { CheckCircle2, ClipboardCheck, Lightbulb } from "lucide-react";
import type { Product } from "@/types/product";

export default function AmazonProductInsights({ product }: { product: Product }) {
  const specHighlights = Object.entries(product.specs || {})
    .filter(([label, value]) => label.trim() && String(value).trim())
    .slice(0, 4);

  const checks = (product.review?.verifyBeforeBuying?.length
    ? product.review.verifyBeforeBuying
    : [
        "Confirm the exact model, size, colour, and selected variant.",
        "Review seller details, delivery, warranty, and return terms.",
        "Check the latest price and availability on the retailer listing.",
      ]).slice(0, 3);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[.035] dark:border-white/10 dark:bg-white/[.04] sm:p-8" aria-labelledby="amazon-product-insights-heading">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Lightbulb size={21} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">Amazon buying guide</p>
          <h2 id="amazon-product-insights-heading" className="mt-1 text-2xl font-black tracking-tight">Product insights</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Review the key specifications before you buy. ShopWiseFinder does not show Amazon price-history charts or past-price comparisons here; prices and availability can change, so check the live listing for current details.
          </p>
        </div>
      </div>

      {specHighlights.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {specHighlights.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[.035]">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <strong className="mt-1 block text-sm leading-6 text-slate-900 dark:text-slate-100">{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
          Detailed specifications have not been added for this listing yet. Check the retailer page for product details.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-5 dark:border-indigo-400/20 dark:bg-indigo-500/[.07]">
        <h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-slate-100">
          <ClipboardCheck size={18} className="text-indigo-600 dark:text-indigo-300" /> Before you buy
        </h3>
        <ul className="mt-3 space-y-2.5">
          {checks.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
