"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type SupportLinks = { telegramUrl: string; whatsappUrl: string; instagramUrl: string };
const EMPTY_LINKS: SupportLinks = { telegramUrl: "", whatsappUrl: "", instagramUrl: "" };
const SupportLinksContext = createContext<SupportLinks>(EMPTY_LINKS);

export function SupportLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<SupportLinks>(EMPTY_LINKS);
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/support/links", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ links?: Partial<SupportLinks> }> : null)
      .then((payload) => {
        if (!active || !payload?.links) return;
        setLinks({
          telegramUrl: safeHttpUrl(payload.links.telegramUrl),
          whatsappUrl: safeHttpUrl(payload.links.whatsappUrl),
          instagramUrl: safeHttpUrl(payload.links.instagramUrl),
        });
      })
      .catch(() => undefined);
    return () => { active = false; controller.abort(); };
  }, [pathname]);
  const value = useMemo(() => links, [links]);
  return <SupportLinksContext.Provider value={value}>{children}</SupportLinksContext.Provider>;
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}

export function useSupportLinks() { return useContext(SupportLinksContext); }
