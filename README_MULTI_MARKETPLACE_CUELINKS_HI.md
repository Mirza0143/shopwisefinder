# ShopWiseFinder — Multi-marketplace aur Cuelinks guide (Hindi)

## Kya automatic hoga aur kya manual rahega?

- **Product catalogue data:** product ka naam, brand, category, original product page URL, current/list price, images, specs aur rating abhi Admin Panel se manually add/edit hote hain ya CSV import kiye ja sakte hain. Cuelinks Monetization API ko automatic universal retailer-product-feed API na samjhein; API campaign discovery, URL-to-affiliate-link conversion aur reporting ke liye hai.
- **Affiliate link:** approved/eligible campaign ke original product URL ko Cuelinks dashboard se convert karke paste kar sakte hain. Ya Admin Panel ka **Generate Cuelinks link** button use kar sakte hain, agar aapke paas API key mein `write:links` scope hai.
- **Approval gate:** link-conversion response `affiliated: true` ho tabhi tracked link commission ke liye eligible batata hai. `false` aaye toh product publish na karein; pehle Cuelinks campaign access/approval check karein.
- **Marketplace support:** Amazon India, Flipkart, Myntra, Meesho, Shopsy, AJIO, aur manual “Other provider”. Meesho ya kisi bhi merchant ko publish karne se pehle Cuelinks mein actual campaign availability/access verify karein.

## Admin se ek product add karna

1. Admin login karein → Product Catalogue → Add product.
2. Marketplace/provider select karein.
3. Product ka **original product-detail URL** paste karein (search page nahi).
4. Product name, brand, category, description, INR price/list price, ek main image (extra 2 images optional), aur available verified details bharein.
5. Cuelinks link generate karein ya Cuelinks dashboard se banaya tracked URL `Affiliate / tracked URL` mein paste karein.
6. Pehle Draft save karke verify karein. Tracked affiliate URL ke bina product publish nahi hoga.

## CSV import

Admin Panel mein **Bulk import products** se CSV preview karein aur confirm karne se pehle errors fix karein. Required columns: `title,brand,category,description,price,image1`. Marketplace product URL ke liye `providerUrl` (ya `productUrl`) use karein. `provider` aur `affiliateUrl` recommended hain. Purani Amazon CSV ka `amazonUrl` field backwards-compatible hai. Optional gallery fields `image2` / `image3` hain; maximum 200 rows per import, file size 2 MB tak.

Example header:

```csv
slug,title,brand,category,description,provider,providerUrl,affiliateUrl,price,originalPrice,currency,image1,image2,image3,status
```

CSV ko spreadsheet mein save karte waqt URLs, commas, quotes aur Unicode characters ko sahi CSV format mein preserve karein. Product images sirf tab use karein jab retailer/affiliate terms permit karte hon ya image use karne ki permission ho.

## Provider badges aur filtering

Products page, product details, compare cards, Admin Catalogue aur bundle product selection mein provider name + favicon badge dikhte hain. Favicon unavailable ho toh text initials fallback hota hai. Public aur admin catalogues mein provider filter hota hai.

## Cuelinks API setup (optional)

1. Publisher dashboard se Monetization API key banayein aur least-privilege scope `write:links` select karein. Campaign browse karne ki zaroorat ho toh `read:campaigns` bhi chahiye.
2. Server-side environment variable `CUELINKS_API_KEY` ko `.env.local` mein locally aur Netlify mein required deploy context ke andar set karein. Isse kabhi `NEXT_PUBLIC_` na banayein aur GitHub mein commit na karein.
3. Channel attribution ke liye optional `CUELINKS_CHANNEL_ID` set kar sakte hain, par sirf tab jab Cuelinks channel verified/eligible ho.
4. Link generation API route authenticated Admin session se protected hai; key browser ko nahi bheji jaati.
5. Cuelinks key/access available na ho toh dashboard se tracked link manual generate karke paste kar sakte hain.

## Demo products ko public se hide karna

- Built-in catalogue mein `isDemoData: true` mark kiye gaye sample products public Products, Compare, homepage and product-detail routes se hidden rehte hain. Admin Catalogue mein ye `Draft` ke roop mein dikhte hain.
- Sample record ko real product banane se pehle exact retailer listing se title, brand, image, current INR price, product URL aur required details verify karein; `isDemoData` flag uncheck karein, valid tracked affiliate URL add karein, phir hi publish karein.
- Static demo records ko public par restore karne ke liye unhe sirf `Published` select karna kaafi nahi: illustrative/demo flag ko bhi uncheck karna hoga.

## Price, stock aur affiliate transparency

Cuelinks link conversion current price, inventory, shipping ya product images sync nahi karta. Price aur stock retailer page par change ho sakte hain. Product price ko checked date/source ke saath maintain karein; automated update tabhi add karein jab official feed/API aur permission available ho. Site par affiliate disclosure visible rakhein. Advertised payout “up to” hota hai; actual commission campaign/category/status par depend karta hai.

## Deployment safety

- `.env.local`, Cuelinks API key, Telegram bot token, admin password, session secret aur Supabase elevated key ko GitHub mein commit na karein.
- Netlify mein env vars har intended context (Deploy Preview/Production) mein separately set hone chahiye; values change karne ke baad re-deploy zaroori hai.
- Product provider fields `swf_products.product_data` JSON object mein save hote hain; in marketplace fields ke liye alag SQL migration nahi chahiye if the existing `swf_products` table/migration is already set up.

## Affiliate disclosure footer

- The footer shows both the exact Amazon Associates sentence, `As an Amazon Associate I earn from qualifying purchases.`, and a general disclosure for eligible marketplace affiliate links.
- The dedicated `/affiliate-disclosure` page repeats the disclosure and tells shoppers to check current prices, stock, seller, warranty and return terms with the retailer.
