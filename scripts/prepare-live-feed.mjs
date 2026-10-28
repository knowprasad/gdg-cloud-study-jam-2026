import fs from 'node:fs/promises';
await fs.mkdir('server', { recursive: true });
await fs.copyFile('.local-backups/public-id-map.json', 'server/public-id-map.json');
console.log('Prepared server-only existing-profile mapping. No private values printed.');
