# SIGNAL BLEED — Project Conventions

An investigative-horror tabletop RPG and its digital play surface, the
**Chart Table**: a no-build static site plus a Firebase Realtime Database
multiplayer companion. See `README.md` for the live structure and
`HANDOFF.md` for current deploy status.

**This is NOT a canvas/deterministic game.** Do not import Hatch Havoc's
deterministic-core, PixiJS, or golden-master conventions into this repo —
they solve a different problem (a seeded, replayable puzzle-game model) that
doesn't exist here. If you find yourself reaching for a seeded RNG, a
`core/` vs `game/` split, or a golden-master test, stop — that's the wrong
project's playbook.

**This file is the single canonical instruction file for this repo, shared
by every runtime that works here (Claude Code, Codex CLI, or anything
else).** There is no separate `CLAUDE.md` — Claude Code falls back to
reading `AGENTS.md` directly when no `CLAUDE.md` is present, so keeping one
file avoids drift between two copies of the same policy.

## Session continuity — READ FIRST

**`HANDOFF.md` (repo root) is the cross-session state file.** At the START
of a session, read it before doing anything else — it carries both the
sponsor-facing deploy checklist and the running two-model handoff log. At
the END of a session (or when the user pauses work), update the handoff log
section, commit, and push. A stale handoff breaks the next session cold —
keeping it current is part of finishing any unit of work.

New entries append two greppable lines — `**Agent:**` and `**Branch:**` —
see [Handoff protocol](#handoff-protocol) below.

## Commands

- `npm i && node smoke-test.js` — headless jsdom pass: joins as GM, exercises
  the Portal clocks tab, marks the Bleed, round-trips an export. This is the
  only automated check in the repo; there is no build, lint, or unit-test
  step.
- There is no dev server. Pages are self-contained HTML — open the file
  directly, or serve the repo root with any static file server, to view
  changes.

## Architecture (non-negotiable)

- **No build step.** Every page (`/index.html`, `/table/index.html`,
  `/gm/index.html`, `/hours/index.html`, `/print/*.html`) is a
  self-contained HTML file — markup, styles, and script together. Do not
  introduce a bundler, framework, package-based component system, or
  transpile step. If a change needs a build step to work, it's the wrong
  change for this repo.
- **Security lives in `firebase.rules.json`, not the client.** Client-side
  checks (e.g. "am I the GM") are UX conveniences only; never treat them as
  the security boundary. Any access-control change belongs in
  `firebase.rules.json`, reviewed as carefully as the deploy checklist in
  `HANDOFF.md` says.
- **`firebase-config.js` is public by design** — the Firebase web config is
  not a secret; RTDB rules are what actually gates access. Even so:
  - **Never rename it.** It's referenced by exact path from `/table/index.html`.
  - **Never commit real Firebase key values.** The committed file must keep
    its commented placeholders (`// apiKey: "..."`, etc.) with the
    `window.SB_FIREBASE_CONFIG = {}` object left empty. Filling it in with a
    live project's values is the sponsor's step (see `HANDOFF.md`), done
    locally, on purpose, not by an agent mid-task.
- **Don't move `sw.js` or `manifest.json`.** Both are referenced with paths
  relative to `/table/index.html`; relocating either breaks the PWA install
  or the service worker's cache scope.
- **Known accepted alpha limitation:** shared board sync is whole-blob,
  last-write-wins (`rooms/{code}/shared` is written as one blob per
  update). This is a deliberate tradeoff, not a bug — per-field patches are
  the planned v2 refinement *if* playtests surface real clobbering. Don't
  "fix" this unprompted.
- **`/rules/*.md` is the source of truth for game content** — mechanics,
  setting, case format. Code that renders rules text or reads case files
  must match what's written there; a mismatch is a code bug, not a
  documentation bug.
- **`/cases/*.json` are case files** matching the schema documented in
  `rules/signal-bleed-case-format.md` (`format: "signal-bleed-case"`,
  `version`, `title`, `depth`, `job`, `wrongDetail`, `locations`, `npcs`,
  `clues`, `artifacts`, `puzzles`, `rings`, `notes`). New or edited case
  files must keep parsing and keep those fields — CI's `cases-validate` job
  checks this on every push/PR.

## Development workflow — two-model collaboration

This repo is small enough that Hatch Havoc's five-role orchestrated-agent
workflow doesn't fit — there's no `core`/`game` split to divide across
agents. Instead, two simpler disciplines apply whenever more than one model
(or more than one session) touches this repo:

1. **Confirm-Before-Execute.** Before any change that touches
   `firebase.rules.json`, `firebase-config.js`, `sw.js`, `manifest.json`, or
   anything under `.github/workflows/`, state what you're about to change and
   why, and wait for explicit go-ahead — these are the files most likely to
   silently break deploy, security, or PWA install if edited carelessly.
   Routine edits to `/rules/`, `/cases/`, or page markup don't need this.
2. **Separation of duties: analyst ≠ implementer.** Whoever wrote the plan
   or diagnosed the bug should not be the sole reviewer of the fix. If
   you're implementing a change of any real size, ask for (or perform, as a
   distinct pass) an independent review before it merges — see
   **Independent review before merge** below.
3. **Independent review before merge.** A change lands on `main` only after
   someone other than its author has looked at the diff — a second model, a
   second session, or the user. For a solo session, that means: don't
   self-approve a non-trivial diff in the same breath you wrote it. Re-read
   it cold, or hand it to a fresh session/agent, before calling it done.

## Handoff protocol

`HANDOFF.md` keeps its existing sponsor-facing deploy checklist at the top.
Below it, a **Session log** section carries two-model handoff entries, each
with two greppable fields:

```markdown
**Agent:** Claude (Sonnet 5, Claude Code) | Codex (CLI, <model>) — <what this session actually did, one line>
**Branch:** `<branch-name>` — claimed | released | merged
```

- **`Agent:`** — machine-greppable provenance: which model/runtime wrote
  this entry, without disrupting the narrative body.
- **`Branch:`** — claim state for the branch this session worked on. A
  branch is **claimed** the moment a session starts work on it (first
  `HANDOFF.md` entry referencing it), **released** when that session ends
  without merging (so a fresh session, same or different runtime, knows
  it's free to pick up), or **merged** when the work lands.

**The rule is a social contract, not a technical lock:** a session must not
start work on a branch whose most recent `HANDOFF.md` mention is `claimed`
by a different agent without the user's explicit go-ahead. Read
`HANDOFF.md` before claiming or resuming a branch — that's the whole
mechanism.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

- **smoke** — `npm i && node smoke-test.js` (the only functional check;
  there's no build or unit-test suite in this repo).
- **cases-validate** — every `/cases/*.json` parses and carries the fields
  documented in `rules/signal-bleed-case-format.md`.
- **html-sanity** — a cheap check that the shipped HTML pages parse and that
  local `href`/`src` references resolve to files in the repo (catches typos
  and broken relative paths without needing a browser or build step).
- **handoff-freshness** — fails a push/PR that changes tracked files without
  also updating `HANDOFF.md`, mirroring Hatch Havoc's gate. This is a coarse
  backstop, not a substitute for actually keeping the session log current.

## Hooks

Two local Claude Code hooks carry over from Hatch Havoc, adapted — nothing
canvas/deterministic-core-specific applies here:

- **no-secrets-in-firebase-config** (PreToolUse, `Edit|Write|MultiEdit` on
  `firebase-config.js`) — blocks a write that would replace the placeholder
  config with what looks like a real Firebase key (an `apiKey` value
  matching Google's `AIza…` key shape, or any of the placeholder fields
  filled in with a non-empty, non-comment value). Local, fast, and backed up
  by the fact that CI doesn't independently re-check this — review any
  intentional exception carefully.
- **handoff-freshness-gate** (Stop) — local mirror of the CI job: blocks
  ending a turn with tracked, uncommitted changes outside `HANDOFF.md` and
  no matching `HANDOFF.md` update staged alongside them. Escape hatches:
  `CLAUDE_SKIP_HANDOFF_GATE=1` or a `.claude/.skip-handoff-gate` marker
  file, for intentionally pausing mid-step.

Both are wired in `.claude/settings.json`.
