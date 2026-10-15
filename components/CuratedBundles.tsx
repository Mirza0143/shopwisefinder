import Link from "next/link";
import { ArrowUpRight, BadgeCheck, PackageCheck, Sparkles } from "lucide-react";
import { curatedBundles, getBundleItemUrl, getBundleUrl, type CuratedBundle } from "@/data/bundles";
import { formatINR } from "@/lib/products";

function money(value: number, _currency = "INR") {
  return formatINR(value);
}

const categoryMeta: Record<CuratedBundle["category"], { eyebrow: string; tag: string; accent: string }> = {
  "mobile-gaming": { eyebrow: "MOBILE GAMING", tag: "PHONE POWER KIT", accent: "from-violet-500/15 via-indigo-500/5 to-transparent" },
  gaming: { eyebrow: "PLAY & CREATE", tag: "DESKTOP SETUP", accent: "from-indigo-500/15 via-sky-500/5 to-transparent" },
  fashion: { eyebrow: "STYLE EDIT", tag: "OUTFIT BUILDER", accent: "from-rose-500/15 via-orange-500/5 to-transparent" },
  desk: { eyebrow: "WORK BETTER", tag: "WORKSTATION", accent: "from-cyan-500/15 via-emerald-500/5 to-transparent" },
  everyday: { eyebrow: "EVERYDAY CARRY", tag: "SMALL ESSENTIALS", accent: "from-amber-500/15 via-orange-500/5 to-transparent" },
};

function BundleCard({ bundle, index }: { bundle: CuratedBundle; index: number }) {
  const estimate = bundle.bundle_items.reduce((sum, item) => sum + item.estimated_price, 0);
  const meta = categoryMeta[bundle.category];

  return (
    <article
      id={bundle.id}
      className="pw-enter group relative isolate overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-900/[.045] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-900/[.09] dark:border-white/10 dark:bg-white/[.045] sm:p-6"
      style={{ animationDelay: `${index * 85}ms` }}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b ${meta.accent}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-[11px] font-black tracking-[.15em] text-indigo-700 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-indigo-300">
          <Sparkles size={13} /> {meta.eyebrow}
        </span>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
          {bundle.bundle_items.length} picks
        </span>
      </div>

      <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">{bundle.title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">{bundle.description}</p>

      <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3 rounded-2xl border border-indigo-100/90 bg-indigo-50/75 p-4 dark:border-indigo-400/15 dark:bg-indigo-500/[.08]">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Estimated component budget</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{money(estimate, bundle.currency)}</div>
        </div>
        <span className="mb-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">Estimate</span>
        <p className="col-span-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Planning estimate only—not a live or verified Amazon price. Retail prices and availability can change.
        </p>
      </div>

      <a
        href={getBundleUrl(bundle)}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-xl active:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        <span>Find these picks on Amazon</span><ArrowUpRight size={18} />
      </a>
      <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Opens an Amazon search; it does not add all components to one cart.</p>

      <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
        <span className="text-xs font-black uppercase tracking-[.14em] text-slate-500 dark:text-slate-400">{meta.tag}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><PackageCheck size={14} /> Component list</span>
      </div>

      <ul className="divide-y divide-slate-200/90 dark:divide-white/10">
        {bundle.bundle_items.map((product) => (
          <li key={product.id} className="group/item flex items-center gap-3 py-3 transition-colors hover:bg-indigo-50/50 dark:hover:bg-white/[.025]">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-[68px] w-[72px] shrink-0 rounded-xl border border-slate-200/90 bg-white object-cover shadow-sm transition duration-300 group-hover/item:scale-[1.03] dark:border-white/10 dark:bg-slate-900"
            />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-bold leading-5 text-slate-900 dark:text-white">{product.name}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{product.role}</span>
              <span className="mt-1 block text-sm font-black text-slate-950 dark:text-white">Est. {money(product.estimated_price, product.currency)}</span>
              <Link href={product.reviewSlug ? `/products/${product.reviewSlug}` : `/products?q=${encodeURIComponent(product.name)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 transition hover:gap-1.5 hover:underline dark:text-indigo-300">
                {product.reviewSlug ? "Read PickWise review" : "Explore similar picks"} <ArrowUpRight size={12}/>
              </Link>
            </div>
            <a
              href={getBundleItemUrl(product)}
              target="_blank"
              rel="sponsored nofollow noopener"
              aria-label={`Find ${product.name} on Amazon`}
              className="inline-flex max-w-[92px] shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-right text-xs font-black text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
            >
              Buy pick <ArrowUpRight size={13} />
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        <BadgeCheck className="mt-0.5 shrink-0 text-indigo-500" size={14} />
        As an Amazon Associate, PickWise may earn from qualifying purchases. Product images and estimates are illustrative; verify the exact listing before publishing.
      </p>
    </article>
  );
}

function BundlePreview({ bundle, index }: { bundle: CuratedBundle; index: number }) {
  const estimate = bundle.bundle_items.reduce((sum, item) => sum + item.estimated_price, 0);
  const meta = categoryMeta[bundle.category];
  return (
    <article className="pw-enter group overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/[.04] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-900/[.09] dark:border-white/10 dark:bg-white/[.04]" style={{ animationDelay: `${index * 65}ms` }}>
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-900 sm:h-44">
        <img src={bundle.bundle_items[0]?.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-[10px] font-black tracking-[.14em] text-white backdrop-blur">{meta.eyebrow}</span>
        <div className="absolute bottom-4 left-4 flex -space-x-2">
          {bundle.bundle_items.slice(1, 4).map((item) => <img key={item.id} src={item.image} alt="" loading="lazy" decoding="async" className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-md" />)}
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-black text-white shadow-md">+{Math.max(0, bundle.bundle_items.length - 3)}</span>
        </div>
        <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900">{bundle.bundle_items.length} picks</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{bundle.title}</h3>
        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">{bundle.description}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <div><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Est. component budget</span><span className="mt-0.5 block text-xl font-black">{money(estimate, bundle.currency)}</span></div>
          <Link href={`/bundles#${bundle.id}`} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 active:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-400">View kit <ArrowUpRight size={14}/></Link>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">Planning estimate only; verify product prices at the retailer.</p>
      </div>
    </article>
  );
}

export default function CuratedBundles({ compact = false, bundles = curatedBundles }: { compact?: boolean; bundles?: CuratedBundle[] }) {
  if (compact) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16" aria-labelledby="bundles-preview-heading">
        <header className="pw-enter mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-black tracking-[.2em] text-indigo-600 dark:text-indigo-300"><Sparkles size={14}/> THE PICKWISE EDIT</span>
            <h2 id="bundles-preview-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Bundles built around your routine</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">From mobile-gaming gear to outfit basics and everyday tech—start with a curated shortlist.</p>
          </div>
          <Link href="/bundles" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:self-auto">Explore all bundles <ArrowUpRight size={16}/></Link>
        </header>
        <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {bundles.map((bundle, index) => <BundlePreview key={bundle.id} bundle={bundle} index={index} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16" aria-labelledby="bundles-heading">
      <header className="pw-enter mb-9 flex flex-col gap-5 border-b border-slate-200/80 pb-8 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black tracking-[.2em] text-indigo-600 dark:text-indigo-300"><Sparkles size={14} /> THE PICKWISE EDIT</span>
          <h1 id="bundles-heading" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">Curated bundles & kits</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">Built around real routines—from mobile gaming sessions to everyday outfits and tidy workspaces.</p>
        </div>
        <Link href="/products" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-white sm:self-auto">Browse all products <ArrowUpRight size={16} /></Link>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {bundles.map((bundle, index) => <BundleCard key={bundle.id} bundle={bundle} index={index} />)}
      </div>
    </section>
  );
}
