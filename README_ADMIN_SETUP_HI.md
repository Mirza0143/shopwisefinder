# Security update note

This revision updates Next.js to `15.5.28` and React/React DOM to `19.1.9`, and pins the Sharp line to `^0.35.5`. The prior package lock is deliberately omitted in this security revision so it cannot pin the old vulnerable versions. Before building/deploying, run `npm install` once to generate a fresh `package-lock.json`, then keep/upload that generated lockfile with the same source. Do not deploy before the install step.

# ShopWiseFinder Admin Panel — Setup Guide (Hindi)

Admin Panel code is integrated into the existing Next.js project. It uses Supabase Postgres for persistent product data and a server-only login for a single site administrator, with username/password followed by a Telegram-delivered six-digit one-time code. It does **not** edit `data/products.json`; database records override matching static slugs or add new products. Drafts and archived overrides are hidden from shoppers.

## Important before starting

- Keep the current live site and Git branch safe. Test this copy locally and through a Netlify Deploy Preview before merging.
- Do not commit `.env.local`, a Supabase `service_role`/secret key, the admin password, or `ADMIN_SESSION_SECRET`.
- The Admin Panel will show a setup error until both Supabase and admin environment values are configured.
- Product prices entered in the form are manual unless a verified data source is connected. This build does **not** pretend to automatically sync Amazon prices.

## 1. Create a Supabase project

1. Open https://database.new or https://supabase.com/dashboard and create a project. Store the database password privately.
2. In the new Supabase project, open **SQL Editor**.
3. Open `supabase/schema.sql` from this code project, copy its complete contents, paste them into the SQL Editor and run it.
4. Open **Project Settings → API Keys** (wording may vary). Copy the project URL and one server-side elevated key. For the legacy JWT `service_role` key, put it in `SUPABASE_SERVICE_ROLE_KEY`. If your dashboard offers the modern `sb_secret_...` key, put it in `SUPABASE_SECRET_KEY` instead. Leave the other key variable empty. Never use a publishable/anon key for either variable and never put an elevated key in a `NEXT_PUBLIC_...` variable.
5. Do not create a policy that gives `anon` or `authenticated` browser users write access to `swf_products`. The supplied SQL intentionally revokes those grants; server APIs use the secret on the server only.

## 2. Configure your local environment

1. In the project root, copy `.env.example` and name the copy `.env.local`.
2. Fill in these values with your own private values:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SERVICE_ROLE_KEY
# OR (modern key, if available): SUPABASE_SECRET_KEY=sb_secret_your_private_key
ADMIN_USERNAME=choose-a-private-username
ADMIN_PASSWORD=choose-a-unique-password-at-least-12-characters
ADMIN_SESSION_SECRET=PUT_A_RANDOM_SECRET_HERE
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_PRIVATE_TELEGRAM_CHAT_ID
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=shopwisefinde-21
NEXT_PUBLIC_AMAZON_DOMAIN=www.amazon.in
```

Generate a good random session secret in PowerShell from the project folder:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the output into `ADMIN_SESSION_SECRET`. Use a unique password of at least 12 characters. Do not paste passwords or secret keys into chat, README files, source code, or GitHub.

3. Install dependencies and test:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

4. Open `http://localhost:3000/admin/login`, sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`, and add a test product as **Draft** first. Drafts do not appear to shoppers. Check the listing, gallery and product page; then change the product to **Published** when ready.

## 3. Configure Netlify (only after local testing)

1. Open Netlify → your ShopWiseFinder project → **Project configuration / Environment variables**.
2. Add the same variables as above (`SUPABASE_URL`, one Supabase server key, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and Amazon tag/domain if needed). Mark secret values as sensitive when Netlify offers that option.
3. For a modern Supabase `sb_secret_...` key, set `SUPABASE_SECRET_KEY` and leave `SUPABASE_SERVICE_ROLE_KEY` empty. For a legacy JWT `service_role` key, do the reverse. Use only one. Do not add these secrets to GitHub or to variables whose names start with `NEXT_PUBLIC_`.
4. Create a new Git branch, commit only the intended source files and deployment docs (never `.env.local`), push, create a Pull Request and test the Netlify Deploy Preview. Merge only after the preview is verified.
5. After Netlify environment variables are added, trigger a new deploy so the server functions receive them.

## 4. How to use the admin

- URL: `/admin`; sign-in URL: `/admin/login`.
- Add/edit products with a title, brand, category, approved Amazon affiliate link, INR price, description and **three different HTTPS image URLs**. The form validates URLs and requires three unique image URLs but cannot prove that the photo depicts the exact product, so visually inspect previews.
- Use **Draft** to check a product before publication. Use **Published** when it is ready for shoppers.
- Built-in JSON products appear in the admin list. Saving one creates a database override; it never edits the JSON file. Archiving a built-in record hides it without modifying the source file.
- Bulk product import accepts CSV files up to 2 MB and 200 product rows. Download the template in the panel. Required fields: `title`, `brand`, `category`, `description`, `amazonUrl`, `price`, `image1`, `image2`, and `image3`. Optional headers include `slug`, `asin`, `originalPrice`, `currency`, `pros`, `cons`, `specsJson`, `status`, `priceVerified`, `rating`, `reviewCount`, `ratingChecked`, `displayOrder`, `videoUrl`, `featured`, `trending`, `editorChoice`. Use `|` to separate multiple pros/cons; use a valid JSON object for `specsJson`. Keep `currency` as `INR` for this Amazon.in catalogue. CSVs default to Draft unless the status column or import selection specifies Published.
- `displayOrder` is the manual index for the product listing: `1` goes before `2`, and blank uses the default catalogue order. An optional YouTube review link can be added in the product form; non-YouTube URLs are rejected.
- Ratings are only shown when a rating and rating count have been entered and “I checked the rating and count on the exact Amazon listing today” is ticked. The site labels it as manually checked with a date; it is not an independent Amazon API verification. If you do not verify it, the visitor sees “Rating not verified”.
- For price history, tick “I personally checked this price today” only after checking the exact product/variant on Amazon. This records a dated observation. A graph requires at least two observations from different dates. This is not automatic price syncing.
- Do not publish fake/demo prices, placeholders, wrong product photos, unsupported review claims, or products you have not checked.

## 5. Curated bundles and one-time database upgrade

The admin now supports selecting two or more already-published products to create a bundle, changing bundle order/status, editing custom bundles, archiving built-in bundles, and importing bundle CSVs. Bundle CSV columns are `slug,title,description,category,productSlugs,status,sortOrder`; `productSlugs` is a `|`-separated list of published product slugs.

Before using bundle management, open the Supabase SQL Editor for the same project and run `supabase/admin-enhancements-v2.sql` once. If you missed v2 or see `PGRST205` / `Could not find the table public.swf_bundles`, run the newer idempotent repair migration `supabase/admin-bundles-support-toggles-v4.sql` instead; it creates the missing bundle table, maintains server-only access, adds User Support toggles, and refreshes the PostgREST schema cache.

## 6. Analytics, welcome banners and admin tools (v3 migration)

Run `supabase/admin-enhancements-v3.sql` once in the same Supabase SQL Editor after the v1 schema and v2 bundle migration. It creates `swf_analytics_events`, `swf_banners`, and a public-read / server-write-only `swf-banners` image bucket. The script enables RLS on tables, revokes browser-role access, and lets the private server APIs write using the server-only Supabase key.

- The admin header offers **KPI Report**, **Import Items**, and **Banners**. KPI counts begin only after this migration and the new deployment are live; historic visits cannot be reconstructed. The report shows page views, unique browser sessions (an estimate, not verified people), recent activity, affiliate clicks by product/link, review clicks by product, banner impressions/clicks, and compare selections. It does not store visitor IP addresses in the analytics table; browser privacy settings can make counts incomplete.
- Use **Banners** to upload a JPG/PNG/WebP file up to 4 MB or supply an HTTPS image URL, add a destination link and schedule dates, and publish + enable it. Only a currently active published/enabled banner appears as a dismissible popup; dismissal is remembered for the browser-tab session. The banner upload requires the `swf-banners` bucket created by the v3 migration.
- Quick Compare now preserves multiple picks even across categories (up to three); cross-category comparisons display whichever specifications exist for each item. Changing the category filter no longer clears selected items.
- A public bundle-table error is handled by falling back to the built-in bundles without throwing a development error overlay. For admin bundle management, run the v4 repair migration if the table is missing.
- Read Review navigation keeps Next.js link prefetch and shows a route-level loading state while a review is being prepared. Review and outbound affiliate clicks are recorded only after this tracking version is deployed.


## 7. Telegram OTP for admin sign-in (v4 migration)

Username/password are not enough to create an admin session in this build. After correct credentials, a 6-digit code is sent to your configured Telegram chat. The code expires in 10 minutes, can be used once, and locks after five incorrect attempts. Code hashes (not the plain code) are stored in Supabase, and requests are limited to three challenges per address per ten minutes.

1. In Telegram, open **@BotFather**, send `/newbot`, follow its prompts, and privately copy the bot token it gives you. Do not share the token or put it in frontend/public variables.
2. Open your new bot in Telegram and press **Start** or send `/start`. The bot cannot proactively message a user until that chat has been started.
3. Find your private chat ID without sharing your token: in a local PowerShell terminal run the commands below. When prompted, paste the bot token; the prompt hides the input. The result may include your recent Telegram update, so do not post its full output publicly—copy only the numeric `message.chat.id`. If `result` is empty, send `/start` to your bot again and repeat.

```powershell
$secure = Read-Host "Paste your Telegram bot token (input hidden)" -AsSecureString
$token = [System.Net.NetworkCredential]::new("", $secure).Password
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates" | ConvertTo-Json -Depth 8
$token = $null
```

4. In `.env.local`, set `TELEGRAM_BOT_TOKEN` to the token and `TELEGRAM_CHAT_ID` to that numeric chat ID. Never send either value in chat or commit `.env.local`. Restart `npm.cmd run dev`. For production, add both as sensitive server-side Netlify environment variables, then redeploy.
5. In this same Supabase project, run `supabase/admin-auth-telegram-v4.sql` once. It creates a server-only challenge table with RLS enabled and browser-role access revoked. Do not run this migration in a different project from the one used in `.env.local`.

Login flow: enter username/password, retrieve the OTP in the configured Telegram private chat, enter all six digits, then verify. If Telegram is not configured or the migration is missing, the login form displays an actionable error rather than creating a session.

## Telegram OTP account change / disable controls

- OTP is enabled by default whenever `ADMIN_TELEGRAM_OTP_ENABLED` is unset or `true`. After `admin-telegram-controls-v5.sql` is installed, the Admin Security database setting takes precedence over the environment flag. Keep OTP enabled for production.
- To direct OTP to a different Telegram account after the controls migration, use Admin → Admin Security: turn OTP OFF by confirming a code sent to the currently connected account, then turn it ON and send the one-time `/start CODE` command from the intended account. This stores the new chat ID server-side. Before the controls migration, change `TELEGRAM_CHAT_ID` in `.env.local` and restart.
- OTP OFF means password-only login and materially weakens security. Prefer the in-dashboard OFF flow (it requires a Telegram confirmation) only for controlled recovery/testing; always restore OTP before public production use. The environment flag remains a fallback for installations that have not run the controls migration.
- Never share the bot token, OTP or `.env.local`. If a bot token was exposed, revoke it with BotFather and replace it in the environment.


## Admin Security: turn Telegram OTP off/on and pair a Telegram account

After running `supabase/admin-telegram-controls-v5.sql` in the same Supabase project, `/admin` includes **Admin Security**. This controls the OTP setting stored in the server-only `swf_admin_security_settings` table, which takes precedence over `ADMIN_TELEGRAM_OTP_ENABLED` once the migration is installed.

- **Turn OFF:** click **Turn OFF with OTP**. A 6-digit code is sent to the currently connected Telegram chat. Enter that code in Admin Security to turn OTP off. The change is not applied before the code is verified. OTP-off means password-only login and is less secure; keep it ON for a public production site.
- **Turn ON / connect a Telegram account:** when OTP is OFF, click **Turn ON & pair account**. Admin displays a random one-time command such as `/start ghusl024d`. Open the intended Telegram bot account and send that exact command. The pairing code expires in 10 minutes and is single-use; the code hash, not the raw code, is stored in Supabase.
- **Local development:** if the bot has no webhook configured, the open Admin Security panel polls Telegram `getUpdates` while the pairing card is visible. Leave the panel open until it confirms pairing. If the bot already has a webhook, pair from the deployed public HTTPS Admin page instead; local `localhost` cannot receive Telegram webhook callbacks.
- **Production:** the pairing action configures Telegram's webhook to the current public HTTPS URL (or `TELEGRAM_WEBHOOK_URL`, if set) at `/api/telegram/webhook`. The deployed site must include this route and have the same `TELEGRAM_BOT_TOKEN`, `ADMIN_SESSION_SECRET`, and Supabase credentials. If using Netlify's generated URL, open Admin from that deployed site to pair; do not set the webhook to localhost.
- To switch Telegram accounts, while OTP is ON first turn it OFF using the current connected account's code, then click ON and send the new one-time pairing command from the new account. A matching pair updates the server-side chat ID and re-enables OTP. `TELEGRAM_CHAT_ID` in `.env.local` remains a fallback before a database chat is connected.
- The webhook validates Telegram's `X-Telegram-Bot-Api-Secret-Token` using a secret derived from the private bot token, only accepts private-user `/start CODE` commands, checks the expiring HMAC-hashed code, and atomically clears it on successful use. Never expose the bot token or commit `.env.local`.

## 8. Automatic Amazon prices — not active yet

The form saves `priceSource` and `priceCheckedAt` fields so the catalogue can distinguish manually verified prices from API prices. **This package does not call Amazon to sync prices yet.** Amazon India’s current Creators API documentation says API access requires Associates enrollment, at least 10 qualifying sales in the trailing 30 days, Creators API registration and credentials. Review the current official docs before enabling price-sync code:

- https://affiliate-program.amazon.in/creatorsapi/docs/en-us/introduction
- https://affiliate-program.amazon.in/creatorsapi/docs/en-us/api-reference/operations/get-items

Once your account is eligible and credentials have been issued, a server-side scheduled sync can be added using the official API and its permitted price/image resources. Do not scrape Amazon pages or hardcode estimated prices as live prices. Netlify scheduled functions/another scheduler and secure server-only Amazon credentials would also need to be configured. Prices may change between sync and customer checkout, so always encourage final price verification on Amazon.

## 9. Security / troubleshooting

- `swf_products`, and after the migrations `swf_bundles`, `swf_analytics_events`, `swf_banners`, and `swf_admin_auth_challenges` have RLS enabled and public browser-role grants revoked. Public pages only get published catalogue data through server-side reads; admin writes require the signed admin session and server-side Supabase secret.
- Login sessions expire after 8 hours; sign out when finished. Use a strong unique password and a random session secret.
- If `/admin` says Supabase isn't configured, confirm the environment variable names and restart the dev server / redeploy after changing them. If sign-in says Telegram is not configured, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, run `supabase/admin-auth-telegram-v4.sql` in the same project, and restart/redeploy.
- If the API says the table doesn't exist, run `supabase/schema.sql` in the correct project's SQL Editor and verify the project URL/key pair.
- If product saves work but the public catalogue doesn't update, inspect Netlify Functions/logs and confirm the environment variables are configured in the production deploy scope.

## 10. User Support (Telegram, WhatsApp and Instagram)

To enable the **User Support** area in the admin dashboard, the three public footer contact icons, and the floating Telegram help button in the bottom-left corner:

1. Run `supabase/admin-support-v1.sql` once in the same Supabase project used by this site's `.env.local` / deployment environment. This creates the single-row `swf_support_settings` table and denies direct browser-role access; the admin/public server routes read and write the settings using server-only Supabase credentials.
2. Open `/admin`, choose **User Support**, and save the contact URLs you want visitors to use. Use full official HTTPS links:
   - Telegram: `https://t.me/your_support_username`
   - WhatsApp: `https://wa.me/919876543210` (include country code, digits only in the phone path)
   - Instagram: `https://www.instagram.com/your_profile/`
3. Set each channel ON or OFF with its own toggle and click **Save support settings**. OFF hides that channel from the footer; Telegram OFF also hides the floating Telegram button. The URL remains saved while OFF, so there is no need to delete and paste it again. Saving changes support icons for every visitor using this deployment/database; refresh the public website to see the update. Empty channels can remain blank.
4. The Telegram floating support button appears at the bottom-left on all public pages when the Telegram link is configured. It is hidden within `/admin` and `/admin/login`. The footer shows only channels that have a saved link. Links open in a new tab/app using the official HTTPS domain.

No Telegram bot token, administrator login secret, WhatsApp API credential, or Instagram password is needed for visitor contact links. These are public contact destinations only; do not place private credentials in these fields.

## Price-tamper protection

Public catalogue endpoints are read-only. Product create/update/import routes require a valid admin session cookie and same-origin mutation request, validate price and original/list-price bounds on the server, and write through the server-only Supabase elevated key. The products table grants no direct write access to `anon` or `authenticated` browser roles. A local proxy or browser developer tools may alter a value shown only in that user's own page, but that does not change the authoritative database unless an authenticated, authorized admin API request is accepted. Use HTTPS for production; no application can honestly be promised “unhackable.”


## 12. Bundle table repair and User Support ON/OFF toggles (v4)

If the Admin Bundles screen shows `PGRST205` / `Could not find the table public.swf_bundles`, open Supabase SQL Editor for the exact project used by this deployment, paste and run `supabase/admin-bundles-support-toggles-v4.sql`, then reload the Bundles section. This idempotent repair creates `swf_bundles` if the earlier v2 migration was skipped and refreshes the PostgREST schema cache. It also adds `telegram_enabled`, `whatsapp_enabled`, and `instagram_enabled` columns to `swf_support_settings`.

In Admin → User Support, set a link once, use each channel's ON/OFF toggle, and click **Save support settings**. OFF hides the channel from the public footer; Telegram OFF also hides the floating Telegram support button. The URL remains saved, so switching ON later does not require re-pasting it. The toggles only affect this app's public support icons.


## Multi-marketplace products + Cuelinks

- Product catalogue is still populated manually or through the CSV import. Cuelinks' public Monetization API offers campaign discovery, URL-to-tracking-link conversion, offers and reporting; it is not a universal product-image/price catalogue feed.
- In **Admin → Add a product**, choose a provider (Amazon India, Flipkart, Myntra, Meesho, Shopsy, AJIO or Other), enter the exact product page URL, then create/paste the affiliate tracking URL.
- To use **Generate Cuelinks link**, create a Cuelinks Monetization API key in the publisher dashboard with the `write:links` scope and set `CUELINKS_API_KEY` in `.env.local` and Netlify environment variables. Keep it server-side; never use a `NEXT_PUBLIC_` name or commit the key.
- The generator only saves a link when Cuelinks reports `affiliated: true`. If it reports false, request campaign approval or use a different approved campaign before publishing.
- CSV imports support `provider`, `providerUrl`, and `affiliateUrl`. Older Amazon CSV files using `amazonUrl` remain supported. Products without a tracked URL may be saved as Draft, but publishing is blocked until an affiliate URL is present.
- The product database stores provider metadata inside `product_data` JSON, so adding these fields does not require a new SQL migration for existing `swf_products` tables.
