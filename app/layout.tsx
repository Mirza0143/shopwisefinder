import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: {
    default: "ShopWiseFinder – Useful Finds, Smart Comparisons",
    template: "%s | ShopWiseFinder",
  },
  description: "Discover practical product picks, mobile gaming accessories, everyday essentials, style kits and side-by-side comparisons.",
  keywords: [
    "product recommendations",
    "mobile gaming accessories",
    "everyday essentials",
    "product comparison",
    "curated bundles",
    "buying guides",
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
