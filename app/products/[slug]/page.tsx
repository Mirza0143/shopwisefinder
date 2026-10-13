import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, ClipboardCheck, Star, X } from "lucide-react";
import { formatINR, getProductAffiliateUrl, getProductBySlug, getProducts, getProductBadges } from "@/lib/products";
import PriceHistoryPanel from "@/components/PriceHistoryPanel";
import AIReviewButton from "@/components/AIReviewButton";
import ProductImageGallery from "@/components/ProductImageGallery";
import type { Product } from "@/types/product";


const specificPhoneGalleries: Record<string, string[]> = {
  "apple-iphone-15-pro-128gb": [
    "https://images.unsplash.com/photo-1697630725124-3fcce8e3c6f3?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1700805810965-bfea8f8109ad?auto=format&fit=crop&w=1200&q=85",
  ],
  "apple-iphone-13-pro-128gb": [
    "https://images.unsplash.com/photo-1695578130342-991b58f1ecb8?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1652721367098-0ecad4cc0370?auto=format&fit=crop&w=1200&q=85",
  ],
};

const relatedGalleryCategories: Record<string, string[]> = {
  "Office": ["PCs", "Monitors", "Everyday Essentials"],
  "PCs": ["Monitors", "Office", "Mobile Accessories"],
  "Everyday Essentials": ["Fashion & Footwear", "Grooming", "Office"],
  "Phones": ["Mobile Accessories", "PCs"],
  "Audio": ["Mobile Accessories", "PCs"],
  "Monitors": ["PCs", "Office"],
  "Keyboards": ["PCs", "Office"],
  "Grooming": ["Everyday Essentials", "Fashion & Footwear"],
  "Fashion & Footwear": ["Everyday Essentials", "Grooming"],
  "Mobile Accessories": ["Phones", "PCs", "Audio"],
};

/**
 * The catalogue currently stores one primary image for most sample products.
 * For demo entries, use additional same-category catalogue images as clearly
 * illustrative gallery references. The two non-demo iPhone listings use
 * model-specific photographs rather than unrelated category images.
 */
function getProductGalleryImages(product: Product): string[] {
  const modelSpecific = specificPhoneGalleries[product.slug];
  if (modelSpecific) {
    return [product.image, ...modelSpecific].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index).slice(0, 3);
  }

  const catalog = getProducts();
  const categoryOrder = [product.category, ...(relatedGalleryCategories[product.category] ?? [] )];
  const candidateUrls: string[] = [product.image];

  for (const category of categoryOrder) {
    for (const candidate of catalog) {
      if (candidate.category === category && candidate.slug !== product.slug) {
        candidateUrls.push(candidate.image);
      }
    }
  }
  // As a final fallback, use other unique catalogue images so every detail
  // page has a usable three-slide gallery even when a category is small.
  candidateUrls.push(...catalog.filter((candidate) => candidate.slug !== product.slug).map((candidate) => candidate.image));
  return candidateUrls.filter((url, index, all) => Boolean(url) && all.indexOf(url) === index).slice(0, 3);
}

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const productBadges = getProductBadges(product);

  return (
    <main className="pw-page-enter mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="mb-6 text-sm text-slate-500"><Link href="/products" className="hover:text-indigo-600">Products</Link> / {product.title}</div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <ProductImageGallery
          productTitle={product.title}
          images={getProductGalleryImages(product)}
          isIllustrative={Boolean(product.isDemoData)}
        />

        <div>
          <div className="flex flex-wrap gap-2">
            {productBadges.map((badge) => <span key={badge} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{badge}</span>)}
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[.18em] text-slate-500">{product.brand} · {product.category}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{product.title}</h1>
          <div className="mt-4 flex items-center gap-2">{(!product.isDemoData && product.reviewCount > 0) ? <><Star size={18} fill="currentColor"/> <strong>{product.rating}</strong><span className="text-slate-500">({product.reviewCount.toLocaleString()} ratings)</span></> : <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Demo listing — no verified rating</span>}</div>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{product.description}</p>
          {product.isDemoData && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">Demo catalog entry: price, specifications, and images are illustrative. Verify all product details before publishing.</p>}

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black">{formatINR(product.price)}</span>
              <span className="pb-1 text-slate-400 line-through">{formatINR(product.originalPrice)}</span>
            </div>
            <p className="mt-1 text-sm text-emerald-600">{product.isDemoData ? "Illustrative sample price—not a live Amazon price." : "Converted from the supplied AED listing; not a verified Indian retail price. Check seller and final checkout price."}</p>
            <Link
              href={getProductAffiliateUrl(product)}
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

      <PriceHistoryPanel product={product} />

      <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">PickWise buying guide</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Detailed review: strengths & trade-offs</h2>
            <p className="mt-2 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">{product.review?.summary ?? product.description}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle size={15}/> Spec-based, not hands-on</span>
        </div>

        {product.isDemoData && <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={18}/><p><strong>Important:</strong> this product is currently a demo/sample entry. The review below interprets the specifications shown on this page; it is not a physical test or a verified claim about a real retail model. Missing features—especially water resistance, durability, camera quality, battery life or safety ratings—must not be assumed.</p></div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[.035]">
            <h3 className="font-black">Who may like it</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.review?.bestFor ?? "Check the specifications against your needs."}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[.035]">
            <h3 className="font-black">Who should be careful</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.review?.notIdealFor ?? "Verify important requirements before buying."}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200/80 p-5 dark:border-emerald-400/20">
            <h3 className="flex items-center gap-2 text-lg font-black"><Check className="text-emerald-600 dark:text-emerald-400" size={20}/> What looks good on paper</h3>
            <ul className="mt-4 space-y-3">{(product.review?.strengths ?? product.pros).map((x) => <li key={x} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"><Check className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" size={16}/><span>{x}</span></li>)}</ul>
          </div>
          <div className="rounded-2xl border border-rose-200/80 p-5 dark:border-rose-400/20">
            <h3 className="flex items-center gap-2 text-lg font-black"><X className="text-rose-600 dark:text-rose-400" size={20}/> Limitations & risks to consider</h3>
            <ul className="mt-4 space-y-3">{(product.review?.limitations ?? product.cons).map((x) => <li key={x} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"><X className="mt-1 shrink-0 text-rose-600 dark:text-rose-400" size={16}/><span>{x}</span></li>)}</ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-5 dark:border-indigo-400/20 dark:bg-indigo-500/[.07]">
          <h3 className="flex items-center gap-2 text-lg font-black"><ClipboardCheck className="text-indigo-600 dark:text-indigo-300" size={20}/> Check before you buy</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(product.review?.verifyBeforeBuying ?? ["Verify the exact model and specifications.", "Check the retailer's return policy and warranty.", "Confirm current price and compatibility."]).map((x) => <li key={x} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-600 text-[10px] font-black text-white">✓</span><span>{x}</span></li>)}</ul>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5 sm:p-8">
        <h2 className="text-2xl font-black">Key specifications</h2>
        <div className="mt-5 grid gap-x-8 divide-y divide-slate-200 dark:divide-white/10 sm:grid-cols-2 sm:divide-y-0">
          {Object.entries(product.specs).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-5 border-b border-slate-200 py-3 text-sm dark:border-white/10">
              <span className="font-semibold text-slate-500">{key}</span><span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-indigo-200 bg-indigo-50/60 p-6 dark:border-indigo-400/20 dark:bg-indigo-500/[.07] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">Free smart buying assistant</p>
        <h2 className="mt-2 text-2xl font-black">Want a quick product analysis?</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Generate an instant, free analysis from the product specifications already in PickWise. The rules highlight strengths, limitations and details to verify without a paid API or an invented test result.</p>
        <AIReviewButton product={product} />
        <p className="mt-3 text-xs text-slate-500">Runs locally in your browser using catalogue data. No API key, account credits or per-review charges are required.</p>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-100 p-7 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-2xl font-black">Video review</h2>
        <div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-slate-300">
          YouTube review placeholder
        </div>
      </section>
    </main>
  );
}