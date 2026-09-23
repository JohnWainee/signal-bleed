# M1 beta canary and rollback runbook

**Status:** prepared and locally verifiable; no production deployment is authorized by this document. The live alpha remains the production surface.

## Release artifact

From a clean checkout of the reviewed SHA:

```sh
npm ci
npm --prefix beta ci
npm --prefix beta/backend ci
VITE_SB_LIVE_BACKEND=1 VITE_SB_EMULATORS=1 npm --prefix beta run package:rehearsal
```

Serve the emulator rehearsal artifact locally and directly open/reload `/beta/gm/`, `/beta/play/`, and `/beta/present/`. Run the four-client suite against this emulator-only build before creating any production-connected artifact. The build refuses emulator mode away from `localhost`/`127.0.0.1`.

Only after that rehearsal passes, create the production-connected artifact without opening it locally:

```sh
VITE_SB_APPCHECK_SITE_KEY=<public-recaptcha-enterprise-site-key> npm --prefix beta run package:canary
```

`package:rehearsal` forces both the live adapter and local emulator endpoints. `package:canary` forces the live adapter without emulator mode, typechecks and builds the three Vite routes, copies only the explicit alpha allowlist plus built beta assets into `preview-beta/`, and verifies required routes, hashed assets, the callable adapter, the beta service-worker escape, and the absence of repository tooling. The site key is public browser configuration; service-account keys, OAuth secrets, and admin credentials never belong in the artifact.

Do not serve or interactively open the production-connected `package:canary` artifact during local rehearsal: it deliberately targets the real `signal-bleed` Firebase project. Its first interactive use belongs only in the separately authorized, protected canary deployment step. The beta bootstrap unregisters an existing root-scoped alpha service worker before Firebase starts and reloads once if the current page was controlled, preventing that worker from caching beta session transport; the browser suite verifies this boundary. The protected root `sw.js` remains unchanged.

## Pre-deploy capture

Record these values in the owner-only operations log:

1. Reviewed git SHA and preview artifact file list/checksum.
2. Current Worker deployment/version and root asset configuration.
3. Current RTDB rules downloaded from project `signal-bleed` and their checksum.
4. Current Function inventory and revisions; the expected pre-canary state has no `betaRoomCommand` or `betaRoomStatus` production deployment.
5. Live response/status for `/`, `/gm/`, `/table/`, `/beta/gm/`, `/HANDOFF.md`, and `/AGENTS.md`.
6. Existing App Check registration/enforcement state and budget alert configuration.

Do not proceed if the captured alpha rules differ from the reviewed repository alpha subtree, the deployed Worker is not the recorded main release, or the rollback operator cannot restore the captured versions.

## Fail-closed deployment order

Each step is a separate action with verification before the next. Present the exact rules/config diff and obtain the protected-file/deployment confirmation required by `AGENTS.md` immediately before executing it.

1. Deploy only `betaRoomCommand` and `betaRoomStatus` with App Check enforcement and **no** `SB_BETA_GM_SLOTS` assignments. Confirm arbitrary room creation returns forbidden and alpha RTDB behavior is unchanged.
2. Publish the reviewed `betaRooms/v1` rules while preserving the alpha `rooms` subtree byte-for-byte. Re-run unauthenticated, cross-room, cross-player, presenter-private, parent-read, and direct-write denials.
3. Point the Worker static-assets deployment at the verified `preview-beta/` artifact. Confirm `/beta/*` now resolves while `/gm/`, `/table/`, print/reference routes and alpha assets match their pre-deploy responses. Confirm repository docs, source and tooling remain 404.
4. Open the GM canary route in its isolated browser profile and record its anonymous Firebase UID privately. Assign that UID to exactly one unused fixed slot ID in the Functions deployment environment; leave the other nine absent. Redeploy only the beta Function configuration.
5. Run the production canary with one GM, two players and one presenter. Verify App Check token acquisition, callable success, separate inbound private payloads, concurrent answers, refresh/reconnect, revocation, stale-scene rejection, exact retry and room closure.

Do not enable App Check enforcement for the shared alpha RTDB API. Do not replace `/gm/`, reuse a spent slot, or delete room data.

## Stop conditions and rollback

Stop immediately for any unauthorized read/write, private marker in the wrong network stream or DOM, legitimate App Check rejection, alpha regression, unhandled client error, unexpected Function retry/error rate, or abnormal cost/budget signal.

Rollback in this order:

1. Restore the captured Worker version so `/beta/*` is no longer reachable.
2. Disable or delete the two beta-only callable Functions; confirm direct invocation no longer succeeds.
3. Restore the captured RTDB rules and re-run the alpha smoke plus beta-denial probes.
4. Verify the same alpha route/status matrix captured before deployment.
5. Retain beta room data and any export for recovery. Do not delete rooms or recycle the slot as part of rollback.

The canary succeeds only when all production checks pass, the budget/error review is normal, and the exact deployed versions and evidence are added to `HANDOFF.md`. Success does not authorize SB-13 production cutover.
