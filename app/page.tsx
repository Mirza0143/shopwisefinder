import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles, Zap, Smartphone, Shirt, Headphones, PackageCheck, ArrowUpRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CuratedBundles from "@/components/CuratedBundles";
import { formatINR } from "@/lib/products";
import { getPublishedCatalog } from "@/lib/product-catalog";
import { getPublishedBundles } from "@/lib/bundle-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getPublishedCatalog();
  const publishedBundles = await getPublishedBundles();
  const findProduct = (slug: string) => catalog.find((product) => product.slug === slug);
  const spotlight = [
    findProduct("arcticclip-mobile-phone-cooler"),
    findProduct("strideknit-everyday-sneakers"),
    findProduct("scentcraft-citrus-eau-de-parfum"),
  ].filter((product): product is NonNullable<typeof product> => product !== undefined);
  const featuredCatalog = catalog.filter((product) => product.featured || Number(product.displayOrder) > 0).sort((a, b) => {
    const ao = Number(a.displayOrder) > 0 ? Number(a.displayOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number(b.displayOrder) > 0 ? Number(b.displayOrder) : Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  const featured = Array.from(new Map([...featuredCatalog, ...spotlight].map((product) => [product.slug, product] as const)).values());
  const trending = [
    findProduct("volt-pocket-20000mah-power-bank"),
    findProduct("soundloop-usbc-wired-earbuds"),
  ].filter((product): product is NonNullable<typeof product> => product !== undefined);

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
              <Link href="/bundles" className="rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-3.5 font-bold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                Explore bundles
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

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16" aria-labelledby="shop-by-need-heading">
        <div className="pw-enter mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-300"><Sparkles size={14}/> Explore by need</p>
            <h2 id="shop-by-need-heading" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">What are you shopping for?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Start with the job to be done—then shortlist useful items without opening dozens of tabs.</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 self-start text-sm font-extrabold text-indigo-600 transition hover:gap-2 dark:text-indigo-300 sm:self-auto">Explore all picks <ArrowRight size={16}/></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Mobile gaming", subtitle: "Coolers, power banks, connectors & grip tools", category: "Mobile Accessories", icon: Smartphone, image: "photo-1511709191319-5864cf11b8b5", tint: "from-violet-500/20" },
            { title: "Style & footwear", subtitle: "Outfit basics, sneakers, slides, socks & carry", category: "Fashion & Footwear", icon: Shirt, image: "photo-1542291026-7eec264c27ff", tint: "from-rose-500/20" },
            { title: "Everyday essentials", subtitle: "Cables, hubs, adapters & compact useful tools", category: "Everyday Essentials", icon: PackageCheck, image: "photo-1498050108023-c5249f4df085", tint: "from-amber-500/20" },
            { title: "Audio & listening", subtitle: "Headphones, earbuds and wired audio picks", category: "Audio", icon: Headphones, image: "photo-1505740420928-5e560c06d30e", tint: "from-sky-500/20" },
          ].map((item, index) => (
            <Link
              key={item.category}
              href={`/products?category=${encodeURIComponent(item.category)}`}
              className="pw-enter group relative isolate min-h-52 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[.04] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-900/10 dark:border-white/10 dark:bg-white/[.04]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <img src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=800&q=82`} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${item.tint} via-slate-950/50 to-slate-950/90 transition-opacity duration-300 group-hover:opacity-95`}/>
              <div className="flex min-h-52 flex-col justify-between p-5 text-white sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-md"><item.icon size={21}/></span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 transition duration-200 group-hover:translate-x-1 group-hover:bg-white/20"><ArrowUpRight size={17}/></span>
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                  <p className="mt-1 max-w-xs text-sm leading-5 text-white/80">{item.subtitle}</p>
                </div>
              </div>
            </Link>
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
              <div key={product.id} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-white/[.07]">
                <div className="flex items-center gap-4">
                  <img src={product.image} alt="" loading="lazy" decoding="async" className="h-20 w-20 rounded-xl object-cover transition duration-300 group-hover:scale-105"/>
                  <div><div className="font-bold">{product.title}</div><div className="mt-1 text-sm text-slate-400">Illustrative price · Est. {formatINR(product.price)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CuratedBundles compact bundles={publishedBundles} />

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