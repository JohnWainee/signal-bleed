# HANDOFF — Signal Bleed alpha deploy

**State:** repo complete and committed on `main` (1 commit). Code is done and smoke-tested.
Nothing here needs authoring — only pushing, wiring, and one config paste.

## Your tasks, in order

1. **Push to GitHub.** Create a repo (suggest `signal-bleed`, private) and push `main`.
   Git identity in the local commit is a placeholder; amend the author if desired.
2. **Cloudflare Pages.** Connect the GitHub repo. Framework: none. Build command: none.
   Output directory: `/`. Production branch: `main`.
3. **Firebase** (multiplayer sync — the app runs single-device until this is done):
   - New project, Analytics off, free Spark plan.
   - Realtime Database, locked mode → paste `firebase.rules.json` into the Rules tab, publish.
   - Authentication → enable **Anonymous** provider only.
   - Register a Web app, copy its `firebaseConfig` values into `firebase-config.js`
     (fields are commented placeholders there), commit, push.
4. **Verify:** open `https://<site>/table/` on two devices with the same `?room=` code.
   Header should NOT say "offline". GM joins first (locks the seat), player second,
   GM sends an artifact from Portal → Send; it should land in the player's inbox.

## Things to know

- `smoke-test.js` (`npm i && node smoke-test.js`) exercises join/clocks/export headlessly.
- The service worker is network-first; deploys propagate on normal reload.
- GM seat is bound to a Firebase anonymous UID. Same person on a new browser = new UID;
  release a stuck seat by deleting `rooms/<CODE>/meta` in the Firebase console.
- Known alpha limitation (accepted): shared board writes are whole-blob, last-write-wins.
  Per-field patches are the planned v2 refinement if playtests surface clobbering.
- Do not rename `firebase-config.js` or move `sw.js`/`manifest.json`; paths are
  referenced relative from `/table/index.html`.

## Out of scope for this handoff

Game content edits, the case loader patch described in `rules/signal-bleed-case-format.md`
(a five-edit Portal "Case" tab — nice-to-have, not required for alpha), and any
per-field sync refactor.
