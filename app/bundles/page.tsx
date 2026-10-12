import type { Metadata } from "next";
import CuratedBundles from "@/components/CuratedBundles";

export const metadata: Metadata = {
  title: "Curated Setup Bundles & Kits | PickWise",
  description: "Explore mobile-gaming, desktop-gaming, style, workstation, and everyday-essential kits on PickWise.",
};

export default function BundlesPage() { return <main className="min-h-screen"><CuratedBundles /></main>; }
