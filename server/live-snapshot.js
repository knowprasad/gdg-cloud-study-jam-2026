import knownIds from './public-id-map.json' with { type: 'json' };
import { buildSnapshot, parseCsv } from '../experiments/legacy-sheet-adapter.js';
import { validateSnapshot } from '../src/snapshot.js';

async function publicId(sourceId, secret) {
  if (knownIds[sourceId]) return knownIds[sourceId];
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sourceId));
  return 'p-' + [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function liveSnapshot(secret) {
  const source = await buildSnapshot();
  const occurrences = new Map();
  source.participants.forEach(person => occurrences.set(person.id, (occurrences.get(person.id) || 0) + 1));
  const rollCounts = new Map();
  source.participants.forEach(person => rollCounts.set(person.sourceRoll, (rollCounts.get(person.sourceRoll) || 0) + 1));
  const publicIdByRoll = new Map();
  const participants = await Promise.all(source.participants.map(async (person, index) => {
    const needsRollIdentity = person.fallbackIdentity || occurrences.get(person.id) > 1;
    const rollKey = rollCounts.get(person.sourceRoll) > 1
      ? `roll:${person.sourceRoll}:rank:${person.rank}:row:${index}`
      : `roll:${person.sourceRoll}`;
    const id = await publicId(needsRollIdentity ? rollKey : person.id, secret);
    if (rollCounts.get(person.sourceRoll) === 1) publicIdByRoll.set(person.sourceRoll.toLowerCase(), id);
    return {
    id, name: person.name,
    guildId: person.guildId === 'unassigned' ? null : person.guildId,
    rank: person.rank, points: person.points, badgesCompleted: person.badges,
    badgeDetails: person.scoreBreakdown.badgeDetails, approvedActivities: person.approvedActivities, bestStreak: person.bestStreak,
    scoreBreakdown: Object.fromEntries(['badges', 'streak', 'earlyFinish', 'attendance', 'activities', 'bingo', 'xp'].map(key => [key, person.scoreBreakdown[key] || 0])),
    };
  }));
  const guilds = source.guilds.filter(guild => guild.assigned).map(guild => ({ id: guild.id, name: guild.name }));
  const response = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=A4%3AC&sheet=Groups', { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('csv')) throw new Error('Guild report unavailable');
  const headRows = parseCsv(await response.text());
  for (const guild of guilds) {
    const groupRow = headRows.find(row => row[0].trim() === guild.name.trim());
    const head = groupRow?.[1]?.trim();
    const matches = participants.filter(person => person.guildId === guild.id && person.name.trim().toLowerCase() === head?.toLowerCase());
    if (matches.length === 1) guild.headId = matches[0].id;
    if (!guild.headId && head) {
      const id = publicIdByRoll.get(head.toLowerCase());
      if (id && participants.some(person => person.id === id && person.guildId === guild.id)) guild.headId = id;
    }
    if (groupRow?.[2]?.trim()) guild.name = groupRow[2].trim();
  }
  const configResponse = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=F5%3AH10&sheet=Config', { signal: AbortSignal.timeout(15000) });
  if (!configResponse.ok) throw new Error('Scoring settings unavailable');
  const configRows = parseCsv(await configResponse.text());
  const xpCapValue = configRows.find(row => row[0] === 'Experience score cap')?.[1];
  const perPoint = Number(configRows.find(row => row[0] === 'Experience points per 1 score point')?.[1]);
  const cap = xpCapValue?.trim() ? Number(xpCapValue) : null;
  const xpPending = source.participants.some(person => {
    const raw = Math.max(0, Number(person.lifetimeXp) || 0) / perPoint;
    const expected = cap === null ? raw : Math.min(cap, raw);
    return Math.abs(expected - person.scoreBreakdown.xp) > 0.11;
  });
  const streakPerDay = Number(configRows.find(row => row[0] === 'Points per day of badge streak')?.[1]);
  const streakCapValue = configRows.find(row => row[0] === 'Streak score cap')?.[1];
  const streakCap = streakCapValue?.trim() ? Number(streakCapValue) : null;
  const streakPending = source.participants.some(person => {
    const raw = Math.max(0, Number(person.bestStreak) || 0) * streakPerDay;
    const expected = streakCap === null ? raw : Math.min(streakCap, raw);
    return Math.abs(expected - person.scoreBreakdown.streak) > 0.11;
  });
  const xpRule = { perPoint, cap, pending: xpPending };
  const streakRule = { pointsPerDay: streakPerDay, cap: streakCap, pending: streakPending };
  return validateSnapshot({ schemaVersion: 1, rulesVersion: 'V10', xpRule, streakRule, updatedAt: source.fetchedAt, participants, guilds });
}
