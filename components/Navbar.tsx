"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Moon, Sun, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

const linkClass = "rounded-lg px-2.5 py-2 text-sm font-bold text-slate-600 transition duration-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300";

const navItems = [
  { href: "/products", label: "Products" },
  { href: "/products?category=Mobile%20Accessories", label: "Mobile Gear" },
  { href: "/products?category=Fashion%20%26%20Footwear", label: "Style" },
  { href: "/products?category=Grooming", label: "Grooming" },
  { href: "/bundles", label: "Bundles", special: true },
  { href: "/compare", label: "Compare" },
];

export default function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-sm shadow-slate-900/[.025] backdrop-blur-sm transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/85">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-5 lg:px-8">
        <Link href="/" aria-label="PickWise home" className="shrink-0 rounded-lg text-xl font-black tracking-tight text-slate-950 transition duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white" onClick={() => setMobileOpen(false)}>
          Pick<span className="text-indigo-600">Wise</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href + item.label} href={item.href} prefetch onMouseEnter={() => router.prefetch(item.href)} onFocus={() => router.prefetch(item.href)} className={`${linkClass} ${"special" in item && item.special ? "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" : ""}`}>
              {"special" in item && item.special && <Sparkles size={13} className="mr-1 inline" />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link href="/products" aria-label="Search and browse products" className="rounded-xl p-2.5 text-slate-700 transition duration-200 hover:rotate-[-5deg] hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/10">
            <Search size={19} />
          </Link>
          <button type="button" aria-label="Toggle theme" onClick={() => document.documentElement.classList.toggle("dark")} className="rounded-xl p-2.5 text-slate-700 transition duration-200 hover:rotate-[-12deg] hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
            <Sun className="hidden dark:block" size={19} />
            <Moon className="dark:hidden" size={19} />
          </button>
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="rounded-xl p-2.5 transition hover:bg-slate-100 dark:hover:bg-white/10 xl:hidden">
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/95 xl:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navItems.map((item) => (
              <Link key={item.href + item.label} href={item.href} prefetch onMouseEnter={() => router.prefetch(item.href)} onFocus={() => router.prefetch(item.href)} onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold transition hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300">
                <span>{item.label}</span><span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
