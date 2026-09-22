# SB-04 backend feasibility and protected-rules proposal

Status: local trusted-command prototype and rules proposal verified in the Firebase emulator. No beta backend or rules are deployed.

## Verified baseline

- Production UI is served by Cloudflare Workers Static Assets from `main`; beta files are excluded by `.assetsignore`.
- The Firebase project `signal-bleed` is on the Spark plan (console inspection, 2026-09-21 HST). Its Realtime Database is `signal-bleed-default-rtdb` in `us-central1`.
- The console's deployed RTDB rules match the repository's `firebase.rules.json`: they grant broad authenticated access in the existing `rooms` alpha namespace and define no beta namespace. Preserve that alpha subtree exactly until an independently reviewed alpha migration.
- The user approved a Blaze-based Functions direction for SB-04 and asked to reuse the billing account already used for Eat the Reich. Signal Bleed remains its own Firebase project. It has **not** been upgraded; no billing, function deployment, or rules publication has occurred.

## Why a trusted command endpoint is needed

SB-01 requires each accepted command, its immutable receipt, membership check, and scene-epoch check to commit as one operation. A client transaction at their common room ancestor would require reading that ancestor, which contains other players' private data. Client access to that ancestor violates the projection contract. A transaction only at one prompt cannot atomically write a separate receipt. The chosen design therefore uses a Firebase callable Function with authenticated `request.auth.uid` and an Admin SDK transaction at one `betaRooms/v1/{roomId}` subtree. The transaction reads membership and current epoch, validates the command, applies the entity change and receipt, and retries on concurrent updates. There is no client-supplied role or room-global expected revision. Distinct players' answers can both succeed after a transaction retry. This is a design inference from Firebase's transaction and rules behavior; emulator tests must prove it before the backend is accepted. See [RTDB transactions](https://firebase.google.com/docs/database/admin/save-data), [callable auth context](https://firebase.google.com/docs/functions/callable), and [client transaction read requirement](https://firebase.google.com/docs/reference/js/database).

One function entrypoint may dispatch room creation, admission request/decision, revocation, scene/prompt commands, and personal edits. Every path remains under the room transaction, so accepted mutation and receipt cannot separate. Failed commands do not reserve a command ID. Duplicate ID plus identical canonical payload returns the original result after authorization is rechecked; changed payload returns `COMMAND_ID_REUSED`. The server must validate exact command fields, opaque IDs, string limits, playbook registry and role transitions before committing. A scene publish increments the epoch; a delayed answer uses the current epoch inside the transaction. No client direct beta write is permitted.

## Read subscriptions and rules

`beta/backend/rules.proposed.json` is an **unpublished proposal**. It copies the current alpha `rooms` rules without change and adds `betaRooms/v1` read grants only at the needed leaf paths. Room-root reads and all client writes remain denied. Applicant reads only their admission; GM reads admissions, membership and decisions; presenter reads only the published scene; a player reads the scene, own admission/member record, own decisions, own sheet/notes and own receipts. Revocation immediately fails subsequent reads, except the person's own admission status used to show revocation. No browser subscribes to `betaRooms/v1/{roomId}` or any private parent. Admin SDK access bypasses rules, so the callable must enforce every authorization and shape invariant itself.

The proposed addition to the protected `firebase.rules.json` is exactly the `betaRooms` subtree in that proposal. `AGENTS.md` requires explicit confirmation before editing that file. The proposal is ready for review; the protected file remains unchanged. Publishing rules is a separate release action and must wait for four-client evidence.

## Test and deployment gates

1. Emulator tests seed an isolated fake project, evaluate the proposed rules as unauthenticated, GM, two players, presenter, pending applicant, revoked member and cross-room identity. Verify denied parent/private reads, all direct beta writes, and allowed leaf reads, including actual returned payloads.
2. Callable emulator tests run concurrent p1/p2 responses, close/answer and scene/answer races, duplicate IDs with same/different payloads, lost acknowledgement retries, admission/revocation, refresh and re-admission. Assert the entity and receipt are both present or both absent.
3. Keep function tests separate from production Firebase credentials. Do not log private payloads or cache them in the service worker. Limit callable payload size and function scale; record billing and deployment settings before production release.
4. The production Firebase project must be upgraded to Blaze before Functions deployment; [Firebase's Functions setup](https://firebase.google.com/docs/functions/get-started) permits local emulation on Spark but requires Blaze for deployment. The billing change and production deploy remain undone.

The RTDB emulator needs Java. Homebrew OpenJDK 26 is available at `/opt/homebrew/opt/openjdk/bin/java`; the system `/usr/bin/java` shim does not resolve it. Run `PATH=/opt/homebrew/opt/openjdk/bin:$PATH npm run emulator:test` from `beta/backend`. The current branch passed five rules tests and two transaction tests. The callable module loads, but a deployed callable and the browser adapter have not been exercised. The production dependency audit currently reports two moderate transitive findings through `gaxios`/`uuid`; resolve or assess those before deployment.
