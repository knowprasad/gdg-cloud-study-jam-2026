// Reads organizer reports; never writes to Google Sheets.
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { buildSnapshot, parseCsv } from '../experiments/legacy-sheet-adapter.js';
import { validateSnapshot } from '../src/snapshot.js';

await fs.mkdir('.local-backups', { recursive: true });
const mappingPath = '.local-backups/public-id-map.json';
let mapping = {};
try { mapping = JSON.parse(await fs.readFile(mappingPath, 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const source = await buildSnapshot();
const occurrences = new Map();
source.participants.forEach(person => occurrences.set(person.id, (occurrences.get(person.id) || 0) + 1));
const eligible = source.participants.filter(person => occurrences.get(person.id) === 1);
const guilds = source.guilds.filter(guild => guild.assigned).map(guild => ({ id: guild.id, name: guild.name }));
const participants = eligible.map(person => {
  mapping[person.id] ||= `p-${randomBytes(16).toString('hex')}`;
  const breakdown = person.scoreBreakdown;
  return {
    id: mapping[person.id], name: person.name,
    guildId: person.guildId === 'unassigned' ? null : person.guildId,
    rank: person.rank, points: person.points, badgesCompleted: person.badges,
    badgeDetails: breakdown.badgeDetails, approvedActivities: person.approvedActivities, bestStreak: person.bestStreak,
    scoreBreakdown: Object.fromEntries(['badges', 'streak', 'earlyFinish', 'attendance', 'activities', 'bingo', 'xp'].map(key => [key, breakdown[key] || 0])),
  };
});
// Only resolve a head when the organizer entry exactly matches one public
// member name in that guild. Unmatched entries (including rolls) stay private.
const headsResponse = await fetch('https://docs.google.com/spreadsheets/d/1sTn7Q6VVqkKHFo2ZEDrnNVnwe0gk8j22knsj8D1Ss6c/gviz/tq?tqx=out:csv&headers=1&range=A4%3AC&sheet=Groups', { signal: AbortSignal.timeout(15000) });
if (headsResponse.ok && headsResponse.headers.get('content-type')?.includes('csv')) {
  const headRows = parseCsv(await headsResponse.text());
  for (const guild of guilds) {
    const headName = headRows.find(row => row[0] === guild.name)?.[1];
    const matches = participants.filter(person => person.guildId === guild.id && person.name === headName);
    if (matches.length === 1) guild.headId = matches[0].id;
    const displayName = headRows.find(row => row[0] === guild.name)?.[2]?.trim();
    if (displayName) guild.name = displayName;
  }
}
// Fetch time is deliberately identified as publication time; source refresh time
// is not inferred from an ambiguous locale-formatted Sheet label.
const snapshot = validateSnapshot({ schemaVersion: 1, rulesVersion: '2026-10-28', updatedAt: source.fetchedAt, participants, guilds });
await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/leaderboard.json', JSON.stringify(snapshot));
console.log(`Published sanitized snapshot: ${participants.length} learners, ${guilds.length} assigned guilds. No Sheet writes.`);
console.log(`${source.participants.length - eligible.length} ambiguous duplicate-profile rows withheld for organizer review; source ranks retained.`);
