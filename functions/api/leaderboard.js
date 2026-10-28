// Only a separately prepared public snapshot may be served here.
// Never fetch organizer worksheets from this route.
export async function onRequestGet({ env, request }) {
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
