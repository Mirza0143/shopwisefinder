import type { Metadata } from "next";
import CuratedBundles from "@/components/CuratedBundles";
import { getPublishedBundles } from "@/lib/bundle-catalog";

export const metadata: Metadata = {
  title: "Curated Setup Bundles & Kits | ShopWiseFinder",
  description: "Explore mobile-gaming, desktop-gaming, style, workstation, and everyday-essential kits on ShopWiseFinder.",
};

export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  const bundles = await getPublishedBundles();
  return <main className="min-h-screen"><CuratedBundles bundles={bundles} /></main>;
}
