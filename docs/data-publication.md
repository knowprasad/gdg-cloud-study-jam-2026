# Public event data

Open `/?data=event#leaderboard` to use the organizer-data UI. The ordinary URL remains the sample preview until a real publication is ready.

The event UI reads `/api/leaderboard`, validates its response, and caches the last valid snapshot in browser storage. If a request fails, it shows the cached snapshot with a delayed-refresh message. Without a cached snapshot it shows an unavailable state and a retry button. Data timestamps are shown in IST.

The endpoint currently accepts a sanitized JSON snapshot through the server-side `PUBLIC_LEADERBOARD_SNAPSHOT` binding. This is an integration fixture for small examples; choose a suitable storage binding for the full 500-person publication before launch. Never put the raw workbook in this binding. The endpoint returns 503 when the binding is absent or invalid.

The strict contract is implemented in `src/snapshot.js`: schema version, rules version, update timestamp, participant records and actual guilds. Participant records contain only random public ID, name, nullable guild ID, rank, points, badge count and seven score components. Unknown fields are rejected; components must add to the total. Public IDs must be generated and kept stable by the publisher. A hash of a roll number is insufficient.

The UI supports public standings, filters, public profiles, score ledgers and guild averages. It deliberately reports that detailed badge evidence and Bingo approvals are absent from this initial contract. The synthetic Bingo experience remains available in demo mode. Real roll lookup is not implemented.

The previous direct Google CSV reader is retained under `experiments/` for historical inspection only. It is not part of the deployable API. The main Sheet and bound Apps Script remain read-only under the user's instruction. A safe publication source is still required; this work has not changed Google sharing settings or published student data.
