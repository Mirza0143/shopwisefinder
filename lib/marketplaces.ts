import type { Product, ProductProvider } from "@/types/product";

export const MARKETPLACES: Array<{ value: ProductProvider; label: string; domain: string; color: string }> = [
  { value: "amazon", label: "Amazon India", domain: "amazon.in", color: "#f59e0b" },
  { value: "flipkart", label: "Flipkart", domain: "flipkart.com", color: "#2563eb" },
  { value: "myntra", label: "Myntra", domain: "myntra.com", color: "#db2777" },
  { value: "meesho", label: "Meesho", domain: "meesho.com", color: "#c026d3" },
  { value: "shopsy", label: "Shopsy", domain: "shopsy.in", color: "#ea580c" },
  { value: "ajio", label: "AJIO", domain: "ajio.com", color: "#111827" },
  { value: "other", label: "Other provider", domain: "", color: "#64748b" },
];

export function normalizeProvider(value: unknown): ProductProvider | null {
  const key = String(value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (["amazon", "amazonindia", "amazonin"].includes(key)) return "amazon";
  if (key === "flipkart") return "flipkart";
  if (key === "myntra") return "myntra";
  if (key === "meesho") return "meesho";
  if (key === "shopsy") return "shopsy";
  if (key === "ajio") return "ajio";
  if (key === "other" || key === "otherprovider") return "other";
  return null;
}

function hostOf(value: string | undefined | null): string {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); }
  catch { return ""; }
}

export function inferProviderFromUrl(value: string | undefined | null): ProductProvider {
  const host = hostOf(value);
  if (host === "amazon.in" || host.endsWith(".amazon.in") || ["amzn.to", "amzn.in", "a.co", "link.amazon"].includes(host) || host.endsWith(".link.amazon")) return "amazon";
  if (host === "flipkart.com" || host.endsWith(".flipkart.com") || host === "fkrt.it") return "flipkart";
  if (host === "myntra.com" || host.endsWith(".myntra.com")) return "myntra";
  if (host === "meesho.com" || host.endsWith(".meesho.com")) return "meesho";
  if (host === "shopsy.in" || host.endsWith(".shopsy.in")) return "shopsy";
  if (host === "ajio.com" || host.endsWith(".ajio.com")) return "ajio";
  return "other";
}

export function getProductProvider(product: Pick<Product, "provider" | "providerUrl" | "affiliateUrl" | "amazonUrl">): ProductProvider {
  const explicit = normalizeProvider(product.provider);
  if (explicit) return explicit;
  const url = product.providerUrl || product.amazonUrl || product.affiliateUrl;
  return url ? inferProviderFromUrl(url) : "amazon";
}

export function getProviderLabel(provider: ProductProvider | string | undefined | null): string {
  const normalized = normalizeProvider(provider) || "amazon";
  return MARKETPLACES.find((item) => item.value === normalized)?.label || "Amazon India";
}

export function getProviderDomain(provider: ProductProvider | string | undefined | null): string {
  const normalized = normalizeProvider(provider) || "amazon";
  return MARKETPLACES.find((item) => item.value === normalized)?.domain || "amazon.in";
}

export function isProviderProductUrl(providerValue: unknown, rawUrl: string): boolean {
  const provider = normalizeProvider(providerValue);
  if (!provider) return false;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (provider === "other") return true;
  switch (provider) {
    case "amazon": return host === "amazon.in" || host.endsWith(".amazon.in") || ["amzn.to", "amzn.in", "a.co", "link.amazon"].includes(host) || host.endsWith(".link.amazon");
    case "flipkart": return host === "flipkart.com" || host.endsWith(".flipkart.com") || host === "fkrt.it";
    case "myntra": return host === "myntra.com" || host.endsWith(".myntra.com");
    case "meesho": return host === "meesho.com" || host.endsWith(".meesho.com");
    case "shopsy": return host === "shopsy.in" || host.endsWith(".shopsy.in");
    case "ajio": return host === "ajio.com" || host.endsWith(".ajio.com");
  }
}

export function isAllowedAffiliateUrl(rawUrl: string, providerValue: unknown): boolean {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  // Cuelinks tracking domains and its clnk.in short links.
  if (host === "linksredirect.com" || host.endsWith(".linksredirect.com") || host === "clnk.in" || host.endsWith(".clnk.in") || host === "cuelinks.com" || host.endsWith(".cuelinks.com")) return true;

  const provider = normalizeProvider(providerValue);
  // Preserve Amazon Associates links only when they carry an Amazon tracking tag,
  // or are recognized Amazon short links; a plain product URL is not an affiliate link.
  if (provider === "amazon") {
    if (["amzn.to", "amzn.in", "a.co", "link.amazon"].includes(host) || host.endsWith(".link.amazon")) return true;
    if ((host === "amazon.in" || host.endsWith(".amazon.in")) && url.searchParams.has("tag")) return true;
  }
  // Flipkart's canonical short-link host may be used for a tracked URL.
  if (provider === "flipkart" && host === "fkrt.it") return true;
  return false;
}
