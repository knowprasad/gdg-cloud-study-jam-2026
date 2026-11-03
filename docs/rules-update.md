# Rules update — 3 November 2026

## Active settings and ranking hierarchy

1. **Ranking Hierarchy (V10):**
   * Primary: Most curriculum badges completed (finishing all 10 badges guarantees placement in the top tier).
   * Secondary: Most Cloud Bingo milestones complete (out of 9 squares).
   * Tertiary: Most lifetime raw Google Skills XP on the profile.
   * Ties: Equal across all three share the rank.

2. **Badge Weightage:**
   * Badge minimum confirmed at **4 points**.
   * Badge credit multiplier: 1 point per credit.
   * Total curriculum badge points available: **69 points** ($4 + 4 + 4 + 4 + 12 + 13 + 4 + 4 + 4 + 16$).

3. **Event Points (Informational & Guild Currency):**
   * Total event points are retained and displayed to reward comprehensive activity: badge credits (up to 69), daily streaks (up to 7), early finish (up to 15), verified session attendance (10/session, max 20), and community Bingo tasks (story card 20, GDG community 20).
   * Guild standings continue to use average member event score across the roster.

## Website changes

* The rules page (`#rules`) displays the prominent "How Leaderboard Ranking Works" 3-tier guide alongside the 69-point badge scale.
* Profile views have removed the obsolete `"X points to move ahead"` message and now guide learners based on badges, Bingo squares, and XP.
* The API adapter supports reading through column W (`A4:W`) for `'Bingo squares complete (of 9)'`.
* Raw Google Skills lifetime XP (`lifetimeXp`) is now published in the public snapshot schema and rendered on individual profiles and leaderboard rows (`· X/9 Bingo · X XP`).
* Leaderboard standings display an explanatory ranking hierarchy note distinguishing the 3-tier ranking determiners from total event points.
* Tests (`scripts/verify-scoring.mjs` and `scripts/check-snapshot.mjs`) and production build verified.
