# V1 release status — 28 October 2026

This is the current release record; it supersedes older status notes in the handoff.

Guild display decision: guild names remain visible. Guild-head sections are hidden for every guild, including those with a resolved head, at the user's request for consistent presentation.

Latest UX pass: Bingo tiles are fixed buttons opening a centred native dialog, with close/Escape/backdrop dismissal and focus restoration. Grid stays in place on mobile. Removed generic “campus adventure,” “next level,” “a little further together,” and similar slogans from primary student routes in favor of event, task and progress labels. Live guild names now read Groups column C (“Guild name”); numeric column A remains the assignment key. Guild heads resolve from a unique name or a roll entry matched privately against Tracker, publishing only the public member ID. Build, guild/snapshot checks and live read passed; browser control still reports disabled, so rendered modal acceptance remains unverified.

Automatic refresh is now implemented: `/api/leaderboard` reads and sanitizes the main Sheet reports on demand, with a five-minute edge cache. Open visible pages recheck every five minutes. No website redeploy is needed for data changes. Existing random profile IDs are preserved by a server-only mapping; new IDs use a private HMAC secret in Cloudflare. Source failures return a marked-stale cached response, or the checked-in last-good public snapshot on a cold cache. This updates already-refreshed Sheet reports; it does not run Apps Script or scrape Skills profiles itself. Previous manual-publication limitations below are historical and superseded.

Latest Bingo correction (supersedes the Instagram-only replacement below): original nine tiles restored. Tile 6 requires posting/tagging the cloud story, following @gdg_oncampus_iiitm and DMing the roll number to that page. Tile 8 remains joining the GDG community page, with membership screenshot and roll number shared in the community group for verification. Approval IDs remain `story` and `community`; no separate follow square or additional points. No private roll information is collected or published by the website. Organizer approvals remain the source of completion; Sheet/script data was not modified.

Bingo revision: the social squares are “Share your cloud story” and “Follow GDG IIITM on Instagram,” linking to `https://www.instagram.com/gdg_oncampus_iiitm/`. Instagram uses its own `instagram` approval ID; historical community membership never marks the follow task complete. Existing source scores are preserved. The Sheet/script approval workflow has not been changed, so Instagram completion will remain open until an explicit Instagram approval is supplied through the publication pipeline.

Guild completion pass: added a ranked guild directory with four GDG crest treatments, shared average-score ranks, curriculum participation and completion counts; dedicated guild pages with shared member ranks, overall ranks and guild heads; personal guild position and overall guild rank. Head publication uses exact matching against a public guild member name; unresolved entries stay private and show “To be announced.” Leaderboard pagination now shows 30 learners at a time and preserves filters. Missing profile/guild links have recovery states. `check-guilds.mjs`, snapshot checks and build passed. Browser review was attempted again but the tool still reported local browser use disabled.

Student-facing polish: technical “Organizer snapshot/data” labels replaced with event identity and “Last updated”; loading/error text now describes standings. The Clubhouse hero and separator are restored on the real-data page, with actual learner count and no invented guild count. Theme now uses neutral Google-style surfaces, blue navigation, yellow actions, green completions and the four-colour GDG signature. Both dark and light palettes are defined; names and row metadata have explicit readable phone sizes. Build and data validation passed; browser visual review remains subject to the tool-access limitation below.

Source commit: `364c6cd`, pushed to GitHub. Verified Pages deployment: https://80c24b41.gdg-cloud-study-jam-2026.pages.dev . Stable production: https://gdg-cloud-study-jam-2026.pages.dev/ .

## Available

Production defaults to the real organizer snapshot. Demo mode remains explicitly available with `?data=demo`. The snapshot has 486 learners and no assigned guilds. Twelve rows were excluded because the same public learning profile appeared more than once. Source ranks are retained, so gaps are possible. The source workbook was read, not modified.

Implemented: public standings, name search, guild filter, public profiles, remembered profile, next-score nudge, component ledger, individual badge evidence, curriculum links, real Bingo approval progress, completion-card download, caption copying, guild-average view, rules, light/dark themes, responsive styles, loading/retry and saved-snapshot fallback. Hall of Fame currently shows a truthful awaiting-announcement state; no recipients were invented.

The latest publication time is displayed in IST. It means when this file was exported, not when every source profile was scraped. The publication is a static snapshot; it does not automatically update after Sheet edits.

## Update the website

Run from this repository:

```powershell
node scripts/export-public-snapshot.mjs
node scripts/check-snapshot.mjs
npm run build
npx wrangler@4.45.0 pages deploy dist --project-name=gdg-cloud-study-jam-2026 --branch=main --commit-dirty=true
```

The exporter only reads reports, creates an allowlisted public file, and preserves random public IDs in `.local-backups/public-id-map.json`. Keep that ignored mapping backed up privately; losing it changes profile URLs on the next export. It never writes to the Sheet or Apps Script. A failed export stops before replacing the public snapshot.

## Concrete limitations

- Guild assignments are missing in the source. Guild pages will populate after organizer assignments and a new export.
- Twelve ambiguous duplicate-profile rows require organizer review. They are withheld rather than silently merged. No source records were altered.
- Automatic six-hour publication is not configured. It needs a durable authorized job and private persistent ID mapping. Do not claim the static file is a live feed.
- The exporter currently relies on read access through Google CSV exports. It does not change sharing settings. The organizer must review the workbook's sharing separately; filtering the website cannot secure an already publicly shared workbook.
- Hall of Fame has no organizer-selected award entries. The second session has no configured date here.
- Roll lookup, real sign-in, admin and guild-head tools remain deferred. Name search works without exposing rolls.
- Browser-control tooling returned “Local browser use is disabled in Work settings,” even though the user's browser tab was open. This release has build, data, route-rendering and scoring checks, but the newly connected real-data UI has not passed a rendered browser review.

## Verification

Build, strict snapshot checks and scoring checks passed. The public JSON and API returned HTTP 200 and 486 validated learners. Leaderboard, guilds, catalog, Hall of Fame and profile markup rendered without `undefined` or `NaN`. Browser review remains outstanding as stated above.

The project is a functional snapshot release, not completion of the original entire v1/v2 wishlist. Remaining items are concrete above; do not hide them behind a “complete” claim.
