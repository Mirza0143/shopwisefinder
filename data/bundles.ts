export type BundleItem = {
  id: string;
  name: string;
  role: string;
  searchQuery: string;
  image: string;
  estimated_price: number;
  current_price: number | null;
  currency: string;
  amazonUrl?: string;
  /** Matching PickWise review when the catalog contains a suitable item. */
  reviewSlug?: string;
};

export type CuratedBundle = {
  id: string;
  title: string;
  description: string;
  category: "mobile-gaming" | "gaming" | "fashion" | "desk" | "everyday";
  bundle_items: BundleItem[];
  currency: string;
  bundleUrl?: string;
  /** Optional manual display order; lower values are shown first. */
  sortOrder?: number;
};

const image = (photo: string) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=480&q=82`;

const reviewSlugByItemId: Record<string, string> = {
  "mg-phone-cooler": "arcticclip-mobile-phone-cooler",
  "mg-power-bank": "volt-pocket-20000mah-power-bank",
  "mg-headset": "echo-wave-anc-headphones",
  "mg-earbuds": "pulse-air-wireless-earbuds",
  "mg-otg": "snaplink-usbc-otg-adapter",
  "mg-audio": "audiobridge-usbc-35mm-adapter",
  "mg-sleeves": "gripglide-mobile-gaming-finger-sleeves",
  "mg-cable": "flexcharge-braided-usbc-cable",
  "mg-trigger": "taptrigger-mobile-game-controller-grips",
  "gaming-keyboard": "apex-mechanical-keyboard",
  "gaming-headset": "echo-wave-anc-headphones",
  "curved-monitor": "vertex-4k-monitor",
  "gaming-chair": "orbit-ergonomic-chair",
  "cable-clips": "cablekeeper-desk-organizer",
  "mens-shirt": "fieldday-cotton-shirt",
  "mens-jeans": "everyday-stretch-jeans",
  "mens-sneakers": "strideknit-everyday-sneakers",
  "mens-socks": "cushioncrew-everyday-socks",
  "mens-slides": "softstep-comfort-slides",
  "mens-sunglasses": "clearview-polarized-sunglasses",
  "mens-belt": "urbanweave-reversible-belt",
  "mens-wallet": "slimline-everyday-wallet",
  "mens-perfume": "scentcraft-citrus-eau-de-parfum",
  "mens-cap": "daymark-canvas-cap",
  "office-chair": "orbit-ergonomic-chair",
  "usb-hub": "linkhub-6in1-usbc-adapter",
  "desk-cable": "flexcharge-braided-usbc-cable",
  "edc-earbuds": "soundloop-usbc-wired-earbuds",
  "edc-cable": "flexcharge-braided-usbc-cable",
  "edc-connector": "snaplink-usbc-otg-adapter",
  "edc-power": "volt-pocket-20000mah-power-bank",
  "edc-slides": "softstep-comfort-slides",
  "edc-socks": "cushioncrew-everyday-socks",
};

const item = (
  id: string,
  name: string,
  role: string,
  searchQuery: string,
  estimated_price: number,
  photo: string
): BundleItem => ({
  id,
  name,
  role,
  searchQuery,
  estimated_price,
  current_price: null,
  currency: "INR",
  image: image(photo),
  reviewSlug: reviewSlugByItemId[id],
});

export const curatedBundles: CuratedBundle[] = [
  {
    id: "mobile-gaming-power-kit",
    title: "Mobile Gaming Power Kit",
    description: "A practical phone-gaming stack for longer sessions: cooling, backup power, audio, connectors and better grip.",
    category: "mobile-gaming",
    currency: "INR",
    bundle_items: [
      item("mg-phone-cooler", "Clip-on Phone Cooler", "Helps manage heat during long sessions", "clip on semiconductor phone cooler USB C", 2490, "photo-1511709191319-5864cf11b8b5"),
      item("mg-power-bank", "20,000mAh Power Bank", "Portable battery for gaming on the go", "20000mAh USB C PD power bank", 3320, "photo-1609091839311-d5365f9ff1c5"),
      item("mg-headset", "Gaming Headset", "Voice chat and focused audio", "mobile gaming headset microphone", 2900, "photo-1505740420928-5e560c06d30e"),
      item("mg-earbuds", "Compact Gaming Earbuds", "Lightweight alternative for travel", "low latency mobile gaming earbuds", 2070, "photo-1590658268037-6bf12165a8df"),
      item("mg-otg", "USB-C OTG Adapter", "Connect supported USB accessories", "USB C OTG adapter phone", 830, "photo-1625948515291-69613efd103f"),
      item("mg-audio", "USB-C to 3.5mm Adapter", "Keep using compatible wired headphones", "USB C to 3.5mm DAC headphone adapter", 750, "photo-1590658268037-6bf12165a8df"),
      item("mg-sleeves", "Gaming Finger Sleeves", "Reduce friction on the touchscreen", "mobile gaming conductive finger sleeves", 580, "photo-1600456899121-68eda5705257"),
      item("mg-cable", "Braided USB-C Cable", "A spare cable for charging and travel", "braided USB C cable 100W", 1080, "photo-1558618666-fcd25c85cd64"),
      item("mg-trigger", "Mobile Gaming Triggers", "Physical shoulder controls for compatible phones", "mobile phone gaming trigger controller", 1240, "photo-1603487742131-4160ec999306"),
    ],
  },
  {
    id: "ultimate-gaming-setup",
    title: "Ultimate Gaming Setup Kit",
    description: "A coordinated desktop setup for gaming, streaming, and long sessions.",
    category: "gaming",
    currency: "INR",
    bundle_items: [
      item("gaming-keyboard", "Mechanical Keyboard", "Fast, tactile input", "mechanical gaming keyboard", 6640, "photo-1587829741301-dc798b83add3"),
      item("gaming-headset", "Gaming Headset", "Comfortable game audio", "gaming headset microphone", 7470, "photo-1505740420928-5e560c06d30e"),
      item("curved-monitor", "Curved Gaming Monitor", "Immersive display", "curved gaming monitor", 20750, "photo-1527443224154-c4a3942d3acf"),
      item("gaming-chair", "Ergonomic Gaming Chair", "Support for long sessions", "ergonomic gaming chair", 14940, "photo-1586023492125-27b2c045efd7"),
      item("desk-mat", "Desk Mat", "A clean, consistent surface", "large gaming desk mat", 1660, "photo-1498050108023-c5249f4df085"),
      item("gaming-mouse", "Wireless Gaming Mouse", "Accurate movement and control", "wireless gaming mouse", 3320, "photo-1527814050087-3793815479db"),
      item("cable-clips", "Cable Management Clips", "Keep the setup tidy", "desk cable management clips", 830, "photo-1498050108023-c5249f4df085"),
    ],
  },
  {
    id: "mens-fashion-kit",
    title: "Complete Men's Fashion Kit",
    description: "Easy-to-match everyday outfits with footwear, accessories, socks and a finishing fragrance.",
    category: "fashion",
    currency: "INR",
    bundle_items: [
      item("mens-shirt", "Everyday Shirt", "Smart-casual base layer", "men's versatile casual shirt", 2900, "photo-1596755094514-f87e34085b2c"),
      item("mens-jeans", "Straight-Fit Jeans", "Everyday staple", "men's straight fit jeans", 4150, "photo-1542272604-787c3835535d"),
      item("mens-sneakers", "Everyday Sneakers", "Comfortable daily footwear", "men's everyday sneakers", 4980, "photo-1542291026-7eec264c27ff"),
      item("mens-socks", "Cushioned Crew Socks", "Everyday multipack", "men's cushioned crew socks multipack", 1000, "photo-1586350977771-b3b0abd50c82"),
      item("mens-slides", "Comfort Slides", "Easy-on casual pair", "men's comfortable slides", 1660, "photo-1603487742131-4160ec999306"),
      item("mens-watch", "Minimalist Watch", "Simple finishing detail", "men's minimalist watch", 4980, "photo-1524805444758-089113d48a6d"),
      item("mens-sunglasses", "Sunglasses", "Practical everyday accessory", "men's UV protection sunglasses", 1660, "photo-1511499767150-a48a237f0083"),
      item("mens-belt", "Reversible Belt", "A useful outfit staple", "men's reversible everyday belt", 1410, "photo-1624222247344-550fb8c5f0b9"),
      item("mens-wallet", "Slim Wallet", "Compact daily carry", "men's slim bifold wallet", 1660, "photo-1627123424574-724758594e93"),
      item("mens-perfume", "Daily Fragrance", "A finishing touch for the routine", "men's fresh citrus eau de parfum", 3320, "photo-1594035910387-fea47794261f"),
      item("mens-cap", "Everyday Cap", "Casual style extra", "men's everyday baseball cap", 1240, "photo-1588850561407-ed78c282e89b"),
    ],
  },
  {
    id: "minimalist-workstation-kit",
    title: "Minimalist Desk / Workstation Kit",
    description: "Keep a home office tidy, practical, and distraction-free.",
    category: "desk",
    currency: "INR",
    bundle_items: [
      item("desk", "Minimalist Desk", "The foundation", "minimalist computer desk", 10790, "photo-1497366754035-f200968a6e72"),
      item("office-chair", "Ergonomic Office Chair", "Comfortable posture support", "ergonomic office chair adjustable", 13280, "photo-1586023492125-27b2c045efd7"),
      item("desk-lamp", "Desk Lamp", "Focused task lighting", "adjustable LED desk lamp", 2490, "photo-1507473885765-e6ed057f782c"),
      item("monitor-stand", "Monitor Stand", "Raise the screen", "minimalist monitor stand", 3320, "photo-1527443224154-c4a3942d3acf"),
      item("cable-management", "Cable Management Kit", "Keep cables organised", "under desk cable management kit", 1240, "photo-1498050108023-c5249f4df085"),
      item("usb-hub", "USB-C Multiport Hub", "Connect everyday desk accessories", "USB C multiport hub HDMI USB A", 2490, "photo-1625842268584-8f3296236761"),
      item("desk-cable", "Braided Charging Cable", "A reliable spare for devices", "braided USB C charging cable", 1080, "photo-1558618666-fcd25c85cd64"),
    ],
  },
  {
    id: "everyday-pocket-essentials",
    title: "Everyday Pocket & Tech Essentials",
    description: "Small items worth keeping handy at home, at work, or in a travel pouch.",
    category: "everyday",
    currency: "INR",
    bundle_items: [
      item("edc-earbuds", "Compact Earbuds", "Audio for commutes and calls", "wireless earbuds compact case", 3320, "photo-1590658268037-6bf12165a8df"),
      item("edc-cable", "USB-C Charging Cable", "A spare cable for your bag", "USB C fast charging cable", 830, "photo-1558618666-fcd25c85cd64"),
      item("edc-connector", "OTG / Connector Adapter", "Connect compatible devices", "USB C OTG connector adapter", 750, "photo-1625948515291-69613efd103f"),
      item("edc-power", "Slim Power Bank", "Extra battery on the move", "slim portable USB C power bank", 2070, "photo-1609091839311-d5365f9ff1c5"),
      item("edc-organizer", "Cable & Gadget Pouch", "Keep little accessories together", "travel cable organizer pouch", 1240, "photo-1498050108023-c5249f4df085"),
      item("edc-slides", "Comfort Slides", "Easy-on casual footwear", "unisex comfortable slides", 1660, "photo-1603487742131-4160ec999306"),
      item("edc-socks", "Everyday Socks", "A practical wardrobe backup", "everyday cotton blend socks multipack", 1000, "photo-1586350977771-b3b0abd50c82"),
    ],
  },
];

export function amazonSearchUrl(query: string) {
  const domain = process.env.NEXT_PUBLIC_AMAZON_DOMAIN?.trim() || "www.amazon.in";
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
  const params = new URLSearchParams({ k: query });
  if (tag) params.set("tag", tag);
  return `https://${domain}/s?${params.toString()}`;
}
export function getBundleItemUrl(product: BundleItem) {
  return product.amazonUrl || amazonSearchUrl(product.searchQuery);
}
export function getBundleUrl(bundle: CuratedBundle) {
  if (bundle.bundleUrl) return bundle.bundleUrl;
  return amazonSearchUrl(`${bundle.title} ${bundle.bundle_items.map((item) => item.name).join(" ")}`);
}
