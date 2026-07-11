# AdSense Readiness Plan

## What’s already done
- Added `about.html`, `contact.html`, and updated `privacy.html` with a generic contact email.
- Added footer navigation to `About`, `Privacy`, and `Contact` pages.
- Added `robots.txt` and `sitemap.xml` for search engines.
- Added canonical tags, Open Graph metadata, and Twitter card tags.
- Added JSON-LD structured data for the homepage and About page.
- Added preconnect hints for fonts, Pexels, and Google Ads.
- Added preload for `style.css` and changed scripts to `defer`.
- Improved hero image prefetch logic to respect slow connections and data saver.

## Technical optimization checklist
1. Images
   - Use Pexels-supplied responsive image sizes and cache small preview images in localStorage.
   - Use layered blur-up backgrounds for faster perceived loading.
   - Only prefetch images on fast connections (not on `save-data` or low-quality networks).
2. Caching
   - Use Cloudflare Pages cache settings for static assets once deployed.
   - Keep a `Cache-Control` policy for `robots.txt`, `sitemap.xml`, `style.css`, `app.js`, and HTML pages.
3. Performance
   - Keep JavaScript lightweight and defer non-critical scripts.
   - Use `preconnect` to external asset origins.
   - Keep page CSS small, and avoid large render-blocking resource chains.
4. SEO
   - Ensure every page has a unique `<title>` and `<meta name="description">`.
   - Provide canonical links for core pages.
   - Submit `sitemap.xml` in Google Search Console.
   - Use `robots.txt` to ensure all public pages are crawlable.

## Content & policy checklist
- ✅ No adult or sexually explicit content.
- ✅ No graphic violence or hate speech.
- ✅ No promotion of illegal activity or illicit products.
- ✅ No personal data exposure.
- ✅ No misleading claims or health/legal advice.
- ✅ No requests for users to click ads.
- ✅ All third-party images are sourced via Pexels and referenced in the app.
- ✅ Contact, About, and Privacy pages are present and visible.

## 4-week content schedule
### Weekly cadence
- **Monday:** Publish 1 new quote or quote card update.
- **Wednesday:** Publish 1 short article or themed guide (500–900 words).
- **Friday:** Publish 1 visual gallery, photo essay, or community highlight.

### 4-week plan
- **Week 1:**
  - Mon: Publish a new Motivation quote card.
  - Wed: Publish a short article: “How a Daily Quote Can Sharpen Your Morning Routine.”
  - Fri: Publish a photo gallery: “Calm Mornings: 5 Images to Start Your Day Slowly.”
- **Week 2:**
  - Mon: Publish a new Healing quote card.
  - Wed: Publish a guide: “3 Simple Mindful Habits to Carry Through Your Day.”
  - Fri: Publish a visual post or user story about rest and recovery.
- **Week 3:**
  - Mon: Publish a new Hustle quote card.
  - Wed: Publish an article: “Staying Productive Without Burning Out.”
  - Fri: Publish a gallery of peaceful workspaces or journal prompts.
- **Week 4:**
  - Mon: Publish a Calm quote card.
  - Wed: Publish a roundup: “Best Quotes for Focus, Healing, and Calm.”
  - Fri: Publish a short video concept or image-heavy collection.

## Next actions
1. Deploy the updated site and verify `robots.txt` and `sitemap.xml` are reachable.
2. Submit the sitemap in Google Search Console.
3. Run Lighthouse on homepage, About, and Privacy pages.
4. Continue adding original content weekly for 4–6 weeks before final AdSense review.
5. If Google requests changes, address them quickly and re-submit.
