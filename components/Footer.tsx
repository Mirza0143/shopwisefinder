import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="text-xl font-black">Pick<span className="text-indigo-600">Wise</span></div>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
            Independent product recommendations, comparisons and buying guides.
          </p>
        </div>
        <div>
          <h4 className="font-bold">Explore</h4>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/products">Products</Link>
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/compare">Compare</Link>
          </div>
        </div>
        <div>
          <h4 className="font-bold">Legal</h4>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/affiliate-disclosure">Affiliate Disclosure</Link>
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/privacy">Privacy</Link>
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/terms">Terms</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500 dark:border-white/10">
        As an Amazon Associate, I earn from qualifying purchases.
      </div>
    </footer>
  );
}