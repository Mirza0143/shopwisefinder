"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

type PublicBanner = {
  id: string; title: string; subtitle: string; message: string; image_url: string; link_url: string; button_label: string;
};

export default function BannerPopup() {
  const [banner, setBanner] = useState<PublicBanner | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/banners/active", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ banner: PublicBanner | null }> : { banner: null })
      .then((payload) => {
        if (!active || !payload.banner) return;
        let dismissed = false;
        try { dismissed = window.sessionStorage.getItem(`swf_banner_dismissed_${payload.banner.id}`) === "1"; } catch { /* private browsing may disable storage */ }
        if (dismissed) return;
        setBanner(payload.banner);
        setVisible(true);
        trackAnalyticsEvent("banner_view", { metadata: { bannerId: payload.banner.id } });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = oldOverflow; };
    // dismiss is stable for this banner id, and this listener only needs `visible` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, banner?.id]);

  function dismiss() {
    if (banner) {
      try { window.sessionStorage.setItem(`swf_banner_dismissed_${banner.id}`, "1"); } catch { /* do not block close */ }
    }
    setVisible(false);
  }

  if (!visible || !banner) return null;
  const safeLocalLink = banner.link_url.startsWith("/") && !banner.link_url.startsWith("//");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="welcome-banner-title" className="relative my-auto grid w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 md:grid-cols-2" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={dismiss} aria-label="Close welcome banner" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-900 shadow transition hover:rotate-90 hover:bg-slate-100 dark:border-white/20 dark:bg-slate-950/90 dark:text-white"><X size={18}/></button>
        <div className="relative flex min-h-56 items-center justify-center bg-slate-100 dark:bg-slate-900"><img src={banner.image_url} alt={banner.title} className="max-h-[55vh] w-full object-contain md:max-h-[560px]" /></div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          {banner.subtitle && <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">{banner.subtitle}</p>}
          <h2 id="welcome-banner-title" className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{banner.title}</h2>
          {banner.message && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{banner.message}</p>}
          <div className="mt-6 flex flex-col gap-2">
            {banner.link_url && <a href={banner.link_url} target={safeLocalLink ? undefined : "_blank"} rel={safeLocalLink ? undefined : "noopener noreferrer"} onClick={() => { dismiss(); trackAnalyticsEvent("banner_click", { linkUrl: banner.link_url, metadata: { bannerId: banner.id } }); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">{banner.button_label || "Explore products"}<ArrowUpRight size={16}/></a>}
            <button type="button" onClick={dismiss} className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">Not now</button>
          </div>
        </div>
      </section>
    </div>
  );
}
