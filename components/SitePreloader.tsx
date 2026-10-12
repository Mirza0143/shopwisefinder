"use client";

import { useEffect, useState } from "react";

export default function SitePreloader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 180);
    const remove = window.setTimeout(() => setVisible(false), 650);
    return () => { window.clearTimeout(fade); window.clearTimeout(remove); };
  }, []);
  if (!visible) return null;
  return (
    <div aria-label="Loading PickWise" role="status" className={`fixed inset-0 z-[100] grid place-items-center bg-white transition-opacity duration-500 dark:bg-slate-950 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-indigo-600 text-2xl font-black text-white shadow-2xl shadow-indigo-600/30 animate-pulse">PW</div>
        <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Pick<span className="text-indigo-600">Wise</span></div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full w-2/3 rounded-full bg-indigo-600 animate-[pwload_0.8s_ease-in-out_infinite_alternate]" /></div>
      </div>
      <style jsx>{`@keyframes pwload { from { transform: translateX(-70%); } to { transform: translateX(70%); } }`}</style>
    </div>
  );
}
