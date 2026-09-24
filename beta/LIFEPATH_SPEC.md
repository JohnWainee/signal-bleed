# Signal Bleed beta lifepath specification

**Status:** accepted design direction and implementation contract for SB-11/12; content remains proposed until its own review and observed playtest. Canonical setting changes belong in `/rules` and are not made by this document.

**Recovered source:** the sponsor-supplied Wayfinder handoff dated 2026-09-22, reconciled with `rules/hawaii-setting-bible.md`, `rules/signal-bleed-v0_1.md`, `beta/LIFEPATH_FIRST_PATH.md`, `beta/LIFEPATH_TUNING_PROPOSAL.md`, `beta/CONTRACTS.md`, and the SB-10–12 task cards.

## Authority and superseded proposals

The Wayfinder decisions fix the default play era at approximately 2050, after an approximately 2045 Fragmentation. September 2026 remains the beginning of the alternate-history timeline and a legal earlier scenario date. The new-generation path is the default for 2050 play. LP-B, **The Name That Stayed**, remains an optional elder/earlier-era path rather than the default.

This supersedes beta text that says the campaign-present year and Fragmentation date are wholly open. The canonical bible records the corresponding setting direction through its normal review path. Approximate dates are intentional; they do not authorize exact borders, factions, constitutional outcomes, or an explanation of the cosmic layer.

No GM-hidden fact may redefine a PC's own established past. GM-only material may cover an NPC's motive, an unresolved outside cause, or a future callback, but cannot secretly revoke a disclosed consequence or playbook choice. This supersedes older prototype language about hidden personal-history hooks.

## World and session frame

- 2026–2029: September Compression, Emergency Logistics Order, prediction-linked arrest, Branch Event One, and Observer Trials remain in order.
- 2030: steering displaces consequences; the exact event remains open.
- 2030s–early 2040s: the brittle late Emergency Republic. This is open authoring space.
- Approximately 2045: **the Fragmentation**, an informational break with branch leakage. The political map officially persists, but systems cannot reliably reconcile identity, authority, or records. Zones and checkpoints may follow; they do not define the event.
- Approximately 2050: default play era.

The horror uses existing mechanics rather than a new subsystem:

1. The break manifests at thresholds: doors, checkpoints, transit spaces, and coverage edges.
2. Between sync windows, existence is provisional; the 3:41 a.m. motif becomes structural.
3. Infrastructure is maintained for people who no longer appear in any agreed ledger.
4. Some people are provisionally recognized by one system and absent from another.
5. The old world continues to broadcast.
6. The GM never declares which side of a threshold or contradictory record is the single real one.

Thresholds and sync windows justify Bleed advances; the arrival associated with a filled clock may land at reconciliation. The other levers refresh Signs, Symptoms, and d100 content for 2050 without changing the move engine.

The crew investigates discrepancy claims for **Interisland Claims & Adjustments**, a fictional successor to Halloran & Vey licensed in the fiction to cross thresholds and settle disputes between ledgers. They also have roots in a neighborhood verification network descended from the Watch tradition. The existing client/job/pay/deadline/wrong-detail case shape remains valid.

In new 2050 material, the helpful channel voice is formally addressed as **Control**. People who have developed a familiar relationship with the voice may call her **Aunty**. “Aunty” is a relational name earned through repeated kindness and practical help, not the system's title or a generic supernatural label. Existing “Grandmother” case/rules text remains compatibility content and must not be bulk-renamed before those scenes are reviewed in context. The naming decision does not establish whether Grandmother and Control are ontologically one continuous voice.

## Path manifests and scenario years

Year gating selects a complete compatible path manifest; it does not silently truncate a four-phase path.

Each path manifest declares:

- stable `pathId` and `tableVersion`;
- earliest and latest compatible `scenarioYear`;
- four ordered phase definitions;
- source/canon status;
- content-pack compatibility.

The default new-generation path is eligible for the approximately 2050 era:

| Phase | Character era | Purpose |
|---|---|---|
| Origin | Childhood in the late Republic, 2030s | Background, first connection, and formative event |
| Career | First work in the brittle system, early 2040s | Job, assignment, access, reputation, or debt |
| Incident | The Fragmentation, approximately 2045 | Crisis role, shared generational scar, and personal stakes |
| Fallout | After the break, late 2040s | Aftermath path, returning threads, and the starting case hook |

LP-B remains a complete earlier/elder path. A 2050 character using LP-B is ordinarily in their 50s–60s; age is characterization, not an automatic modifier or restriction. Earlier scenario dates require a complete compatible path or an explicitly authored pre-divergence path. They never expose later events by truncating the default path.

## Phase procedure

Each phase follows one append-only flow:

1. **Choose a life entry.** Choose one of six concrete backgrounds, jobs, crisis roles, or aftermath paths. The choice persists as a tag and never assigns or restricts a playbook.
2. **Choose a connection.** The phase offers three entry-specific person, group, or place prompts. The player chooses one and supplies its identifying detail.
3. **Deal events.** Randomly offer three of the phase's six event premises. The player chooses one before rolling. No seed, hidden weight, or optimization currency is used.
4. **Roll once.** Roll unmodified 2d6 and store both dice.
5. **Resolve the band.** Totals 2–6 are pressure (15/36), 7–9 entanglement (15/36), and 10–12 room to manoeuvre (6/36). Pressure imposes an immediate constrained choice; entanglement brings another person or group into the consequence; room to manoeuvre supplies time or access without removing lasting consequences.
6. **Show known effects.** Present the full known consequences of A, B, and any proposed custom response before confirmation.
7. **Choose response.** Select A, B, or a GM-approved custom response whose allowlisted effects are agreed before confirmation.
8. **Confirm receipt.** Append the immutable phase record and apply its effects once.

There are no optimization rerolls. Replacing content for lines, veils, safety, or fit is free, unlimited, and never recorded as a reroll. A player may redraw the three offered events or use the phase's authored safety fallback at the same band and effect budget. Replacement never worsens the outcome. Once confirmed, a response is history; later correction requires an explicit audited correction command rather than mutation of the old receipt.

A custom-response generator asks what the character does, what risk they accept, and who or what is involved. It drafts an immediate outcome, one phase-appropriate asset, one lasting complication, relationship, or obligation, and private/public receipts from the allowlisted effect vocabulary. The GM may edit and must approve it before confirmation. A custom response cannot exceed the preset capability budget, erase the event's pressure, alter stats or playbook eligibility, establish cosmic truth, or affect another PC without consent. V1 uses structured templates; generated prose may be layered on later but is not authoritative.

### Event selection v1

The first content pack has six authored event families per phase and one authored variant for each `event family × band`: eighteen primary cells per phase. After the life entry is chosen, the application randomly offers three event families and the player chooses one before rolling. The single 2d6 roll selects that family's band variant; there is no hidden weight, seeded engine, or optimization reroll. Each cell also references the authored phase safety fallback for the same band.

Callbacks may read prior confirmed tags, facets, obligations, assets, or bargains and change framing. They cannot change the recorded dice/band, remove a confirmed cost, assign a playbook, or execute arbitrary scripts.

## Mechanical effects

### Allowed v1 effects

- add a life-entry/history tag;
- create or update a relationship facet attached to a stable NPC reference;
- add an obligation;
- grant one tagged asset;
- record an accepted Static bargain and its symptom text;
- set or refine the starting hook;
- append the phase receipt.

Effects use a small validated data vocabulary. Unknown effect types fail closed. Every response changes persistent state and must have a distinct narrative purpose; neither A nor B may be strictly better across the same dimensions.

### Assets

Every confirmed phase grants a document, contact, access, or place asset. Once per session, a player may invoke one lifepath asset total, regardless of how many assets they own, to:

- ask a Read the Wire question without rolling;
- count as leverage for Work Someone; or
- open a scene that would otherwise require a roll.

The application stores the granted asset and its invoke options but does not enforce spending. The table tracks once-per-session use.

### Static bargains

A response may offer, never impose: “start with a mark of Static; write the symptom into your history.” A character may accept at most one Static bargain across the complete lifepath. Acceptance and symptom text are persisted. `startingStatic` equals the chosen playbook's starting Static plus the accepted bargain, for a maximum starting value of 3; no character can begin claimed. The character receives any Static Move reached at the resulting level. Applying that value to the playable character sheet requires the separately reviewed character-schema extension; until then the bargain remains visible and must not be silently discarded.

### Explicit non-effects

- no raw stat bonuses or penalties;
- no playbook restriction or automatic assignment;
- no optimization reroll currency;
- no software-enforced asset spending;
- no inherited/half-strength moves in v1;
- no signature playbook mechanics in the first engine increment.

## Visibility

| Data | Player | GM | Presenter/table |
|---|---:|---:|---:|
| Life entry, connection, dealt events, dice, band, response, receipt, assets, obligations, facets, bargains, hook | Yes | Yes | No, unless explicitly revealed |
| Phase title and era | Yes | Yes | Yes |
| One-line public receipt | Yes | Yes | Yes |
| Dice | Yes | Yes | Only with that player's permission |
| Static-bargain symptom | Yes | Yes | Only when the player reveals/plays it |
| Player private notes | Yes | No | No |

The player may reveal any owned lifepath item at any time. Public reveal copies only an allowlisted public receipt object. Presenter payloads must never contain the complete lifepath record and rely on CSS/DOM hiding.

## Persistence contract

The player-owned lifepath aggregate is independently revisioned and schema-versioned:

```ts
type Lifepath = {
  schemaVersion: 1;
  revision: number;
  pathId: string;
  tableVersion: string;
  status: 'in-progress' | 'complete';
  nextPhase: 'origin' | 'career' | 'incident' | 'fallout' | null;
  phases: PhaseRecord[];
  derived: {
    tags: string[];
    facets: RelationshipFacet[];
    obligations: Obligation[];
    assets: Asset[];
    staticBargains: StaticBargain[];
    startingStatic: number;
    startingHook: string | null;
  };
};

type PhaseRecord = {
  schemaVersion: 1;
  phase: 'origin' | 'career' | 'incident' | 'fallout';
  era: string;
  choiceId: string;
  connection: { kind: 'person' | 'group' | 'place'; promptId: string; text: string };
  offeredEventIds: string[];
  eventId: string;
  dice: [number, number];
  total: number;
  band: 'pressure' | 'entanglement' | 'room';
  response: { kind: 'A' | 'B' | 'custom'; id: string; text: string };
  appliedEffects: LifepathEffect[];
  receipt: { privateText: string; publicText: string };
  visibility: { dicePublic: boolean; receiptPublic: boolean };
};
```

Room state stores `scenarioYear`, defaulting to an implementation-selected year in the approximately 2050 era. Path eligibility is year-based because the accepted Fragmentation/default-era dates remain approximate. The path and content-pack validators compare the year with manifest eligibility before returning any event text.

The authoritative command flow persists a command receipt before acknowledging success. Retrying the exact command ID/payload returns its prior result. A changed payload with the same command ID fails. Confirming a phase atomically appends one record, updates derived state once, and advances `nextPhase`. Refresh and reconnect reconstruct progress from confirmed state. In-progress choice/deal/roll state may resume, but it never applies effects before confirmation.

Playbook, sheet, inventory, and private notes remain separate contract entities. Lifepath completion does not assign or filter a playbook.

## Content-pack requirements

Each authored event cell includes:

- stable event ID and content version;
- phase, compatible life entries, event family, band, era, and source/canon status;
- prompt and known situation;
- A and B response text with allowlisted effects;
- optional custom-response guidance;
- private and public receipt templates;
- referenced NPC/entity IDs and callback tags;
- content warnings and a same-band reference to the authored phase safety fallback;
- continuity assertions.

The default pack needs four phases, six life entries and six event families per phase, three band variants per family, and two responses per variant. That is eighteen primary cells and thirty-six preset responses per phase. Automated validation checks complete cells, three unique dealt offers, unique IDs, valid references/effects, comparable capability, chronological consistency, a valid same-band fallback, and availability of all seven playbooks.

The sponsor-approved Origin pack is authored in `beta/LIFEPATH_2050_ORIGIN.md`. Author and playtest Origin before expanding Career, Incident, or Fallout.

Cross-character links are opt-in and commit only after every affected player confirms. One player's lifepath cannot rewrite another player's secrets, actions, or established history.

## Playbook layer

The 2050 reskin changes taglines and Dark Secret prompts, not existing stats, moves, or playbook availability. The accepted signature names remain playtest-gated proposals:

- Splicer — The Tap
- Registrar — The File
- Operator — The Hail
- Inspector — The Countersign
- Diver — The Ballast
- Salvage — The Double Entry
- Watch — The Ink

Do not implement these mechanics until the basic lifepath has completed an observed playtest and each proposal receives a balance review.

### Control contact (playtest-gated)

Control is available to the GM as a fictional delivery channel for concrete clues, access, warnings and offers of practical help. This does not require a new favor, debt or relationship subsystem. Her help works in the immediate situation and must materially inform a decision or make an otherwise unavailable option possible; the GM may reveal displaced consequences but cannot retroactively turn the answer into a lie, a trivial technicality or a useless trick.

The Operator's proposed **The Hail** owns deliberate two-way contact:

1. Once per session, the Operator may establish two-way contact with Control or another established channel voice. The call is answered unless prior fiction makes that voice unreachable; if it is unreachable, the use is not spent and the GM states the fictional barrier.
2. The voice acknowledges the Operator and may converse as the fiction permits. The Hail does not compel an answer to a particular question. Any help the voice offers must be concrete and usable rather than a riddle.
3. An answered use adds exactly one incoming-call tally, regardless of the conversation's length. An Operator can hold only one; The Hail is unavailable while it remains. The tally clears when spent or at the end of that Operator's next played session.
4. The GM may spend a tally to place an incoming call at a consequential moment when an operative channel exists and the Operator can physically answer. Otherwise the tally remains unspent.
5. The Operator must accept the connection and hear the opening; they never have to expose themselves, act on the call or obey.

The existing Static move **Call and Answer** remains distinct: once per session it compels a truthful answer to one direct question. The Hail guarantees contact, not an answer to a question; Call and Answer guarantees the answer. Balance review must test tally pacing, whether “must answer” preserves meaningful choice, and whether the two moves remain distinct in play.

## Implementation sequence

1. **SB-11A:** pure schema/types, validator, malformed/oversized fixtures, and content-pack completeness checks.
2. **SB-11B:** idempotent life-entry → connection → deal-three → choose-event → roll → confirm → append commands with immutable history and interruption/resume.
3. **SB-11C:** room `scenarioYear`, manifest eligibility, and no-later-text tests.
4. **SB-11D:** versioned data-only content loader using the fixed v1 event grid.
5. **SB-11E:** player/GM/private-public projections and network-level privacy tests.
6. **Character schema:** represent playable Static/symptoms without granting GM access to private notes.
7. **SB-12A–C:** phone-first player flow, GM reveal controls, and presenter-safe receipts.
8. **SB-12D:** observed table playtest and report before signature mechanics or inherited moves.

SB-09D targeted delivery/inbox and SB-09E editable minimal personal data should land before the complete SB-12 experience. They may proceed while the default content pack is authored.

## Naming decisions

The sponsor selected **Interisland Claims & Adjustments** for the Halloran & Vey successor. The helpful 2050 channel voice is **Control** in formal or operational speech and **Aunty** in familiar speech. Authors must preserve that register difference: an unfamiliar caller does not begin with “Aunty,” and the voice does not introduce herself that way. Aunty is an earned relationship signaled through play, not a mechanical tier or automatic reward.

## Remaining open authoring questions

- What institutions and checkpoints exist on 2050 Oʻahu at case-writing depth?
- Do Otty and Mrs. Ansel survive as elders, records, or neither?
- What event skeleton defines the brittle 2030s–early 2040s?
- Is Grandmother continuous with Control across 2026 and 2050? Keep unstated until chosen.
- Full JIITG expansion, exact Sounding event, later factions, and cosmic ontology remain open.

None of these blocks SB-11A/B when source-status fields are used. They do block canonical prose that claims a specific answer.
