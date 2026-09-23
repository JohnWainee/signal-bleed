# SB-05–07 accessibility review

**Standard:** WCAG 2.1 AA  
**Surfaces:** `/beta/gm/`, `/beta/play/`, `/beta/present/`  
**Date:** 2026-09-22 HST

## Summary

No critical or major issue was found in the implemented M1 flow. Native labels and controls, semantic headings/sections, polite status announcements, visible focus, 48 px controls, reduced-motion handling, safe `textContent` rendering, and responsive layouts are present. Automated browser coverage verifies 44 × 44 px minimum targets and no horizontal overflow at 360 × 800, 390 × 844, 1024 × 768, and 1920 × 1080.

A local emulator-backed physical rehearsal passed on an iPad GM, phone player, and 16:9 presenter display. VoiceOver/NVDA, a keyboard-only manual flow, 200% zoom, and a second physical player were not exercised and remain open gates.

## WCAG checks

| Area | Result | Evidence |
|---|---|---|
| Structure and names | Pass | One page heading, labeled sections, native labels, buttons and selects; presenter DOM omits participant identifiers. |
| Keyboard | Pass by implementation | All actions use native controls in DOM order; `:focus-visible` uses a 3 px high-contrast outline. Manual screen-reader pass remains. |
| Status/errors | Pass | Connection, pending, retry, validation, access-loss, capacity and closure messages use a polite live status region and visible text. |
| Touch targets | Pass | Controls are at least 48 px in CSS; E2E bounding-box checks require at least 44 × 44 px. |
| Motion | Pass | No essential animation; `prefers-reduced-motion: reduce` collapses animation and transition durations. |
| Responsive reflow | Pass | E2E checks phone, tablet and 16:9 viewports; long scene headings use `overflow-wrap: anywhere`. |
| Safe content | Pass | User and scene content is inserted with `textContent`, never HTML. |

## Contrast samples

| Element | Foreground / background | Ratio | Result |
|---|---|---:|---|
| Primary text | `#edf5f0` / `#0b1418` | 16.78:1 | Pass |
| Muted/status text | `#a7c0ba` / `#0b1418` | 9.66:1 | Pass |
| Labels/accent | `#a9e4d2` / `#132228` | 11.43:1 | Pass |
| Standard button | `#edf5f0` / `#263f3c` | 10.18:1 | Pass |
| Destructive button | `#2a0804` / `#ffb3aa` | 10.82:1 | Pass |

## SB-08 manual checks

Record device model, OS/browser version, tester, date, and pass/fail notes for each row. A desktop viewport emulation is not a substitute for these checks.

- [x] iPad GM: created and closed an emulator-only room; admitted a physical phone and presenter; previewed/published a scene; sent a targeted prompt; inspected the answer; revoked and re-admitted the presenter. Portrait/landscape controls and status states remained usable. A second physical player/concurrent physical answer was not available; the separate four-context browser test covers that behavior.
- [x] Phone player: requested admission, received and answered a private prompt, refreshed, rotated, disconnected/reconnected networking, and retained the confirmed/read-only state without presenter leakage. The first device attempt exposed `crypto.randomUUID()` being unavailable on LAN HTTP; the `getRandomValues()` fallback fixed it and the repeated physical flow passed.
- [x] Physical 16:9 display: joined as presenter, cleared immediately on revocation (user-supplied screenshot), rejoined as a fresh presenter, and recovered the current public scene without private prompt/answer content or clipping.
- [ ] Keyboard-only: complete create/join, admission, preview/publish, prompt, answer, retry, revoke, and close flows without a pointer. Confirm logical focus order, visible focus, and focus restoration after live updates.
- [ ] Screen reader: with VoiceOver on iPad/iPhone or macOS Safari (or NVDA on Windows), complete join/admission, scene update, private prompt/answer, disconnect/reconnect, revocation, and room closure. Confirm names/roles/states are announced once, status messages are useful rather than repetitive, and cleared private views are no longer navigable.
- [ ] Zoom/reflow: repeat the active surface at 200% browser zoom and after portrait/landscape rotation; confirm no loss of content or two-dimensional scrolling.

Leave a row open if the required hardware, assistive technology, or full flow was not actually exercised. Attach screenshots or short recordings only when they do not expose private room data.

### Physical rehearsal record — 2026-09-22 HST

The operator used available iPad, phone, and 16:9 display hardware against the isolated `demo-signal-bleed-beta` Auth/RTDB/Functions emulators on a private LAN. Exact device models and OS/browser versions were not recorded, so this evidence is limited to the device classes and behaviors above. The header visibly identified the environment as `Local emulator beta · no production connection`; no production Firebase service, App Check enforcement, slot, Worker traffic, or deployment changed.
