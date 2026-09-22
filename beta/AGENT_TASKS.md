# Signal Bleed beta — agent task board

Updated: 2026-09-22. Planning baseline: draft PR #6, branch `feat/beta-session-foundation`, commit `0b317bf9aec850f4c955f208412b978768147eb3`.
Re-fetch branch state before starting; this document does not freeze future repository changes.

## Goal and first milestone

Build the beta in the existing Signal Bleed repository, retaining Cloudflare Workers static assets and Firebase. The GM directs the tabletop session from an iPad; the TV/projector follows; player phones hold persistent personal information and short private choices. Lifepath rolls must never restrict playbook choice.

**M1: a four-screen session.** One GM changes scenes, sends separate A/B prompts to two players, and sees their responses. The presenter follows the public scene without receiving private content. Refresh, late join, reconnect, and simultaneous responses work. This milestone is useful without the complete lifepath system.

**M2: a playable lifepath session.** Approved roll tables, branch resolution, freely chosen playbooks, persistent character/inventory, and GM-controlled reveals work end to end.

**M3: in-place beta release.** A reviewed preview, alpha preservation, migration/rollback rehearsal, and verified production cutover at the existing URL.

Do not add 3D rendering, a generic multi-game engine, native apps, automated casting discovery, new hosting, or broad rules rewrites to these milestones. Presenter mode initially means a separate browser display/window that the group can mirror or cast normally.

## What exists and what is unproven

- Alpha contains the Chart Table, GM reference, Hours chart, case/rules files, Firebase config/rules, and Cloudflare config.
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
| A — session/backend | Contracts, auth, Firebase adapter and rules tests | `beta/session/`, proposed `beta/src/session/`, `beta/src/data/`, backend tests |
| B — GM/presenter | GM scene controls and public display | Proposed `beta/src/gm/`, `beta/src/present/`, surface tests |
| C — player | Private decisions and personal information | Proposed `beta/src/play/`, player tests |
| Integrator/reviewer | Scaffold, shared UI, dependency updates, integration and release | Root config, lockfile, router, shared styles, workflow and deployment files |

These are responsibilities, not four agents that must run continuously. Use a separate review session for each non-trivial change; the integrator cannot be sole reviewer of their own code. A content-audit task can run beside setup because it changes documentation only. One human or coordinating session dispatches and serializes integration.

**Recommended first dispatch:** SB-00 to a reviewer/integrator and SB-10 to a content analyst. Then SB-01, SB-02, and SB-03 in order. Once those contracts and fixtures land, run SB-04, SB-05, and SB-06 in parallel.

## Branch and ownership protocol

1. Read root `AGENTS.md`, `HANDOFF.md`, `beta/README.md`, and this board.
2. Until PR #6 is merged, use `feat/beta-session-foundation` as the integration base. Create a task branch `feat/beta-sb-NN-short-name` from its latest reviewed commit; target draft task PRs at that integration branch. After integration into main, the coordinator explicitly updates the base.
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
| SB-00 | Review foundation and verify working baseline | Integrator/reviewer | — | READY |
| SB-01 | Reconcile beta instructions and freeze contracts | A + integrator | SB-00 | WAIT |
| SB-02 | Vite/TypeScript scaffold and build packaging | Integrator | SB-01 | WAIT |
| SB-03 | Typed session model and mock adapter | A | SB-02 | WAIT |
| SB-04 | Firebase authorization and realtime adapter | A | SB-03 | WAIT |
| SB-05 | GM control surface and presenter | B | SB-03 | WAIT |
| SB-06 | Player prompts and persistent personal surface | C | SB-03 | WAIT |
| SB-07 | Wire surfaces and prove four-client M1 | Integrator/reviewer | SB-04–06 | WAIT |
| SB-08 | Preview packaging and release rehearsal | Integrator | SB-07 | WAIT |
| SB-09 | Alpha feature parity and migration inventory | Integrator | SB-00 | WAIT |
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
**Own:** `beta/session/`, `beta/src/session/`, mock data adapter and contract tests.
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
**Do:** inventory the alpha chart, clocks, clues, links, rolls, case loading/staging, artifacts/puzzles/inbox, character notes, print/reference pages, and Hours map. Inspect actual code; do not assume handoff entries describing old branches reflect current main.
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
