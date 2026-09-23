# Closed-beta room operations

This runbook covers the bounded M1 beta namespace only. It never authorizes alpha changes, automatic deletion, slot reuse, or production deployment by itself.

## Slot assignments

Production reads `SB_BETA_GM_SLOTS` as a JSON object whose keys are the ten fixed room IDs in `backend/server/slots.mjs` and whose values are Firebase Auth UIDs. Invalid JSON, unknown room IDs, invalid UIDs, or more than ten entries fail closed.

For the first canary, assign exactly one room ID to the owner's isolated GM browser UID and leave the other nine absent. Keep the mapping in the deployment environment and the owner-only operations record; do not commit participant UIDs. A spent room ID is never reassigned, even after an approved export or later deletion.

## Export

1. Stop issuing new commands and close the room read-only from the GM surface.
2. Use an authenticated Firebase CLI session to export only `/betaRooms/v1/{roomId}` from project `signal-bleed` into a local directory outside this repository.
3. Confirm the JSON contains the expected `owner`, `shared`, `admissions`, `decisions`, `personal`, and `receipts` branches. Treat it as private participant data.
4. Record the room ID, export timestamp, source project, deployed Function version, byte count, and SHA-256 checksum in the owner-only operations record.
5. Store the export in owner-approved encrypted storage. Do not attach it to GitHub, logs, CI artifacts, or support messages.

## Recovery rehearsal

1. Start the isolated Auth, RTDB, and Functions emulators for `demo-signal-bleed-beta`.
2. Import the exported room under a distinct recovery-only emulator room ID; never overwrite the source production path during a rehearsal.
3. Verify the public scene, GM roster/decisions, each player's own personal data and decisions, presenter projection, immutable receipts, and closed state.
4. Re-run unauthorized parent, cross-player, presenter-private, and direct-write denials against the recovered fixture.
5. Record the checksum and result. A failed rehearsal blocks deletion or migration; it does not justify editing the export by hand.

## Incident rollback

Capture the pre-canary RTDB rules, Function inventory/revisions, Worker version, and alpha route responses before deploying anything. If private data leaks, an unauthorized read succeeds, legitimate App Check traffic fails, or cost/error rates become abnormal: remove the beta asset routes, disable or delete the two beta-only callables, restore the captured rules and Worker version, and retain room data for recovery. Do not delete rooms in response to a budget alert.
