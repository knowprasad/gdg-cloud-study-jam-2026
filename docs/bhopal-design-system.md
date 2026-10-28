# DevFest Bhopal: observed design system and Study Jam adaptation

Source: https://devfest.bhopal.dev/ . Inspected 27 October 2026 using Firecrawl branding/images, browser screenshots, and computed DOM styles at 1440px and 390px. Raw evidence is saved locally in `.firecrawl/bhopal-branding.json`, `bhopal-measured.json`, `bhopal-motion.json`, `bhopal-1440.png`, and `bhopal-390.png`.

![Bhopal reference viewport](../design-previews/references/bhopal.png)

## Measured source tokens
- Background: `#F8F9FA`; primary text: `#202124`; yellow action: `#FBBC05` with dark `#1A1A1A` text; Google blue: `#4285F4`; secondary border: `#DADCE0`.
- Typeface: Inter. Body is 16px/24px. The event-name H1 is 44px/55px at desktop, weight 900. The separate illustrated display statement is larger; do not confuse the H1 measurement with the whole hero.
- Header: 81px desktop, fixed position; desktop nav is 14px/20px, weight 500. Yellow header action is 40px tall, padding 10px 20px, pill radius, 14px/20px weight 700.
- Primary and secondary buttons use the same pill geometry. Primary has yellow fill and no shadow; secondary uses the page surface and a fine border. General spacing follows a four-pixel base (Firecrawl inference).
- Visual identity: open neutral canvas, strong type contrast, local chapter attribution, sparse Google-color highlights, arched interactive illustration and regional pattern. Content is organized into event sections, not repeated generic cards.
- Motion evidence: reference art invites interaction; extracted browser animation evidence is in `bhopal-motion.json`. Reduced-motion captures intentionally suppress animation, so their near-zero transition values are not the normal-motion specification.

## What this college product inherits
- A chapter-led masthead using the supplied **GDG on Campus ABV-IIITM Gwalior** badge, plus separate Google Cloud program attribution.
- Confident type, a high-contrast yellow action, restrained Google colors, open standings and consistent rounded controls.
- Motion only on the collectible pass, earned marks and interaction feedback, with reduced-motion alternatives.

## What changes for this product
- This is a college event, not a Gwalior city event. No city-led campaign headline, copied lake artwork, conference tickets, speakers or regional ornament.
- Keep the preferred Clubhouse sage/forest family rather than copying every source color. Use Manrope already self-hosted in the prototype; do not add a second large font family just to imitate the reference.
- Replace the conference illustration with a working selected-learner pass and ten badge milestones. Keep search and standings reachable on phones.
- Do not invent scores, awards or attendance rules. All visible demo figures remain labeled synthetic.

This is a measured reference and adaptation record, not a pixel-copy specification or a claim that the result is objectively better than the reference.
