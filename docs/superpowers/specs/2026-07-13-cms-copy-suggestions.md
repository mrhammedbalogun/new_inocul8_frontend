# CMS Copy Suggestions — Homepage (Django Admin → Homepage content)

Improved copy for each CMS field, matching the redesigned homepage's tone:
professional but human, simple language, Nigerian-context aware, no unsourced
statistics. Paste the values you like into Django admin; `{rating}`/`{count}`
placeholders are filled automatically with live review numbers.

Positioning note: the current build is clinic + access points + corporate
on-site (no doorstep/home-visit language) — every suggestion below respects
that.

| Field | Current (fallback) | Suggested |
|---|---|---|
| hero_badge | `Rated {rating} by {count}+ patients` | Keep as is — clear, specific, and the placeholders already do the proof-point work. |
| hero_title | `Vaccination & preventive care, at your convenience.` | `Protection for the people you love, on your schedule.` |
| hero_title_highlight | `at your convenience.` | `on your schedule.` |
| hero_subtitle | `Convenient, affordable and timely immunization for your family and your team — childhood vaccines, travel health & yellow fever cards, and adult vaccines across Lagos.` | `Childhood immunizations, travel health and yellow fever cards, and adult vaccines — from a licensed clinic and access points across Lagos, booked in minutes.` |
| hero_cta_primary | `Book an Appointment` | Keep as is — action-first, no change needed. |
| hero_cta_secondary | `Chat on WhatsApp` | Keep as is — action-first, no change needed. |
| services_eyebrow | `What We Do` | Keep as is. |
| services_title | `Preventive healthcare, end to end` | `Preventive care for every stage of life` — more benefit-led, mirrors the childhood-to-corporate span shown in the section below it. |
| services_description | `From a baby's first shots to a healthier workforce, Inocul8 covers every stage of preventive care.` | Keep as is — already concrete and on-brand. |
| steps_eyebrow | `How It Works` | Keep as is. |
| steps_title | `Protected in three simple steps` | Keep as is — punchy, sentence case, benefit-led already. |
| steps_description | `No queues, no guesswork. Book in minutes and get seen at an access point near you.` | Keep as is. |
| steps_cta_label | `Book Now` | Keep as is. |
| whyus_eyebrow | `Why Choose Us` | Keep as is. |
| whyus_title | `Your trusted preventive-health partner` | Keep as is. |
| whyus_description | `Understanding vaccines and tracking immunization schedules is hard. We handle the details so you get care at your convenience.` | `Understanding vaccines and tracking immunization schedules is hard. We handle the details so you get care on your schedule.` — swaps "at your convenience" for "on your schedule" to match the new hero highlight and avoid echoing doorstep-era phrasing. |
| testimonials_eyebrow | `Loved by patients` | Keep as is. |
| testimonials_title | `Trusted across Lagos and beyond` | Keep as is. |
| testimonials_description | `Rated {rating} from {count}+ reviews — here's what people say about care with Inocul8.` | Keep as is — placeholders carry the proof, copy is warm and concrete. |
| blog_eyebrow | `From the blog` | Keep as is. |
| blog_title | `Talk vaccines with Inocul8` | `Vaccine guides and health tips` — clearer and more searchable than the current conversational phrasing, still friendly. |
| blog_description | `Practical guides on travel health, yellow fever cards and preventive care in Nigeria.` | Keep as is — concrete, under 160 chars. |
| faq_eyebrow | `FAQ` | Keep as is. |
| faq_title | `Questions, answered` | Keep as is. |
| faq_description | `Everything you need to know before you book. Still unsure? Reach out — we're happy to help.` | Keep as is — warm, concrete, invites contact. |
| cta_title | `Ready to protect what matters most?` | Keep as is. |
| cta_description | `Book a vaccination or a free consultation today — at an access point near you.` | Keep as is — action-first, matches clinic/access-point positioning. |

## Summary of actual changes (5 of 27 fields)

1. **hero_title** / **hero_title_highlight** — reframes the promise around
   scheduling flexibility rather than repeating "convenience" (which also
   appears in `whyus_description`), giving the page more varied language.
2. **hero_subtitle** — tightened to one sentence, keeps the required mentions
   (childhood vaccines, travel health & yellow fever cards, adult vaccines,
   Lagos), drops "for your family and your team" (redundant once Corporate
   has its own band) and swaps in a concrete proof clause ("booked in
   minutes").
3. **services_title** — more benefit-led opening word ("Preventive care for
   every stage of life" vs. "Preventive healthcare, end to end").
4. **whyus_description** — replaces "at your convenience" with "on your
   schedule" so it doesn't repeat the pre-redesign phrase and stays
   consistent with the new hero highlight.
5. **blog_title** — swaps a conversational, slightly vague title for one
   that describes what's actually in the section and is easier to scan.

Everything else is already strong as written — no changes suggested for the
sake of change.
