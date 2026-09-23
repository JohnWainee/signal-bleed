# M1 closed-beta room capacity and lifecycle decision

**Status:** Accepted by the project owner for implementation; local code remains under review and undeployed. **Date:** 2026-09-22. **Decider:** project owner. This decision does not authorize deletion or production deployment.

## Context

SB-04 commits each accepted command and its exact-payload receipt in one room-root transaction. The current M1 contract keeps receipts for the room's lifetime and has no cleanup. Active-role limits and a 32 KB request limit do not bound total admissions, prompts, receipts, room count, transaction read size, or storage cost. The `signal-bleed` project's $10 monthly budget sends alerts but does not cap charges. The live alpha uses a separate namespace and must remain untouched.

The revision should preserve atomic receipts, cross-reload exact retries, private projections, and retained player records on re-admission. A rejected new command must not silently discard existing data. An accepted command's same-ID/same-payload retry must still return its original result after a capacity limit or room close; authorization is still checked first.

## Recommended decision for a closed beta

1. **Invitation-only room slots.** Allocate a hard maximum of ten opaque room IDs for the entire closed-beta cohort, each bound server-side to one preauthorized GM UID before room creation. `room.create` succeeds only for its assigned pair. Do not trust a URL, client role claim, or App Check alone as an invitation. This bounds total beta room count without a non-atomic cross-room quota. Spent slot IDs are never recycled, including after any later approved deletion. Expanding beyond ten is a separate policy and deployment decision, not a routine configuration update. The slot list contains identifiers, not private room content.
2. **Per-room hard ceilings.** Reject a *new* accepted command before mutation if its projected post-transaction room exceeds any ceiling: 24 distinct admission UIDs, 100 total prompts, 512 accepted receipts across all issuers, or 512 KiB of serialized room JSON. These are initial beta values, not a claim that RTDB billing is exactly JSON size. Count denied/revoked applicants and old prompts so cycling identities cannot evade the limits. Keep one receipt/size reserve for `room.close`.
3. **Explicit closed state, no silent eviction.** Add a GM-only `room.close` command that atomically records a receipt and marks the room read-only. Before and after closure, an already accepted command's exact retry returns its receipt after authorization checks; new mutations return a distinct `ROOM_CLOSED` or `ROOM_FULL` result with no receipt. Closing does not erase scenes, prompts, personal records, or receipts. The client warns when nearing a ceiling and offers an explicit new-session path; it must not auto-create a replacement room or replay a rejected command under a new ID.
4. **No automatic deletion in the closed beta.** Retain closed rooms for read-only viewing and eventual export. Manual deletion is a separate, owner-approved operation after export and identity/privacy review, never a reaction to a budget alert. With ten slots and hard per-room ceilings, beta database content is bounded, though transactions, bandwidth, Functions, App Check assessments, logs, and alpha traffic still incur uncapped charges. A broader/public beta requires an explicit archival, export, retention, and deletion policy first.

The size ceiling is evaluated on the complete proposed room inside the existing transaction, using UTF-8 bytes of its serialized JSON as a conservative application guard. It is not an RTDB pricing or wire-size guarantee. The implementation must count before writing the receipt and must still fit that receipt. If a room is already beyond a new ceiling when the policy is introduced, existing accepted receipts remain readable/retriable, and all new mutations except close fail; do not truncate history.

## Alternatives considered

| Option | Benefit | Cost / reason not recommended now |
|---|---|---|
| Keep unlimited lifetime rooms and receipts | No behavior change or migration | Billing and transaction size remain unbounded; alerts do not stop spend. |
| Evict oldest receipts or prompts on a rolling cap | Active rooms can continue indefinitely | Breaks exact retry and historical privacy/audit semantics; a lost acknowledgement can mutate twice or become unknowable. |
| Automatically delete inactive rooms | Bounds long-term storage | Irreversible data loss without export, consent, recovery, or retention policy; not suitable for this closed beta. |
| Invite-bound room slots plus per-room ceilings (recommended) | Bounds beta data without deleting or weakening receipt idempotency | Limits a session's length and requires manual slot administration and clear UI at capacity. |

## Implementation and verification gates

- Revise `beta/CONTRACTS.md` to replace unlimited room creation/lifetime growth with the slot and ceiling rules, add `ROOM_FULL`/`ROOM_CLOSED`, `room.close`, and explicit read-only semantics. Preserve immutable accepted receipts, authorization order, personal records, and no automatic deletion.
- Add trusted slot authorization and transaction-time count/byte checks to the callable. Do not implement quota only in UI or RTDB rules. Keep alpha rules unchanged. If a protected file must change, follow `AGENTS.md` confirmation first.
- Add emulator tests for limits, race at the final slot/receipt, same-ID retry at/after cap and closure, changed-payload ID reuse, revoked retry, size boundary, failed-command no-receipt, and no private parent reads. Add browser tests for capacity messaging without private leakage.
- Establish operational alerts/monitoring for room count, bytes, command failures, Function invocations, and budget usage. Record the ten assigned slots and a manual export/recovery procedure before any beta deployment. Define a separate public-beta retention policy before expanding beyond ten rooms.

## Release consequence

This decision reduces storage-growth exposure but does **not** turn the $10 budget into a spend cap or make the current branch deploy-ready. PR review, dependency findings, production App Check traffic, and the controlled rollout/rollback checks in `beta/SB04_FEASIBILITY.md` still apply. No production room is closed, exported, or deleted by the local implementation.
