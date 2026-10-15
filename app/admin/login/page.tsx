import type { Metadata } from "next";
import AdminLoginForm from "@/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin sign in | ShopWiseFinder",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950 sm:p-8">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-lg font-black text-white">SW</div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Private workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Only the account configured by the site owner can manage products, images, categories and imports.</p>
        <AdminLoginForm />
        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-white/5 dark:text-slate-300">Admin access is separate from the public shopping site. Keep your admin password and environment values private.</p>
      </section>
    </main>
  );
}
