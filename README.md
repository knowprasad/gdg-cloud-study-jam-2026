# Cloud Study Jam — Guild Clubhouse

Mobile-first leaderboard and progress website for GDG on Campus ABV-IIITM Gwalior.
Guild Clubhouse is the selected design. Production builds show only this direction.

**Team preview:** https://gdg-cloud-study-jam-2026.pages.dev/

**Source:** https://github.com/knowprasad/gdg-cloud-study-jam-2026 (private).

This is a team-feedback preview: all 500 learners, scores, streaks and guild assignments are fictional. Real scoring and the Google Sheets pipeline are not connected.

## Run locally

```sh
npm ci
npm run dev -- --port 5174
npm run build
npm run preview -- --port 4174
```

Use **Find my place** with `Aarav` / `DEMO005` or `Nandini` / `DEMO500`. Search, guild filtering, personal progress, guild pages, badge catalogue and light/dark themes work. Only the chosen demo ID and theme are remembered locally; this is not authentication.

Local development retains comparison routes `?design=canvas` and `?design=builders`. Production always selects Clubhouse and hides the design chooser.

## Deployment

Build output is `dist/`. Intended host: Cloudflare Pages. See `docs/deployment.md` for the deployment record and repeatable commands.

## Team feedback

Please review on a phone first: find yourself using a sample profile, compare guilds, explore badges, and try both themes. Report unclear labels, hard-to-read text, awkward taps or unexpected behavior, with device/browser and page name.

## Assets and credits

The supplied GDG chapter badge is preserved intact. Google Cloud product marks identify products, not issued curriculum badges. Footer folk pattern and skyline are adapted from DevFest Bhopal, visibly credited; the skyline is decorative reference artwork, not college architecture. Other references are recorded in `docs/reference-board.md`. Interface icons: Phosphor (license in `public/icons/`). Typeface: Manrope (license in `public/fonts/`).

No private student records or credentials are included. Local research captures, handoff notes, build output and browser evidence are excluded from Git.
