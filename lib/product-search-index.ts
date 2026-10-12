import type { Product } from "@/types/product";
import { normalizeSearchText } from "./search";

/** Include user-facing fields, numeric price forms, editorial details and price history. */
export function buildProductSearchIndex(product: Product): string {
  const review = product.review;
  const priceHistory = (product.priceHistory?.observations || []).flatMap((observation) => [
    String(observation.price),
    Number.isFinite(observation.price) ? observation.price.toLocaleString("en-IN") : "",
    observation.date,
    observation.source,
  ]);
  const values = [
    product.id, product.slug, product.title, product.brand, product.category,
    product.description, product.price, product.price.toLocaleString("en-IN"),
    product.originalPrice, product.originalPrice.toLocaleString("en-IN"),
    product.currency, product.rating, product.reviewCount,
    ...(product.pros || []), ...(product.cons || []), ...(product.badges || []),
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [key, String(value)]),
    review?.summary || "", review?.bestFor || "", review?.notIdealFor || "",
    ...(review?.strengths || []), ...(review?.limitations || []), ...(review?.verifyBeforeBuying || []),
    product.priceHistory?.lastMonthPrice ?? "",
    product.priceHistory?.avg30DayPrice ?? "",
    product.priceHistory?.source || "",
    ...priceHistory,
  ];
  return normalizeSearchText(values.map((value) => String(value ?? "")).join(" "));
}
