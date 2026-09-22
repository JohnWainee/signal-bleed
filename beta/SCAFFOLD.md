# SB-02 fixture scaffold — draft

Branch: `feat/beta-sb-02-scaffold`, based on main merge `373565b188496500f92f57abb8e2f45bcf96b7ce`. PR #6 was merged after the user's explicit instruction and all four checks passed its final head.

## What is prepared

- Separate HTML entry points at `/beta/gm/`, `/beta/play/`, `/beta/present/` with shared TypeScript/CSS. No SPA fallback is required. Existing alpha `/gm/` remains intact.
- GM fixture state selector, player demonstration choice, and large presenter scene. Every page labels itself as synthetic fixture content. Choice clicks are local demonstrations only; refresh resets them. No Firebase import, auth, persistence or cross-window synchronization.
- `scaffold-fixture.ts` is a temporary display adapter, explicitly not SessionAdapter. SB-03 replaces it with the reviewed typed model. Route-selected fixture shapes do not establish a security boundary; no private real data belongs in this bundle.
- Vite multi-page configuration, strict TypeScript configuration, exact direct dependency pins in a separate beta package. Root alpha dependency/lockfile unchanged; root scripts delegate to beta.
- Preview packaging copies an explicit allowlist of alpha files plus built beta assets into `preview-beta/`. It excludes repository metadata, node_modules, beta sources/tests/docs and configuration. The fixture bundle is deliberately included only in this local preview artifact. `/reference/gm/` redirects to preserved `/gm/`; the eventual route replacement must reverse that arrangement without breaking relative links during SB-08.

## Tooling sources and choices

Checked official [Vite setup](https://vite.dev/guide/), [multi-page build guidance](https://vite.dev/guide/build.html#multi-page-app), [Vite 8.3.0 release](https://github.com/vitejs/vite/releases/tag/v8.3.0), and [TypeScript 6.0.2 release](https://github.com/microsoft/TypeScript/releases/tag/v6.0.2). Use Node >=22.12.0. TypeScript 6.0.2 is a deliberate stable pin, not a claim that it is the newest release. Vite transpilation is separate from the explicit typecheck command.

## Resume in a dependency-enabled checkout

```sh
npm ci
npm --prefix beta install
# Commit the generated beta/package-lock.json after checking the dependency diff.
npm --prefix beta ci
npm run beta:typecheck
npm run beta:build
npm run beta:package
npm run beta:dev
```

Open each `/beta/{gm,play,present}/` URL directly and reload it. Exercise the GM state selector and player preview choices; check keyboard focus, phone width and a 16:9 presenter viewport. Then serve `preview-beta/` with a static server and repeat route/asset checks, including `/gm/`, `/reference/gm/`, `/table/`, `/hawaii/` and print links. Confirm source/test/config paths are absent from that artifact.

Run alpha smoke, cases, HTML sanity, setting validation and the four reference tests. Do not change the protected workflow merely to resolve the current environment blocker; any proposed gate changes must follow AGENTS. No production build setting or Cloudflare config is changed here. Existing root-based deployment is not switched to this artifact.

## Evidence and open gates

Passed locally: Node syntax checks for main.ts and both build/packaging scripts; fixture role-shape check; existing four beta reference tests. These are not a Vite build, TypeScript semantic check or browser test.

Blocked: npm registry reads for vite/typescript returned HTTP 403 in this runtime. No trusted lockfile could be generated; it is intentionally absent, not fabricated. Clean beta install, typecheck, Vite build, actual packaged-output audit and browser verification remain outstanding. SB-02 is BLOCKED-ENV and its PR must remain draft until those gates pass. SB-03 is not unlocked by the existence of these files.

Independent read-only review by `hawaii_review` found no concrete static blocker. Reviewer confirmed that `/reference/gm/` is only a temporary redirect, not independent preservation for cutover, and state controls are local to the GM fixture. Coordinator retained both limitations; no build/browser approval is implied.
