"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SitePreloader from "@/components/SitePreloader";
import QuickCompareProvider from "@/components/QuickCompareProvider";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import BannerPopup from "@/components/BannerPopup";
import FloatingTelegramSupport from "@/components/FloatingTelegramSupport";
import { SupportLinksProvider } from "@/components/SupportLinksProvider";

/** Keep the private admin workspace visually separate from public site navigation. */
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return (
    <SupportLinksProvider>
      <SitePreloader />
      <Navbar />
      <QuickCompareProvider>{children}<AnalyticsTracker /><BannerPopup /></QuickCompareProvider>
      <Footer />
      <FloatingTelegramSupport />
    </SupportLinksProvider>
  );
}
