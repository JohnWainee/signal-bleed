# SB-05–07 pre-review audit

**Audited commit:** `87f5764` plus the follow-up fixes recorded below  
**Reviewer:** cold review pass in the implementing Codex runtime  
**Verdict:** implementation-ready; still requires an independent exact-SHA reviewer before merge

## Findings fixed

1. **Moderate — revoked participant recovery:** a revoked identity reloaded into the access-loss path with no explicit way to request re-admission, despite the contract retaining personal records for re-admission. The join view now offers a new request for `revoked` status and does not subscribe a revoked identity until that request is accepted. The browser test reloads the revoked client and requires the request control.
2. **Low — E2E portability:** the pinned Playwright test still defaulted to a macOS-only Chrome path. It now honors `SB_CHROME_PATH`, uses installed macOS Chrome only when present, and otherwise lets Playwright select its managed Chromium executable.

## Review notes

- No client content is inserted as HTML; labels, statuses, headings and role-specific projections remain explicit.
- The presenter DOM omits Firebase participant identifiers and its adapter subscription remains scene-only after admission.
- Draft form values survive realtime rerenders in controller state; scene publication cannot occur until the current draft has been previewed.
- Pending commands remain single-flight and exact-payload retries retain the SB-04 semantics.
- The expanded E2E test covers both fixes and continues to assert UI plus inbound RTDB payload privacy.

This pass is deliberately not called independent approval. A different reviewer/session must inspect the final pushed SHA before PR #10 is marked ready.
