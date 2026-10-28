# Deployment record

## Latest snapshot release — 28 October 2026

Source commit `364c6cd` was pushed to GitHub and deployed to https://80c24b41.gdg-cloud-study-jam-2026.pages.dev . Production https://gdg-cloud-study-jam-2026.pages.dev/ now defaults to real sanitized snapshot data. Public JSON was verified HTTP 200 with 486 validated participants. See [v1-release.md](v1-release.md) for exclusions, verification limits and manual refresh instructions. The older production details below describe previous releases.

## Production

- Project: Cloudflare Pages `gdg-cloud-study-jam-2026`, production branch `main`.
- URL: https://gdg-cloud-study-jam-2026.pages.dev/
- Source: private repository https://github.com/knowprasad/gdg-cloud-study-jam-2026.
- Latest verified website release: immutable deployment https://8042a8ef.gdg-cloud-study-jam-2026.pages.dev, built from website commit `5f8acc9` on 28 October 2026.
- The release has the Guild Clubhouse interface, public rules, profile score ledger, and fictional example learners. It does not show real student data or the local Bingo work.

## Release history

| Date | Deployment | Source | Notes |
|---|---|---|---|
| 28 Oct 2026 | `https://554b9291.gdg-cloud-study-jam-2026.pages.dev` | `6eabf68` | Initial private-repository team preview; Clubhouse locked as production direction. |
| 28 Oct 2026 | `https://8042a8ef.gdg-cloud-study-jam-2026.pages.dev` | `5f8acc9` | Scoring rules and profile score ledger. Browser verification covered the rules route and example profiles. |

Commit `e3aff49` adds organizer tab-order code only; it is not a website deployment. Local changes after these releases are not published.

## Repeat the direct Pages upload

```sh
npm ci
npm run build
npx wrangler@4.45.0 pages deploy dist --project-name=gdg-cloud-study-jam-2026 --branch=main
```

Wrangler login is required. This project uses direct uploads; pushing to GitHub alone does not publish a website update. Do not deploy the experimental `functions/api/leaderboard.js` or connect real workbook data until the privacy and identifier release blockers in [project-handoff.md](project-handoff.md) are resolved.

Wrangler `4.154` previously attempted automatic framework conversion during project setup. That process was stopped and its package changes were reverted. The verified static upload used Wrangler `4.45.0`; no runtime framework/plugin dependency was added.
