// Reads organizer reports; never writes to Google Sheets.
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { buildSnapshot } from '../experiments/legacy-sheet-adapter.js';
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
// Fetch time is deliberately identified as publication time; source refresh time
// is not inferred from an ambiguous locale-formatted Sheet label.
const snapshot = validateSnapshot({ schemaVersion: 1, rulesVersion: '2026-10-28', updatedAt: source.fetchedAt, participants, guilds });
await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/leaderboard.json', JSON.stringify(snapshot));
console.log(`Published sanitized snapshot: ${participants.length} learners, ${guilds.length} assigned guilds. No Sheet writes.`);
console.log(`${source.participants.length - eligible.length} ambiguous duplicate-profile rows withheld for organizer review; source ranks retained.`);
