# M1 session contracts — version 1

Status: implementation design for SB-02–07; no Firebase enforcement exists yet. Supersedes the reference module's global revision and the README's earlier proposed path layout. Game canon remains in `rules/hawaii-setting-bible.md`. These engineering defaults do not approve new lifepath rules.

## Scope and routes

M1 is one GM, two independently authenticated players and one independently authenticated presenter. GM publishes scenes and targeted A/B prompts; players respond once; presenter follows only published scene content. Character name, freely selected playbook, plain inventory entries and private notes persist across scene changes. No automatic mechanical effects, lifepath generation or public reveal of character information in M1.

Scaffold development uses `/beta/gm/`, `/beta/play/`, `/beta/present/`. Eventual release routes are `/gm/`, `/play/`, `/present/`; SB-08 controls that switch after preserving the alpha GM reference at `/reference/gm/`. Alpha `/gm/` is not overwritten during scaffold work. Room identifiers in URLs locate rooms; they confer no authority. Fixture mode is visibly labeled and must not connect to production Firebase.

## Identity and membership

- An authenticated UID creates a new room with immutable GM ownership in one authorized create operation. Existing rooms cannot be claimed. Commands carry no trusted actor UID or role; the adapter gets identity from authentication and checks stored membership.
- A signed-in guest explicitly requests admission as player or presenter. The GM approves that exact UID and requested role. A pending applicant sees only their own admission status, never room state or the roster. No room directory or public roster. Request text is limited to a display name; repeated requests replace only that applicant's pending request.
- Presenter uses an isolated auth context with its own UID: a separate browser profile/device for M1. A `/present/` URL opened with GM credentials is not a secure presenter. Refuse presenter mode for a GM/player identity and explain how to use the separate context.
- Roles do not change in place in M1. GM can revoke a player/presenter. Revocation denies future reads/writes, tears down listeners and clears local private views; data already seen cannot be recalled. Re-admission of the same UID restores its retained records. Denied requests may be submitted again only by explicit user action.
- Anonymous identity survives ordinary reload only while browser auth storage remains available. Clearing storage or changing browser loses access. Room codes, names and claimed character ownership are not recovery proof. M1 has no self-service GM transfer or recovery bypass. A lost GM identity requires a separately reviewed administrator recovery procedure or a new room; never delete metadata to free a beta GM seat. New player UIDs start fresh unless a later explicit migration is implemented. UI warns before sign-out/storage-reset actions.

## Privacy and logical storage

Use an isolated `betaRooms/v1/{roomId}` namespace. Paths below are logical adapter targets, subject to SB-04's rules feasibility review. No client subscribes to the room root. Deny parent reads that would include private children. Authentication alone never grants room access.

| Relative path / data | Read | Write |
|---|---|---|
| `owner` | GM | Immutable creation only |
| `admissions/{uid}` | Applicant and GM | Applicant requests; GM decides; validate transitions |
| `members/{uid}` | That admitted member and GM | GM admission/revocation only |
| `shared/scene` | Admitted GM, players, presenter | GM only |
| `gm/notes` | GM | GM |
| `decisions/{uid}/{promptId}` (prompt + response) | Recipient player and GM | GM creates/closes prompt; recipient creates immutable response |
| `personal/{uid}/sheet` | Owner player | Owner player |
| `personal/{uid}/notes` | Owner player | Owner player |
| `receipts/{uid}/{commandId}` | Command issuer | Written atomically with accepted command; client cannot forge result |

GM sees all admitted identities and sent prompts/responses, but not private character notes or personal sheets. Presenter sees no roster, private prompt, response, receipt or GM draft. A player sees only their own personal records and decisions, plus the published scene. A future share/reveal action must copy an explicit allowlisted subset; never broaden a parent read to implement sharing.

## Entity shapes and adapter boundary

All entities use schemaVersion 1; all IDs are opaque validated identifiers. Strings render as text, never HTML. Reject unknown command fields, forbidden object keys, non-finite numbers, invalid enum values and oversized payloads. IDs: 1–128 ASCII letters/digits/underscore/hyphen, excluding `__proto__`, `prototype`, `constructor`; name/title/option labels <=200 characters; bodies/questions/notes <=2000; inventory <=100 entries, each label <=200 and quantity integer 0–999. Empty notes/inventory allowed. Playbook IDs must come from the canonical seven-playbook registry, with null permitted while choosing; rolls cannot filter that registry.

```ts
type Role = 'gm' | 'player' | 'presenter';
type Choice = 'A' | 'B';
type Scene = { schemaVersion: 1; epoch: number; title: string; body: string };
type Prompt = {
  schemaVersion: 1; id: string; sceneEpoch: number; revision: number;
  question: string; a: string; b: string; closed: boolean;
  response: null | { choice: Choice; commandId: string };
}; // Recipient is the immutable enclosing UID path.
type Sheet = {
  schemaVersion: 1; revision: number; name: string; playbookId: string | null;
  inventory: { id: string; label: string; quantity: number }[];
};
type Notes = { schemaVersion: 1; revision: number; text: string };
type Command = { commandId: string } & (
  | { type: 'scene.publish'; expectedEpoch: number; title: string; body: string }
  | { type: 'prompt.open'; recipientUid: string; promptId: string;
      sceneEpoch: number; question: string; a: string; b: string }
  | { type: 'prompt.close'; recipientUid: string; promptId: string;
      expectedRevision: number }
  | { type: 'response.submit'; promptId: string; sceneEpoch: number;
      expectedRevision: number; choice: Choice }
  | { type: 'sheet.replace'; expectedRevision: number;
      name: string; playbookId: string | null; inventory: Sheet['inventory'] }
  | { type: 'notes.replace'; expectedRevision: number; text: string }
);
type Failure = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID'
  | 'CONFLICT' | 'STALE_SCENE' | 'CLOSED' | 'ALREADY_ANSWERED'
  | 'COMMAND_ID_REUSED' | 'DISCONNECTED';
type Result = { ok: true; commandId: string; entityRevision: number }
  | { ok: false; code: Failure };
type Delivery<T> = { status: 'loading' | 'live' | 'disconnected';
  value: T | null }; // Value is last confirmed, never an optimistic private projection.
interface SessionAdapter {
  createRoom(roomId: string, commandId: string):
    Promise<{ ok: true; roomId: string } | { ok: false; code: Failure }>;
  requestAdmission(roomId: string, role: 'player' | 'presenter', name: string,
    commandId: string): Promise<Result>;
  decideAdmission(roomId: string, uid: string, decision: 'admit' | 'deny',
    expectedRevision: number, commandId: string): Promise<Result>;
  revoke(roomId: string, uid: string, expectedRevision: number,
    commandId: string): Promise<Result>;
  send(roomId: string, command: Command): Promise<Result>;
  watch(roomId: string, onEvent: (event: SessionEvent) => void): () => void;
  dispose(): void;
}
type Admission = { schemaVersion: 1; revision: number; role: 'player' | 'presenter';
  status: 'pending' | 'admitted' | 'denied' | 'revoked'; name: string };
type SessionEvent =
  | { type: 'admission'; value: Admission }
  | { type: 'scene'; data: Delivery<Scene> }
  | { type: 'decisions'; data: Delivery<Record<string, Prompt>> }
  | { type: 'sheet'; data: Delivery<Sheet> }
  | { type: 'notes'; data: Delivery<Notes> }
  | { type: 'gmRoster'; data: Delivery<Record<string, Admission>> }
  | { type: 'gmDecisions'; data: Delivery<Record<string, Record<string, Prompt>>> }
  | { type: 'accessLost'; code: 'FORBIDDEN' | 'UNAUTHENTICATED' };
```

`watch` chooses subscriptions from authenticated stored membership, never the route. GM receives scene/gmRoster/gmDecisions; player receives scene/decisions/sheet/notes; presenter receives scene only. Each admitted identity may also receive its own admission event. Pending applicants receive only admission. Access loss emits accessLost, clears cached views and unsubscribes. dispose is idempotent. The type union is a design aid; runtime role enforcement and backend rules remain required. GM draft notes remain local in M1; the reserved GM notes path need not be implemented yet.

## Concurrency, lifecycle and retries

1. Empty room scene epoch is 0 with no published scene. Publishing increments the epoch atomically even when returning to the same scene text. Only expected current epoch succeeds. No room-global revision is used for player writes.
2. Opening creates a never-reused prompt ID at revision 0 for one admitted player and the current nonzero scene epoch. Prompt text/options/recipient/epoch are immutable. For M1, allow multiple open prompts per player; display them in stable prompt-ID order and let GM close unwanted ones explicitly.
3. Response commits only for the authenticated recipient, active membership, current scene epoch, matching prompt revision, not closed, and no existing response. Answer or close increments that prompt revision. Once answered, choices cannot be edited. Closing does not erase a committed answer; answered status takes precedence in the UI. Reopening/correction creates a new prompt ID.
4. Scene change immediately makes old-epoch prompts non-actionable without bulk rewriting them. They remain readable as history and are labeled expired if unanswered. Backend checks the current epoch at response commit, not just on the device. Close/answer and scene/answer races must have one authoritative ordering: a response committed first is retained; one committed after closure or transition is rejected. Different players' answers target distinct entities and must both succeed without a global-revision conflict.
5. Sheet and notes each start at revision 0 and update independently with compare-and-set. A first admission request starts at revision 0; each subsequent request, decision or revocation increments that UID’s shared admission/membership revision atomically. First player admission initializes absent sheet and notes at revision 0 (empty name, null playbook, empty inventory and notes) in the same accepted admission operation. Re-admission retains existing personal records unchanged. Membership/admission revisions control GM approval/revocation races. Scene changes never reset personal data. M1 does not implement room/character deletion or automatic cleanup.
6. Each command ID is unique per room and issuer. Successful result, canonical command payload and mutation are recorded atomically. Same ID + identical payload returns the original result without reapplying, even if the scene subsequently changed; same ID + different payload returns COMMAND_ID_REUSED. Authorization is rechecked before receipt lookup, so revocation never exposes old results. Keep accepted receipts for room lifetime in M1. Failed commands do not claim an ID. Room creation/admission commands follow the same idempotency guarantee. The caller generates and retains an opaque roomId before createRoom; retry uses that identical roomId and commandId. Creation atomically claims the unused room and records its receipt. An existing room owned by another UID returns FORBIDDEN; a collision never transfers ownership. No room ID is newly generated inside a retry.
7. Lost acknowledgements are resolved by retrying the identical command ID/payload. Do not automatically queue new offline mutations or change expected revisions to force success. DISCONNECTED means outcome may be unknown; show pending/retry until authoritative acknowledgement or rejection. On stale/conflict errors refresh confirmed state and require a fresh deliberate choice. Do not store private payloads in service-worker caches or diagnostic logs.
8. If several validation failures apply, authorization wins first, then input/ID reuse, missing entity, stale epoch, existing answer, closed state, revision conflict. Return FORBIDDEN for unauthorized targets without revealing whether another player's entity exists.

SB-04 must prove atomic mutation/receipt and epoch validation in its proposed backend. This document does not assert that client-side RTDB transactions alone satisfy them. If rules cannot enforce an invariant, document the smallest trusted-server addition and its deployment implications before implementing that addition. Do not silently relax the contract. Alpha's whole-blob synchronization is not reused.

## Shared fixtures and acceptance

SB-03 owns fixtures: GM g1, players p1/p2, presenter tv1, pending outsider x1; scene epoch 1; distinct private prompt markers ONLY_P1 and ONLY_P2; GM_ONLY note and PLAYER_ONLY personal notes. Public scene is explicitly synthetic Hawaiʻi test content, no later timeline spoilers or new canon. Fixtures include loading, empty, disconnected, denied and revoked states; return defensive copies.

Contract tests cover admission/identity spoofing, presenter private reads/writes, player cross-reads, malformed payloads, independent simultaneous answers, duplicate IDs with same/different payloads, delayed acknowledgements after transition, close/answer races, scene/answer races, revoked retries, personal revision conflicts and reconnect. SB-04 repeats authorization/race tests against the emulator; SB-07 proves data is absent from unauthorized network responses using four isolated browser contexts. Mock projections alone never count as privacy acceptance.

## Next handoff

SB-02 builds the fixture-only Vite/TypeScript shells and preserved alpha packaging. SB-03 implements this typed model and migrates/removes the older reference module so there is one implementation. Then SB-04/05/06 consume this adapter in separate owned directories. Contract changes require one coordinated edit and affected fixture/test updates. Exact lifepath dice/tables remain SB-10/11 work and do not block M1.
