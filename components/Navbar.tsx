"use client";
import Link from "next/link";
import { Search, Moon, Sun } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="text-xl font-black tracking-tight">
          Pick<span className="text-indigo-600">Wise</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/products" className="text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Products</Link>
          <Link href="/products?category=Audio" className="text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Audio</Link>
          <Link href="/products?category=Monitors" className="text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Monitors</Link>
          <Link href="/compare" className="text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Compare</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/products" aria-label="Search" className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-white/10">
            <Search size={19} />
          </Link>
          <button
            aria-label="Toggle theme"
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <Sun className="hidden dark:block" size={19} />
            <Moon className="dark:hidden" size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}