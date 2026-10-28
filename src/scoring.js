// Rules version shared by the preview adapter and the public explanation.
// Real participants will receive these calculated fields from the organizer pipeline.
export const scoringRules = Object.freeze({
  version: '2026-10-28', start: '2026-09-14', end: '2026-11-22',
  badgeMinimum: 4, streakCap: 7, earlyCap: 15, attendancePerSession: 2, attendanceCap: 10,
});
const dayMs = 86400000;
const round = n => Math.round(n * 10) / 10;
const validDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const eligible = s => validDay(s) && s >= scoringRules.start && s <= scoringRules.end;

export function scoreProgress(completions, attendance, courses) {
  const known = new Map(courses.map(c => [c.id, c]));
  const earned = new Map();
  for (const b of completions) {
    if (known.has(b.id) && eligible(b.date) && (!earned.has(b.id) || b.date < earned.get(b.id))) earned.set(b.id, b.date);
  }
  const days = [...new Set(earned.values())].sort();
  let bestStreak = 0, run = 0, previous = null;
  for (const date of days) {
    const stamp = Date.parse(date);
    run = previous !== null && stamp - previous === dayMs ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run); previous = stamp;
  }
  const badgeDetails = [...earned].map(([id, date]) => ({id, date, points: Math.max(scoringRules.badgeMinimum, known.get(id).credits)}));
  const sessions = new Set(attendance.filter(a => a.id && eligible(a.date)).map(a => a.id));
  const last = days.at(-1);
  const earlyFinish = known.size > 0 && earned.size === known.size ? round(scoringRules.earlyCap *
    Math.max(0, Math.min(1, (Date.parse(scoringRules.end) - Date.parse(last)) / (Date.parse(scoringRules.end) - Date.parse(scoringRules.start))))) : 0;
  const breakdown = { badges: badgeDetails.reduce((n, b) => n + b.points, 0), streak: Math.min(bestStreak, scoringRules.streakCap),
    earlyFinish, attendance: Math.min(scoringRules.attendanceCap, sessions.size * scoringRules.attendancePerSession), xp: 0 };
  return { ...breakdown, total: round(breakdown.badges + breakdown.streak + breakdown.earlyFinish + breakdown.attendance),
    badgeDetails, bestStreak, sessions: sessions.size, completedAt: earned.size === known.size ? last : null };
}

export function rankParticipants(people) {
  people.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  let rank = 0, previous;
  people.forEach((p, i) => {
    if (p.points !== previous) rank = i + 1;
    p.rank = rank; previous = p.points;
    const nextScore = i ? people.slice(0, i).findLast(x => x.points > p.points)?.points : null;
    p.nextRankGap = nextScore === null || nextScore === undefined ? null : round(nextScore - p.points + 0.1);
  });
  return people;
}
