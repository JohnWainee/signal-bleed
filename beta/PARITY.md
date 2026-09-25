# Alpha feature-parity inventory (SB-09A)

One row per capability that exists in the alpha today. Every row cites the file and the
function/section it actually lives in, read from the code on `integration/beta` at the commit this
document lands on — not from `HANDOFF.md`, which describes branches that no longer match the tree.

**Scope.** This is the inventory half of SB-09. The export/versioning/import/rollback specification
is SB-09C and is deliberately absent here; the *Private data and export notes* column records the
facts SB-09C needs, not the spec. No code changes, canon changes or protected-file changes are part
of this card.

## How to read the decision column

| Decision | Meaning |
|---|---|
| **retain** | Stays where it is, in the alpha (or in the repo's tooling/content), and the beta is not expected to reimplement it. The capability is not lost at cutover because the alpha artifact survives. |
| **migrate** | Must exist in the beta before SB-13 can be called parity. Every `migrate` row needs a separately scoped implementation card — SB-09's own card says "any required parity implementation becomes a separately scoped card before SB-13". |
| **defer** | Consciously not in M1. Named here so it is a decision rather than a silent drop, with the lane or condition that would revisit it. |

`NEEDS-SPONSOR` marks a row whose fate is a genuine product decision — destructive, or ambiguous in
a way an implementer should not resolve alone. Those rows still carry a decision (the
recommendation) so the inventory stays complete; the marker says the recommendation is not yet
authorised.

**Beta coverage today** names the module or lane that covers the capability *now*. "none" means
nothing in `beta/src`, `beta/backend` or `beta/CONTRACTS.md` addresses it — the beta has no partial
version of it.

One `ask_user_questions` was raised on SIG-31, on the parity-bar question (see
[Open sponsor decisions](#open-sponsor-decisions)). The rest of the inventory did not wait on it.

---

## 1. Session, identity and sync

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Room join by code, room code in the URL, code generated when absent | `table/index.html:799` (`ROOM` IIFE), `table/index.html:420` (`#join`), `:1225` (`join` / `join-gm`), `:1255` (`room-go`) | `beta/CONTRACTS.md` "Identity and membership"; `beta/src/app/live.ts:22` (`startLive`) | migrate | The beta already has a stricter version: a room ID locates a room and confers no authority, and guests request admission. Alpha's "type a code, you're in" has no equivalent and must not be carried over as-is. | Alpha room codes are five characters from `Math.random()` and are the only access control for non-GM data. Any export keyed on a room code inherits that weakness. |
| GM seat lock (first anonymous UID to claim `meta/gmUid` owns the room) | `table/index.html:1229` (transaction in `join-gm`), `firebase.rules.json` → `rooms/$roomId/meta` | `beta/backend/` closed-beta slot binding; `beta/CONTRACTS.md` "Identity and membership" (ten source-fixed room IDs bound to a GM UID before creation) | migrate | Beta ownership is stricter and already implemented; the alpha mechanism is superseded, not reimplemented. | A lost alpha GM identity is recovered by deleting `rooms/<CODE>/meta` in the console (`HANDOFF.md` → Things to know). CONTRACTS explicitly forbids that for beta rooms. Do not port the recovery procedure. |
| Anonymous Firebase auth, with a localStorage fallback when no config is present | `table/index.html:841` (`initSync`), `:819` (`put`), `:823` (`got`), `:1448` (3 s poll when offline) | Anonymous auth is in `beta/src/data/firebase-bootstrap.ts`; there is no offline/unauthenticated mode | migrate (auth) | Auth carries over. The localStorage fallback does not — see the next row. | — |
| Single-device offline mode (all state, including sealed pages and inboxes, in `localStorage`) | `table/index.html:821` and `:825` (`SB:<ROOM>:<key>` branches), `:1447` ("no sync configured; this device only") | none | defer | Useful for a solo demo, but it puts private per-player records in plaintext on a shared device and cannot express admission. Revisit only if playtests need a no-network mode; not an M1 goal. | **Private data.** `SB:<ROOM>:players/<id>` holds the sealed page, private notes and inbox unencrypted in the browser. Nothing clears it. Any export/import story that touches alpha data must state what happens to these keys. |
| Whole-blob, last-write-wins shared board sync | `table/index.html:819` (`put`), `:826` (`absorbShared`), `:849` (`pushB`) | Superseded by per-entity revisions and receipts: `beta/src/session/model.ts:200` (`send`), `beta/CONTRACTS.md` "Entity shapes and adapter boundary" | retain | An accepted alpha limitation (`AGENTS.md` → Architecture). The beta already replaces it with a better model; there is nothing to migrate and nothing to fix in the alpha. | A single `rooms/<CODE>/shared` blob is the natural alpha export unit, which is exactly why `dump-exp` produces it. SB-09C should treat it as one versioned document, not as a set of entities. |
| Presence dots and a 14 s heartbeat, including who is holding which card | `table/index.html:849` (`pushB` writes `B.presence`), `:901` (dots in `render`), `:918` (`hold` lookup in `renderCards`), `:1449` (interval) | `gmRoster` (`beta/src/session/model.ts:110`) shows admissions to the GM only | defer | M1's privacy model has no all-players-see-all-players channel, and presence is comfort, not a session tool. Revisit with SB-12 if table play needs it. | Presence writes a display name, colour and role into the shared blob every 14 s, readable by any authenticated client. A beta equivalent needs an explicit allowlisted public projection, per CONTRACTS ("never broaden a parent read"). |

## 2. The chart

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Clue cards on a draggable chart, positioned in percentage coordinates | `table/index.html:1387` (`dropClue`), `:915` (`renderCards`), `:1190`–`:1218` (pointer drag handlers), `B.clues` in `board()` at `:810` | none | migrate | The chart is the app's name and its central shared artifact. Nothing in `beta/src` models a clue. | Clue text is public to every authenticated client in the room via the shared blob. |
| Chart zones — "the theory" and "no bottom found" — and the derived `play` / `woven` / `deep` state | `table/index.html:76` (`#zTheory`, `#zDeep` CSS), `:1208` (state assignment on pointerup), `:1213` (the "came back up" moment) | none | migrate | The zones are the mechanic, not decoration: woven count feeds the Theorize modifier and drowning is how a case ends. | — |
| Links ("string") between cards, drawn as SVG with a flow pulse, cut by clicking the line | `table/index.html:925` (`renderStr`), `:1303` (`tie`), `:1306` (`cut`), `B.links` at `:811` | none | migrate | Second half of the chart; links are shared state, not a view. | — |
| Face-down clues (GM pins a card the players cannot read) | `table/index.html:919` (`hid` in `renderCards`), `:1301` (`pin-face`), `:1366` (`bank-face`) | none | migrate | A GM-only-until-revealed card is a real session tool and the beta has no analogue. | **Private data — existing defect.** `face:true` only hides the text in the DOM; the plaintext is in `rooms/<CODE>/shared`, readable by any authenticated client (`firebase.rules.json` → `rooms/$roomId/shared`). A beta version must hold hidden text in a GM-only path. Do not carry the alpha shape into an export that is presented as private. |
| Card-holding outline (who is dragging what, from presence) | `table/index.html:918` (`hold` lookup), `:1197` (`me.hold=c.id`) | none | defer | Depends on the presence channel above, which is itself deferred. | — |

## 3. Clocks and case structure

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| The Bleed — six-segment case clock in the rail | `table/index.html:895` (segments in `render`), `:1262` (`bleed` action), `B.bleed` at `:810` | none | migrate | Core published mechanic (`rules/signal-bleed-v0_1.md`, `gm/index.html` → Clocks). Losing it loses the case's pacing spine. | Public shared state; no privacy concern. |
| The Aperture — eight-segment season clock, with the `APW` wording ladder and the tide visual | `table/index.html:455` (`APW`), `:897` (caption), `:898` (`--tide`), `:1333`–`:1334` (`ap-up` / `ap-dn`), `:1142` (Portal readout) | none | migrate | Season-level state; also the only cross-case persistent number in the alpha. | Survives `endcase`, so it is the one value an export must preserve across cases. |
| Company clocks — arbitrary named four-segment clocks | `table/index.html:1145` (`pClocks`), `:1241` (`corp-add`), `:1244` (`corp-seg`), `:1248` (`corp-del`), `B.corps` at `:811` | none | migrate | GM-authored fronts. Exercised by `smoke-test.js`, so it is a verified working capability, not a sketch. | Public shared state. |
| Five rings, with the per-ring Terror and Temptation ticks and the "advance anyway?" confirm | `table/index.html:454` (`RINGS`), `:1176` (`openCase`), `:1326`–`:1332` (`rt`, `rp`, `ringfwd`) | none | migrate | The ring ladder is the case's structure and is referenced by the case-file format (`rings.terrors` / `rings.temptations`). | Public shared state. |
| Case name and depth (3/4/5), with depth feeding the Theorize modifier | `table/index.html:1179` (`caseIn`), `:1426` (input handler), `:1312` (`depth` cycle), `:912` (modifier readout) | none | migrate | Depth is arithmetic the app performs; a beta without it silently changes the roll. | Public shared state. |
| End the case — drowns the chart, clears Harm, widens the Aperture, increments the case count | `table/index.html:1335` (`endcase`) | none | migrate | Destructive and irreversible in the alpha (no undo, no snapshot). Worth reimplementing deliberately rather than by accident. | **Destructive.** Clears each player's Harm through `pushP()` and rewrites every clue's state. An export taken after `endcase` cannot reconstruct the chart. SB-09C should decide whether a beta equivalent snapshots first. |

## 4. Rolls, tables and the ledger

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Theorize resolution — band picker (10+ / 7–9 / 6−) with the woven-minus-depth modifier shown | `table/index.html:374` (`#ovTheory`), `:1313` (`rec`), `:911` (`w`/`tMod` in `render`) | none | migrate | Note what this actually is: **the app rolls no dice.** The table rolls 2d6 physically and the player taps the band. Any beta version should keep that or change it as an explicit product decision, not as an implementation detail. | The 7–9 band writes Static to the acting player's private record; the 6− band fills the Bleed and widens the Aperture. One tap writes both shared and private state. |
| Draw tables — Signs of the Signal, Symptoms, Asks | `table/index.html:440`–`:453` (`SIGNS`, `SYMPTOMS`, `ASKS`), `:364` (`#ovDraw`), `:1403` (`show`) | none | migrate | Session tool, one tap, used constantly. Content is canon and also lives in `rules/signal-bleed-v0_1.md`, `gm/index.html:167`, `print/hawaii.html`. | Migrating the *tool* is engineering; changing the *text* is canon and needs the `canon` label. Read the table content from a shared source rather than re-typing it into `beta/src`. |
| d100 generator — nine bands over signs, clues, prompts, artifacts, three puzzle kinds, terrors, temptations | `table/index.html:535` (`D100`), `:1101` (`rollD100`), `:1114` (`pD100`), history in `d100Hist` at `:809` | none | migrate | The GM's improvisation engine and the single largest block of content in the alpha. `scripts/validate-setting.mjs:33` parses `D100` out of the page and asserts its band coverage, so the shape is load-bearing for CI too. | `d100Hist` is in-memory only — it is lost on reload and is not in any export today. Decide in SB-09C whether roll history is worth persisting. |
| Roll-to-surface routing — "Drop to board", "Use in Send", "Use in Puzzle", "Stage" | `table/index.html:1092` (`d100Actions`), `:1345`–`:1359` (`d100-drop`, `d100-use-send`, `d100-use-puzzle`, `d100-stage`), `:1109` (`stageRoll`) | none | migrate | This routing is what makes the generator usable mid-scene instead of a text dump. | Terror and temptation rolls are deliberately GM-eyes-only with no send target (`:1099`). Preserve that. |
| Ledger of theories that became true | `table/index.html:1166` (`openLedger`), `B.ledger` at `:811`, written at `:1314` | none | migrate | The campaign's canon record — what the table established. Most valuable thing in an export. | Public shared state; grows without bound (no cap). |
| Session log (timestamped, capped at 150 entries) | `table/index.html:817` (`logit`), `:1172` (rendered under the ledger), `B.log` at `:811` | none | migrate | Cheap, and the only audit trail of what happened in a room. | Drops the oldest entry past 150 (`:817`), so a late export loses early history. Local wall-clock `HH:MM` strings, not timestamps — not sortable across timezones or sessions. |

## 5. GM Portal

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Clue bank — GM writes clues privately, drops them face-up or face-down when the moment arrives | `table/index.html:1034` (`pBank`), `:1364`–`:1366` (`bank-add`, `bank-del`, `bank-drop`, `bank-face`), `G.bank` at `:813` | Conceptually adjacent to `gm/notes` (`beta/CONTRACTS.md` privacy table); no bank exists | migrate | Prep-then-release is how the GM runs the chart. | Held under `rooms/<CODE>/gm`, which `firebase.rules.json` correctly restricts to the GM UID. This is the one alpha path with a real privacy boundary — preserve it in any export. |
| Staging queue — artifacts and puzzles held, then sent one at a time | `table/index.html:1109` (`stageRoll`), `:1127` (staged list in `pD100`), `:1360`–`:1363` (`q-send`, `q-del`), `G.queue` at `:813` | none | migrate | Same reason as the bank, for private sends. | GM-only path. A staged item carries its `to` target, so an export of `G.queue` discloses intended recipients. |
| Send an artifact (title + body) to one player or to everyone | `table/index.html:1051` (`pSend`), `:1367` (`send-art`), `:1391` (`deliver`) | Partly: `prompt.open` (`beta/src/session/model.ts:216`) is the only GM→one-player channel, and it is a binary A/B question, not a document | migrate | An artifact is a document to read, not a decision to make. The beta's prompt cannot express it. | `deliver` writes into each recipient's `rooms/<CODE>/players/<pid>` node. Beta must use `decisions/{uid}` or a new private path; never a shared one. |
| Targeted-recipient picker ("Everyone" plus one button per roster entry) | `table/index.html:1045` (`whoRow`), `:1343` (`to`), `:1077` (`nameForPid`) | `prompt.open` takes a `recipientUid` but no UI picker exists | migrate | Required by every private send. | Resolves "all" through `B.roster` (`:1395`); a player who has not claimed a playbook is not in the roster and therefore silently receives nothing. Worth fixing, not porting. |
| Keypad puzzle — player enters a code to unlock a payload | `table/index.html:1058` (`pPuz` form), `:1000` (`puzzleUI` keypad branch), `:1280` (`pad` handler), `:1371` (`send-keypad`) | none | migrate | One of three interactive puzzle kinds, all exercised in real play and all absent from the beta. | The answer (`m.code`) and the payload ship to the player's private record *before* they solve it (`:1399`). Anyone reading that record has the answer. Fix in the beta version; do not replicate. |
| Sounding puzzle — player finds a depth on a slider, ±40 m tolerance, with warm/cold pings | `table/index.html:1066` (form), `:1007` (`puzzleUI` sound branch), `:1287` (`sonar-go`), `:1376` (`send-sound`) | none | migrate | As above. | Same pre-delivered-answer issue: `m.target` and the payload are in the player's record from the moment it is sent. |
| Recovered-audio puzzle — bracketed words blacked out, three free recoveries then it costs Static | `table/index.html:1072` (form), `:1014` (`puzzleUI` audio branch), `:1292` (`recover`), `:1381` (`send-audio`) | none | migrate | As above, plus it is the only place in the alpha where a puzzle writes a mechanical consequence. | `beta/CONTRACTS.md` states M1 has "no automatic mechanical effects". The Static charge at `:1294` is exactly that, so this row cannot land in M1 unchanged — scope it as a post-M1 card or drop the automatic mark. |
| Crew view — every claimed character's name, playbook and Static, GM-side | `table/index.html:1135` (`pCrew`), fed by `syncRoster` at `:853` | `gmRoster` (`beta/src/session/model.ts:110`) delivers admissions, not character state | migrate | The GM needs to see the table's exposure at a glance. | **Privacy note.** `syncRoster` publishes name, playbook, Static and Harm into the *shared* blob, so every player sees every other player's Static, not just the GM. CONTRACTS gives the GM admissions and prompts but explicitly not sheets — so the beta version is a narrower, deliberate projection, not a port. |
| GM prep notes, and "the one wrong detail" | `table/index.html:1155` (`pNotes`), `:1420`–`:1421` (input handlers), `G.notes` / `G.wrong` at `:813` | `gm/notes` path exists in `beta/CONTRACTS.md` and `firebase.rules.json` → `betaRooms/v1/$roomId/gm/notes`; no UI | migrate | The path is already reserved and rules-protected; only the surface is missing. | GM-only, correctly gated in both rule sets. |

## 6. Player surfaces

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Claim a playbook from the seven, and put it back down | `table/index.html:467` (`BOOKS`), `:938` (picker in `openSheet`), `:1267` (`claim`), `:1271` (`dropbook`) | `Sheet.playbookId` with the canonical seven in `PLAYBOOK_IDS` (`beta/src/session/model.ts:39`); no picker UI | migrate | The registry is already frozen in the beta contract; the surface is not built. | `dropbook` discards the character with no confirmation and no undo (`:1271`). Do not port that. |
| Character sheet — four stats, Static 0–5, Harm 0–3, two Bonds, accumulated Symptoms | `table/index.html:951` (`sheetSelf`), `:1272`–`:1277` (`stat`, `static`, `harm`, `burn`), `:1406` (`setStatic`) | `Sheet` (`beta/src/session/model.ts:9`) carries only `name`, `playbookId` and a plain inventory | migrate | The beta `Sheet` is a scaffold, not a character. Extending it is a contract change and needs its own card. | Lives in the player's private record. Symptoms are auto-appended on each Static mark (`:1408`) — another automatic mechanical effect that M1's contract currently forbids. |
| Playbook content — tagline, starting stats, unique moves, Static moves at 1/3/5, seed Bonds, dark-secret prompt | `table/index.html:467`–`:532` (`BOOKS`) | `PLAYBOOK_IDS` only — identifiers, no content | migrate | Without the content a claimed playbook is an empty label. | Canon. `scripts/validate-setting.mjs:42` parses `BOOKS` out of the page and asserts the seven playbooks, so moving this text is a canon-labelled change, not a refactor. |
| Basic moves reference on the sheet | `table/index.html:456` (`BASIC`), `:969` (rendered), `:988` (`mv` helper) | none | migrate | Players read it mid-roll; also duplicated in `gm/index.html:256` and `print/hawaii.html:147`. | Canon text, three copies already. A beta version should reduce copies, which is itself a canon-adjacent decision. |
| Sealed page — the playbook's dark secret, written privately | `table/index.html:972` (`sheetSecret`), `P.secret` at `:812`, `:1418` (input handler) | none — `Notes` (`beta/src/session/model.ts:10`) is a single free-text field | migrate | The strongest privacy promise the alpha makes to a player ("Nobody else's screen ever loads this"). Dropping it silently would break that promise. | Gated by `firebase.rules.json` → `rooms/$roomId/players/$uid` — **but that rule grants the GM read access too**, so the promise in the UI copy is not what the rules enforce. Beta's `personal/{uid}` is owner-only and does honour it. Flag on any migration of alpha data. |
| Private notes | `table/index.html:977` (in `sheetSecret`), `P.notes` at `:812`, `:1419` | `Notes` entity and `personal/{uid}/notes` path | migrate | Closest thing to a direct beta equivalent that already exists. | Same GM-readable caveat as the sealed page in alpha; correct in beta. |
| Private inbox with unread badge and an arrival interstitial | `table/index.html:980` (`sheetInbox`), `:830` (`absorbPriv`), `:908` (badge in `render`), `#inboxDot` at `:140` | none | migrate | The receiving half of every GM send; without it artifacts and puzzles have nowhere to land. | Unbounded — `absorbPriv` never trims `P.inbox`. Every artifact, puzzle, answer and payload a player ever received is retained in their private record indefinitely. SB-09C needs a retention answer here. |
| Room chip and the offline indicator | `table/index.html:1446` (`roomChip`), `:1447` (`roomJoin`) | none | defer | Status affordance; beta's `Delivery.status` (`beta/src/session/model.ts:6`) already carries the underlying signal and `live.ts` surfaces its own messaging. | — |

## 7. Presentation and accessibility

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Light / dark theme, following `prefers-color-scheme` | `table/index.html:875` (`setMode`), `:19` (`body.light` tokens), `:1443`; also `gm/index.html:303` | `beta/src/ui/base.css` | migrate | Small, and the alpha does it everywhere; a beta that only works in the dark is a regression. | — |
| Calm mode and `prefers-reduced-motion` — disables sweep, scan, ripples, pulses and glow | `table/index.html:307` (media query), `:308` (`body.calm`), `:1261` (`calm` toggle), `:1441` (auto-enable) | none | migrate | SB-12's acceptance criteria already require reduced-motion alternatives, so this is a stated requirement, not a nicety. | — |
| Escape-to-close overlays and Enter-to-join | `table/index.html:1432` (`keydown` handler) | none | migrate | Baseline keyboard access for a modal-heavy UI. | — |
| "Moment" full-screen interstitial for reveals and consequences | `table/index.html:883` (`moment`), `:416` (`#moment`) | none | defer | Presentation for events that migrate anyway (puzzle solved, Bleed full, Static 5). The event carries the meaning; the interstitial is how it is shown. Revisit with SB-12. | The solved-puzzle payload is rendered here (`:1283`, `:1288`) — a reveal surface, so the beta must still show payloads somewhere. |
| Living background — glyph rain, tide, horizon, sun, sweep, scanlines, ripples, driven by `pressure()` | `table/index.html:698`–`:771` (`initRain`, `drawRain`, `pressure`, `ripple`), `:33`–`:92` (CSS) | none | defer | Atmosphere, not a session tool, and the most expensive thing to port. The Bleed/Aperture values that drive it do migrate, so the hook survives. | — |
| Web Audio ambience and SFX | `table/index.html:774`–`:795` (`ac`, `tone`, `sfx`, `startAmb`, `stopAmb`), `:1260` (`snd` toggle) | none | defer | Same reasoning as the background. | — |
| Per-playbook lens colouring (the whole UI re-tints to your playbook) | `table/index.html:864` (`applyLens`), `lens` / `lens2` in `BOOKS` | none | defer | Identity affordance tied to playbook content; revisit once playbook content migrates. | — |

## 8. Reference and print pages

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| GM Reference — nine sections, expandable moves, full-page search | `gm/index.html` (`:116` nav, `:282` moves render, `:311` search) | Not reimplemented; `beta/CONTRACTS.md` reserves `/reference/gm/` and `beta/src/app/main.ts:81` already links `/gm/` | retain | Self-contained, no-build, works. CONTRACTS commits to preserving it under an explicit route at SB-08 rather than rebuilding it. | Public content; no session data. |
| Print pack — core rules, seven playbook sheets, GM screen | `print/hawaii.html` (`:125` core rules, `:224` first playbook, `:753` GM screen) | none | retain | Print-only, no interactivity to migrate. Beta cutover does not touch it. | Public canon. |
| Compatibility print URLs | `print/hours.html`, `print/vespers.html` — byte-identical copies of `print/hawaii.html` | none | retain | `AGENTS.md` → Setting authority names these as compatibility URLs. Asserted by `scripts/validate-setting.mjs:47`. | Three copies of the same canon; edit one, and the setting check fails until all three match. |
| Hawaiʻi location index and scenario timeline, with an era filter | `hawaii/index.html` (inline `places` array and the `era` change handler at the end of the file) | none | retain | Reference content with a small self-contained interaction. No session state, nothing to migrate. | Public canon; verified against the external references in its own footer. |
| Compatibility URL for the location index | `hours/index.html` — byte-identical copy of `hawaii/index.html` | none | retain | Same compatibility rule as the print copies. | Same duplication caveat. |
| Landing page linking every surface | `index.html:37`–`:43` (card grid) | Beta routes are not listed | retain | Stays as the hub; SB-08 adds the beta routes at cutover as part of release routing, not as parity work. | Links `cases/case-eleven-minutes.json` directly, so the case file is a published artifact, not just a dev fixture. |

## 9. Case files

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Case-file JSON format and the two shipped case files | `rules/signal-bleed-case-format.md:20` (the format), `cases/case-eleven-minutes.json`, `cases/case-template-blank.json` | none | retain | The format is the spec the beta should load against; the files are content. Neither needs to change for the beta to exist. | A case file contains the wrong detail, NPC secrets and every puzzle answer in plaintext. It is a GM artifact — never serve it into a player surface. Note that `index.html:42` links it publicly today. |
| `cases-validate` CI check | `scripts/validate-cases.mjs`, wired as `npm run cases:validate` and the `cases-validate` job in `.github/workflows/ci.yml` | none | retain | Repo tooling, independent of which client renders the case. | — |
| **In-app case loading and staging** | **Not implemented.** Specified as "THE LOADER PATCH" in `rules/signal-bleed-case-format.md:92`. Only patch steps 1 and 2 landed: `G.queue` exists in `gm()` (`table/index.html:813`) and `deliver` takes an explicit target (`:1391`). There is no `pCase()`, no Case tab in `#pTabs` (`:406`), no file picker and no `G.rings`. | none | defer | **Correcting the record:** the card's Do list asks for "case loading/staging", and `HANDOFF.md` describes it as a nice-to-have patch. Reading the code, the alpha cannot load a case file at all. There is therefore nothing to migrate — only a spec the beta may implement. Sequence it after the bank and staging queue exist in the beta. | When it is built (in either client), a loaded case writes the wrong detail and puzzle answers into the GM-only path. The alpha loader patch as drafted also sets `B.caseName` and `B.depth` into shared state — correct, but worth doing deliberately. |
| The Portal "Case" surface that *does* exist — case name, ring state, end the case | `table/index.html:1176` (`openCase`), reached from the dial spoke at `:349`, not from the Portal tab bar | none | migrate | Covered by the case-structure rows in §3; listed here only so the name collision with the loader patch does not read as a gap. | — |

## 10. Backup, export and platform

| Capability | Where it lives in the alpha | Beta coverage today | Decision | Rationale | Private data and export notes |
|---|---|---|---|---|---|
| Export the table as JSON text | `table/index.html:1249` (`dump-exp`), textarea at `:1161` | none | migrate · **NEEDS-SPONSOR** | This is the only backup the alpha has, and SB-09C's spec depends on knowing whether it must stay readable. The sponsor decision is whether beta must import alpha exports at all, or whether beta rooms start clean. | Emits `{shared, gm}` — so a GM's export contains the clue bank, prep notes and the wrong detail. It carries **no version field and no schema marker**, which is the first thing SB-09C has to fix. Player private records are not included, so an export is not a full session backup and should never be described as one. |
| Import a pasted backup | `table/index.html:1251` (`dump-imp`) | none | migrate · **NEEDS-SPONSOR** | Same decision as the export row; called out separately because the import side is the destructive one. | **Destructive and unvalidated.** `Object.assign(board(), d.shared)` then `pushB()` — no confirmation, no version check, no schema validation, no undo, and it overwrites the live room for every connected client. Whatever SB-09C specifies must not reproduce this. |
| PWA install and the network-first service worker | `manifest.json` (scope `./`, `start_url ./table/`), `sw.js`, registered at `table/index.html:1450` | `beta/package-preview.mjs` handles beta packaging; no PWA story | defer | Both files are protected (`AGENTS.md` → Architecture) and their scope interacts with wherever the beta ends up being served. It is a release-routing question for SB-02/SB-08, not a parity question. | Cached responses are keyed by URL under `sb-v1` with no scope split, so a beta served inside `./` shares the alpha's cache. Flag for SB-08 before any route switch. |
| Alpha functional smoke test | `smoke-test.js` (jsdom, joins as GM, exercises the clocks tab, marks the Bleed, round-trips an export) | `beta/tests/model.test.mjs` covers the beta model | retain | Guards the alpha for as long as the alpha ships. | Its export round-trip is currently the only automated coverage of `dump-exp` / `dump-imp`. |
| HTML sanity and setting-consistency checks | `scripts/html-sanity.mjs:10` (`PAGES`), `scripts/validate-setting.mjs:8` (`dirs`) | Both already include `beta` in their scope (`validate-setting.mjs:8`) | retain | Repo tooling; already beta-aware. | `validate-setting.mjs` parses `D100` and `BOOKS` out of `table/index.html` by regex (`:33`, `:42`). Moving that content to the beta without updating the script breaks the check — a real coupling to plan for. |

---

## Summary

62 capabilities.

| Decision | Count |
|---|---|
| retain | 11 |
| migrate | 41 |
| defer | 10 |

Two rows carry `NEEDS-SPONSOR` (export, import), and both are the same underlying question, which
SB-09C specifies once it is answered.

Nothing in this inventory is dropped without a named decision. The 41 `migrate` rows are not one
card: per SB-09's own exclusion ("rewriting all alpha features in one task"), each becomes its own
scoped card before SB-13. The natural clusters are the chart (§2), the clocks and case structure
(§3), rolls and content (§4), the Portal's private-send pipeline (§5), and the character sheet (§6).

## Open sponsor decisions

**Raised on SIG-31 as a single `ask_user_questions`:** what is the parity bar for cutover? The
answer changes the shape of the 32 `migrate` rows — whether they are all release blockers for
SB-13, whether the alpha Chart Table stays live in parallel while the beta grows into it, or
whether the beta ships as a narrower tool and the alpha is retired with an explicitly accepted
feature loss. The rest of this inventory does not depend on the answer.

**Deferred to SB-09C, flagged here:** whether beta rooms must be able to import an alpha export at
all. Both `NEEDS-SPONSOR` rows in §10 collapse to that one question.

## Findings worth acting on regardless

Read while inventorying; none is in scope to fix here, and each is stated so it is not silently
carried into the beta.

1. **Face-down clue text is not private** (§2). Only hidden in the DOM; the plaintext is in the
   shared blob that every authenticated client reads.
2. **Puzzle answers ship with the puzzle** (§5). `code`, `target` and `payload` are written into the
   recipient's record before they solve anything.
3. **The sealed page's UI copy overstates its privacy** (§6). It says "nobody else's screen ever
   loads this"; `firebase.rules.json` → `rooms/$roomId/players/$uid` grants the GM read access. The
   beta's `personal/{uid}` path does honour the promise.
4. **The alpha cannot load a case file** (§9), despite the documented patch and the shipped case
   files. Any plan that assumes case loading exists today is wrong.
5. **`dump-imp` is destructive and unvalidated** (§10). No version field, no confirmation, no undo,
   and it overwrites the live room for everyone.
6. **`validate-setting.mjs` regex-parses `D100` and `BOOKS` out of `table/index.html`** (§10).
   Migrating that content without updating the script breaks `npm run setting:validate`.
