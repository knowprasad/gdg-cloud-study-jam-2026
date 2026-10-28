import { validateSnapshot } from './snapshot.js';

const cacheKey = 'study-jam-public-snapshot-v1';

export async function loadSnapshot({ fetcher = fetch, storage } = {}) {
  if (!storage) {
    try { storage = globalThis.localStorage; } catch { /* Storage may be disabled. */ }
  }
  let previous = null;
  try {
    const cached = storage?.getItem(cacheKey);
    if (cached) previous = validateSnapshot(JSON.parse(cached));
  } catch { /* Invalid or unavailable browser storage does not block loading. */ }

  try {
    const response = await fetcher('/data/leaderboard.json', { signal: AbortSignal.timeout(10000), cache: 'no-cache' });
    if (!response.ok) throw new Error('Publication unavailable');
    const snapshot = validateSnapshot(await response.json());
    try { storage?.setItem(cacheKey, JSON.stringify(snapshot)); } catch { /* Storage is optional. */ }
    return { status: 'ready', snapshot };
  } catch {
    return previous
      ? { status: 'stale', snapshot: previous }
      : { status: 'unavailable', snapshot: null };
  }
}
