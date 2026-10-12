import type { EditorialReview, Product } from "@/types/product";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isKnown(value: string): boolean {
  return Boolean(value) && !/^(unknown|n\/a|not available|not specified|not listed|-)$/i.test(value.trim());
}

function readSpec(product: Product, aliases: string[]): string {
  const entries = Object.entries(product.specs || {});
  const match = entries.find(([key]) => aliases.some((alias) => key.toLowerCase().includes(alias.toLowerCase())));
  return match ? clean(match[1]) : "";
}

function appendUnique(target: string[], value: string, max = 6) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized || target.some((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized)) return;
  if (target.length < max) target.push(value);
}

/**
 * Free, deterministic catalogue review. It never calls a remote AI service and only
 * uses fields already present in the product catalogue. It is guidance, not testing.
 */
export function generateSmartReview(product: Product): EditorialReview {
  const existing = product.review;
  const strengths: string[] = [];
  const limitations: string[] = [];
  const verifyBeforeBuying: string[] = [];

  for (const item of existing?.strengths ?? product.pros ?? []) appendUnique(strengths, item);
  for (const item of existing?.limitations ?? product.cons ?? []) appendUnique(limitations, item);
  for (const item of existing?.verifyBeforeBuying ?? []) appendUnique(verifyBeforeBuying, item);

  const isPhone = /phone|mobile|smartphone/i.test(product.category);
  const isAudio = /audio|headphone|earbud/i.test(product.category);
  const chipset = readSpec(product, ["chipset", "processor", "cpu model", "soc"]);
  const display = readSpec(product, ["display", "screen size", "screen"]);
  const refresh = readSpec(product, ["refresh rate"]);
  const resolution = readSpec(product, ["resolution"]);
  const water = readSpec(product, ["water/dust", "water resistance", "ip rating"]);
  const battery = readSpec(product, ["battery", "battery life"]);
  const connectivity = readSpec(product, ["connectivity"]);
  const noiseCancellation = readSpec(product, ["noise cancellation", "anc"]);
  const storage = readSpec(product, ["storage", "memory storage"]);
  const ram = readSpec(product, ["ram", "memory"]);

  if (isPhone) {
    if (isKnown(chipset)) appendUnique(strengths, `Listed processor: ${chipset}. This is a specification reference, not an independent benchmark result.`);
    if (isKnown(display) || isKnown(refresh)) {
      const displayDetail = [display, refresh ? `${refresh} refresh rate` : ""].filter(isKnown).join("; ");
      if (displayDetail) appendUnique(strengths, `Display details listed: ${displayDetail}. Actual viewing quality has not been independently tested.`);
    }
    if (isKnown(water)) appendUnique(strengths, `Water/dust rating listed: ${water}. This does not guarantee a used device is still water-resistant.`);
    if (isKnown(storage)) appendUnique(limitations, `Listed storage is ${storage}; check that capacity suits your apps, photos and videos.`);
    if (isKnown(ram) && /verify|seller-listed|claimed/i.test(ram)) appendUnique(verifyBeforeBuying, `Verify the seller-listed memory specification (${ram}) against the exact model and region.`);
    if (!isKnown(water)) appendUnique(verifyBeforeBuying, "No clear water/dust rating is listed; do not assume the device is water-resistant.");
    if (!isKnown(chipset)) appendUnique(verifyBeforeBuying, "Confirm the exact processor/chipset for the model and region.");
    appendUnique(verifyBeforeBuying, "Check battery health, repair history, warranty, seller and return policy before payment.");
  }

  if (isAudio) {
    if (isKnown(noiseCancellation)) appendUnique(strengths, `Noise-cancellation feature listed: ${noiseCancellation}. Real-world cancellation quality is not measured here.`);
    if (isKnown(battery)) appendUnique(strengths, `Battery specification listed: ${battery}. Actual runtime may vary with volume and features enabled.`);
    if (isKnown(connectivity)) appendUnique(strengths, `Connectivity listed: ${connectivity}. Confirm device compatibility and codec/features you need.`);
    appendUnique(verifyBeforeBuying, "Look for independent microphone, comfort and audio-quality tests; the catalogue does not prove real-world performance.");
  }

  const knownSpecCount = Object.values(product.specs || {}).filter((value) => isKnown(clean(value))).length;
  const specCount = Object.keys(product.specs || {}).length;
  const summaryBase = clean(existing?.summary) || `${product.title} is listed in the ${product.category} category. The guidance below is based only on the available product catalogue information.`;
  const dataNote = product.isDemoData
    ? " This is a demo listing, so price and feature claims must be independently checked before publishing or buying."
    : " This is a specification-based assessment, not a hands-on test; check listing condition, seller details and the final checkout price.";

  if (!verifyBeforeBuying.length) {
    appendUnique(verifyBeforeBuying, "Confirm the exact model, current price, seller, warranty and return policy.");
  }
  if (!limitations.length) appendUnique(limitations, "The catalogue does not establish independent real-world performance or reliability.");

  const bestFor = clean(existing?.bestFor) || (strengths.length
    ? `Buyers interested in ${product.title}, after checking the listed specifications and current offer.`
    : `Buyers whose needs match the listed ${product.category.toLowerCase()} features, once the listing is verified.`);
  const notIdealFor = clean(existing?.notIdealFor) || "Buyers who need independently tested performance, confirmed warranty or details that are missing from this listing.";
  const completeness = specCount ? ` The catalogue currently contains ${knownSpecCount} of ${specCount} specification fields.` : " No detailed specifications are listed in the catalogue.";

  return {
    summary: `${summaryBase}${completeness}${dataNote}`,
    bestFor,
    notIdealFor,
    strengths: strengths.slice(0, 6),
    limitations: limitations.slice(0, 6),
    verifyBeforeBuying: verifyBeforeBuying.slice(0, 6),
  };
}
