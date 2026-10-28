import assert from 'node:assert/strict';
import { guildStandings, guildView, personalGuild } from '../src/guilds.js';
const snapshot = {
  guilds: [{ id: 'a', name: 'Orbit', headId: 'one' }, { id: 'b', name: 'Solo' }, { id: 'c', name: 'Empty' }],
  participants: [
    { id: 'one', name: 'A very long learner name <script>', guildId: 'a', points: 10, badgesCompleted: 2, rank: 1 },
    { id: 'two', name: 'Second', guildId: 'a', points: 0, badgesCompleted: 0, rank: 3 },
    { id: 'three', name: 'Singleton', guildId: 'b', points: 5, badgesCompleted: 1, rank: 2 },
  ],
};
const guilds = guildStandings(snapshot);
assert.equal(guilds[0].average, 5);
assert.equal(guilds[1].average, 5);
assert.equal(guilds[0].rank, guilds[1].rank);
assert.equal(guilds.find(g => g.id === 'a').active, 1);
assert.equal(guilds.find(g => g.id === 'c').average, 0);
assert.ok(guildView(snapshot, 'a').includes('&lt;script&gt;'));
assert.ok(guildView(snapshot, 'b').includes('To be announced'));
assert.ok(guildView(snapshot, 'missing').includes('Guild not found'));
assert.ok(personalGuild(snapshot, snapshot.participants[1]).includes('#2 of 2'));
assert.ok(guildView({ guilds: [], participants: [] }).includes('No guilds assigned yet'));
console.log('PASS: zero scores included in averages, shared ranks, singleton, empty guild, participation, escaping, personal guild position.');
