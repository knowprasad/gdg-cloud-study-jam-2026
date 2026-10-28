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
  const participants = await Promise.all(source.participants.filter(person => occurrences.get(person.id) === 1).map(async person => ({
    id: await publicId(person.id, secret), name: person.name,
    guildId: person.guildId === 'unassigned' ? null : person.guildId,
    rank: person.rank, points: person.points, badgesCompleted: person.badges,
    badgeDetails: person.scoreBreakdown.badgeDetails, approvedActivities: person.approvedActivities, bestStreak: person.bestStreak,
    scoreBreakdown: Object.fromEntries(['badges', 'streak', 'earlyFinish', 'attendance', 'activities', 'bingo', 'xp'].map(key => [key, person.scoreBreakdown[key] || 0])),
  })));
  const guilds = source.guilds.filter(guild => guild.assigned).map(guild => ({ id: guild.id, name: guild.name }));
  const response = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=A4%3AB&sheet=Groups', { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('csv')) throw new Error('Guild report unavailable');
  const headRows = parseCsv(await response.text());
  for (const guild of guilds) {
    const head = headRows.find(row => row[0] === guild.name)?.[1];
    const matches = participants.filter(person => person.guildId === guild.id && person.name === head);
    if (matches.length === 1) guild.headId = matches[0].id;
  }
  return validateSnapshot({ schemaVersion: 1, rulesVersion: '2026-10-28', updatedAt: source.fetchedAt, participants, guilds });
}
