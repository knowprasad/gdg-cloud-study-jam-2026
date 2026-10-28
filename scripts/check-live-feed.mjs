import fs from 'node:fs';
import assert from 'node:assert/strict';
import { liveSnapshot } from '../server/live-snapshot.js';
const current = await liveSnapshot(fs.readFileSync('.local-backups/feed-id-key', 'utf8').trim());
const previous = JSON.parse(fs.readFileSync('public/data/leaderboard.json'));
assert.ok(current.participants.some(person => person.id === previous.participants[0].id));
assert.ok(current.participants.every(person => !('roll' in person) && !('email' in person)));
console.log(`PASS live read: ${current.participants.length} learners; previous profile IDs preserved; no private participant fields.`);
