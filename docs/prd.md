# Cloud Study Jam website — product requirements

**Product:** public, mobile-first leaderboard and learning-progress site for GDG on Campus ABV-IIITM students.
**Event window:** 14 September–22 November 2026, inclusive, IST.
**Budget:** ₹0; free tiers only.
**Current state:** Guild Clubhouse is selected. Production still uses fictional demo data. See [project handoff](project-handoff.md) for release state, Sheet safety, and remaining work.

## Product goal

Help roughly 500 students finish more Google Cloud curriculum badges by making progress visible, understandable, and social within their guilds. The website also serves as a polished organizer portfolio piece. It must feel like a college event for ABV-IIITM students, not a city-wide Gwalior event or a native mobile app.

## Student experience

### Public leaderboard

- Show individual standings, each student's guild position, and guild-vs-guild standings using organizer-supplied data.
- Let students search by public name and filter by guild.
- Handle ties honestly, and show points, completed badges, and the freshness/status of the data.
- Do not show roll numbers, emails, Instagram handles, private notes, or approval records.

### Personal progress

- Provide a personal view with overall rank, points to the next rank, guild position, streak and milestone progress, badge collection, and a component-by-component score ledger.
- A real roll-number lookup requires a private resolver. Never ship a roll-to-profile mapping in public JSON. Local sample lookup is demo-only and is not authentication.
- Show current and best streak only when their definitions and data are authoritative. Do not present sample or missing values as verified facts.

### Curriculum and Cloud Bingo

- Link to the ten configured Google Skills curriculum badges and explain how each badge contributes to the score.
- Show a 3×3 Cloud Bingo card with these milestones: first badge; redeemed learning credits; the named AI Studio course; attendance at the 25 October session; five badges; approved story-card post; attendance at a second session; approved GDG community membership; ten badges.
- Organizer approval is required for credit redemption, story posting, and community membership. Opening a link does not complete a milestone.
- The second session is not scheduled in this document. Only mark it eligible after organizers configure the session.
- A verified full card earns one 5-point bonus. Badge/session squares do not duplicate existing points; Bingo rows, columns, and optional social sharing have no additional score.
- Allow a completed verified card to download as a share image. A local demo card must be labeled as sample data.

### Rules and awards

- Publish the event window, badge points, streak, early-finish, attendance, activity, Bingo, XP, guild, and tie rules in plain language.
- Show the same score components on each personal profile so students can understand their totals.
- Keep Google Skills threshold rewards separate from organizer competition prizes. Hall of Fame entries and any prizes require organizer publication; do not invent recipients or guarantees.

## Adopted scoring rules

- Each eligible curriculum badge earns its configured credit value, with a 4-point minimum. A badge counts once; zero-credit badges earn 4 points.
- The best consecutive run of badge-completion days earns 1 point per day, capped at 7. Multiple badges on one day count once. Breaking the run does not remove the best-streak award.
- Completing all ten badges earns an early-finish bonus that falls linearly from 15 points at the start of the event to 0 on 22 November.
- Each distinct verified session earns 2 points, capped at 10.
- Story-card posting and joining the GDG community each earn 2 points once after organizer approval.
- Completing all nine verified Bingo squares earns a one-time 5-point bonus.
- Google Skills lifetime XP is display-only and contributes 0 points.
- Equal scores share rank; alphabetical order is only for arranging ties. Guild score is average points per member in the fixed eligible roster, including zero-point members.

Implementation lives in the organizer scoring pipeline. The website consumes calculated values and explains them; it should not recalculate real scores independently. The V5 rules are documented in [rules-update.md](rules-update.md).

## Privacy and source-of-truth requirements

- The main workbook `1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c` is the authoritative organizer source; the `1Igt…` workbook is a mock copy.
- Keep the workbook and response tab private. Never publish raw form responses, roll numbers, emails, private organizer notes, approval data, or a roll/profile mapping.
- Public data may contain approved names, guild, score components, badge progress, attendance totals, milestones, and public learning-profile links as appropriate.
- Publish only an allowlisted, sanitized, versioned snapshot. Stable public IDs must not expose or be derivable from private identifiers.
- Every total must reconcile with its visible components. Keep the last good snapshot on upstream failure and clearly mark stale or delayed data.
- The user said not to change Sheet data. Any future work against the Sheet or its bound script is read-only unless the user explicitly reauthorizes it.

## Design and accessibility

- Guild Clubhouse is the selected visual direction, with the supplied GDG chapter logo and official Google Cloud product marks.
- Adapt the soothing palette, motion, and separator/footer structure from DevFest Bhopal without copying its city-specific content. Credit the adaptation. Skyline art is decorative and must not imply a Gwalior event.
- Optimize for phones first while keeping a usable desktop leaderboard. Use readable text, generous touch targets, dark/light themes, keyboard access, reduced-motion support, and clear focus states.
- Keep motion purposeful and restrained. The site is a website, with ordinary page navigation rather than an app-style bottom bar.

## Release gates and deferred scope

Production uses sample data until the read-only data publisher passes a privacy review, stable-ID review, score reconciliation, and stale/error-state review. The current local adapter reads public Google CSV exports and is not approved for deployment; details are in [project-handoff.md](project-handoff.md).

V1 still needs a safe real-data connection, actual guild assignments, organizer-configured session data, remaining guild views, organizer-selected Hall of Fame, and a verified share image. Admin authentication, guild-head tools, weekly challenges, comeback rewards, social-share bonuses, and a native app are later or out of scope.
