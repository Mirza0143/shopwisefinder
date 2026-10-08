import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles, Zap } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getFeaturedProducts, getTrendingProducts } from "@/lib/products";

export default function HomePage() {
  const featured = getFeaturedProducts();
  const trending = getTrendingProducts();

  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-indigo-700 shadow-sm dark:border-indigo-400/20 dark:bg-white/5 dark:text-indigo-300">
              <Sparkles size={14} /> Smarter buying decisions
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-.045em] sm:text-6xl lg:text-7xl">
              Find products worth buying.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                Skip the noise.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Clear recommendations, side-by-side comparisons and practical buying guides to help you choose with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-indigo-600">
                Explore products <ArrowRight size={18} />
              </Link>
              <Link href="/compare" className="rounded-2xl border border-slate-300 bg-white/70 px-6 py-3.5 font-bold dark:border-white/10 dark:bg-white/5">
                Compare options
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-indigo-500/20 to-violet-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/60 p-3 shadow-2xl backdrop-blur-xl dark:bg-white/5">
              <img
                src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1400&q=85"
                alt="Modern technology products"
                className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
              />
              <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/20 bg-slate-950/80 p-5 text-white backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300"><Zap size={14}/> Today's picks</div>
                <p className="mt-2 text-xl font-bold">Curated products. Less research. Better decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[.025]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:grid-cols-3 lg:px-8">
          {[
            ["Independent-first", "Recommendations built around useful product criteria."],
            ["Easy comparisons", "See important differences without opening ten tabs."],
            ["Transparent", "Clear affiliate disclosure and outbound buying links."]
          ].map(([title, text]) => (
            <div key={title} className="flex gap-3">
              <ShieldCheck className="mt-1 shrink-0 text-indigo-600" size={20}/>
              <div><div className="font-bold">{title}</div><div className="mt-1 text-sm text-slate-500">{text}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">Editor's selection</p><h2 className="mt-2 text-3xl font-black tracking-tight">Featured products</h2></div>
          <Link href="/products" className="hidden text-sm font-bold md:block">View all →</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-300">Trending now</p>
              <h2 className="mt-2 text-3xl font-black">Products people are exploring</h2>
              <p className="mt-3 max-w-xl text-slate-300">Discover popular picks and compare the features that matter.</p>
            </div>
            <Link href="/products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Browse picks <ArrowRight size={17}/></Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {trending.slice(0, 2).map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-4">
                  <img src={product.image} alt="" className="h-20 w-20 rounded-xl object-cover"/>
                  <div><div className="font-bold">{product.title}</div><div className="mt-1 text-sm text-slate-400">{product.rating} ★ · ${product.price.toFixed(2)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-8 dark:border-indigo-400/10 dark:bg-indigo-500/10 sm:p-12">
          <div className="flex items-start gap-4">
            <Check className="mt-1 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-black">As an Amazon Associate, I earn from qualifying purchases.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                This website may earn a commission when you purchase through qualifying affiliate links. Prices and availability can change, so verify current details on Amazon before purchasing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}