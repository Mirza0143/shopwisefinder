import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-5 py-24 text-center">
    <h1 className="text-6xl font-black">404</h1>
    <p className="mt-4 text-slate-500">The page you're looking for doesn't exist.</p>
    <Link href="/" className="mt-7 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Back home</Link>
  </main>;
}