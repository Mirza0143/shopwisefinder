import type { Product } from "@/types/product";
import { extractAsin, normalizeSlug } from "@/lib/product-catalog";
import { getProviderLabel, inferProviderFromUrl, isAllowedAffiliateUrl, isProviderProductUrl, normalizeProvider } from "@/lib/marketplaces";

export type ProductSaveStatus = "draft" | "published";
export type ValidatedProductInput = { product: Product; status: ProductSaveStatus };

function stringValue(value: unknown, label: string, max = 500): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return text;
}

function parseHttpsUrl(value: unknown, label: string): string {
  const raw = stringValue(value, label, 2048);
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error(`${label} must be a full URL starting with https://.`); }
  if (url.protocol !== "https:") throw new Error(`${label} must use https://.`);
  if (url.username || url.password) throw new Error(`${label} must not contain embedded credentials.`);
  return url.toString();
}


function asStringArray(value: unknown, label: string): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 30);
  if (typeof value === "string") return value.split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
  if (value == null) return [];
  throw new Error(`${label} must be a list of lines.`);
}

function cleanSpecs(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
    return Object.fromEntries(entries.filter(([key, val]) => typeof val === "string" && key.trim()).map(([key, val]) => [key.trim().slice(0, 80), String(val).trim().slice(0, 250)]));
  }
  if (typeof value === "string" && value.trim()) {
    try { return cleanSpecs(JSON.parse(value)); } catch { throw new Error("Specifications must be valid JSON, e.g. {\"Battery\":\"5000 mAh\"}."); }
  }
  return {};
}


function cleanYouTubeUrl(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("Video URL must be a YouTube URL.");
  const raw = value.trim();
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Video URL must be a full YouTube URL."); }
  if (url.protocol !== "https:") throw new Error("Video URL must use HTTPS.");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = "";
  if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (/^\/(shorts|embed|live)\//.test(url.pathname)) videoId = url.pathname.split("/")[2] || "";
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("Use a valid YouTube watch, share, Shorts, or embed URL.");
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function validateProductInput(raw: Record<string, unknown>, defaultStatus: ProductSaveStatus = "draft", previous?: Product): ValidatedProductInput {
  const title = stringValue(raw.title, "Product name", 180);
  const brand = stringValue(raw.brand, "Brand", 100);
  const category = stringValue(raw.category, "Category", 80);
  const description = stringValue(raw.description, "Description", 3000);
  const existing = previous;
  const statusValue = raw.status === "published" ? "published" : raw.status === "draft" ? "draft" : defaultStatus;
  const candidateProviderUrl = [raw.providerUrl, raw.productUrl, raw.amazonUrl, existing?.providerUrl, existing?.amazonUrl, raw.affiliateUrl, existing?.affiliateUrl].find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const provider = normalizeProvider(raw.provider) || normalizeProvider(existing?.provider) || (candidateProviderUrl ? inferProviderFromUrl(candidateProviderUrl) : "amazon");
  const providerUrl = parseHttpsUrl(
    (typeof raw.providerUrl === "string" && raw.providerUrl.trim()) ||
      (typeof raw.productUrl === "string" && raw.productUrl.trim()) ||
      (typeof raw.amazonUrl === "string" && raw.amazonUrl.trim()) ||
      existing?.providerUrl || existing?.amazonUrl || existing?.affiliateUrl || "",
    `${getProviderLabel(provider)} product URL`,
  );
  if (!isProviderProductUrl(provider, providerUrl)) {
    throw new Error(`The product URL does not match the selected provider (${getProviderLabel(provider)}). Check the URL or change the provider.`);
  }
  const parsedProviderUrl = new URL(providerUrl);
  const normalizedHost = parsedProviderUrl.hostname.toLowerCase().replace(/^www\./, "");
  if (provider === "amazon" && (normalizedHost === "amazon.in" || normalizedHost.endsWith(".amazon.in")) && !/(?:^|\/)(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i.test(parsedProviderUrl.pathname)) {
    throw new Error("Use the specific Amazon.in product detail URL (usually /dp/ASIN), not a search or category page.");
  }
  const affiliateInput = typeof raw.affiliateUrl === "string"
    ? raw.affiliateUrl.trim()
    : provider === "amazon"
      ? (typeof raw.amazonUrl === "string" && raw.amazonUrl.trim() ? raw.amazonUrl.trim() : existing?.affiliateUrl || existing?.amazonUrl || "")
      : (existing?.affiliateUrl || "");
  const affiliateUrl = affiliateInput ? parseHttpsUrl(affiliateInput, "Affiliate tracking URL") : undefined;
  if (affiliateUrl && !isAllowedAffiliateUrl(affiliateUrl, provider)) {
    throw new Error("Affiliate link must be HTTPS and use the selected marketplace or a recognized Cuelinks tracking domain.");
  }
  if (statusValue === "published" && !affiliateUrl) {
    throw new Error("Add or generate a tracked affiliate URL before publishing. You can save the product as Draft first.");
  }
  const amazonUrl = provider === "amazon" ? affiliateUrl : undefined;
  const maybeSlug = typeof raw.slug === "string" && raw.slug.trim() ? raw.slug : title;
  const slug = normalizeSlug(maybeSlug);
  if (!slug || slug.length < 2) throw new Error("Could not create a valid product slug from the name.");

  const imagesRaw = Array.isArray(raw.images)
    ? raw.images.filter((value) => typeof value === "string" && value.trim())
    : [raw.image1, raw.image2, raw.image3].filter((value) => typeof value === "string" && value.trim());
  const images = imagesRaw.map((url, index) => parseHttpsUrl(url, `Image URL ${index + 1}`));
  if (images.length < 1 || images.length > 3) throw new Error("Add between one and three product image URLs.");
  if (new Set(images).size !== images.length) throw new Error("Product image URLs must be different from each other.");
  const price = Number(raw.price);
  const originalPrice = raw.originalPrice == null || raw.originalPrice === "" ? price : Number(raw.originalPrice);
  if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) throw new Error("Price must be a positive number.");
  if (!Number.isFinite(originalPrice) || originalPrice < price || originalPrice > 100_000_000) throw new Error("Original/list price must be greater than or equal to the current price.");
  const currency = typeof raw.currency === "string" && /^[A-Z]{3}$/.test(raw.currency.trim().toUpperCase()) ? raw.currency.trim().toUpperCase() : "INR";
  if (currency !== "INR") throw new Error("This catalogue is configured for Indian marketplaces. Use INR prices only in this store.");
  const asin = (typeof raw.asin === "string" && raw.asin.trim() ? raw.asin.trim().toUpperCase() : provider === "amazon" ? extractAsin(providerUrl) : null) || undefined;
  if (asin && !/^[A-Z0-9]{10}$/.test(asin)) throw new Error("ASIN must contain 10 letters/numbers.");

  const sourceChecked = raw.priceVerified === true || raw.priceVerified === "true";
  const checkedAt = sourceChecked ? new Date().toISOString() : null;
  const ratingNumber = raw.rating == null || raw.rating === "" ? Number(existing?.rating || 0) : Number(raw.rating);
  const reviewCountNumber = raw.reviewCount == null || raw.reviewCount === "" ? Number(existing?.reviewCount || 0) : Number(raw.reviewCount);
  if (!Number.isFinite(ratingNumber) || ratingNumber < 0 || ratingNumber > 5) throw new Error("Rating must be between 0 and 5.");
  if (!Number.isInteger(reviewCountNumber) || reviewCountNumber < 0 || reviewCountNumber > 100_000_000) throw new Error("Review count must be a whole number of 0 or more.");
  const ratingCheckedNow = (raw.ratingChecked === true || raw.ratingChecked === "true") && ratingNumber > 0 && reviewCountNumber > 0;
  const ratingValuesChanged = Boolean(existing) && (
    (raw.rating !== undefined && raw.rating !== "" && Number(raw.rating) !== Number(existing?.rating || 0)) ||
    (raw.reviewCount !== undefined && raw.reviewCount !== "" && Number(raw.reviewCount) !== Number(existing?.reviewCount || 0))
  );
  const preserveApiRating = existing?.ratingSource === "amazon_creators_api" && !ratingValuesChanged;
  const ratingSource = ratingCheckedNow ? "manual_checked" as const : preserveApiRating ? "amazon_creators_api" as const : "unverified" as const;
  const ratingCheckedAt = ratingCheckedNow ? new Date().toISOString() : preserveApiRating ? existing?.ratingCheckedAt || null : null;
  const displayOrderRaw = raw.displayOrder === null || raw.displayOrder === "" ? undefined : (raw.displayOrder === undefined ? existing?.displayOrder : Number(raw.displayOrder));
  const displayOrder = displayOrderRaw == null || displayOrderRaw === undefined ? undefined : Number(displayOrderRaw);
  if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 1_000_000)) throw new Error("Display order must be a positive whole number, such as 1, 2, or 3.");
  const videoUrl = cleanYouTubeUrl(raw.videoUrl ?? existing?.videoUrl);
  const previousObservations = [...(existing?.priceHistory?.observations || [])];
  if (sourceChecked && checkedAt) {
    const latest = previousObservations[previousObservations.length - 1];
    const checkedDay = checkedAt.slice(0, 10);
    if (!latest || Number(latest.price) !== price || latest.date.slice(0, 10) !== checkedDay) {
      previousObservations.push({ date: checkedAt, price, source: "manual_verified" });
    }
  }
  const product: Product = {
    ...(existing || {} as Product),
    id: existing?.id || (typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : `swf-${slug}`),
    slug,
    title,
    brand,
    category,
    description,
    image: images[0],
    images,
    provider,
    providerUrl,
    affiliateUrl,
    amazonUrl,
    asin,
    originalPrice,
    price,
    currency,
    rating: ratingNumber,
    reviewCount: reviewCountNumber,
    ratingSource,
    ratingCheckedAt,
    displayOrder,
    videoUrl,
    badges: [
      ...(existing?.badges || []).filter((badge) => badge !== "Demo listing"),
      ...((raw.isDemoData === true || raw.isDemoData === "true") ? ["Demo listing"] : []),
    ],
    pros: asStringArray(raw.pros, "Pros"),
    cons: asStringArray(raw.cons, "Cons"),
    specs: cleanSpecs(raw.specs),
    priceSource: sourceChecked ? "manual_verified" : "unknown",
    priceCheckedAt: checkedAt,
    priceHistory: {
      lastMonthPrice: existing?.priceHistory?.lastMonthPrice ?? null,
      avg30DayPrice: existing?.priceHistory?.avg30DayPrice ?? null,
      checkedAt,
      source: sourceChecked ? "manual_verified" : "unknown",
      observations: previousObservations,
    },
    isDemoData: raw.isDemoData === true || raw.isDemoData === "true",
    featured: raw.featured === true || raw.featured === "true",
    trending: raw.trending === true || raw.trending === "true",
    editorChoice: raw.editorChoice === true || raw.editorChoice === "true",
  };
  return { product, status: statusValue };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n") { row.push(cell.trim().replace(/\r$/, "")); if (row.some((item) => item.length)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV has an unclosed quote. Use a CSV file exported from Excel or the provided template.");
  row.push(cell.trim().replace(/\r$/, ""));
  if (row.some((item) => item.length)) rows.push(row);
  return rows;
}

export function csvRowToProduct(headers: string[], values: string[], defaultStatus: ProductSaveStatus): ValidatedProductInput {
  const key = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapped = new Map<string, string>(headers.map((header, index): [string, string] => [key(header), values[index] || ""]));
  const get = (...names: string[]) => {
    for (const name of names) { const value = mapped.get(key(name)); if (value !== undefined) return value; }
    return "";
  };
  const raw: Record<string, unknown> = {
    slug: get("slug"), title: get("title", "productname", "name"), brand: get("brand"), category: get("category"),
    description: get("description"), provider: get("provider", "marketplace", "merchant"), providerUrl: get("providerUrl", "productUrl", "destinationUrl"), affiliateUrl: get("affiliateUrl", "trackingUrl", "cuelinksUrl") || get("amazonUrl", "amazonLink"), amazonUrl: get("amazonUrl", "amazonLink"), asin: get("asin"),
    price: get("price", "currentPrice"), originalPrice: get("originalPrice", "listPrice") || get("price", "currentPrice"),
    currency: get("currency") || "INR", image1: get("image1", "imageUrl1", "imageUrl", "image"), image2: get("image2", "imageUrl2"), image3: get("image3", "imageUrl3"),
    pros: get("pros").split("|"), cons: get("cons").split("|"), specs: get("specsJson", "specs") || "{}", status: get("status") || defaultStatus,
    priceVerified: get("priceVerified").toLowerCase() === "true", rating: get("rating"), reviewCount: get("reviewCount", "ratingsCount"), ratingChecked: get("ratingChecked").toLowerCase() === "true",
    videoUrl: get("videoUrl"), displayOrder: get("displayOrder"), isDemoData: get("isDemoData").toLowerCase() === "true",
    featured: get("featured").toLowerCase() === "true", trending: get("trending").toLowerCase() === "true", editorChoice: get("editorChoice").toLowerCase() === "true",
  };
  return validateProductInput(raw, defaultStatus);
}
