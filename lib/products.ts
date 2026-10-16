import products from "@/data/products.json";
import type { Product } from "@/types/product";
import { getProductProvider } from "@/lib/marketplaces";

const items = products as unknown as Product[];
export function getProducts() { return items; }
export function getProductBySlug(slug: string) { return items.find((product) => product.slug === slug); }
export function getFeaturedProducts() { return items.filter((product) => product.featured); }
export function getTrendingProducts() { return items.filter((product) => product.trending); }

/** A transparent, rules-based phone score. It only compares products in the same category. */
function phoneScore(product: Product) {
  const specs = Object.entries(product.specs || {}).reduce<Record<string, string>>((acc, [k, v]) => { acc[k.toLowerCase()] = String(v).toLowerCase(); return acc; }, {});
  const all = Object.values(specs).join(" ");
  let score = 0;
  if (/a17 pro|a18|a19|snapdragon 8 elite|snapdragon 8 gen 3/.test(all)) score += 40;
  else if (/a16 bionic|snapdragon 8 gen 2|dimensity 9300/.test(all)) score += 34;
  else if (/a15 bionic|snapdragon 8 gen 1|dimensity 9000/.test(all)) score += 28;
  else if (/a14 bionic|snapdragon 7|dimensity 8000/.test(all)) score += 20;
  const refresh = all.match(/(\d{2,3})\s*hz/);
  if (refresh) score += Math.min(15, Number(refresh[1]) / 8);
  if (/oled|amoled/.test(all)) score += 8;
  if (/ip68/.test(all)) score += 6; else if (/ip67/.test(all)) score += 4;
  const ram = all.match(/(?:ram[^\d]{0,10}|)(\d{1,2})\s*gb/);
  if (ram) score += Math.min(10, Number(ram[1]));
  const storage = all.match(/storage[^\d]{0,12}(\d{2,4})\s*gb/);
  if (storage) score += Math.min(8, Number(storage[1]) / 64);
  return score;
}
export function getProductBadges(product: Product, catalog: Product[] = items) {
  const base = (product.badges || []).filter((b) => !["Best Overall", "Best Value"].includes(b));
  const isPhone = (item: Product) => ["Phones", "Smartphones"].includes(item.category);
  if (!isPhone(product)) return product.badges || [];
  // Demo phones are useful for testing layouts, but should not decide real-product rankings.
  const phones = catalog.filter((item) => isPhone(item) && !item.isDemoData);
  if (phones.length < 2) return base;
  const ranked = [...phones].sort((a, b) => phoneScore(b) - phoneScore(a));
  const overall = ranked[0];
  const value = [...phones].sort((a, b) => (phoneScore(b) / Math.max(1, b.price)) - (phoneScore(a) / Math.max(1, a.price)))[0];
  const dynamic: string[] = [];
  if (product.slug === overall.slug) dynamic.push("Best Overall");
  if (product.slug === value.slug && product.slug !== overall.slug) dynamic.push("Best Value");
  return [...dynamic, ...base].slice(0, 2);
}

export function formatINR(value: number | null | undefined, compact = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Price unavailable";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: value >= 1000 ? 0 : 2, notation: compact ? "compact" : "standard" }).format(value); }
  catch { return `₹${Math.round(value).toLocaleString("en-IN")}`; }
}
export function getAmazonSearchUrl(query: string) {
  const domain = process.env.NEXT_PUBLIC_AMAZON_DOMAIN?.trim() || "www.amazon.in";
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
  const params = new URLSearchParams({ k: query }); if (tag) params.set("tag", tag);
  return `https://${domain}/s?${params.toString()}`;
}
export function getProductAffiliateUrl(product: Product) {
  // New multi-marketplace records use affiliateUrl; amazonUrl remains a legacy fallback.
  for (const candidate of [product.affiliateUrl, product.amazonUrl]) {
    if (!candidate) continue;
    try { const parsed = new URL(candidate); if (parsed.protocol === "https:" && parsed.hostname) return parsed.toString(); }
    catch { /* invalid legacy URL falls through to the safe marketplace fallback */ }
  }
  const provider = getProductProvider(product);
  if (provider === "amazon") return getAmazonSearchUrl(`${product.brand} ${product.title}`.trim());
  // Published non-Amazon products should have a tracked URL; this is a defensive fallback for older draft data.
  if (product.providerUrl) {
    try { const parsed = new URL(product.providerUrl); if (parsed.protocol === "https:") return parsed.toString(); }
    catch { /* continue to marketplace fallback */ }
  }
  return `https://${({ flipkart: "www.flipkart.com", myntra: "www.myntra.com", meesho: "www.meesho.com", shopsy: "www.shopsy.in", ajio: "www.ajio.com", other: "www.amazon.in", amazon: "www.amazon.in" } as const)[provider]}/`;
}
