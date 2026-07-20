# Shaheen Shafi Unani Clinic & Hijama Center — website

Static, GitHub-Pages-ready site for the clinic in Model Colony, Karachi.
Plain HTML/CSS/JS — no build step, no framework, no dependencies to install.

## Files

| File | What it is |
|------|-----------|
| `index.html` | The whole single-page site (all sections + SEO meta + JSON-LD structured data). |
| `styles.css` | All styling. Palette = herbal green + amber/honey + sage-cream; WhatsApp green is reserved for the booking CTA only. |
| `script.js` | Behaviour: WhatsApp/phone links, EN/اردو language toggle, booking form → pre-filled WhatsApp, mobile nav, scroll reveal. **Contains the one contact-number constant (see below).** |
| `favicon.svg` | Site icon (green disc + amber 8-point Sunnah star). |
| `og-image.svg` | Social-share (Open Graph / Twitter) preview image. |
| `CNAME` | GitHub Pages custom domain — contains exactly `shaheenshafi.com`. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (no Jekyll processing). |
| `robots.txt` | Allows all crawlers; points to the sitemap. |
| `sitemap.xml` | One-URL sitemap for the homepage. |

## ▶️ THE ONE LINE TO CHANGE THE WHATSAPP / PHONE NUMBER

Open **`script.js`** and edit the two constants at the very top:

```js
const CLINIC_WHATSAPP       = "923000000000";                 // <-- real number, digits only, no + or spaces
const CLINIC_PHONE_DISPLAY  = "+92 3XX XXX XXXX (to be confirmed)"; // <-- how it appears on the page
```

- `CLINIC_WHATSAPP`: international format, **digits only** (no `+`, no spaces). Pakistan example: `92` + `3001234567` → `"923001234567"`.
- `CLINIC_PHONE_DISPLAY`: the human-readable version shown on the page and in the footer.

Every WhatsApp button, the floating button, all `Call` / `tel:` links, and the booking form's pre-filled message read from these two constants — so this is the **only** place to update. After setting the real number, you can also delete the "(number being confirmed)" note lines in `index.html` (search for `cta-note` and `Number being confirmed`).

Also update the placeholder `telephone` in the `MedicalClinic` JSON-LD block in `index.html` (search for `"+920000000000"`).

## 🗣️ How to update testimonials

Testimonials live in `index.html` in the `#reviews` section. The three shown are **clearly marked "Sample"** and must be replaced with real, verified reviews.

To replace one, find a `<article class="review …">` block and:
1. Remove the two `<span class="sample-tag">` lines (the "Sample" badge).
2. Edit the `<blockquote>` text (keep the `data-lang="en"` / `data-lang="ur"` pair if you want both languages; you can leave the Urdu one empty or translate it).
3. Edit the `.who` line (name + which service).

Recommended: keep pointing patients to the Google Business Profile link already at the bottom of the section (`maps.app.goo.gl/VTyGuWixhJyLerCS6`) and paste in genuine Google reviews as they come in.

## Other placeholders to confirm with the owner

- Practitioner name: `Hakeem [Name to be confirmed]` in the `#about` section.
- Opening hours: "to be confirmed" in the `#location` section and in the JSON-LD `openingHoursSpecification`.
- Approximate geo coordinates (24.9072588, 67.1925137 for Model Colony) in the JSON-LD and `geo.position` meta — refine to the exact clinic point if desired.

## Preview locally

No build needed. From this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser (the Google Map iframe and the on-demand Urdu font need internet).

## Deploy (handled by the orchestrator)

Push this folder to a repo, enable GitHub Pages on the branch, and point the `shaheenshafi.com` DNS at GitHub Pages. `CNAME` and `.nojekyll` are already in place.

---

### Medical-honesty note (do not remove)
The site frames Hijama and Unani strictly as **traditional / complementary care** and carries a visible medical disclaimer in the services section and footer. Do not add cure claims, guaranteed outcomes, or disease-specific promises — this protects the clinic legally.
