---
name: Study Jam 2026 design previews
description: Three active coded previews; Guild Clubhouse remains preferred, selected for continued development.
colors:
  action-yellow: "#fbbc05"
  action-hover: "#e8ad00"
  action-ink: "#1a1a1a"
  clubhouse-page: "#f8f9fa"
  clubhouse-ink: "#202124"
  clubhouse-muted: "#5f6368"
  clubhouse-accent: "#326548"
  clubhouse-wash: "#e9f0e4"
  clubhouse-dark-page: "#17211c"
  clubhouse-dark-accent: "#bdd5a9"
  canvas-page: "#fbfaf7"
  canvas-accent: "#265ca6"
  canvas-collector: "#f6edda"
  canvas-collector-border: "#e7d7b2"
  canvas-dark-page: "#191c21"
  canvas-dark-accent: "#a8c9fa"
  canvas-dark-collector: "#302d25"
  builders-page: "#f5f8fc"
  builders-ink: "#1e3047"
  builders-accent: "#235ca7"
  builders-wash: "#e6effb"
  builders-dark-page: "#131f2d"
  builders-dark-accent: "#a7ccff"
  surface-light: "#fff"
  gdg-blue: "#4285f4"
  gdg-red: "#ea4335"
  gdg-green: "#34a853"
typography:
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
  clubhouse-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px,4.4vw,66px)"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-.045em"
  canvas-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(40px,4.1vw,60px)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.04em"
  builders-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px,5.6vw,80px)"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-.04em"
rounded:
  panel: "16px"
  control: "8px"
  pass: "18px"
  lens: "12px"
  rivalry: "14px"
  pill: "999px"
  canvas-arch: "150px 150px 18px 18px"
components:
  primary-action:
    backgroundColor: "{colors.action-yellow}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
---
# Design System: Study Jam previews

## Overview
Exactly three active directions are registered in `src/previews.js`: **Guild Clubhouse** (`?design=clubhouse`), **Campus Canvas** (`?design=canvas`) and **Builders League** (`?design=builders`). Clubhouse is retained, preferred and the default. Cloud Expedition is removed from the active set; unsupported design queries normalize to Clubhouse. The user selected Clubhouse for continued development.
Clubhouse pairs a collectible selected-learner pass with sage/forest progress surfaces. Canvas is a warm, neutral, Bhopal-inspired composition with an original arched ten-course collector and interactive course lens. Builders uses bold blue typography, nearby competitors and a left-side personal standings aside on desktop. All are soothing, purposeful gamification for a college event.

## Colors
Frontmatter records intentional active palette additions, not every legacy CSS literal. `src/style.css` supplies Clubhouse/shared styles; `src/variants.css` supplies Canvas/Builders overrides. Yellow pill actions are shared; forest, warm neutral and blue surfaces distinguish the concepts. Dark themes retain each direction's identity with separate page, surface, ink and accent variables. Preserve official asset colors and use the four-color strip sparingly.

## Typography
Self-hosted Manrope TTF weights 400–800 (five files) use `font-display:swap` and sans-serif fallback. Display declarations request weight 750; these are CSS values, not an additional font file. At ≤760px hero sizes are Clubhouse 43px, Canvas 39px and Builders 48px; small-screen overrides reduce Canvas/Builders further. Rankings and points use tabular figures. Do not import reference-site fonts into these previews.

## Layout
Sticky website header with intact supplied chapter badge (54px desktop, 46px phone), readable campus host text, desktop navigation and a mobile link row; no bottom tabs. Main width is 1180px. Canvas pairs its hero copy with the collector and uses a 260px right standings aside. Builders uses a 240px left standings aside (215px at ≤1100px), with standings on the right; at ≤760px standings precede the aside in one column. Rival cards become stacked rows on phones. Canvas retains five collector columns; the shared personal badge collection uses three columns on phones.

## Elevation & Depth
Use fine dividers and tonal hierarchy. Clubhouse's pass has `0 14px 35px -28px rgba(32,56,39,.45)` shadow and restrained desktop tilt; Canvas relies on its arch and lens surface, Builders on the bordered rival track and selected-row fill. Avoid adding a card around every datum.

## Shapes
Use the documented panel, pass, lens and pill radii. Canvas's arch becomes `110px 110px 16px 16px` on phones; its personal collection symbols are circular. Builders uses 14px collection symbols, 12px guild tiles and flat course rows. Shared avatars remain circular.

## Components
All three share 500 fictional participants, eight guilds, ten courses and routes for leaderboard, profile/home, guilds and badges. Search, guild filtering, show more, native profile dialog, demo selection, course links, unfinished-course filtering and theme switching work. Local storage optionally remembers demo profile/theme. Canvas badge buttons update `aria-pressed` and the live course lens; they do not award completion. Builders rivals link to sample profiles and highlight the selected learner.
Keep visible accent focus rings, labelled controls, empty-state reset, wrapping names and reduced-motion support. Clubhouse earned marks and Canvas collector entrances animate only when reduced motion is not requested. Official Google Cloud product icons identify products, not issued badges; interface icons are Phosphor SVGs. The organizer-supplied chapter badge stays intact.

## Do's and Don'ts
- Do compare all three with identical sample data and preserve the preferred Clubhouse direction.
- Do retain college-only positioning, working website navigation, honest sample labels and asset credits.
- Don't imply final approval, live data, sign-in, private roll lookup, verified badges or prize integration. Scoring, ties, guild policy and streak rules remain pending; displayed mock figures are not proposed policy.

## Footer refinement — 28 October 2026
Clubhouse now has 32px decorative folk bands adapted from retained Bhopal evidence and credited visibly. A sage footer contains a typographic invitation, four columns collapsing to two on phones, intact chapter logo and attribution. No city artwork is reused.

## Mobile reading refinement
Clubhouse uses16px learner names and intro copy,14–15px footer links,13px secondary row text,44px theme/navigation targets. Mobile rows retain badge progress. White theme uses warm near-white/sage; dark theme uses charcoal forest with softened text. Footer skyline is retained Bhopal artwork explicitly credited, not college architecture. Connect uses known public chapter links.
