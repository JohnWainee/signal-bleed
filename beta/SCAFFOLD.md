# SB-02 fixture scaffold — verification record

Branch: `feat/beta-sb-02-scaffold`, based on main merge `373565b188496500f92f57abb8e2f45bcf96b7ce`. PR #6 was merged after the user's explicit instruction and all four checks passed its final head.

## What is prepared

- Separate HTML entry points at `/beta/gm/`, `/beta/play/`, `/beta/present/` with shared TypeScript/CSS. No SPA fallback is required. Existing alpha `/gm/` remains intact.
- GM fixture state selector, player demonstration choice, and large presenter scene. Every page labels itself as synthetic fixture content. Choice clicks are local demonstrations only; refresh resets them. No Firebase import, auth, persistence or cross-window synchronization.
- `scaffold-fixture.ts` is a temporary display adapter, explicitly not SessionAdapter. SB-03 replaces it with the reviewed typed model. Route-selected fixture shapes do not establish a security boundary; no private real data belongs in this bundle.
- Vite multi-page configuration, strict TypeScript configuration, exact direct dependency pins in a separate beta package. Root alpha dependency/lockfile unchanged; root scripts delegate to beta.
- Preview packaging copies an explicit allowlist of alpha files plus built beta assets into `preview-beta/`. It excludes repository metadata, node_modules, beta sources/tests/docs and configuration. The fixture bundle is deliberately included only in this local preview artifact. `/reference/gm/` redirects to preserved `/gm/`; the eventual route replacement must reverse that arrangement without breaking relative links during SB-08.
- The existing production Worker still serves the repository root for alpha. Root `.assetsignore` excludes the entire unbuilt `beta/` tree, generated artifacts and repository tooling from that Worker; beta routes are **local preview only** until the reviewed SB-08 release configuration points at a tested build artifact.

## Tooling sources and choices

Checked official [Vite setup](https://vite.dev/guide/), [multi-page build guidance](https://vite.dev/guide/build.html#multi-page-app), [Vite 8.3.0 release](https://github.com/vitejs/vite/releases/tag/v8.3.0), and [TypeScript 6.0.2 release](https://github.com/microsoft/TypeScript/releases/tag/v6.0.2). Use Node >=22.12.0. TypeScript 6.0.2 is a deliberate stable pin, not a claim that it is the newest release. Vite transpilation is separate from the explicit typecheck command.

## Reproduce in a dependency-enabled checkout

```sh
npm ci
npm --prefix beta install
npm --prefix beta ci
npm run beta:typecheck
npm run beta:build
npm run beta:package
npm run beta:dev
```

Open each `/beta/{gm,play,present}/` URL directly and reload it. Exercise the GM state selector and player preview choices; check keyboard focus, phone width and a 16:9 presenter viewport. Then serve `preview-beta/` with a static server and repeat route/asset checks, including `/gm/`, `/reference/gm/`, `/table/`, `/hawaii/` and print links. Confirm source/test/config paths are absent from that artifact.

Run alpha smoke, cases, HTML sanity, setting validation and the four reference tests. Do not change the protected workflow merely to resolve the current environment blocker; any proposed gate changes must follow AGENTS. No production build setting or Cloudflare config is changed here. Existing root-based deployment is not switched to this artifact.

## Evidence and open gates

Verified 2026-09-21 HST in a clean checkout of PR #7 head `4f8efe9b8805dbe5ee6878ef4c8d27b38abf93f1` using Node 22.23.2 and npm 10.9.8:

- `npm ci`, `npm --prefix beta install`, and `npm --prefix beta ci` passed with zero reported vulnerabilities. Generated lockfile v3 has exact root pins TypeScript 6.0.2 and Vite 8.3.0; all resolved packages point to `registry.npmjs.org`.
- `npm run beta:typecheck` and `npm run beta:package` passed. Vite 8.3.0 emitted three HTML entry points and hashed CSS/JS assets; the packaging script produced `preview-beta/`.
- `npm run smoke`, `npm run cases:validate`, `npm run html:sanity`, `npm run setting:validate`, and `node --test beta/tests/session.test.mjs` passed (4/4 reference tests). Alpha smoke reported no page errors.
- In an actual browser, direct Vite routes `/beta/gm/`, `/beta/play/`, `/beta/present/` loaded. GM state changed to loading; player choice A showed a local preview result and reset on refresh; all three routes reloaded. Presenter was inspected at a 16:9 viewport, player at 390×844, and keyboard Tab reached the player navigation. These are desktop browser/viewport checks, not physical-device tests.
- Served `preview-beta/` separately: all three built beta routes loaded directly/reloaded. `/reference/gm/` redirected to the intact alpha `/gm/`; `/table/`, `/hawaii/`, and the Hawaiʻi, Hours, and Vespers print pages loaded. Browser error log was empty for the inspected session. The output file list contains alpha allowlisted assets/content, three beta entry pages, hashed JS/CSS, and the redirect; no beta source/tests/config, node_modules, or repository metadata. `preview-beta/`, `dist-beta/`, and beta node_modules remain gitignored.
- Fable's independent static review found that the existing root-serving Worker would otherwise expose unbuilt beta HTML and source. Added `.assetsignore` per [Cloudflare's static-assets ignore format](https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets) without changing `wrangler.jsonc`. `npx wrangler deploy --dry-run --outdir /private/tmp/signal-bleed-wrangler-dry-run` passed with no upload. Local `wrangler dev` returned 200 for `/gm/` and `/table/`, and 404 for `/beta/gm/`, `/beta/src/app/main.ts`, `/beta/package-lock.json`, `/HANDOFF.md`, and `/.assetsignore`. This verifies root Worker containment locally, not a production deployment or remote preview.

Independent final review of the containment fix is pending. Keep PR #7 draft pending that review and CI on the pushed SHA. This fixture has no Firebase auth, persistence, real multiplayer, authorization, or private-network proof; the four reference tests do not establish those behaviors. Real iPad/phone/TV checks remain unperformed. The existing `/reference/gm/` redirect points back to `/gm/`, so SB-08 must create independent preservation before any eventual route replacement. SB-03 stays WAIT until SB-02 is accepted; no production asset-directory setting, protected file, merge, or deployment was changed.

The earlier `hawaii_review` static pass found no concrete blocker on the scaffold source, but predates this installation and browser verification. It is not the pending final-diff review.
