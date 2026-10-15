import { NextResponse } from "next/server";
import { getProductAffiliateUrl } from "@/lib/products";
import { getPublishedCatalog } from "@/lib/product-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getPublishedCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) return NextResponse.redirect(new URL("/products", request.url));
  const destination = getProductAffiliateUrl(product);
  return NextResponse.redirect(destination, { status: 302 });
}
