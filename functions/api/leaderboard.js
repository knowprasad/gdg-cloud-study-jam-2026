// All public responses pass the strict allowlist; raw source rows stay server-side.
export async function onRequestGet(context) {
  const { env, request } = context;
  if (env.FEED_ID_KEY) {
    const cache = caches.default;
    const cacheKey = new Request(new URL('/api/public-feed-cache-v2', request.url));
    const previous = await cache.match(cacheKey);
    if (previous && Date.now() - Date.parse((await previous.clone().json()).updatedAt) < 300000) {
      return Response.json(await previous.json(), { headers: { 'Cache-Control': 'public,max-age=60', 'X-Feed-Status': 'current' } });
    }
    try {
      const { liveSnapshot } = await import('../../server/live-snapshot.js');
      const snapshot = await liveSnapshot(env.FEED_ID_KEY.trim());
      context.waitUntil(cache.put(cacheKey, Response.json(snapshot, { headers: { 'Cache-Control': 'public,max-age=604800' } })));
      return Response.json(snapshot, { headers: { 'Cache-Control': 'public,max-age=60', 'X-Feed-Status': 'current', 'X-Content-Type-Options': 'nosniff' } });
    } catch {
      if (previous) return Response.json(await previous.json(), { headers: { 'Cache-Control': 'no-store', 'X-Feed-Status': 'stale' } });
      // The checked-in public snapshot is a cold-cache recovery point.
      const backup = await env.ASSETS.fetch(new URL('/data/leaderboard.json', request.url));
      if (backup.ok) return new Response(await backup.text(), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Feed-Status': 'stale' } });
      return Response.json({ error: 'Standings unavailable' }, { status: 503 });
    }
  }
  try {
    const { validateSnapshot } = await import('../../src/snapshot.js');
    let source = env.PUBLIC_LEADERBOARD_SNAPSHOT;
    if (!source && env.ASSETS) {
      const response = await env.ASSETS.fetch(new URL('/data/leaderboard.json', request.url));
      if (response.ok) source = await response.text();
    }
    if (!source) throw new Error('No publication');
    const snapshot = validateSnapshot(JSON.parse(source));
    return Response.json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ error: 'Event data is temporarily unavailable.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
