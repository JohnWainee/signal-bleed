# Lifepath choice tuning — design proposal

Status: proposed expansion for review/playtest, not approved canonical rules.
Related task: SB-10 in AGENT_TASKS.md. Retrieved conversation context on 2026-09-22.

## Established direction versus proposals

Confirmed user direction: heavily roll-based lifepath; player chooses approach/direction; lifepath modifies a freely chosen playbook and never restricts which playbook may be chosen.

Recovered assistant design: Origin, Career, Incident, Fallout; choose direction → roll → consequence choice → record change; authored event atoms with tags, prerequisites, exclusions and follow-ups; prior choices influence later event pools; persistent NPCs, character links and GM-hidden hooks.

Earlier suggestions included 2d6 for origin/fallout and career entry/event rolls. Exact tables, thresholds, modifiers, reroll policy, effects and balancing have not been established as approved canon. Retrieve/compare repository rules before finalizing them.

## Proposed choice contract

Each phase contains:
1. Direction: player picks what they attempt or prioritize.
2. Event: dice supply an eligible circumstance; recorded outcomes survive reload.
3. Response: two concise, materially different ways to handle it.
4. Receipt: show the immediate consequence and what persists; GM controls public reveal.
5. Continuity: append to the timeline and update entities/tags that can matter later.

A/B is the display format, not a binary personality score. Allow a GM-adjudicated alternative when neither option fits. Show its proposed effects for player confirmation before committing. A content replacement/reroll policy should handle unwanted material without forcing a player to justify discomfort; decide exact use limits separately from ordinary optimization rerolls.

## Four-phase prototype

| Phase | Direction chosen | Dice determine | Response changes |
|---|---|---|---|
| Origin | Community/background or formative priority | Pressure on that upbringing | First relationship, value or unresolved obligation |
| Career | Work or opportunity attempted | Entry complication and a consequential event | Access, reputation, contact or debt |
| Incident | Kind of trouble investigated/encountered | Disruption and personal stakes | What was protected, lost, concealed or exposed |
| Fallout | What the character tries to preserve | How earlier threads return | Lasting tie, scar, obligation and starting hook |

A poor career roll complicates the route; it does not bar the intended playbook or discard the character concept. Avoid extra entry rolls in the first prototype unless they produce a distinct choice rather than another delay.

## Meaningful choices

Every authored A/B pair must answer:
- What does each option protect or gain?
- What does each option risk, lose, owe or leave unresolved?
- Which relationship/state changes now?
- What later event or callback can recognize this choice?

Neither option should be a strict improvement across the same effects. Avoid repeated virtue-versus-cruelty or obvious best-stat choices. Alternate kinds of tension: loyalty/opportunity, security/truth, personal cost/shared cost, immediate relief/future obligation. Not every event needs a punishment; relationships, access and values also distinguish characters.

Show known immediate stakes in plain language before confirmation. Hidden information may concern an NPC's motives, an unresolved mystery or a later hook; it must not silently reverse a disclosed promise or secretly remove a player's playbook options.

## Example: illustrative, not canon

Career direction: investigate irregular records.
Rolled event: a colleague asks you to remove a name from a dangerous report.

A — Keep their secret.
Known result: retain their trust; accept an obligation.
B — Keep the record intact.
Known result: retain the evidence; strain that relationship.

The same colleague can return in Incident or Fallout. A might make them someone who asks for repayment; B might make them someone who challenges why you preserved the evidence. The GM-hidden hook can concern why the name mattered. It cannot mean “A secretly made you ineligible for Inspector.”

Later outcomes depend on the recorded choice. Do not simply swap one sentence while awarding identical state.

## Event selection versus resolution

Keep event variety and outcome severity separate:
- Select from a bounded pool of authored eligible events.
- If required by the approved mechanic, make a separate resolution roll for outcome.
- Start without accumulating numerical lifepath bonuses. Use prior tags primarily to change eligible events/callbacks; test any modifiers independently before adding them.

For a 2d6 table, totals have weights 1,2,3,4,5,6,5,4,3,2,1 out of 36. Equal-sized rows are not equally likely. Either intentionally allocate common/rare events to totals or use a separate uniform event-selection roll. Do not present a weighted selection as a straight, unmodified 2d6 result.

Persist table version, eligible event IDs, effective weights, actual roll, selected event and applied effects. A GM can inspect why an event qualified. Exact weighting and repeat limits are tunable data, not hidden hard-coded behavior.

## Authoring structure

An event atom needs: stable ID/version; phase; source/canon status; eligibility tags; exclusions; weight; short prompt; two options; known stakes; validated effects; public/private visibility; NPC/entity references; follow-up hooks; fallback when no event qualifies.

Effects use a small allowlisted vocabulary (add/remove tag, create/update relationship, add obligation, add approved item, append timeline entry). Do not execute arbitrary scripts from event content. Any stat, move or inventory benefit must be defined against canonical rules and reviewed for balance.

Cross-character links are opt-in: propose a shared event or relationship to both players and commit only after both accept. One player's history must not unilaterally rewrite another's secrets, actions or established timeline.

## Scope and tuning

First content pack proposal: 6 event atoms per phase (24 total), 2 choices each, and at least 2 authored callback families spanning phases. This is a prototype budget, not an approved content quota. Build one complete four-phase path first; expand once its choices work.

Test:
- Every option changes persistent state and has an identifiable narrative purpose.
- Every playbook remains available through every valid path.
- No unreachable phase, contradictory NPC state, invalid reference or empty pool without fallback.
- No duplicated effects after reconnect/retry; prior rolls cannot silently change.
- Players understand known stakes without reading implementation tags.
- Both choices attract players for intelligible reasons; investigate lopsided choices but do not force 50/50 selection.
- Review final characters for comparable starting capability; richer misfortune must not simply produce a weaker character.
- Observe time per phase and GM explanation burden before adding rolls or prose.

Use automated branch/schema checks plus a small observed table playtest. Large combinatorial counts are not evidence of meaningful variety.

## Implementation sub-tasks within SB-10/SB-11

1. LP-A: recover full source and reconcile canonical mechanics; list missing decisions.
2. LP-B: author one complete four-phase fixture with genuine consequence callbacks, clearly labeled proposal.
3. LP-C: review choices with the user; record accepted stakes, dice policy and effects.
4. LP-D: implement event schema/validator and explainable eligibility/selection.
5. LP-E: implement persistent resolution/effects, privacy and optional mutual character links.
6. LP-F: expand approved content pack and run branch checks + observed playtest.

LP-A and proposed LP-B can proceed while M1 is built. Production rules/content in LP-D onward require an accepted specification. Prototype fixtures must never be mislabeled as approved campaign canon.
