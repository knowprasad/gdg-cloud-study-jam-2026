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
  const response = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=A4%3AC&sheet=Groups', { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('csv')) throw new Error('Guild report unavailable');
  const headRows = parseCsv(await response.text());
  // Resolve private roll entries on the server; only return the public member ID.
  const trackerResponse = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=A1%3AAN&sheet=Tracker', { signal: AbortSignal.timeout(15000) });
  const tracker = trackerResponse.ok && trackerResponse.headers.get('content-type')?.includes('csv') ? parseCsv(await trackerResponse.text()) : [];
  const rollColumn = tracker[0]?.indexOf('Roll');
  const profileColumn = tracker[0]?.indexOf('Profile ID');
  for (const guild of guilds) {
    const groupRow = headRows.find(row => row[0].trim() === guild.name.trim());
    const head = groupRow?.[1]?.trim();
    const matches = participants.filter(person => person.guildId === guild.id && person.name.trim().toLowerCase() === head?.toLowerCase());
    if (matches.length === 1) guild.headId = matches[0].id;
    if (!guild.headId && head && rollColumn >= 0 && profileColumn >= 0) {
      const entries = tracker.slice(1).filter(row => row[rollColumn]?.trim().toLowerCase() === head.toLowerCase());
      const profileIds = [...new Set(entries.map(row => row[profileColumn]).filter(Boolean))];
      if (profileIds.length === 1) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(profileIds[0]));
        const sourceId = 'p-' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
        const id = await publicId(sourceId, secret);
        if (participants.some(person => person.id === id && person.guildId === guild.id)) guild.headId = id;
      }
    }
    if (groupRow?.[2]?.trim()) guild.name = groupRow[2].trim();
  }
  const configResponse = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=F5%3AH6&sheet=Config', { signal: AbortSignal.timeout(15000) });
  if (!configResponse.ok) throw new Error('Scoring settings unavailable');
  const configRows = parseCsv(await configResponse.text());
  const xpRule = { perPoint: Number(configRows.find(row => row[0] === 'Experience points per 1 score point')?.[1]), cap: Number(configRows.find(row => row[0] === 'Experience score cap')?.[1]) };
  return validateSnapshot({ schemaVersion: 1, rulesVersion: 'V9', xpRule, updatedAt: source.fetchedAt, participants, guilds });
}
