# Alpha-to-beta parity and migration inventory

**Status:** SB-09 source inventory at `3d7c7dbd564342f5c30fabba5d9d4350bfb8ec51`. This is a plan and compatibility contract, not evidence that missing features have been implemented or migrated.

## Classification key

- **Essential beta implementation** — required before beta can replace the alpha Chart Table for ordinary sessions.
- **Retained in alpha during migration** — remains at its alpha URL while beta coexists with it.
- **Later migration** — useful interactive functionality, but not required for the first core beta slice.
- **Intentionally deferred** — excluded for a stated product, safety, or sequencing reason.

## Current boundary

Alpha has shared-board, per-player-private, and GM stores (`table/index.html:797-813`) and writes the shared board as a last-write-wins blob (`table/index.html:819-860`). Beta instead uses commands and granular subscriptions: GM gets scene/roster/decisions, player gets scene/decisions/sheet/notes, and presenter gets scene only (`beta/src/data/firebase-session.ts:123-154`; `beta/CONTRACTS.md:24-36`). Beta M1 implements admission, scene publish, targeted A/B prompts, room closure, and read-only character/inventory/notes presentation (`beta/src/app/live.ts:169-251`), but not the alpha workflow below.

## Capability inventory

| Capability | Actual alpha source and behavior | Current beta gap | Classification and rationale |
|---|---|---|---|
| Chart and shared board | `board()` persists clues, links, roster, ledger, log and clocks (`table/index.html:810-811`). Cards are positioned and may be face-down (`table/index.html:915-923`); SVG links render/cut and pin/tie/cut actions mutate the board (`table/index.html:925-931`, `1301-1306`, `1387-1390`). | Shared state is only one published scene (`beta/src/session/model.ts:7-18`). | **Essential beta implementation.** The clue board is the named play surface. Use granular commands, not alpha whole-blob writes. Freeform drag layout may follow an ordered accessible board. |
| Clocks | Six-segment Bleed and eight-step Aperture render globally (`table/index.html:893-913`); four-segment company clocks are editable (`table/index.html:1145-1153`, `1241-1248`); case transitions update them (`table/index.html:1262-1265`, `1333-1340`). Rules define triggers (`rules/signal-bleed-v0_1.md:195-208`; `gm/index.html:133-138`). | No clock entity, command, subscription, or UI exists. | **Essential beta implementation.** Bleed is a frequent visible control. Implement it first; add Aperture/company clocks without inflating the first review. |
| Clues and links | GM bank adds, drops face-up/down, or deletes clues (`table/index.html:1034-1050`, `1364-1366`). Cards move through play/woven/deep states and link (`table/index.html:1193-1222`, `1301-1306`); woven clues drive Theorize and ledger (`table/index.html:911-913`, `1311-1324`). | No clue/link or theory entities exist. | **Essential beta implementation.** Start with create/reveal/state/order and links, retaining explicit GM reveal and presenter-safe projections. Theory follows once clue state exists. |
| Rolls | Alpha embeds move/Theorize bands and records outcomes (`table/index.html:374-385`, `456-466`, `1311-1324`) plus a d100 content generator that can stage clues/deliveries (`table/index.html:534-716`, `1077-1133`, `1344-1360`). | Beta has no roll model. Lifepath rolls separately depend on SB-10 (`beta/AGENT_TASKS.md:164-185`). | **Later migration.** Physical dice and retained references cover ordinary rolls. Migrate Theorize recording after clues, and d100 as a separate helper. Do not conflate this with lifepath or add a seeded engine. |
| Case loading and staging | Canonical case v1 includes job, wrong detail, locations, NPCs, clues, artifacts, puzzles, rings and notes (`rules/signal-bleed-case-format.md:8-75`; `cases/case-eleven-minutes.json:2-156`). Validation currently checks required top-level structure (`scripts/validate-cases.mjs:11-47`). The format doc proposes a Portal loader/stager (`rules/signal-bleed-case-format.md:90-229`), but actual alpha has no Case tab or loader implementation (`table/index.html:404-414`, `1027-1032`). | No case parser, loader, or staging queue exists. | **Essential beta implementation for validation/staging; retained in alpha for direct JSON/reference access until then.** Never describe the proposed patch as shipped alpha behavior. Import only to preview/staging; require explicit publish/send. |
| Artifacts, puzzles, and inbox | GM sends text artifacts or keypad/sounding/audio puzzles to all or one player (`table/index.html:1051-1075`, `1367-1401`). Player inbox tracks unread items and runs the puzzle UI locally (`table/index.html:980-1024`, `1279-1299`). | Targeted A/B prompts exist (`beta/src/session/model.ts:8`, `13-18`; `beta/src/app/live.ts:210-246`), but durable delivery/inbox/artifact/puzzle entities do not. | **Essential beta implementation for targeted text delivery and durable inbox. Later migration for interactive puzzle widgets.** Text delivery is a basic session primitive; puzzle state needs separate validation/concurrency design. |
| Character notes and personal information | `priv()` holds character, sealed answer, notes and inbox (`table/index.html:812`). Sheet edits stats, Static, symptoms, Harm, Bonds, secret and notes (`table/index.html:951-978`, `1266-1278`, `1413-1421`); shared state gets only a roster summary (`table/index.html:853-855`). | Beta defines private, independently revisioned sheet/name/playbook/inventory/notes (`beta/src/session/model.ts:9-18`; `beta/CONTRACTS.md:29-40`, `110-112`) and subscriptions, but UI only displays them (`beta/src/app/live.ts:247-249`). | **Essential beta implementation for editable name, freely chosen playbook, inventory and notes. Later migration for stats, Static, Harm, Bonds, sealed answers, symptoms and automation**, pending approved character/lifepath rules. Never expose private notes to GM. |
| Print/reference pages | `/gm/` is searchable rules/setting/case reference (`gm/index.html:105-244`). `/print/hawaii.html` is the nine-sheet pack (`print/hawaii.html:124-853`); `/print/hours.html` and `/print/vespers.html` are byte-identical compatibility URLs. Home links these resources (`index.html:35-39`). | Beta has no need to duplicate static rules content. | **Retained in alpha during migration.** Preserve `/gm/`, `/print/*`, `/rules` and case JSON; canonical content remains `/rules`, not copied beta strings. |
| Hawaiʻi location/index | `/hawaii/` supplies seven place anchors, selectable descriptions, a date-gated timeline and sources (`hawaii/index.html:1-4`). The setting authority remains `rules/hawaii-setting-bible.md`. | Beta uses Hawaiʻi fixtures/headings but has no index or scenario-date control. | **Retained in alpha during migration.** Link to `/hawaii/`. **Intentionally deferred:** maps/navigation, real-facility interiors, or inferred canon; the index is explicitly non-navigational and the bible forbids invented authority. |

## Export and migration contract

### Formats and versions

1. Preserve alpha data exactly. Its dump is an unlabelled `{shared, gm?}` object (`table/index.html:1249-1254`) whose stores carry `v: 3` (`table/index.html:810-813`). Recognize it as **`alpha-table-dump/v3` only after validation**; never mutate the source in place. It omits all player-private stores and is not a complete room backup.
2. Beta export uses an explicit envelope: `format: "signal-bleed-session"`, `version: 1`, `exportedAt`, `source`, and separately typed `public`, `gm`, and `private` sections. Entity `schemaVersion` values remain independent. Unknown future envelope versions fail closed.
3. Case files remain separate: `format: "signal-bleed-case"`, currently `version: 1`. They may populate staging only; they are never session exports or direct live-path writes.
4. Export JSON is data, never authority or commands. Import creates new beta IDs/revisions through trusted migration commands. Imported command IDs, UIDs, ownership, receipts, membership, room codes and timestamps are never authoritative.

### Private-data retention

- Default GM export contains public room state and GM-only staging/notes plus a manifest of private record types/revisions/counts, never player-private contents.
- Each player may produce a separate owner-visible private export. Combining private exports needs explicit per-player consent and a separate reviewed card; GM authority alone is insufficient.
- Closure/rollback retains beta data read-only. No automatic deletion, alpha-room rewrite, slot recycling, or identity reassignment is migration behavior (`beta/CONTRACTS.md:110-114`; `beta/RELEASE_RUNBOOK.md:56-65`).

### Import validation and preview

- Parse in isolation; require a plain object; reject forbidden keys, unknown format/version, non-finite values, invalid enums/IDs, duplicate IDs, broken links, absent recipients, excessive counts/bytes, and out-of-bound strings before writing.
- For alpha dumps, allow only known `board()`/`gm()` fields; fill missing arrays from defaults but report unknown fields. Validate each clue, link, ledger, clock and queue item and show accepted/unsupported counts.
- Import only to a newly assigned empty beta room. The GM reviews public, GM-only and unsupported/private omissions, then explicitly confirms one atomic import. Failure leaves it empty. No partial import or overwrite in v1.
- Case import validates nested field types and puzzle variants more strictly than today's presence-only repository validator, previews staging, and publishes/sends nothing automatically.

### Rollback

Alpha routes/data and the Firebase `rooms` namespace remain untouched while beta uses its versioned namespace. Keep the original export and a receipt with source checksum, target room, importer version, counts and omissions. Before cutover rehearse export → dry-run → empty test-room import → projection comparison → beta disable → unchanged alpha reopen. Rollback changes routing/beta availability only; it never reverse-writes into alpha or deletes either room.

## User decisions required

1. Choose whether player-private alpha data remains alpha-only, is exported by each player, or gets a consent-based transfer flow. **Recommendation:** no automatic private migration; the GM dump cannot recover it.
2. Choose whether unsupported harmless legacy fields may be omitted with a preview report or must block import. **Recommendation:** block structural/privacy ambiguity; allow only named UI/history omissions.
3. Choose whether alpha stats/Static/Harm/Bonds/secrets appear read-only in beta before SB-10/11 or remain solely in alpha. **Recommendation:** remain in alpha until the character schema is approved.
4. Choose whether case `to` names are interactively resolved to admitted identities or imported unassigned. **Recommendation:** unassigned staging; names are not identity proof.
5. Any overwrite, deletion, ownership/UID transfer, slot reuse, production migration, or cutover remains separate explicit approval. The first migration implementation supports none of these.

## Dependency-ordered implementation cards

| Order | Card | Reviewable deliverable | Acceptance boundary |
|---:|---|---|---|
| 1 | **SB-09A — Versioned export/import validator** | Pure schemas/validators, alpha-v3 reader, beta-v1 envelope, dry-run fixtures and hostile-input tests. No Firebase writes/UI import. | Reject unknown versions, forbidden keys, broken references, leakage and limits; round-trip without granting authority. |
| 2 | **SB-09B — Core clues and Bleed clock** | Granular commands/projections for clue create/reveal/state/order and the six-segment Bleed; accessible GM controls and public views. | Emulator/model/E2E cover roles, concurrent updates, reconnect, presenter privacy and no whole-room overwrite. **Recommended first slice.** |
| 3 | **SB-09C — Links and Theorize ledger** | Link add/remove integrity, woven selection, depth and immutable theory record. | Depends on 09B; rejects broken/stale links; records outcomes rather than authoritative RNG. |
| 4 | **SB-09D — Text delivery and inbox** | GM sends validated text to one/all admitted players; private read/unread state persists. | Depends on admissions/export policy; unauthorized payloads absent; exact retry never duplicates. |
| 5 | **SB-09E — Editable minimal personal sheet** | Player edits name, canonical unrestricted playbook, inventory and private notes with conflict/retry UI. | Private notes never reach GM/presenter; refresh/scene change preserve edits; no lifepath/stats. |
| 6 | **SB-09F — Case import and staging** | Strict case-v1 parser, dry-run preview, clue bank and unassigned delivery staging. | Depends on 09A/B/D; atomic staging only; nothing auto-publishes; names cannot claim identities. |
| 7 | **SB-09G — Additional clocks/history** | Aperture/company clocks, ring gates, activity log and explicit end-case transition. | End-case preview names every mutation; no deletion. |
| 8 | **SB-09H — Interactive puzzle deliveries** | Keypad, sounding and audio-recovery delivery types with validated state/results and accessible alternatives. | Depends on 09D; separate type per review; no hidden answer sent before reveal. |
| 9 | **SB-09I — d100/reference helpers** | Data-driven d100 tables, stage actions, and navigation to retained references. | Depends on 09B/D/F; canonical content traceability; no seeded engine. |
| 10 | **SB-09J — Migration rehearsal** | Empty-room dry-run/import UI, checksums, comparison report and rollback rehearsal. | Depends on implemented targets and user decisions; no production/overwrite/delete/transfer/slot reuse. |

## First core slice recommendation

Implement **SB-09B: clues and the Bleed clock** first. Clues are created, revealed, moved, woven and linked throughout alpha (`table/index.html:915-931`, `1034-1050`, `1193-1222`, `1301-1306`), while Bleed is always visible and participates in normal move/case transitions (`table/index.html:893-913`, `1262-1265`, `1335-1340`). Beta already supplies secure membership, GM commands and public projections, so this extends proven boundaries without first solving case migration or rich private puzzles. Follow with SB-09D text delivery and SB-09E editable personal data to restore the basic GM → shared table → player loop.

Do not include VoiceOver investigation unless the failure also blocks ordinary core use. The attempt remains deferred, neither passed nor waived (`beta/reviews/SB-05-07-accessibility.md:37-52`).
