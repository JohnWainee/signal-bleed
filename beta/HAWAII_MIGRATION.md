# Hawaiʻi migration record

Date: 2026-09-22. Base: a1028cfd4e67bdd159bf96d82e9248c371b4c807. Branch: feat/beta-session-foundation; draft PR #6. Not deployed.

## User direction

Replace the former setting across Signal Bleed with real Hawaiʻi and the previous session's lore. Personal Context recovered: September 2026 opening; September Compression; Option B Emergency Republic; October Emergency Logistics Order; fictional JIITG/non-originating records; December prediction-linked arrest; Branch Event One in spring 2027; Observer Trials in late 2028–2029; 2030 displacement; later undated fragmentation. Campaign-present year and exact Sounding event remain open.

## Scope

- New canonical rules/hawaii-setting-bible.md; old bible URL is a pointer, with history preserved in Git.
- Landing, GM reference, Chart Table playbook prose and d100 content, seven core playbooks, case JSON, season modules, print packs and beta documentation migrated.
- /hawaii/ is a selectable place/timeline reference. The former invented-island map is replaced by a location index, not yet a georeferenced Hawaiʻi map. /hours/ serves the same content for existing links. It is a public setting reference, not the future privacy-enforcing presenter surface; timeline selection hides text visually, not from the client payload.
- /print/hawaii.html is canonical; old print URLs contain identical current pages. The older duplicate pack is synchronized to the nine-sheet pack.
- Old settlement mythology, geography, fixed island-count cosmology, invented licensing law, and mandatory archipelago evacuation are removed. Specific fictional firms and characters are retained as adapted supporting cast, not real organizations or officials.
- First lifepath now dates Origin to September 2026, Career to late 2026, Incident to spring 2027, Fallout to Observer Trials. It is an optional later-start proposal, not a fixed campaign start.
- No Firebase rules/config, service worker, manifest, CI workflow or production hosting changed. Existing saved rooms/exports are not automatically rewritten; importing or upgrading old campaign data requires the explicit migration task already on the board.

## Evidence

Passed locally:
- node scripts/validate-setting.mjs: 22 active content files checked for retired setting text; inline JS syntax; required timeline anchors; d100 coverage; seven playbooks; exact compatibility copies.
- node scripts/validate-cases.mjs: both JSON cases pass.
- node --test beta/tests/session.test.mjs: four tests pass.
- Independent Python/lxml audit: eight HTML pages, no broken local href/src references.

Independent read-only agent review found an identity/custody contradiction in the lifepath. Fixed: obtaining the intact original restores access to the identity; Career A + Incident A remains masked. Also added October to timeline filtering and a local pre-2026-record caveat to the core case excerpt.

Limitations: npm ci was blocked with HTTP 403 for a dependency; the existing jsdom smoke and HTML-sanity commands could not run locally. Playwright could not launch because Chromium is not installed. No browser/device/visual execution is claimed. Run those checks in CI/full checkout before merge; the static link audit is not a browser test. New lore is not automatically proof of game balance.

## Next

SB-00: review the cumulative PR and run full smoke/browser checks. SB-09: include georeferenced map work and saved-room migration in parity review. SB-10/LP-C: review the proposed lifepath choices in the Hawaiʻi frame; do not reintroduce the superseded setting. No merge or deployment performed.
