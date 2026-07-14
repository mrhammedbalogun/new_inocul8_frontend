# Homepage Redesign — Design Spec

**Date:** 2026-07-13
**Source brief:** `Inocul8_Webuzo/redesign-inocul8-prompt.txt`
**Direction (approved):** Editorial + product hybrid — warm, light, Fraunces-led editorial typography (One Medical warmth) with Stripe/Linear-grade signature moments (animated hero composition, bento trust grid, one dark corporate band).

## Goals

Increase bookings (Cowva), WhatsApp conversations, trust, and brand authority while keeping Lighthouse ~100 across the board and preserving all SEO behavior. The visitor's first impression should be: *"This is a premium healthcare company I can trust with my family's health."*

## Locked constraints (do not violate)

- **Booking is external**: all Book CTAs → `site.bookingUrl` (Cowva, new tab); WhatsApp CTAs → `wa.me`. No in-house booking flow.
- **No doorstep/home-visit language** — positioning is "at your convenience" (clinic + access points); corporate on-site is kept.
- **CMS-driven content stays CMS-driven.** Every field in the existing `/home/` payload (`HomeContent`, stats, value_props, steps, testimonials, service_cards, faqs, blog_teasers) continues to power its section. Redesigned sections must accept the same props.
- **Frontend-first for new content** (approved): new sections (why-prevention, corporate band, trust marks, newsletter) ship with polished static content in `src/lib/content.ts`-style modules using the existing fallback pattern; CMS wiring is a follow-up backend task.
- **Light mode only** (`color-scheme: light`), existing brand tokens (teal brand scale, ink, coral accent, gold) remain the palette. Extend, don't replace.
- **FAQ JSON-LD, generateMetadata, sitemap, robots** — all preserved.
- Header: minor polish only. Footer: full upgrade (approved).

## Approved decisions

| Decision | Choice |
|---|---|
| New-section content | Frontend-first static, CMS later |
| Animation | Framer Motion (`motion` package), selectively; CSS elsewhere |
| Imagery | Custom SVG illustration + abstract gradients (no photos yet) |
| Scope | Homepage sections + footer upgrade + minor header polish |

## Section architecture (top to bottom)

Storytelling arc: hook → proof → problem → solution → process → differentiation → segments → social proof → content authority → objections → action.

### 1. Hero (signature moment)
- Full-viewport-ish (min-h ~85vh desktop, natural height mobile), soft mesh gradient + subtle organic blob shapes.
- Left: CMS `hero_badge` (live rating pill), H1 from `hero_title` with `hero_title_highlight` in gradient text, `hero_subtitle`, primary CTA (coral, Book → Cowva) + secondary CTA (WhatsApp, outline w/ WhatsApp glyph). Micro trust row under CTAs (e.g. "Certified vaccines · Same-day yellow-fever cards · Pay-small-small plans").
- Right (desktop) / below (mobile, simplified): **floating protection-journey composition** — 3–4 glassmorphic SVG cards (appointment confirmed, vaccination record w/ ticked doses, yellow fever card, 4.9★ Google badge) gently floating (CSS transforms), staggered entrance via Framer Motion, subtle pointer-parallax on desktop only (disabled for touch + reduced-motion).
- LCP element is the H1 text — no image/JS gating; the composition is inline SVG, below-the-fold-safe on mobile.

### 2. Trust bar (replaces StatsBar)
- Animated count-up stats from CMS `stats` (respects reduced motion; server-rendered final values as fallback content) + credibility marks row: "Featured by Univ. of Utah Lassonde Institute", Google rating mark, certification badges (static content module).

### 3. Why prevention matters (NEW)
- Editorial two-column: narrative headline ("Prevention is safer, easier and cheaper than a cure") + 3 concise risk/benefit points with inline SVG spot illustrations. Warm brand-50 background band. Static content module.

### 4. Services (bento grid)
- CMS `service_cards` (4 cards) in an asymmetric bento layout (first card featured, larger). Each card: icon in tinted squircle, title, body, "Learn more →" link to its `/what-we-do/...` href, hover lift + icon micro-animation. Grid degrades to single column on mobile.

### 5. How booking works (interactive timeline)
- CMS `steps` (3 steps) as a horizontal timeline (vertical on mobile) with an animated progress line drawn on scroll (Framer Motion `whileInView`), numbered nodes, and a right-aligned booking preview mini-card ("Response within minutes on WhatsApp"). CTAs: `steps_cta_label` → Cowva + WhatsApp secondary.

### 6. Why Inocul8
- CMS `value_props` (4) as clean feature cards in a 2×2 (desktop) grid with staggered reveal; icons get soft gradient rings.

### 7. Corporate solutions (NEW — the dark band)
- `ink-950` background with subtle teal mesh; headline for HR/companies, 3 bullet outcomes (on-site vaccination days, screening drives, reduced sick leave), CTA "Request corporate proposal" → `/contact` + WhatsApp. Static content module. This is the one high-contrast moment on the page.

### 8. Testimonials
- Keep the marquee (Google-synced data, hover-pause, reduced-motion fallback already exist). Card upgrade: verified-source badge linking to `reviewUrl` for Google reviews, star row, avatar initial disc, service tag when derivable. Section header uses CMS testimonial fields + `fillRating`.

### 9. Blog
- CMS `blog_teasers`: first as a featured wide card, remaining two stacked; category chip, computed reading-time placeholder (static est.), hover image-less gradient headers keyed by category. Links preserve exact slugs.

### 10. FAQ
- CMS `faqs` in an upgraded accordion: animated height (Framer Motion `AnimatePresence` or CSS grid-rows trick), plus/cross icon rotation, one-open-at-a-time, keyboard accessible (`<button aria-expanded>`); FAQ JSON-LD unchanged. "Still unsure?" WhatsApp link at the bottom.

### 11. Final CTA
- CMS `cta_title`/`cta_description` on a brand gradient panel with organic shapes; Book + WhatsApp + phone. Rounded container floating over the footer edge.

### 12. Footer (upgrade)
- Large organized footer on `ink-950`: brand + mission column, Services links (what-we-do tree), Quick links, Contact (address, phone, WhatsApp, email, hours), newsletter signup form (posts to existing contact API route or mailto-fallback — implementation plan decides; no fake success states), social icons, certifications row, legal (privacy/terms) + copyright. Keep all current footer links so no internal-link SEO regressions.

Mobile sticky `MobileBookBar` stays, restyled to match.

## Design system extensions (globals.css `@theme`)

- Spacing/typography stay Tailwind-native; add: `--shadow-float` (deeper card shadow for hero cards), `--radius-3xl`, gradient utility classes (`.bg-mesh-warm`, `.bg-band-dark`), and standard motion durations/easings as CSS vars (`--ease-out-quart`, 150/300/600ms scale).
- New shared components: `SectionHeader` (eyebrow/title/description — replaces per-section duplication), `Reveal` (Framer Motion whileInView wrapper, reduced-motion aware), `CountUp`, `GlassCard`, `Marquee` stays.
- All motion respects `prefers-reduced-motion` (existing global override stays; Framer Motion components also check `useReducedMotion`).

## Data / content strategy

- New static content lives in `src/lib/content-extra.ts` (or extends `content.ts`): `preventionPoints`, `corporateSolutions`, `trustMarks`, `footerContent`. Typed the same way as existing modules so later CMS wiring is a drop-in (mirror the `getHome` fallback pattern).
- No backend changes in this project. A follow-up task will add these blocks to the Django `/home/` payload.

## Copy

All static copy rewritten to be persuasive, simple, medically trustworthy; Nigerian-context aware (yellow fever cards, pay-small-small, Lagos access points). CMS-held copy is *not* changed in code (fallbacks may be refreshed to match tone) — improved CMS copy will be suggested separately for the user to paste into Django admin, so code and CMS don't fight.

## SEO / accessibility / performance

- One H1 (hero). Correct H2/H3 hierarchy per section. FAQ schema preserved; existing Organization/MedicalClinic schema untouched.
- WCAG 2.2 AA: contrast-checked tokens (brand-600+ on white for text), focus-visible rings everywhere, skip link (add if missing), semantic landmarks, `aria-expanded` accordions, keyboard-reachable marquee content.
- Performance: Framer Motion imported only in leaf client components (`LazyMotion`/`m` with `domAnimation` to keep bundle small); all sections remain Server Components except interactive leaves; inline SVG only (no image LCP); zero layout shift (fixed-size media boxes); target Lighthouse ≥95 all categories on mobile.

## Edge cases

- API down → static fallbacks render everything (existing pattern; new sections are static anyway).
- Empty testimonials/teasers arrays → sections hide gracefully.
- Reduced motion → all entrances become instant/opacity-only; marquee becomes scrollable row (already implemented).
- 320px width, high zoom, long text → fluid type via `clamp()`, no horizontal scroll.

## Out of scope

- Django/CMS model changes; header mega-menu redesign; dark mode; real photography; in-house booking; other pages (service pages, blog) beyond shared footer.

## Verification

- `npm run build` clean; dev-server visual pass at 320/375/768/1280/1920 via browser tools with screenshots; Lighthouse run on the built app; keyboard-only walkthrough; reduced-motion emulation check; confirm FAQ JSON-LD in page source and all preserved hrefs present.
