# Study Jam 2026

**Status:** Guild Clubhouse is the user's chosen frontend direction for continued building. The three coded comparisons were delivered; Canvas and Builders remain references and Cloud Expedition has been removed. Bhopal-inspired separator strips and the illustrated campus-focused footer are implemented, including GDG Connect and larger mobile typography. The real data pipeline remains deferred. Start with `CONTEXT.md` for continuation; `docs/prd.md` contains the requirement ledger, `docs/reference-board.md` the inspected references, and `DESIGN.md` the current implementation.

The intended product is a mobile-first responsive **college event** website for ABV-IIITM students, hosted by GDG on Campus ABV-IIITM Gwalior, with desktop layouts. It is not a Gwalior-wide city event. Event dates are 14 September–22 November 2026; the initial live-core target is 3 November 2026. Participants should understand their progress, find their place in the standings, explore badges and feel connected to their guild.

The current public-first journey opens on the leaderboard, continues through name lookup or participant rows to a personal profile, and connects to guild members and the ten-course badge catalogue. All three previews expose this same journey through the switcher. Campus Canvas adds an interactive course collector; Builders League emphasizes nearby competitors. Header links adapt to phones; there is no bottom tab bar.

Working preview interactions include name search, guild filtering, show-more rows, empty-state reset, fictional `DEMO005`-style profile lookup, profile selection, hash navigation/browser history, guild pages, unfinished-course filtering, external course links and dark mode. Local storage optionally remembers only the chosen demo profile and theme. This selection is not sign-in.

All 500 participants, eight guilds, scores, ranks, streaks and badge completions are synthetic demonstration data. The snapshot is labelled 27 October 2026. Course/product links and downloaded brand assets do not imply Google endorsement or verified completion. Curriculum milestones are separate from competition prizes.

**Pending rules:** the user's unfinished script will determine scoring, guild sizes, streak rules and final prizes. Ranking/tie policy and guild scoring remain to be finalized; the guild directory currently orders by name. Mock arithmetic and displayed positions are not proposed competition policy.

Planned work includes a finalized data interface, private roll lookup, attendance points from the organizer workflow, downloadable share cards and an organizer-selected Hall of Fame. No live Sheet, SQL/data pipeline, authentication, private roll lookup, attendance submission or prize integration is connected. Real data, private-data persistence, final prize promises and full-product development remain deferred.

Preview acceptance covers all three directions at phone/desktop widths, navigation, lookup/filtering, missing results, zero-point profiles, long names, browser history and official asset loading. The purpose is to compare usable directions before building the final website; image generation has been stopped.
