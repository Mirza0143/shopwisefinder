# PickWise — polished starter source

## Windows setup
1. Back up the project currently in use.
2. Extract this ZIP into a new folder. Open the folder in VS Code where `app/`, `components/`, `data/`, `lib/`, `types/` and `package.json` are at the same level.
3. Install dependencies with `npm.cmd install`.
4. Copy `.env.example` to `.env.local`. Add your own Amazon Associates tag and Amazon marketplace domain. Never commit `.env.local`.
5. Start development with `npm.cmd run dev` and open `http://localhost:3000`.
6. Validate production with `npm.cmd run build`.

## Included
- Mobile gaming kit (phone cooler, power bank, headset/earbuds, OTG and headphone adapter, finger sleeves, cable, triggers).
- Larger men's style bundle including shoes, slides, socks, belt, wallet, cap, sunglasses and fragrance.
- Desktop gaming, workstation and everyday pocket/tech bundles.
- Product catalog extended with mobile accessories, fashion/footwear, grooming, audio and everyday essentials.
- Search across descriptions and specs, category chips, price budget, sort modes and reset filters.
- Homepage “Shop by need” image cards; improved mobile navigation.
- Subtle hover lift/image zoom, layered shadows, fade-up entrances, focus styles and prefers-reduced-motion support.
- Dynamic category-driven 2–3 item product comparison and Quick Compare bar retained.
- Affiliate outbound searches include the optional Associate tag and are marked with `rel="sponsored nofollow"`.

## Product review content
- Every sample product now has a tailored review summary, intended use, strengths, limitations and a pre-purchase verification checklist.
- These are spec-based editorial notes for the demo catalog, not first-hand testing or verified claims about retail products. Check the actual manufacturer's listing and independent reviews before publishing. Missing IP/water-resistance, durability, camera, safety or performance information must not be assumed.

## Important
All new entries and prices are labelled as illustrative/demo data. Confirm real products, photos, specs, prices and valid affiliate links before production. Price history is not live: the history fields intentionally remain empty until an authorised source and persistence/scheduled collection are connected. Bundle budgets are estimates; the Amazon links open searches, not a combined multi-product cart.


Currency/history note: UI sample values are in INR format but are illustrative placeholders rescaled for display only (fixed x83 from older USD-like placeholders; not a live FX rate). Dated price observations are empty until an authorised provider/source is connected. Never present sample values as verified retailer prices or price history.


## Free Smart Review
Product review analysis runs locally from the catalogue's stored specifications and editorial notes. It does not call a paid AI API and does not require an OpenAI API key. These notes are not hands-on testing; confirm real product claims and seller details before purchase.
