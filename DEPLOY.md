# Deploying Signal Bleed

> Historical alpha setup guide. The current GitHub checks include a Cloudflare Workers build, while this guide describes a Pages Git integration. The live production path has not been verified in this SB-02 checkout. Do not use these instructions for a beta cutover or assume a repository-root publish is safe; confirm the actual host and follow the reviewed SB-08 release runbook first.

## 1. Cloudflare Pages (hosting)

1. Push this repo to GitHub.
2. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings: **no framework, no build command, output directory `/`**. Deploy.
4. Every push to `main` auto-deploys. You get `https://<project>.pages.dev`.

## 2. Firebase (multiplayer sync)

1. console.firebase.google.com → **Add project** (turn Analytics off). Stay on the free Spark plan.
2. **Build → Realtime Database → Create Database** → pick a nearby region → start in locked mode.
3. **Rules tab** → replace everything with the contents of `firebase.rules.json` → Publish.
4. **Build → Authentication → Get started** → enable the **Anonymous** provider only.
5. **Project settings → Your apps → Web (`</>`)** → register → copy the `firebaseConfig` object.
6. Paste those values into `firebase-config.js` in this repo, commit, push. Done —
   the next deploy is multiplayer.

Why Realtime Database, not Firestore: Firestore bills per write and board updates are
frequent tiny writes; RTDB bills bandwidth only, which at table scale rounds to $0.

## 3. First playtest

1. GM opens `https://<site>/table/` — a room code is generated and shown.
2. GM taps **Enter as GM** (this locks the room's GM seat to them).
3. Players open the same URL with `?room=CODE`, or type the code on the sign-on screen.
4. Optional: everyone Share → **Add to Home Screen** for the app feel.

## Troubleshooting

- **"Room X · offline" in the header** — `firebase-config.js` is still empty, or the
  Firebase SDK failed to load. The table works, but only on that device.
- **"This room already has a GM"** — the GM seat is locked to the first claimant's
  anonymous auth ID. Same GM, new device/browser = new ID; open a fresh room, or
  delete `rooms/<CODE>/meta` in the Firebase console to release the seat.
- **Stale board after edits** — the service worker is network-first, so a normal
  reload fetches fresh; a hard refresh clears any cached copy.
