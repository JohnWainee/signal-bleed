# Signal Bleed beta — session foundation

Status: SB-03 typed mock implementation under review, not a playable or deployed beta.

## Direction recovered from the September 21–22 design session

- Evolve the existing Signal Bleed repository and eventually replace alpha at the same URL.
- GM steers scenes and areas from an iPad; the group need not navigate independently.
- `/present` is a read-only TV/projector board. `/play` keeps player information, inventory, and short private decisions available. `/gm` becomes the control surface.
- Lifepath is heavily roll-based, but never determines or restricts playbook choice.
- Planned beta tooling is Vite/TypeScript on the existing Cloudflare Workers static-assets hosting with Firebase realtime state.

These newer user decisions supersede the alpha no-build direction for the planned beta migration. This initial increment needs no bundler and changes no alpha pages. Do not import DigitTable's separate game architecture or invent missing lifepath tables. Canonical content remains in `/rules`.

## What this increment contains

`src/session/model.ts` defines the typed contract and an in-memory mock adapter with per-entity revisions, admitted roles, targeted prompts, receipts, and surface-specific events. It has no Firebase connection or backend security enforcement. Tests run with:

```sh
node --experimental-strip-types --test beta/tests/model.test.mjs
```

The in-memory state is a fixture model, not a proposed whole-room database write. Client checks and projections do not secure Firebase. The mock adapter binds an identity at connection; SB-04 must replace this with authenticated Firebase identity and enforce roles and read access at the backend.

Mock scene transitions leave old prompts readable as expired history (`sceneEpoch` differs from the current scene); they cannot be answered or closed. Revocation ends an active watch. After an explicit re-admission, the client creates a new watch. The mock's close/answer tests exercise serialized outcomes; SB-04 must prove races and atomic receipts against the backend emulator.

## Next vertical slice

1. Preserve the alpha commit with a release tag before changing production build settings. Starting baseline: `624e8cb5b82917478024e227938687c221eb0125`. No tag has been created by this increment.
2. Add Vite/TypeScript and route shells in the beta branch. `/gm` currently holds alpha reference content, so explicitly preserve access to that material when introducing the control surface.
3. Introduce an isolated, versioned Firebase namespace. Proposed paths: `betaRooms/{room}/meta`, `shared/scene`, `gm`, `players/{uid}`, `prompts/{uid}/{promptId}`, and `responses/{uid}/{promptId}`. Scope revisions/transactions to the affected entities in the adapter to avoid unrelated players contending on a single room revision.
4. Implement authenticated room creation and GM-seat ownership, membership, presenter read access, GM-only scene/prompt writes, and player-owned responses. Presenter credentials must never share the GM identity. Read-only is a backend permission, not a URL flag.
5. Validate Firebase rules in the emulator: unauthenticated access denied; players cannot write scenes, read another player's prompts, or elevate role; presenters cannot read private data or write; closed/stale/duplicate responses rejected. Do not connect this module to alpha rules: alpha currently permits any authenticated user to write shared state.
6. Connect one GM, one presenter, and two player clients. Verify scene synchronization, isolated decisions, reconnect, late join, and scene transitions while preserving character/inventory data.
7. Add lifepath tables and branch resolution only after retrieving their complete approved design and comparing against `/rules`. Playbook selection stays independent of roll results.

## Release gates and scope

Keep existing Cloudflare/Firebase hosting. Produce a beta preview before an in-place production cutover. Preserve alpha exports; define and test an explicit migration/rollback rather than silently rewriting existing rooms. Re-run alpha smoke, case validation, and HTML sanity alongside beta tests once a full checkout is available.

`AGENTS.md` requires explicit go-ahead for edits to Firebase rules/config, service worker, manifest, or CI workflows; this increment edits none of them. Prepare concrete changes before requesting any additional approval that remains necessary. Independent review is required before merging a non-trivial change. No production deploy or merge is part of this increment.

## Validation limits

Four local Node tests cover the session contract and data isolation projections. They do not prove Firebase authorization, browser rendering, network synchronization, or compatibility with the existing deployed application. No alpha checks were run locally because terminal cloning was blocked; source changes are submitted through the GitHub connection.

## Agent implementation plan

See [AGENT_TASKS.md](AGENT_TASKS.md) for task ownership, dependencies, acceptance checks and the copyable assignment prompt. Start with SB-00 and SB-10. See [LIFEPATH_TUNING_PROPOSAL.md](LIFEPATH_TUNING_PROPOSAL.md) for the recovered four-phase direction and proposed choice tuning; exact rules/content remain subject to source reconciliation and review.


## Current setting

Use [Hawaiʻi — Emergency Republic](../rules/hawaii-setting-bible.md) for all places, chronology and program references. The former archipelago is superseded. The first four-phase fixture spans September 2026–2029; it does not fix the campaign-present date.

## M1 implementation contract

`CONTRACTS.md` v1 supersedes the preliminary namespace/revision sketch above. SB-00 baseline checks and SB-01 contract review are recorded in `reviews/SB-00-01.md`. SB-02 provides fixture-only Vite/TypeScript routes while preserving alpha. SB-03 replaces the reference module with the typed mock contract; backend and surfaces follow after review.

## SB-02 scaffold draft

PR #6 is merged; main is the integration base. Draft PR #7 adds three fixture-only entry pages, a reproducible lockfile, build and preview packaging. See [SCAFFOLD.md](SCAFFOLD.md) for verified setup and remaining review/device limits. This is not a connected multiplayer session. The root Cloudflare Worker continues to serve alpha; `.assetsignore` excludes beta source and fixtures until the reviewed release task changes the asset directory.
