"use client";

import Link from "next/link";
import { Instagram, MessageCircle, Send } from "lucide-react";
import { useSupportLinks } from "@/components/SupportLinksProvider";

const supportLinkClass = "inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white";

export default function Footer() {
  const { telegramUrl, whatsappUrl, instagramUrl } = useSupportLinks();
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-5 lg:px-8">
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
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/products?category=Mobile%20Accessories">Mobile Gear</Link>
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/products?category=Fashion%20%26%20Footwear">Style & Footwear</Link>
            <Link className="block hover:text-slate-950 dark:hover:text-white" href="/bundles">Curated Bundles</Link>
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
        <div>
          <h4 className="font-bold">Contact & Support</h4>
          <p className="mt-2 text-xs leading-5 text-slate-500">Need help? Message our team.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {telegramUrl && <a className={supportLinkClass} href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Contact support on Telegram"><Send size={17} className="text-sky-500"/>Telegram</a>}
            {whatsappUrl && <a className={supportLinkClass} href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Contact support on WhatsApp"><MessageCircle size={17} className="text-emerald-600"/>WhatsApp</a>}
            {instagramUrl && <a className={supportLinkClass} href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Contact support on Instagram"><Instagram size={17} className="text-pink-500"/>Instagram</a>}
            {!telegramUrl && !whatsappUrl && !instagramUrl && <p className="text-xs leading-5 text-slate-500">Support contacts are being configured. Check back soon.</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500 dark:border-white/10">
        As an Amazon Associate, I earn from qualifying purchases.
      </div>
    </footer>
  );
}
