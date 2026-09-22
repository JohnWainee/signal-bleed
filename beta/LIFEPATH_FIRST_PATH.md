# First lifepath prototype: The Name That Stayed

Status: authored playtest proposal, not approved canonical content or implemented runtime.
Task: LP-B under SB-10. User authorized drafting the first complete path on 2026-09-22.

## Source boundaries

Grounding: `rules/the-hours-setting-bible.md` (Low Town, Tide Watch, Cold Harbour, water distribution, record keeping, missing time); `rules/signal-bleed-v0_1.md` (2d6 bands, playbook-based character creation, no predetermined mystery solution).
The base rules retain older cyberpunk terminology; this prototype uses The Hours setting vocabulary. It does not settle wider rules/setting drift.
New material: Mara Vale, ledger incidents, all branch effects, and this lifepath procedure are proposals. Mara is a new adult neighbour, later a colleague; no existing named NPC is rewritten. Do not identify her as secretly supernatural or predetermine who caused the anomalies.

## Play procedure

Four phases: Origin, Career, Incident, Fallout. Each has:
- Choose one of two directions before rolling.
- Roll unmodified 2d6 once, recording both dice.
- Read the result variant and direction-specific framing.
- Choose response A or B after seeing all known effects.
- Confirm and append the history entry. Show a short receipt.

Proposed bands: 2–6 pressure (15/36); 7–9 entanglement (15/36); 10–12 room to manoeuvre (6/36). These are lifepath-specific narrative outcomes, not a substitute for normal in-session moves. No stat modifiers, extra career-entry roll, The Offer, starting Harm/Static, stat bonuses, additional mechanical Bonds or automatic Clues in this first experiment.
Every result moves forward; all playbooks remain available regardless of results. Existing party-level playbook selection conventions are a separate question; lifepath adds no eligibility restrictions.

Before each response display both its branch effect and the roll-band rider. No surprise mechanical costs. A player can propose another response; GM and player agree its concrete effects before confirming. Apply normal lines/veils/skip practice. Replacement content does not count as an optimization reroll. Ordinary rerolls are absent from this prototype.

## Persistent facts

One recurring NPC: `mara`. One historical document lineage: `ledger`.
Record direction, raw roll, band, chosen response, visibility and effects for each phase.
Record distinct relationship facets rather than a single “good/bad” relationship number.
Records, credentials, contacts and obligations are narrative permissions/hooks, not automatic successes or extra numeric resources.
Draft implementation values below are semantic specifications, not executable arbitrary code.

## 1 — Origin: After the storm

Timing: an unspecified storm during your earlier life, before Career. Do not tie childhood to the recent tank-farm failure.

Public frame: Low Town is distributing drinking water after a storm. Mara has one list; the actual queue is longer. She asks you to help.

Choose direction:
- O-D1: Help the people at the door. You see who is missing from the list.
- O-D2: Make the numbers add up. You find entries that do not match the deliveries.
Direction persists as `people-first` or `records-first`; later framing acknowledges it.

Roll:
| 2d6 | What happens | Known rider applying to either response |
|---|---|---|
| 2–6 | Deliveries stop before everyone is served. | You commit to another water run; record one origin obligation. |
| 7–9 | Another volunteer brings enough, but needs help next week. | Record one owed volunteer shift. |
| 10–12 | The next delivery arrives in time. | No additional obligation. |

Response:
- A — **Make room on the list.** Work with Mara to record an emergency addition and get an unlisted household served. She trusts your discretion; the household knows you helped. You must later explain why you authorized the exception. Set `origin=exception`, `mara.discretionTrust=true`, `originExplanation=open`.
- B — **Put your name beside the discrepancy.** Keep the original entry and file a signed correction so the missing household is officially visible. Mara trusts your accuracy; the correction can be traced to you. Set `origin=correction`, `mara.accuracyTrust=true`, `originAttribution=public`.

Both choices help the household. Neither erases a Tide Watch record or advances the Aperture.
Receipt: “Mara remembers how you helped. [Exception to explain / Signed correction on record]. [Roll rider].”

## 2 — Career: The second copy

Time advances. Mara now coordinates some deliveries through Cold Harbour and recommends you for temporary work.

Choose direction:
- C-D1: Take dispatch work. You encounter the ledger at the loading desk; record dispatch familiarity.
- C-D2: Take records work. You encounter it in the reconciliation office; record records familiarity.
Neither job assigns a playbook.

Callback:
- Origin A: “You made an exception once. Mara asks you to hear her out before putting this on the record.”
- Origin B: “Your correction is still in the files. Mara asks whether another signed record would help—or expose someone.”

A delivery record contains a duplicate household entry. Mara asks you to conceal the household's identity while its entries are checked. The household is a witness, not an established culprit.

Roll:
| 2d6 | What happens | Known rider applying to either response |
|---|---|---|
| 2–6 | Someone has already noticed you handling the discrepancy. | A supervisor knows you investigated; record institutional attention. |
| 7–9 | An archived duplicate is available only through a colleague. | Record a specific favour owed for retrieving it. |
| 10–12 | You obtain the duplicate during your ordinary duties. | No additional obligation. |

Response:
- A — **Keep the name private.** Secure a copy with the identifying line masked; leave the original intact with its custodian. Mara stays willing to speak privately. Your own copy cannot identify the household; later identification requires a willing witness/custodian. Set `career=masked`, `ledgerCopy=redacted`, `mara.privateChannel=open`.
- B — **Keep an attributable copy.** Retain the complete copy in your private files. You can identify and compare the entry later, but Mara stops passing you confidential names. She remains a person you know, not an automatic enemy. Set `career=complete`, `ledgerCopy=complete`, `mara.privateChannel=closed`.

No forgery, deletion of the original, or guarantee of immunity is implied.
Receipt: “You kept [a redacted / a complete] copy. Mara [will speak privately / no longer shares confidential names]. [Roll rider].”

## 3 — Incident: Eleven minutes

Choose direction:
- I-D1: Follow the delivery. The anomaly appears on a loading-desk clock and duplicate receipt.
- I-D2: Follow the record. The anomaly appears in the archive log and its timestamp.
Persist the actual location for later scenes.

Both versions: you and Mara are together when eleven minutes disappear from two independent records. You remember speaking throughout. Neither record shows the conversation.

Callback:
- Career A: Mara tells you privately that she recognizes the household, without naming it. Her presence keeps identification possible.
- Career B: You can identify the entry from your copy. Mara will compare what she witnessed, but will not offer confidential testimony.

Roll:
| 2d6 | What happens | Known rider applying to either response |
|---|---|---|
| 2–6 | Your name appears on the record as the person who authorized the missing interval. | Record a disputed authorization; you know you did not knowingly sign it. |
| 7–9 | Your recollection and Mara's disagree on one ordinary detail. | Record an unresolved disagreement, chosen together; neither account is declared false. |
| 10–12 | You retain a timestamped message from before the interval. | Add that mundane corroborating record; it does not explain the anomaly. |

Response:
- A — **Leave together.** Escort Mara out before the desk/office closes. You secure a future meeting with her, but the original is sealed in routine custody before you can obtain it. Keep your earlier copy. Set `incident=witness`, `mara.meeting=agreed`, `originalAccess=restricted`.
- B — **Stay for the original.** Remain through sign-out and receive the original under a return obligation. Mara leaves safely on her own and declines to be your corroborating witness. Keep the historical relationship facets, but set `incident=document`, `originalAccess=temporary`, `returnOriginal=open`, `mara.testimony=declined`.

B does not imply Mara is injured or abandoned to danger. A does not destroy evidence.
Receipt: “[A witness meeting / The original on loan], with [restricted original access / no promised corroboration]. [Roll rider].”

## 4 — Fallout: The request

Choose direction:
- F-D1: Protect the people tied to the ledger. You seek a discreet meeting.
- F-D2: Establish what happened to the ledger. You seek a recorded comparison.
Direction is the character's stated priority, not a promise to remove all costs.

Build the callback from actual prior state:
- If Incident A, Mara attends the agreed meeting. If Incident B, a custodian delivers a written request; Mara has made no promise to testify.
- If Career A, identification remains masked unless the witness freely supplies it; do not magically reconstruct it.
- If Career B, the complete identity stays available to the character, not automatically to the presenter.
- If Origin A, the requester asks you to account for the old emergency exception. If Origin B, they bring your signed correction. Neither becomes proof of wrongdoing.

Roll:
| 2d6 | What happens | Known rider applying to either response |
|---|---|---|
| 2–6 | A review of the ledger is already scheduled. | The opening hook has a near deadline; GM names it before response. |
| 7–9 | A requester needs a preliminary answer before sharing more. | Record one promised follow-up meeting. |
| 10–12 | You can set the first meeting yourself. | Player chooses its ordinary time/place; no extra debt. |

Response:
- A — **Keep it between the people involved.** Commit to a private follow-up. The evidence remains private; progress requires voluntary access to people or records you do not hold. Set `fallout=private`, `hook=arrange-private-comparison`.
- B — **Put your account on record.** Submit your observations and a redacted comparison; protect other people's names. You gain a traceable reference for pursuing the inquiry, but your involvement is visible and may be questioned. Set `fallout=filed`, `hook=answer-for-filed-account`.

Origin explanation and borrowed-original obligations remain open until actually addressed in play; this choice does not clear them automatically.
Final receipt summarizes the contact, documents, outstanding obligations and hook. It does not establish the anomaly's cause.

## Complete worked path (illustrative rolls, not live random results)

O-D1, roll 8, A: help at the door; make an emergency addition. Mara trusts discretion; owe a volunteer shift; exception needs explaining.
C-D2, roll 5, B: records work; keep the complete copy. Supervisor noticed; Mara stops sharing confidential names.
I-D2, roll 9, A: follow archive records; disagree about which clock sounded; leave together. Mara agrees to meet despite the strained confidence; original access is restricted.
F-D1, roll 10, B: seek a discreet meeting, then decide your own account needs a record. Choose when/where; file a redacted account. Mara attends; the character retains the full private copy and takes responsibility for their own public statement.

Result: a character with records experience, a complicated relationship with Mara, a complete private copy, a filed redacted account, an unpaid volunteer shift, an old exception to explain, institutional attention, and an unexplained eleven-minute disagreement. Choose any otherwise available playbook. No numeric bonus, additional Harm/Static, extra mechanical Bond or automatic case Clue is granted.

## GM and presenter handling

- Public screen: phase title, neutral location, dice result if the player permits, and public choice/reveal only.
- Player + GM: known stakes, personal copy, relationship facets, obligations.
- GM prep: follow-up questions and NPC mundane wants; no fixed cosmic answer.
- Never send the full character history to the presenter then hide it.
- Mara can become a shared NPC across characters only after timeline reconciliation; linking another PC requires that player's consent.
- Do not multiply one shared debt or document into unrelated duplicates when several players share a past.

## Tuning and implementation acceptance

This is one authored situation per phase with three roll variants and two directions/two responses, not a complete diverse event pool. Dice change pressure, evidence and obligations; the final system needs more eligible events to avoid repeating this plot for every character.

Check all band/response combinations for continuity: redacted identities remain unknown; original access matches custody; declined testimony never becomes guaranteed; obligations persist; no choice gates playbooks. Confirm each direction changes the framed action, while each response changes consequential state.

Playtest questions:
1. Could the player name a real reason for either response?
2. Did an earlier choice visibly matter later?
3. Were multiple obligations interesting or just paperwork? Cap/merge them only after evaluating, never silently discard.
4. Did four rolls feel sufficiently influential? If not, expand event selection before adding modifiers.
5. Did a tempting choice emerge without an obvious universal best option?
6. Could the character still become the desired playbook without rewriting the past?

Next: user walkthrough of one phase at a time; revise the pairs and roll influence from their feedback. Mark LP-B drafted, not validated or approved. Do not promote this into canonical /rules or production content until reviewed.
