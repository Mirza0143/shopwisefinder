import { NextResponse } from "next/server";
import { getPublishedCatalog } from "@/lib/product-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const products = await getPublishedCatalog();
  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
