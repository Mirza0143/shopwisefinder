import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return NextResponse.redirect(new URL("/products", _request.url));
  }

  // Production upgrade:
  // 1. Record the click in Supabase.
  // 2. Build/validate the marketplace-specific affiliate URL.
  // 3. Redirect to the approved Amazon Associates URL.
  return NextResponse.redirect(product.amazonUrl);
}