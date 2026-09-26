# Signal Bleed beta — agent task board

Updated: 2026-09-22. Integration baseline: main at merge `373565b188496500f92f57abb8e2f45bcf96b7ce` (PR #6 merged by user authorization).
Re-fetch branch state before starting; this document does not freeze future repository changes.

## Setting authority

The user replaced the former archipelago across Signal Bleed with **Hawaiʻi — Emergency Republic**. Read `rules/hawaii-setting-bible.md` before implementing content. Preserve September Compression (2026), Branch Event One (2027), Observer Trials (2028–2029), 2030 displacement and an undated later fragmentation. No invented campaign-present year. Date-gate lifepaths and fixtures. The first path is now a later-start Hawaiʻi example, still a proposal.

## Goal and first milestone

Build the beta in the existing Signal Bleed repository, retaining Cloudflare Workers static assets and Firebase. The GM directs the tabletop session from an iPad; the TV/projector follows; player phones hold persistent personal information and short private choices. Lifepath rolls must never restrict playbook choice.

**M1: a four-screen session.** One GM changes scenes, sends separate A/B prompts to two players, and sees their responses. The presenter follows the public scene without receiving private content. Refresh, late join, reconnect, and simultaneous responses work. This milestone is useful without the complete lifepath system.

**M2: a playable lifepath session.** Approved roll tables, branch resolution, freely chosen playbooks, persistent character/inventory, and GM-controlled reveals work end to end.

**M3: in-place beta release.** A reviewed preview, alpha preservation, migration/rollback rehearsal, and verified production cutover at the existing URL.

Do not add 3D rendering, a generic multi-game engine, native apps, automated casting discovery, new hosting, or broad rules rewrites to these milestones. Presenter mode initially means a separate browser display/window that the group can mirror or cast normally.

## What exists and what is unproven

- Alpha contains the Chart Table, GM reference, Hawaiʻi location index, case/rules files, Firebase config/rules, and Cloudflare config.
- PR #6 adds an in-memory session module and four Node tests. It does not add UI, transport, persistence, Firebase security enforcement, or lifepath rules.
- Existing alpha shared-state permissions are unsuitable for the beta's GM-only model.
- The reference module's room-wide revision is not the final database concurrency design.
- Exact lifepath tables and branch semantics have not been recovered and approved in this branch.
- Terminal cloning was blocked in the planning session. GitHub file reads/writes worked. Implementation agents need a full checkout with Node/package installation, browser tests, and Firebase emulator access.
- Cloudflare/Firebase administrative access has not been verified here. Do not assume a deployment or rules publication happened.

## Staffing and dispatch

Use at most three concurrent implementation agents after the contract is settled:

| Lane | Responsibility | Owned areas |
|---|---|---|
| A — session/backend | Contracts, auth, Firebase adapter and rules tests | `beta/src/session/`, `beta/src/data/`, backend tests |
| B — GM/presenter | GM scene controls and public display | Proposed `beta/src/gm/`, `beta/src/present/`, surface tests |
| C — player | Private decisions and personal information | Proposed `beta/src/play/`, player tests |
| Integrator/reviewer | Scaffold, shared UI, dependency updates, integration and release | Root config, lockfile, router, shared styles, workflow and deployment files |

These are responsibilities, not four agents that must run continuously. Use a separate review session for each non-trivial change; the integrator cannot be sole reviewer of their own code. A content-audit task can run beside setup because it changes documentation only. One human or coordinating session dispatches and serializes integration.

**Next dispatch:** SB-02 scaffold, then SB-03 typed model. SB-00 baseline evidence and SB-01 contracts are recorded in `beta/reviews/SB-00-01.md` and `beta/CONTRACTS.md`. SB-10 content reconciliation can run independently. Once those contracts and fixtures land, run SB-04, SB-05, and SB-06 in parallel.

## Branch and ownership protocol

1. Read root `AGENTS.md`, `HANDOFF.md`, `beta/README.md`, and this board.
2. PR #6 is merged. Use `main` as the integration base. Create a task branch `feat/beta-sb-NN-short-name` from its latest reviewed commit; target draft task PRs at `main`.
3. Never have two agents write the same branch/worktree. Record task owner, base SHA, and branch in the coordinator's dispatch record before work. Check HANDOFF for existing claims.
4. Agent owns only the task's listed areas. Propose interface/config changes to the integrator instead of editing another lane's files.
5. Root package/lock files, shared router/styles, and deployment config have one writer: the integrator. Backend agents can propose dependency requirements.
6. Each agent still updates HANDOFF on its own branch, as required by AGENTS. The integrator preserves all entries and resolves that predictable append-only conflict. Do not concurrently edit this board; the coordinator updates statuses serially.
7. Each task PR includes task ID, scope, exact test commands/results, limitations, and handoff. Review and integrate in dependency order. No task implicitly authorizes merging to main or production deployment.
8. If protected-file approval is required by AGENTS and not already supplied in the current session, prepare the proposed diff and its reason, then obtain the required go-ahead. Planning this board is not a blanket waiver. Existing user authorization takes precedence; do not ask twice.

Statuses: READY = can start; WAIT = dependencies; BLOCKED-CONTENT = specific source missing; DONE requires accepted evidence, not just authored code.

## Task index

| ID | Task | Lane | Depends on | Status |
|---|---|---|---|---|
| SB-00 | Review foundation and verify working baseline | Integrator/reviewer | — | DONE; baseline evidence recorded |
| SB-01 | Reconcile beta instructions and freeze contracts | A + integrator | SB-00 | DONE; contract v1 reviewed |
| SB-02 | Vite/TypeScript scaffold and build packaging | Integrator | SB-01 | DONE; live Cloudflare topology verified as Workers Static Assets, with beta kept out of production |
| SB-03 | Typed session model and mock adapter | A | SB-02 | DONE; independent review, eleven contract tests, package and PR checks pass |
| SB-04 | Firebase authorization and realtime adapter | A | SB-03 | ACCEPTED FOR MERGE; exact-SHA review and local gates pass; production canary gates remain |
| SB-05 | GM control surface and presenter | B | SB-03 | DONE CORE; independent review, responsive/keyboard E2E, and physical iPad/16:9 rehearsal pass; manual accessibility deferred until after core basics |
| SB-06 | Player prompts and persistent personal surface | C | SB-03 | DONE CORE; independent review, private prompt/reconnect E2E, and physical phone rehearsal pass; manual accessibility deferred until after core basics |
| SB-07 | Wire surfaces and prove four-client M1 | Integrator/reviewer | SB-04–06 | REVIEW; independent automated review, full browser/privacy scenario, and physical iPad/phone/16:9 rehearsal pass; reported VoiceOver-session crash is undiagnosed and deferred |
| SB-08 | Preview packaging and release rehearsal | Integrator | SB-07 | REVIEW; independently reviewed rehearsal/canary boundary, rollback runbook, and physical-device rehearsal pass; protected production capture/deploy, App Check traffic, rollback evidence, and manual accessibility gates remain |
| SB-09 | Alpha feature parity and migration inventory | Integrator | SB-00 | INCREMENTAL; docs complete and SB-09B ordered clues + Bleed implemented/tested; independent review remains before acceptance |
| SB-10 | Recover lifepath specification and content manifest | Content analyst | — | READY; implementation blocked on source |
| SB-11 | Lifepath engine and character persistence | A/C sequentially | SB-07, SB-10 | WAIT |
| SB-12 | GM-led lifepath presentation and playtest | B + reviewer | SB-11 | WAIT |
| SB-13 | Production cutover | Integrator | SB-08, SB-09, SB-12 | WAIT |

## Task cards

### SB-00 — Review foundation and verify working baseline

**Deliver:** independent review of PR #6 and baseline evidence at an exact SHA.
**Own:** review notes in `beta/reviews/`; fixes only in existing beta module/tests if needed.
**Do:** obtain a full checkout; inspect current main and PR changes; run alpha smoke, cases validation, HTML sanity, and the beta Node tests. Inspect workflow status rather than equating mergeability with passing CI.
**Accept:** findings carry severity and reproduction; all required checks have results or precise access blockers; fixes re-run affected tests and receive separate review. Confirm protected-file rules and existing branch claims.
**Exclude:** new features, deployment, claiming that the current projections prove Firebase privacy.

### SB-01 — Reconcile instructions and freeze contracts

**Deliver:** `beta/CONTRACTS.md`, typed-interface design, privacy matrix, and an accurate beta addendum to root conventions.
**Own:** beta design docs; root AGENTS/README/HANDOFF changes through integrator.
**Do:** preserve alpha instructions for alpha; explicitly record the newer user-approved Vite/TypeScript beta direction without weakening approval/review rules. Record routes, adapters, mock fixtures, errors, commands, events, entity revisions, membership and role lifecycle, prompt lifecycle, and character/inventory ownership.
**Resolve:** player consent/join and GM admission; read-only presenter provisioning with an identity separate from GM; lost anonymous identity/GM recovery; who may see private notes versus GM-sent prompts; scene-change invalidation; retry/deduplication semantics. Default to only granting needed reads; document any user-facing policy question rather than inventing a recovery bypass.
**Accept:** all three lanes can implement against the same API and fixtures; no entire-room private reads; concurrent responses from distinct players do not conflict merely because another entity changed; stale responses after a scene change have a defined rejection.
**Exclude:** exact lifepath table content, production rules publication.

### SB-02 — Vite/TypeScript scaffold and packaging

**Deliver:** reproducible beta dev/build/typecheck commands, lockfile, route shells, a fixture adapter, and explicit deployment output.
**Own:** package/lock/build config, proposed `beta/src/app/`, `beta/src/ui/`, shared styles, route wiring.
**Do:** inspect current dependency/runtime requirements from official documentation during implementation; choose and pin compatible versions. Preserve alpha paths/assets as planned; prevent source files or test fixtures from becoming accidental production assets.
**Accept:** clean install/build/typecheck; all three routes load directly and after refresh; old /gm reference remains accessible under an explicit preserved route; alpha smoke/case/HTML checks remain meaningful. Do not call a client-side route guard authorization.
**Protected edits:** CI/PWA/config changes follow AGENTS; prepare a concrete patch first if additional go-ahead is needed.
**Exclude:** visual polish, real Firebase writes, production build-setting changes.

### SB-03 — Typed model and mock adapter

**Deliver:** typed session commands/views, an adapter interface, and multi-actor fixtures following SB-01.
**Own:** `beta/src/session/`, mock data adapter and contract tests. The former `beta/session/` prototype was removed.
**Do:** migrate the existing module instead of maintaining two competing implementations. Validate inputs and isolate public/player/GM data. Replace or adapt the global revision concept with the contract's per-entity concurrency.
**Accept:** tests cover valid scene/prompt flow, malformed IDs/input, spoofed roles, duplicate commands, stale responses, independent concurrent player responses, immutable projections, and private-data isolation. Fixture data is clearly non-canonical test content.
**Exclude:** network transport and invented game mechanics.

### SB-04 — Firebase authorization and realtime adapter

**Deliver:** authenticated adapter, isolated versioned beta namespace, proposed rules, emulator configuration and adversarial authorization tests.
**Own:** `beta/src/data/`, backend tests and emulator fixtures; `firebase.rules.json` only after the applicable approval requirement is satisfied.
**Do:** enforce the SB-01 room/role lifecycle and permissions at the backend; subscribe only to allowed paths; use granular writes/transactions, stable command IDs, unsubscribe cleanup, and explicit pending/failed/confirmed states. Authentication comes from Firebase identity, never command payloads. Keep beta test traffic out of live alpha rooms.
**Accept:** emulator denies anonymous/unauthenticated unauthorized access, cross-room reads, role elevation, player scene writes, other-player private reads, presenter writes/private reads, invalid responses, duplicate/stale submissions, and deleted/revoked membership. Test simultaneous responses and reconnect. Confirm data is absent from unauthorized network payloads, not merely hidden.
**Boundary:** metadata needed for admission must not expose private room state. If an invariant cannot be enforced with RTDB rules/transactions, document the smallest trusted-server addition before implementing; no client-only fallback.
**Exclude:** publishing rules or changing production credentials as part of unit testing.

### SB-05 — GM control surface and presenter

**Deliver:** scene selection/publish, targeted A/B prompts, response status, and a readable public board.
**Own:** `beta/src/gm/`, `beta/src/present/`, their styles/tests.
**Do:** consume the frozen adapter; develop on fixtures until SB-04 is ready. GM previews before publishing and explicitly controls reveals. Presenter has no GM controls or private subscriptions. Distinguish blank/loading/disconnected/last-confirmed views.
**Accept:** iPad touch interaction and keyboard use; readable 16:9 screen at distance; reduced motion; long-text/empty states; safe text rendering; no player/GM private information in presenter DOM or payloads. A scene change does not require players to navigate.
**Exclude:** auto-casting integration, map editor, 3D, custom sound engine.

### SB-06 — Player prompts and personal surface

**Deliver:** player join/status, private A/B decision, confirmed response state, and minimal persistent character/inventory presentation.
**Own:** `beta/src/play/`, player styles/tests.
**Do:** show active prompts with large touch targets and minimal text. Keep personal information accessible between scenes. Show pending/failed submissions and permit only contract-approved retries. Use approved fields; lifepath generation comes later.
**Accept:** player one never receives player two's private data; answered/closed/stale prompts cannot be resubmitted; scene changes preserve character/inventory; refresh/reconnect restore confirmed state; supported phone sizes and keyboard/screen-reader flow work.
**Exclude:** determining character mechanics, assigning a playbook from rolls, full inventory simulation.

### SB-07 — Four-client integration and M1 acceptance

**Deliver:** integrated adapter wiring and repeatable browser tests with four isolated authenticated contexts.
**Own:** app wiring and integration/E2E tests; route fixture cleanup via integrator.
**Scenario:** GM creates room; admits two players and a presenter; publishes scene; sends distinct private prompts; both players answer concurrently; GM sees both; presenter sees only public scene. Close a prompt while a delayed response is in flight. Change scene, refresh all clients, disconnect/reconnect one player, join a fresh presenter, and verify no lost state or duplicate resolution.
**Accept:** authorization emulator suite plus browser scenario pass; real iPad/phone/TV checks recorded separately from desktop emulation; no unhandled errors; revocation closes subscriptions; stale offline actions cannot silently apply. Alpha regression checks pass.
**Exclude:** marking manual device checks passed without devices, or treating mocked transport as multiplayer completion.

### SB-08 — Preview and release rehearsal

**Deliver:** reviewable beta preview, build/deploy runbook, rollback rehearsal, and documented protected-file changes.
**Own:** build output mapping and Cloudflare configuration through integrator; CI/PWA only with applicable authorization.
**Do:** verify actual host configuration (repo docs mention Pages, while wrangler is Worker static assets). Preserve alpha commit with a non-overwriting release tag and record it; verify whether production has advanced since the planning baseline. Test service-worker/cache behavior without caching private session responses.
**Accept:** preview uses a safe test namespace/project; direct-route reloads work; deployment points to the tested SHA; rollback restores the previous release; no production cutover performed as an incidental preview step. CI runs the new type/build/rules/E2E gates after required workflow approval.
**Exclude:** new hosting stack or unverified claims of deploy access.

### SB-09 — Feature parity and migration inventory

**Deliver:** `beta/PARITY.md` and export/migration specification.
**Own:** docs and explicitly scoped migration fixtures/tests.
**Do:** inventory the alpha chart, clocks, clues, links, rolls, case loading/staging, artifacts/puzzles/inbox, character notes, print/reference pages, and Hawaiʻi location index. Inspect actual code; do not assume handoff entries describing old branches reflect current main.
**Accept:** every existing capability marked retain, migrate, or explicitly deferred with rationale; do not silently remove essential session tools to declare beta replacement. Define export/version handling, private data retention, import validation and rollback. Destructive/ambiguous migration requires a reviewed user decision.
**Exclude:** rewriting all alpha features in one task. Any required parity implementation becomes a separately scoped card before SB-13.

### SB-10 — Recover lifepath spec and content manifest

**Deliver:** `beta/LIFEPATH_SPEC.md` with source references and a missing-decisions list.
**Own:** documentation only; canonical rules changes need their own scope.
**Do:** recover the complete approved design session/handoff and compare with repository rules. Record stages, dice, tables, modifiers, rerolls, branch effects, bonds, GM reveals, resulting character fields, and persistence. Mark unknown items unknown. The confirmed constraint is roll-heavy generation with free playbook choice.
**Accept:** each mechanic/table is traceable to approved content; no invented canon is presented as approved. If the source remains unavailable, return the exact questions or requested transcript sections. SB-11 remains blocked on those details, but M1 continues.
**Exclude:** coding speculative lifepath rules to fill the gap.

### SB-11 — Lifepath engine and character persistence

**Deliver:** schema-versioned lifepath progress/history, validated roll outcomes, branch effects, and character persistence using SB-10.
**Own:** proposed `beta/src/lifepath/`, approved data tables, character adapter extensions coordinated with lane A.
**Do:** make recorded outcomes stable on refresh/retry; use the specified dice rules; apply effects once; allow resume and explicit approved correction/reroll semantics; select playbooks independently.
**Accept:** approved table boundaries and branches covered; no duplicate effects after retry; character/inventory survives scene transitions and reconnect; all supported playbooks remain selectable regardless of roll history.
**Exclude:** a seeded game engine, unapproved balancing, or automatic assignment of playbooks.

### SB-12 — Lifepath presentation and table playtest

**Deliver:** player roll/choice flow, GM stage/reveal controls, public presentation, and one complete lifepath playtest report.
**Own:** surface integrations under agreed lane ownership; lifepath E2E tests.
**Accept:** GM can guide organically without forcing everyone to navigate; private outcomes stay private until an explicit permitted reveal; animations have reduced-motion alternatives and do not block authority/state; interruption/resume works; full four-client flow produces correct persisted characters.
**Exclude:** elaborate cinematic effects before the plain flow passes.

### SB-13 — Production cutover

**Deliver:** reviewed beta release at the existing URL, verification evidence, and final handoff.
**Depends additionally on:** parity implementation cards identified by SB-09 and any outstanding user decisions/access approvals.
**Do:** independent review of exact release diff; verify protected-file approvals, current deployed revision, backups/exports, rules compatibility and deployment ordering; merge/deploy only with the applicable authorization.
**Accept:** build/type/unit/rules/E2E/alpha gates pass; preview and real-device findings addressed; migration and rollback rehearsed; post-deploy GM/player/presenter smoke succeeds; release and alpha rollback references recorded.
**Exclude:** interpreting a green unit-test suite or this planning document as production approval.

## Agent assignment prompt

Copy this and replace TASK_ID and branch details:

> Implement TASK_ID from beta/AGENT_TASKS.md in JohnWainee/signal-bleed. Start by reading AGENTS.md and HANDOFF.md, then the task card and dependencies. Fetch the coordinator-designated integration branch and create an isolated task branch/worktree at its latest reviewed SHA. Check task ownership before editing. Implement only the assigned scope and owned files; coordinate shared contract/config changes with the integrator. Use actual /rules content for game mechanics. Follow existing protected-file approval requirements without asking again for already-authorized actions. Run the task's acceptance checks, report exact results and limitations, update HANDOFF, and open a draft PR to the designated integration branch. Do not merge or deploy. If blocked, name the exact missing source/access/decision and finish independent authorized work first.

## Task completion record

The coordinator records: task ID; owner/session; task branch; base SHA; status; dependency PRs; implementation PR; reviewed SHA; test evidence; unresolved decisions; next owner. Claims are coordinated centrally; a stale HANDOFF entry is not a distributed lock.

Keep tasks to one coherent, reviewable behavior. If a task grows beyond that, split it along the stated deliverables while retaining the acceptance gate. Estimates should be made by the implementing agent after repository inspection; no calendar promises are implied here.


### Dispatch record — 2026-09-22

Coordinator Codex completed SB-00 evidence and SB-01 design on integration branch `feat/beta-session-foundation`, base `ba03bc542cb9098b077df9cfb9d08a93039051a2`. Independent reviewer: hawaii_review (read-only). See `reviews/SB-00-01.md` for exact scope and remaining browser/backend limits. No implementation agents own SB-02–06 yet. Next owner: integrator for SB-02, using `CONTRACTS.md` v1. This task acceptance does not approve merging the entire PR or deployment.

### Dispatch record — merge and SB-02 scaffold

PR #6 merged at `373565b188496500f92f57abb8e2f45bcf96b7ce`; current integration base is main. Codex prepared SB-02 on `feat/beta-sb-02-scaffold` from that exact commit. Status: BLOCKED-ENV (npm HTTP 403; cannot generate a trustworthy lockfile or verify build/typecheck/browser). Source and packaging are reviewable; completion requires the commands/checks in `SCAFFOLD.md`. Branch released for a dependency-enabled implementation session. SB-03 remains WAIT. The earlier “no owner” record is historical.

### Dispatch record — SB-02 resumed, 2026-09-21 HST

| Field | Current record |
|---|---|
| Task / owner / model | SB-02; Codex integrator (Codex app; exact model ID not exposed in this runtime); active implementation |
| Branch / base | `feat/beta-sb-02-scaffold`; `373565b188496500f92f57abb8e2f45bcf96b7ce` |
| Dependencies / owned files | SB-01; `beta/package-lock.json`, beta build/packaging documentation, this board and `HANDOFF.md`. Integrator retains sole ownership of shared dependency/routing/configuration files. |
| Acceptance | Root and beta clean installs, typecheck, build/package, direct/reloaded beta routes, preview alpha routes and asset audit, alpha smoke/case/HTML/setting checks, four reference tests. See `SCAFFOLD.md` for results. |
| Status / result | DONE; automated and desktop-browser gates passed, Fable re-reviewed asset containment, and live Cloudflare dashboard confirmed Workers Static Assets hosting. |

Factory discovery is read-only, not a dispatch: Claude Code 2.1.278 is authenticated and lists Fable 5.1/Sonnet 5 in its local catalog; Ollama is reachable with local Qwen models, but no Signal Bleed Qwen task has run. The DeepSeek pi provider reports `credentials_not_configured`; SB-10 is **not dispatched**. The existing factory Beads queue/worktrees concern another tenant, not this repository. Do not claim those workers for Signal Bleed or share this game's content into that queue. SB-09 and SB-10 packets must name an exact new branch/worktree and base SHA before dispatch. At most three implementation workers may be active, including Codex.

### Review dispatch — SB-02 Fable 5.1

- Task: independent final review of SB-02; owner/model: Fable 5.1 through authenticated Claude Code 2.1.278; status: **read-only re-review complete**. Fable found one medium root-asset exposure risk, now contained for Workers by `.assetsignore`, and judged the fix non-blocking. Its plan-mode reviews did not execute tests. Stale setup docs were updated. Remaining host-topology question is recorded below.
- Exact target/base: `b299ad6dbcaf7a46fc9bf620ce7b83acd46efe0b`; dedicated `review/beta-sb-02-fable` worktree at `/private/tmp/signal-bleed-sb02-fable-review`. Compare with main `373565b188496500f92f57abb8e2f45bcf96b7ce`.
- Sources: root `HANDOFF.md`, `AGENTS.md`, this board, `CONTRACTS.md`, `SCAFFOLD.md`, Hawaiʻi setting bible. Own review notes only; no implementation/shared/protected files. Check lockfile, routes, packaging, alpha preservation, exact tests and limits; report severity/file/line, actual commands/results, failures and unresolved questions. No merge/deploy or Firebase claims.
- If review changes are authored, draft PR target is `feat/beta-sb-02-scaffold` and reviewer updates `HANDOFF.md`; for a read-only report, Codex records review result in `HANDOFF.md` and PR #7. No report is accepted as test evidence until Codex inspects it.

### Research dispatch — SB-09 Qwen local

- Task: bounded alpha feature inventory with file/line references, no runtime or tracked-file changes; owner/model: local `qwen2.5-coder:7b` via pi/Ollama; status: **attempted, no accepted result**. The first invocation exited after printing a read-tool-call-shaped string, without a source inventory or test evidence. Codex owns final `beta/PARITY.md` integration and cross-review; retry only after confirming the factory tool protocol.
- Exact base: main `373565b188496500f92f57abb8e2f45bcf96b7ce`; dedicated `docs/beta-sb-09-parity` worktree at `/private/tmp/signal-bleed-sb09-qwen`; dependency SB-00 DONE. Draft documentation PR target: `main` only after evidence review, with its own HANDOFF update.
- Sources: `HANDOFF.md`, `AGENTS.md`, this board, `CONTRACTS.md`, `SCAFFOLD.md`, Hawaiʻi setting bible and actual alpha source. Own inventory report only; no shared/router/dependency/protected files. Inventory chart/clocks/clues/links/rolls/case staging/artifacts/puzzles/inbox/notes/print/reference/Hawaiʻi index. Supply exact references, retain/migrate/defer recommendation and gaps; do not assume historical handoff equals current code.
- Acceptance: read-only source inspection with reproducible `rg`/file references, limitations and unresolved migration questions; no runtime changes, no claim of browser or migration tests. Report actual checks and failures. If the factory cannot complete the packet, mark not dispatched or failed and have Codex do the inventory independently.

SB-02 result link: [merged PR #7](https://github.com/JohnWainee/signal-bleed/pull/7), merge commit `6868ab47ee50890c91e29149613170be36773109`. Reviewed code SHA: `2633f60e255bea98ce21feb44c68d44173630e8c` (Fable read-only re-review). Cloudflare dashboard confirms `signal-bleed.com` is the `signal-bleed` static-assets Worker, connected to this repo, deploying `main` from `/` with `npx wrangler deploy`. After merge, live `/gm/` and `/table/` return 200; beta source/routes, `/HANDOFF.md`, and `/AGENTS.md` return 404. SB-02 is DONE and SB-03 is in review. Fable SB-05 and Qwen SB-06 remain WAIT.

### SB-03 implementation record — 2026-09-21 HST

| Field | Current record |
|---|---|
| Task / owner | SB-03; Codex integrator, typed mock implementation; independent review pending |
| Branch / exact base | `feat/beta-sb-03-session-model` from accepted SB-02 head `5c654ed` |
| Dependency / PR target | SB-02 merged in PR #7; [draft PR #8](https://github.com/JohnWainee/signal-bleed/pull/8) targets `main` |
| Owned files | `beta/src/session/`, `beta/tests/model.test.mjs`, removal of older `beta/session/session.mjs` and its tests; documentation and handoff updates. No Firebase, alpha runtime, protected file, routing or dependency changes. |
| Acceptance evidence | `node --experimental-strip-types --test beta/tests/model.test.mjs` 11/11; `npm run beta:typecheck`, `npm run beta:package`, alpha smoke/cases/HTML/setting checks passed. Covers private views, malformed commands, roles, independent answers, receipts, scene epochs, serialized close/answer ordering, admission races, revocation, reconnect and personal revisions. |
| Review / result | Fable read-only re-review of `07f768f` found no blocker and verified the prior fixes. Follow-up aligned disconnected role precedence and cross-player denial with the contract; 11/11 tests, package build and five PR checks pass at `898efed`. SB-03 is accepted as a mock model, not backend authorization or four-client multiplayer proof. |

### Prepared, not dispatched — SB-10 DeepSeek

- Task: source/content reconciliation and missing-decisions report for lifepath. Intended owner/model: DeepSeek `deepseek-v4-flash` via pi, contingent on verified credential, tenant data-scope approval, and a reachable model. Current auth result: `credentials_not_configured`; **not dispatched**, no result or PR.
- Planned exact base: main `373565b188496500f92f57abb8e2f45bcf96b7ce`; dedicated branch `docs/beta-sb-10-lifepath-spec`, separate worktree to be created only at dispatch. Draft PR target `main`; dependency independent of SB-02.
- Required sources: `HANDOFF.md`, `AGENTS.md`, this board, `CONTRACTS.md`, Hawaiʻi setting bible, approved lifepath source documents. Owned files: `beta/LIFEPATH_SPEC.md` and its own HANDOFF entry only; no canonical rules, runtime, config or task-board edits. Record stages, rolls/tables/modifiers/rerolls/branches/bonds/reveals/persistence with exact source references and explicitly missing decisions. Acceptance: no invented approved table/canon, source traceability and questions if approved transcript is unavailable. Report actual checks/failures; no merge/deploy. Later backend review requires a separate packet and availability check.
