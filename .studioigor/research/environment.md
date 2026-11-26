# Environment — research (2026-11-22)

Engine: `web` (`Three.js 0.187.0` + `@dimforge/rapier3d-compat 0.21.0` + `postprocessing 6.39.6`), Vite `8.3.0`, TypeScript `7.0.2`.

## Findings
- **Runtime (container):** Linux x86_64 (`node 22.23.2`, `npm`, `python3 3.11.2`, `git 2.34.1`, `ffmpeg 4.4.2`). Homebrew, Blender, `git-lfs`, and `claude` CLI are absent in this cloud container; live preview runs on Vite port `3000`.
- **Three.js + Physics + PostFX:** `three@0.187.0` + `@types/three@0.187.0`, `@dimforge/rapier3d-compat@0.21.0` (single-bundle WASM init via `RAPIER.init()` without extra Vite wasm plugins), `postprocessing@6.39.6` (`EffectComposer`, `BloomEffect`, `ToneMappingEffect`, `VignetteEffect`).
- **Tests & Linter (2026):** `vitest@5.1.1`, `eslint@10.15.0` + `@eslint/js@10.0.1` + `typescript-eslint@8.73.0` + `prettier@3.10.1`. ESLint 10 dropped `.eslintrc*` and uses `eslint.config.js` with `defineConfig` from `eslint/config` + `...tseslint.configs.recommended`.
- **Browser Capture & Playwright:** Container pre-installs `playwright-cli@0.1.22` and `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` with `chromium_headless_shell-1247`. Installing `playwright@1.65.1` as project dependency + running `tools/capture.mjs` with `PW_CHROMIUM=/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell` avoids redundant Chromium downloads and supports `isSoftwareGl` SwiftShader WebGL capture.
- **3D Assets & Blender:** Without Blender in the cloud container, procedural composite `THREE.Group` meshes (3–12 parts) + procedural PBR `CanvasTexture`/`DataTexture` guarantee zero 404 asset failures across Browser and Tauri PC builds (pending user confirmation for "3D without Blender").

## What this changes
- Install all npm engine/test/lint/capture dependencies in one batch (`three`, `@types/three`, `@dimforge/rapier3d-compat`, `postprocessing`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `playwright`).
- Ask the user to confirm **3D without Blender** (procedural Three.js models & PBR textures) vs external `.glb` workflow before Phase 5.
- Configure `tools/capture.mjs` in `ENV.md` using `PW_CHROMIUM` pointing to the container's `/ms-playwright/chromium_headless_shell-1247/...` binary, and configure `eslint.config.js` (ESLint 10 flat config).

## Sources
- npm registry (`three@0.187.0`, `@dimforge/rapier3d-compat@0.21.0`, `postprocessing@6.39.6`, `vitest@5.1.1`, `eslint@10.15.0`, `typescript-eslint@8.73.0`, `playwright@1.65.1`) — checked 2026-11-22
- ESLint 10 Flat Config & `typescript-eslint` v8 documentation (`defineConfig` in `eslint.config.js`) — checked 2026-11-22
- Container probe (`playwright-core/browsers.json` rev `1247`, `/ms-playwright`) — checked 2026-11-22
