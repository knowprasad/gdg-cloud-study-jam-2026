# Operating the student website

## Add or rename a guild

Use your existing Groups and member-assignment workflow in the main Sheet. The website reads the resulting Leaderboard group field when you export. A guild with assigned learners automatically receives a directory card, crest, average score, participation summary and detail page. Names are read on each export; they are not hardcoded into the interface.

## Assign a guild head

In Groups, the head entry must match a public member name exactly and belong to that guild. The exporter then publishes only the person's opaque public ID. Unknown, ambiguous or roll-number head entries are not published. The website shows “To be announced” until there is a safe match.

## Approve activities

Continue the existing organizer approval workflow in the Sheet. Exported Bingo Progress entries supply the approved milestones. Merely clicking a course, community or story link never awards points. A student's completed Bingo download unlocks only when all nine tasks are complete in the exported evidence.

## Publish changes

**Automatic refresh is now active.** Sheet report changes are read by the website API with a five-minute cache, and visible open pages recheck every five minutes. You no longer need to redeploy for ordinary score/guild changes. Your Sheet's own Apps Script refresh still needs to update the reports first. The manual export commands below remain a recovery/deployment procedure.

Run the read-only export, checks, build and Pages deploy commands in [v1-release.md](v1-release.md). This is currently a manual publication. Editing the Sheet alone does not immediately update the website. Preserve `.local-backups/public-id-map.json` privately so profile links remain stable.

## Launch gates still needing external input

- Enter actual guild assignments and heads through your organizer process.
- Review duplicate learning profiles; the exporter withholds ambiguous entries.
- Supply real Hall of Fame selections; the website currently shows an awaiting-announcement state.
- Configure a durable refresh job with narrowly scoped deployment credentials for automatic publication. Existing interactive Cloudflare login has not been copied into a background service.
- Enable browser-control access for rendered mobile/desktop review. Build and logic checks do not establish visual acceptance.

No Sheet or bound Apps Script writes were performed while implementing these website features.
