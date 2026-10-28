# Cloud Study Jam website — project handoff

**Updated:** 28 October 2026  
**Workspace:** `C:\PROJECTS\kestra\GDG_Cloud_Jam_26 website`  
**Purpose:** the current source of truth for product decisions, implementation status, risks, and the next work. This replaces earlier chronological notes where they conflict.

## Current state

Latest: automatic server-side read-only data refresh is deployed at `24642cb0`, stable production URL unchanged. Browser reads `/api/leaderboard`, five-minute edge cache and five-minute visible-page polling; stale cache/static fallback on upstream failure. Verified production API HTTP 200/current/486 learners twice, second request cached. Existing profile IDs preserved with ignored server mapping; new IDs use Cloudflare secret `FEED_ID_KEY`. Do not expose the mapping or key. See data-publication.md for restoring deployment prerequisites. This supersedes all older manual-only publication status notes.

**Latest release:** read [v1-release.md](v1-release.md) first. Real snapshot publication and a connected public UI now supersede the historical sample-only status below. The release record states current functionality, verification limits, duplicate-profile exclusions and the manual refresh procedure.

Organizer-data UI is now connected to the validated loader under `/?data=event#leaderboard`. It supports loading/unavailable/retry states, saved-snapshot fallback, standings/search/guild filters, profiles with component ledgers, and actual guild averages. The standard URL still opens the synthetic preview. No real publication has been configured or deployed. See [data-publication.md](data-publication.md). Build and snapshot validation checks passed after this integration.

Latest continuation: the deployable API no longer reads Google Sheets. The old CSV adapter and its checker were moved to `experiments/legacy-sheet-adapter.js` and `experiments/legacy-feed-check.mjs` for reference only. `functions/api/leaderboard.js` now serves only an explicitly configured sanitized snapshot, validated by `src/snapshot.js`; missing or invalid publication returns 503. `src/load-snapshot.js` provides a browser loader with a validated last-good cache. Neither is wired into the current sample UI yet. `node scripts/check-snapshot.mjs` and the frontend build passed. The environment JSON mechanism is a small integration fixture, not the final storage choice for a 500-person feed; production publication still requires a suitable sanitized source and storage path.

| Area | State |
|---|---|
| Product direction | Guild Clubhouse for a college event serving ABV-IIITM students. It is not a Gwalior city event. |
| Public website | [gdg-cloud-study-jam-2026.pages.dev](https://gdg-cloud-study-jam-2026.pages.dev/) |
| Latest verified website release | `8042a8ef` Pages deployment; synthetic participant data. See [deployment record](deployment.md). |
| Local work | Bingo profile UI, revised sample scoring, Apps Script Bingo source, and a read-only Sheet adapter are uncommitted. They are not in the public build. |
| Main organizer workbook | `1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c`; it remains the authoritative workbook. |
| Sheet access policy | The user said: **“do not change data of sheet plz.”** Treat the Sheet and its bound Apps Script as read-only unless the user later gives new, explicit authorization. Report any authorized change before and after it. |

The public site does **not** yet use real student data. Its 500 learners, guilds, scores, and personal records are fictional examples. The local feed experiment is not production-ready and is not wired into the website.

## Important Sheet change disclosure

An in-flight `enableBingoV6` Apps Script run continued after the user said not to change Sheet data. It modified the main workbook. The last review recorded these changes:

- Added `Bingo Approvals` and `Bingo Progress` tabs, plus backup tabs.
- Added the 25 October 2026 session configuration entry in `Config`.
- Refreshed the derived reports and score data.
- The raw `Form Responses1` tab was unchanged in the comparison.
- Three manual follow-up status cells differed from an earlier snapshot; the comparison did not establish why.

This was an unintended write after the user's instruction. No Sheet or Apps Script operation should be run now. The repository's `apps-script/Bingo.gs` is local source; check the live bound project only if the user later authorizes a read-only review.

## Product decisions

- Audience: about 500 students participating in the Google Cloud Study Jam at ABV-IIITM. Event scoring window is 14 September–22 November 2026, inclusive, in IST.
- Format: mobile-first website with a readable desktop layout, light and dark themes, large text, generous tap areas, and restrained motion. Keep the friendly guild/game feel without making it look like a native app or generic game dashboard.
- Visual direction: Guild Clubhouse is selected. The supplied GDG chapter badge is used. DevFest Bhopal's hero/footer separator and footer structure were adapted; its skyline is decorative and must not suggest a Gwalior city event. Keep the visible inspiration credit.
- Public names and public learning-profile progress were approved. Never publish roll numbers, email, Instagram handles, private organizer notes, approval records, or a roll-to-profile mapping.
- Google Skills threshold rewards and organizer competition rewards are separate. Do not promise prize eligibility or weekly awards until organizers publish them.
- Guild assignments and heads come from organizer records. No current team should fabricate guild membership or names.
- No student attendance submission form is needed; organizers enter verified attendance through their existing workflow.

## Adopted V5 scoring rules

These are the rules implemented in the V5 script and explained on the currently deployed site. The real site still displays synthetic score examples.

- Each eligible curriculum badge awards its listed course-credit value, with a minimum of 4 points. A badge counts once; a zero-credit course still earns 4 points.
- Best consecutive run of badge-completion days earns 1 point per day, capped at 7. Multiple badges on the same day count as one streak day. A break does not erase the best-streak bonus.
- Completing all ten curriculum badges earns an early-finish bonus that declines linearly from 15 points at the start of the window to 0 on 22 November.
- Each distinct, verified session earns 2 attendance points, capped at 10. A session counts once.
- Google Skills lifetime XP is display-only and contributes 0 score points.
- Equal scores share a rank; alphabetical order only arranges tied names.
- Guild score is the average across its fixed eligible roster, including members with zero points.
- Scores use one decimal place where needed. The site shows a component ledger so students can see where points came from.

The source script uses badge dates rather than timestamps for tie ordering. Do not imply sub-day precision. If scoring rules change, update the authoritative organizer logic and the public rules presentation together; keep the UI independent from the scoring formula.

## Cloud Bingo decisions and local implementation

The personal profile has a 3×3 Bingo concept. The nine squares are:

1. Earn a first curriculum badge.
2. Redeem Google Cloud learning credits (organizer-approved).
3. Complete **Develop AI-Powered Prototypes in Google AI Studio** (course template 1426).
4. Attend the 25 October 2026 credit-redemption session.
5. Earn five curriculum badges.
6. Post the story card and tag `@gdg_oncampus_iiitm` (organizer-approved).
7. Attend a second eligible session; its date is not set here.
8. Join the official [GDG on Campus community page](https://gdg.community.dev/gdg-on-campus-atal-bihari-vajpayee-indian-institute-of-information-technology-and-management-gwalior-india/) (organizer-approved).
9. Earn all ten curriculum badges.

The story-card guide is [iiitm-cloud-stories-review.vercel.app](https://iiitm-cloud-stories-review.vercel.app/). Do not expose Instagram handles on public learner profiles.

Scoring: story-card approval is 2 points once; community-join approval is 2 points once; each verified session follows the existing 2-point attendance rule; completing all nine squares earns a one-time 5-point bonus. Badge/session squares do not duplicate their existing points. Bingo rows/columns and optional sharing of a completed card earn no extra points.

`src/bingo.js`, the profile integration in `src/main.js`, related styles, and `apps-script/Bingo.gs` currently implement a **local mock experience**. The demo has a complete profile, a partial profile, and an empty profile; it can create a downloadable completion PNG for the completed demo. None of this is in the deployed website or connected to verified live approvals. Recheck the code and its visible wording before publishing.

## Current local code and data-feed findings

Uncommitted work at the time of this handoff:

- `src/bingo.js`, `src/main.js`, `src/data.js`, `src/scoring-view.js`, and `src/style.css`: mock Bingo, activity points, and profile presentation. The Bingo module is now formatted as readable functions; sample completions are labeled “Example complete,” not “Verified.”
- `apps-script/Bingo.gs`: local Apps Script V6 source corresponding to approval and progress reports. It must not be installed or executed under the current Sheet instruction.
- `functions/api/leaderboard.js`: experimental server-side adapter reading `Leaderboard`, `Tracker`, `Groups`, `Bingo Progress`, and `Refresh Log` via Google Sheets CSV export.
- `scripts/check-readonly-feed.mjs` and `scripts/check-bingo-ui.mjs`: local verification scripts. Their presence is not evidence that the live website is integrated.

The refactored front end builds successfully with `npm run build`. The local Clubhouse profile preview is at `http://localhost:5174/?design=clubhouse#profile/demo-1`; complete and partial progress were reviewed at 390px in light and dark themes. Singular streak-day wording, the ten-badge milestone message, and scoring-rule spacing were corrected. `node scripts/verify-scoring.mjs` passed, including all 500 sample score breakdowns and the source-level attendance deduplication/cutoff/cap checks. This is a sample-only review, not a live-data acceptance check. No live Apps Script function was executed.

The read-only feed experiment returned 495 participants at the time of its last snapshot, zero assigned guilds, a successful refresh label, and reconciled component totals. Those counts are time-specific; do not present them as current. That test snapshot contained real public names and badge progress, while guild assignment was absent in the source snapshot.

**Release blockers for the feed:**

1. The adapter fetches organizer tabs using a public Google CSV endpoint. Before exposing any endpoint, verify the workbook's Google sharing/publishing settings. If the whole workbook is publicly readable, filtering fields in Cloudflare does not protect the underlying private tabs. Use a dedicated sanitized publication source or another access-controlled server-side path.
2. The current participant ID is derived from an unsalted SHA-256 hash of a public Skills Boost profile URL. That is deterministic, but it is not a secret or a robust opaque identifier. Replace it with a stable random ID or a keyed mapping that is never shipped to the browser.
3. No real guilds are assigned in the observed snapshot. Keep people unassigned until organizer data supplies guilds; do not reuse mock guilds.
4. Confirm score component reconciliation against the current main workbook after the Bingo changes, and define honest `updatedAt`, stale-data, and failed-refresh states before wiring the API into the site.

Do not deploy `functions/api/leaderboard.js` or connect it to the frontend until these blockers are resolved and privacy is reviewed.

## Delivery and development

- Private source repository: [knowprasad/gdg-cloud-study-jam-2026](https://github.com/knowprasad/gdg-cloud-study-jam-2026).
- Cloudflare Pages production: [gdg-cloud-study-jam-2026.pages.dev](https://gdg-cloud-study-jam-2026.pages.dev/).
- The site uses direct Pages uploads. A Git push alone does not publish a new website build; see [deployment.md](deployment.md).
- `CONTEXT.md` is machine-local and ignored by Git. This tracked document is the canonical handoff.
- Local preview is on port 5174. Port 5173 was serving an unrelated project. Check the port before using it or stopping a server.
- Build command: `npm run build`. Existing verification commands and scripts are documented in `package.json`, `docs/rules-update.md`, and `scripts/`.

## Work still required

1. Complete and review the local Bingo profile and score-ledger experience against phone layouts and the two themes.
2. Reconcile Bingo activity and bonus semantics with the existing V5 score pipeline without modifying the Sheet under the current instruction.
3. Replace or redesign the read-only data publisher to satisfy the privacy release blockers above; keep the front end on sample data until the sanitized contract is proven.
4. Add actual guild/member data and the second session only from organizer-approved sources.
5. Connect production data with clear loading, stale, empty, and failure states; preserve the last good snapshot on refresh errors.
6. Finish the remaining requested v1 work after the real data contract is safe: guild views, organizer-selected Hall of Fame, and shareable verified completion card.

Admin authentication, guild-head tools, challenges, comeback rewards, social-share bonuses, and a native app remain later or out of scope. Budget remains ₹0/free tiers.

## References

- [Product requirements](prd.md)
- [Scoring implementation record](rules-update.md)
- [Deployment record](deployment.md)
- [Design references](reference-board.md)
- [Design adaptations](bhopal-design-system.md)
- [REA findings](rea-findings.md)
