import assert from 'node:assert/strict';
import { validateSnapshot } from '../src/snapshot.js';
import { onRequestGet } from '../functions/api/leaderboard.js';

const sample = {
  schemaVersion: 1, rulesVersion: '2026-10-28', updatedAt: '2026-10-28T10:00:00Z',
  guilds: [], participants: [{
    id: `p-${'a'.repeat(32)}`, name: 'Example learner', guildId: null,
    rank: 1, points: 4, badgesCompleted: 1,
    scoreBreakdown: { badges: 4, streak: 0, earlyFinish: 0, attendance: 0, activities: 0, bingo: 0, xp: 0 },
  }],
};
assert.equal(validateSnapshot(sample), sample);
for (const field of ['roll', 'email', 'privateNote', 'profileId']) {
  const bad = structuredClone(sample);
  bad.participants[0][field] = 'private';
  assert.throws(() => validateSnapshot(bad));
}
const inconsistent = structuredClone(sample);
inconsistent.participants[0].points = 99;
assert.throws(() => validateSnapshot(inconsistent));
assert.equal((await onRequestGet({ env: {} })).status, 503);
const response = await onRequestGet({ env: { PUBLIC_LEADERBOARD_SNAPSHOT: JSON.stringify(sample) } });
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), sample);
console.log('PASS: private fields rejected, totals reconcile, missing publication fails closed, valid snapshot served.');
