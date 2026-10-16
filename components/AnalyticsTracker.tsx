"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

function tidyPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 300) : "/";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;
    trackAnalyticsEvent("page_view", { pagePath: tidyPath(pathname) });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.origin); } catch { return; }
      if (url.origin === window.location.origin && url.pathname.startsWith("/products/") && url.pathname !== "/products/") {
        const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
        trackAnalyticsEvent("review_click", { productSlug: slug, linkUrl: url.pathname });
        return;
      }
      if (url.origin === window.location.origin && url.pathname.startsWith("/go/")) {
        const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
        trackAnalyticsEvent("affiliate_click", { productSlug: slug, linkUrl: url.pathname, metadata: { linkText: (anchor.textContent || "Affiliate link").trim().slice(0, 100), provider: (anchor.dataset.provider || "unknown").slice(0, 40) } });
        return;
      }
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const affiliateHosts = ["amazon.in", "amzn.in", "amzn.to", "a.co", "link.amazon"];
      if (affiliateHosts.some((hostSuffix) => host === hostSuffix || host.endsWith(`.${hostSuffix}`))) {
        const productName = anchor.closest("article")?.querySelector("h2,h3")?.textContent?.trim();
        trackAnalyticsEvent("affiliate_click", {
          linkUrl: `${url.origin}${url.pathname}`,
          metadata: { linkText: (anchor.textContent || "Amazon link").trim().slice(0, 100), productName: (productName || "").slice(0, 160) },
        });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
