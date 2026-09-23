# SB-05–07 accessibility review

**Standard:** WCAG 2.1 AA  
**Surfaces:** `/beta/gm/`, `/beta/play/`, `/beta/present/`  
**Date:** 2026-09-22 HST

## Summary

No critical or major issue was found in the implemented M1 flow. Native labels and controls, semantic headings/sections, polite status announcements, visible focus, 48 px controls, reduced-motion handling, safe `textContent` rendering, and responsive layouts are present. Automated browser coverage verifies 44 × 44 px minimum targets and no horizontal overflow at 360 × 800, 390 × 844, 1024 × 768, and 1920 × 1080.

The remaining limitation is manual verification: desktop browser inspection is not a physical iPad/phone/TV test, and VoiceOver/NVDA behavior has not been recorded. Those are SB-08 canary rehearsal gates rather than claims made here.

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

- Keyboard-only pass through create/join, preview/publish, admission, prompt, answer, retry, revoke and close flows.
- VoiceOver on iPad/iPhone or macOS Safari; confirm live status announcements are useful and not repetitive.
- 200% browser zoom and landscape/portrait rotation.
- Physical 16:9 display readability at table distance.
