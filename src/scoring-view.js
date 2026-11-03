import { scoringRules as rules } from './scoring.js';

export function scoringPage(courses, escape, xpRule = null, streakRule = null, live = false) {
  const streakCap = live && streakRule ? streakRule.cap : rules.streakCap;
  const streakPerDay = live && streakRule ? streakRule.pointsPerDay : rules.streakPointsPerDay;
  const streakPending = live && streakRule?.pending;
  const streakLimit = streakCap == null ? 'no cap' : `up to ${streakCap} points`;
  return `<section class="simple-intro rules-intro"><h1>Know your ranking & points.</h1><p>Complete the curriculum, unlock Bingo squares, and grow your Google Skills profile. Every rank and point has a clear reason.</p><span class="sample-label">${live ? 'Event scoring rules · V10' : 'Rules adopted 3 Nov 2026 · Live hierarchy'}</span></section>
  <div class="rules-layout"><section class="rules-content" aria-labelledby="score-rules-title">
    <div class="rules-ranking-banner">
      <h2 id="score-rules-title">How Leaderboard Ranking Works</h2>
      <p>The leaderboard ranking follows a strict 3-tier milestone hierarchy so learners who finish the full curriculum and earn more experience points take the uppermost seats:</p>
      <ol class="ranking-steps">
        <li><strong>1. Curriculum badges completed:</strong> Learners completing all 10 curriculum badges strictly rank ahead of anyone with 9, 8, or fewer badges. Finishing all 10 badges guarantees a top-tier placement.</li>
        <li><strong>2. Cloud Bingo milestones complete:</strong> Among learners with the same badge count, whoever has completed more Bingo squares (out of 9) ranks higher.</li>
        <li><strong>3. Google Skills lifetime XP:</strong> Among learners tied on both badges and Bingo squares, whoever has higher total profile experience points takes the higher seat.</li>
      </ol>
      <p class="ranking-note"><strong>Equal milestones share a rank:</strong> Learners with the exact same badges, Bingo count, and profile XP share the same rank. Alphabetical order only arranges display names.</p>
    </div>

    <h2>How your Event Score adds up</h2>
    <p>While rank follows curriculum milestones, your <strong>Total Event Points</strong> reflect comprehensive campus and habit engagement, powering your personal ledger and your guild's average:</p>
    <dl class="rules-list">
      <div><dt>Curriculum badges <span>69 points available</span></dt><dd>Each eligible badge earns its credit value in points, with a minimum of 4. Zero-credit badges earn 4 points too. Each badge counts once.</dd></div>
      <div><dt>Your best badge streak <span>${streakCap == null ? 'No cap' : `Up to ${streakCap} points`}</span></dt><dd>Earn ${streakPerDay ?? rules.streakPointsPerDay} point${(streakPerDay ?? rules.streakPointsPerDay) === 1 ? '' : 's'} per day in your longest consecutive run of curriculum-badge days, ${streakLimit}. Multiple badges on one day count as one streak day. A broken streak does not remove your best-streak bonus.${streakPending ? ' Some published streak scores do not yet match these settings; organizers need to refresh the leaderboard.' : ''}</dd></div>
      <div><dt>Finish all ten early <span>Up to 15 points</span></dt><dd>Complete every curriculum badge to unlock this bonus. It decreases evenly from 15 at the event start to 0 on 22 November, using your final badge date. Finishing a subset does not earn this bonus.</dd></div>
      <div><dt>Verified session attendance <span>10 per session · 20 maximum</span></dt><dd>Each distinct verified session earns 10 points, up to 20 total. The same session counts once, even if your attendance is entered twice.</dd></div>
      <div><dt>Google Skills XP <span>${xpRule ? `1 point per ${xpRule.perPoint} XP · ${xpRule.cap == null ? 'no cap' : `maximum ${xpRule.cap} points`}` : 'See the current scoring settings'}</span></dt><dd>${xpRule ? `Your total profile XP contributes 1 score point per ${xpRule.perPoint} XP${xpRule.cap == null ? ' with no cap' : `, capped at ${xpRule.cap} score points`} to your event points total. XP earned before this event counts too. The final score is rounded to one decimal place.${xpRule.pending ? ' Some published XP scores do not yet match these settings; organizers need to refresh the leaderboard.' : ''}` : 'XP contributes to your event points under the current Sheet settings. Check your profile for the published XP score.'}</dd></div>
    </dl>
    <h2>Bingo & community activities</h2><p>Square 6 (story post) and square 8 (GDG membership) each earn 20 points once after organizer approval. Squares 4 and 7 earn 10 points each through verified session attendance. Complete all nine verified Bingo squares for a one-time 5-point bonus. Badge and session squares do not duplicate their existing points. Rows and columns earn no extra points; sharing the completed card is optional and earns no extra points.</p><h2>Points for each badge</h2><ul class="badge-values">${courses.map(c => `<li><a href="${c.url}" target="_blank" rel="noopener noreferrer">${escape(c.title)}</a><strong>${Math.max(rules.badgeMinimum, c.credits)}<span class="sr-only"> points</span></strong></li>`).join('')}</ul>
    <details class="rule-calculation"><summary>The early-finish calculation</summary><p>15 × (days from your last curriculum badge to 22 November) ÷ (days from 14 September to 22 November). Scores are rounded to one decimal place.</p></details>
  </section><aside class="rules-aside"><section><h2>Dates that count</h2><p><strong>14 Sep–22 Nov 2026</strong>, inclusive, using India Standard Time (IST). Only curriculum completions and sessions in this window qualify.</p></section>
    <section><h2>Guilds & ranking</h2><p>Your guild score is the average event points per member across its fixed eligible roster, including members on zero points. Individual leaderboard rank is determined strictly by the 3-tier milestone order (Badges → Bingo → XP).</p></section>
    <section><h2>If an update fails</h2><p>A temporary profile-fetch problem should retain the last verified result and show an update delay. Organizers verify final results after the event closes. An empty or failed scrape is not proof that a badge was lost.</p></section>
    <section><h2>Rewards are separate</h2><p>The curriculum milestones are 5 and 10 badges. Score rank does not itself confirm reward approval or collection. Organizer competition prizes have not been announced here.</p></section>
    <section class="rules-preview-note"><h2>Score & rank updates</h2><p>Profile scores and ranks come from the organizer tracker. Component values and the total are rounded separately, so they may differ by 0.1 point when added.</p></section>
  </aside></div>`;
}

export function scoreBreakdown(person, courses, escape, streakRule = null, xpRule = null) {
  const b = person.scoreBreakdown;
  if (!b) return `<section class="score-breakdown"><h2>Where the points came from</h2><p>The organizer has not supplied the breakdown yet.</p><a href="#rules" class="text-link">Read the scoring rules</a></section>`;
  const streakLimit = streakRule ? (streakRule.cap == null ? 'no cap' : `maximum ${streakRule.cap} points`) : `maximum ${rules.streakCap} points`;
  const rawXp = person.lifetimeXp !== undefined ? person.lifetimeXp : Math.round((b.xp || 0) * (xpRule?.perPoint ?? rules.xpPerPoint ?? 100));
  const xpDescription = xpRule
    ? `${rawXp.toLocaleString('en-IN')} lifetime profile XP · 1 score point per ${xpRule.perPoint} XP · ${xpRule.cap == null ? 'no cap' : `maximum ${xpRule.cap} points`}`
    : `${rawXp.toLocaleString('en-IN')} lifetime profile XP · 1 score point per ${rules.xpPerPoint} XP · ${rules.xpCap == null ? 'no cap' : `maximum ${rules.xpCap} points`}`;
  const rows = [['Curriculum badges', b.badges, `${person.badges} of 10 completed`], ['Best badge streak', b.streak, `${person.bestStreak ?? b.bestStreak ?? 0} consecutive ${(person.bestStreak ?? b.bestStreak ?? 0) === 1 ? 'day' : 'days'} · ${streakLimit}`], ['Early completion', b.earlyFinish, b.completedAt ? `All ten completed ${b.completedAt}` : 'Complete all ten badges to unlock'], ['Session attendance', b.attendance, `${Number.isFinite(b.sessions) ? b.sessions : Math.round((b.attendance || 0) / 10)} verified sessions · 10 each, maximum 20 points`], ['Community activities', b.activities || 0, 'Story post and GDG membership · 20 points each'], ['Full Bingo bonus', b.bingo || 0, b.bingo ? 'All nine squares verified · awarded once' : 'Complete all nine verified squares to unlock'], ['Google Skills XP', b.xp, xpDescription]];
  return `<section class="score-breakdown" aria-labelledby="score-breakdown-title"><div class="section-heading"><div><h2 id="score-breakdown-title">Where the points came from</h2><p>Event point breakdown across all verified learning activities.</p></div></div><dl class="score-ledger">${rows.map(([label, points, note]) => `<div data-score-component="${label}"><dt>${label}<small>${escape(note)}</small></dt><dd>${points.toFixed(1)}<span class="sr-only"> points</span></dd></div>`).join('')}<div class="score-ledger-total"><dt>Total event points</dt><dd data-score-total>${b.total.toFixed(1)}</dd></div></dl>
    <details class="earned-points"><summary>Points from each completed badge</summary>${b.badgeDetails.length ? `<ul class="badge-values">${b.badgeDetails.map(badge => `<li><span>${escape(courses.find(c => c.id === badge.id).title)}<small>${badge.date}</small></span><strong>+${badge.points}</strong></li>`).join('')}</ul>` : '<p>No eligible badges completed yet. Your first badge earns at least 4 points.</p>'}</details><a href="#rules" class="text-link">See all scoring rules <span aria-hidden="true">→</span></a></section>`;
}
