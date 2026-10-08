# Amazon Affiliate Premium Starter

A premium Next.js starter for an Amazon affiliate product recommendation/review website.

## Requirements

- Node.js 20+
- npm
- VS Code recommended

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Important

The sample Amazon URLs are placeholders. Replace them with your own compliant Amazon Associates URLs before publishing.

Do not copy Amazon customer reviews, prices, images, or other Amazon content unless you have an approved method and permission to use it under the applicable Associates program policies.

## Main files

- `app/page.tsx` — homepage
- `app/products/page.tsx` — product listing + filters
- `app/products/[slug]/page.tsx` — product detail
- `app/go/[slug]/route.ts` — affiliate redirect
- `data/products.json` — starter product data
- `components/` — reusable UI
- `app/globals.css` — premium design system
