import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SitePreloader from "@/components/SitePreloader";
import QuickCompareProvider from "@/components/QuickCompareProvider";

export const metadata: Metadata = {
  title: {
    default: "PickWise – Useful Finds, Smart Comparisons",
    template: "%s | PickWise",
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
        <SitePreloader />
        <Navbar />
        <QuickCompareProvider>
          {children}
        </QuickCompareProvider>
        <Footer />
      </body>
    </html>
  );
}
