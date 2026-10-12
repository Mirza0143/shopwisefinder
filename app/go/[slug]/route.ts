import { NextResponse } from "next/server";
import { getProductBySlug, getProductAffiliateUrl } from "@/lib/products";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return NextResponse.redirect(new URL("/products", request.url));
  return NextResponse.redirect(getProductAffiliateUrl(product));
}
