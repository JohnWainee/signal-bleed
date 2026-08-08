# SIGNAL BLEED — alpha playtest build

An investigative horror tabletop RPG and its digital play surface, the **Chart Table**:
a shared multiplayer board for phones, tablets, and laptops. Players join by room code;
the GM runs a private Portal for clues, sealed secrets, puzzles, and company clocks.

**Live structure**

| Path | What it is |
|---|---|
| `/` | Landing page |
| `/table/` | The Chart Table (multiplayer app) |
| `/gm/` | Searchable GM reference |
| `/print/vespers.html`, `/print/hours.html` | Print packs |
| `/hours/` | The Hours setting chart & record |
| `/cases/` | Case files (JSON) |
| `/rules/` | Rules and setting documents (markdown, source of truth) |

## Architecture

- **One static site, no build step.** Every page is a self-contained HTML file.
- **Sync:** Firebase Realtime Database (anonymous auth) under `rooms/{code}/`:
  - `shared` — the board everyone sees
  - `players/{uid}` — each player's private space (character, sealed page, inbox)
  - `gm` — the GM's clue bank and prep, readable only by the GM
  - `meta/gmUid` — GM lock; first GM to claim a room keeps it
- **Fallback:** with no Firebase config, the table runs single-device on localStorage —
  the site is fully usable before sync is configured.
- **Security** lives in `firebase.rules.json`, not in the client. The Firebase web
  config in `firebase-config.js` is public by design.

## Deploying

See `DEPLOY.md`. Short version: connect this repo to Cloudflare Pages (no build
command, output directory `/`), create a free Firebase project, paste its config
into `firebase-config.js`, paste `firebase.rules.json` into the RTDB rules tab.

## Development

`node smoke-test.js` runs a headless jsdom pass over the table app: joins as GM,
exercises the Portal clocks tab, marks the Bleed, and round-trips an export.
