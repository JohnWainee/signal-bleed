# SB-05–08 independent review

Date: 2026-09-22 HST  
PR: [#10](https://github.com/JohnWainee/signal-bleed/pull/10)  
Reviewed implementation: `ea0ee17ede2a47433df5684853f9cd4548829759` plus the complete follow-up diff described below  
Base: `abea0d3` (the `main` merge commit incorporated by the branch)

## Initial verdict

The independent read-only review requested changes for five findings:

1. The production-connected canary artifact and local emulator rehearsal were not separated clearly enough, so following the runbook could connect a local rehearsal to production.
2. The packaged root alpha service worker caches every GET and the beta had no proof that a controlled page escaped it before starting private transport.
3. Editing a scene after preview left the existing publish button active, allowing unpreviewed text to publish.
4. The four-client suite omitted the required delayed answer/prompt-close race, a real disconnect/reconnect, a replacement presenter, and failure on uncaught browser errors.
5. Realtime full-DOM renders could discard keyboard focus while the GM was editing.

The reviewer ran the 11 session-model tests and the one slot test successfully. Its isolated worktree did not have dependencies for typecheck, backend command tests, or browser/emulator execution. It did not perform physical-device, screen-reader, production App Check, deployment, or production validation.

## Resolution and focused re-review

The follow-up diff:

- added a dedicated emulator-only `package:rehearsal` path and made `package:canary` force emulator mode off even when the caller exports a conflicting variable;
- made production artifact verification reject emulator project/endpoint identifiers;
- unregisters a root-scoped alpha service worker before Firebase bootstrap, with a one-time reload when the beta page was already controlled;
- invalidates and removes the publish action on any post-preview edit, while retaining a callback guard;
- restores focus and text selection to recreated editor fields;
- expands the browser suite with the close/answer race, actual offline transition and restored confirmed state, presenter replacement, preview invalidation/focus assertions, unhandled page/console errors, and service-worker/controller/CacheStorage assertions.

The same independent reviewer performed a focused read-only re-review of the complete follow-up diff and found **no remaining blocker** across the five original findings. The reviewer noted one accepted non-blocking tradeoff: unregistering the root worker removes alpha offline control for that browser profile until `/table/` registers it again; the beta privacy boundary therefore fails closed.

## Integrator verification

- beta typecheck: pass;
- fixture, emulator-rehearsal, and hostile-environment production-canary packaging/verification: pass;
- session model: 11/11 pass;
- full emulator suite: 1 slot, 5 rules, 7 command/capacity/closure, and 2 adapter/callable tests pass;
- expanded multi-context browser/privacy scenario: pass after one transient Chrome launch abort was retried; the immediately preceding complete run and the retry both reached the behavioral assertions, and the final run passed;
- `git diff --check`: pass.

No production service, rules, Function, Worker route, slot assignment, App Check enforcement state, or deployment changed. Physical iPad/phone/TV and screen-reader checks, protected deployment confirmation, production version/rules capture, App Check traffic, and rollback evidence remain open release gates.
