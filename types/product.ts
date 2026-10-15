export type PriceSource = "amazon_creators_api" | "approved_provider" | "manual_verified" | "unknown";

/** A timestamped price captured from a known source. Never invent observations. */
export type PriceObservation = {
  date: string; // ISO 8601 date/time of observation
  price: number; // INR in this project
  source: PriceSource;
};

export type PriceHistory = {
  lastMonthPrice: number | null;
  avg30DayPrice: number | null;
  checkedAt: string | null;
  source: PriceSource;
  observations?: PriceObservation[];
};

export type EditorialReview = {
  summary: string;
  bestFor: string;
  notIdealFor: string;
  strengths: string[];
  limitations: string[];
  verifyBeforeBuying: string[];
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  /** Optional three-photo gallery saved by the product manager. */
  images?: string[];
  asin?: string;
  priceSource?: PriceSource;
  priceCheckedAt?: string | null;
  /** Optional direct product URL. When absent, /go/[slug] creates a tagged Amazon search. */
  amazonUrl?: string;
  originalPrice: number;
  price: number;
  currency: "INR" | string;
  rating: number;
  reviewCount: number;
  /** Rating shown only if its source and capture date are recorded. */
  ratingSource?: "amazon_creators_api" | "manual_checked" | "unverified";
  ratingCheckedAt?: string | null;
  /** Manual ordering: smaller positive integers appear earlier in the main catalogue. */
  displayOrder?: number | null;
  /** Optional YouTube review URL; only valid YouTube links are embedded. */
  videoUrl?: string | null;
  badges: string[];
  pros: string[];
  cons: string[];
  review?: EditorialReview;
  specs: Record<string, string>;
  priceHistory?: PriceHistory;
  /** Only populate launch data when the original launch price/date is verified. */
  launchPrice?: number | null;
  launchDate?: string | null;
  isDemoData?: boolean;
  featured?: boolean;
  trending?: boolean;
  editorChoice?: boolean;
};
