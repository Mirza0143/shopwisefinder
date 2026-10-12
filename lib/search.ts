/** Normalize catalogue search so common spelling differences still find the same item. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Treat "iPhone", "i phone", and "i-phone" as the same phrase.
    .replace(/iphone/g, "i phone")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearchQuery(searchIndex: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  if (searchIndex.includes(normalizedQuery)) return true;

  // Compact matching also handles forms such as "iPhone15Pro".
  const compactIndex = searchIndex.replace(/\s/g, "");
  const compactQuery = normalizedQuery.replace(/\s/g, "");
  if (compactQuery && compactIndex.includes(compactQuery)) return true;

  // Allow words in a query to appear in a different order (e.g. "OLED iPhone").
  const words = new Set(searchIndex.split(" "));
  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  return queryWords.length > 1 && queryWords.every((word) => words.has(word));
}
