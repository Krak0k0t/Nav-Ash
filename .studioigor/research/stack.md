# Stack — research (2026-11-22)

Game: **«Навь и Пепел»** — Full 3D Dark Slavic Action-RPG, procedural dungeons + Nav inversion, dynamic angled isometric ↔ 3rd-person camera, PBR + layered mist (`FogExp2` / height fog), selective bloom, fresnel rim. Platforms: **Browser + PC**.

## Findings
- **Excluded (hard platform rule):** **Unreal 5** (no Web export) and **Godot .NET (C#)** (no Web export).
- **Three.js `0.187.0` (r187, 2026-10-30) + `@dimforge/rapier3d-compat` `0.21.0` + `postprocessing` `6.39.6` + Tauri `2.x` / Electron `45.x` (`web`):**
  - Supports WebGL2 (`WebGLRenderer` + `pmndrs/postprocessing` `EffectComposer` with `BloomEffect` selective luminance + `ToneMappingEffect` ACES + `FogExp2` / custom height-fog shader) AND modern `WebGPURenderer` + TSL `RenderPipeline` with WebGL2 fallback.
  - Fastest browser startup (~2–5 MB core + WASM physics), instant live preview on port 3000 + headless Playwright frame capture, TypeScript + React 19 UI/skill-tree layer already initialized.
  - PC desktop build via **Tauri 2** (native OS webview, tiny binary) or **Electron 45.4** (bundled Chromium for uniform GPU shaders).
- **Babylon.js `9.37.1` + `@babylonjs/havok` `1.3.14` (`web`):**
  - Babylon 8/9 added dual native GLSL/WGSL shaders and WebGPU volumetric lighting + Havok WASM physics + built-in Inspector. Heavier core and steeper React/Vite integration than Three.js.
- **Godot `4.6.3` / `4.7` (GDScript, `godot`):**
  - Text scenes (`.tscn/.tres/.gd`), native PC export, Web export (~5–9 MB compressed / ~40 MB uncompressed WASM).
  - **Key web limitation:** Godot Web export is locked to the **Compatibility (WebGL2) renderer**, where **Volumetric Fog, `FogVolume`, SDFGI, and SSAO/SSIL are unsupported** (must fake with depth fog + billboard particles). Not installed in container; requires local desktop setup for GUI/runs.
- **Unity 6 (`6000.3 LTS` / `6000.7`, `unity`):**
  - Mature 3D animation/URP, adds WebGPU + Wasm64 (up to 16 GB) alongside WebGL2.
  - Baseline empty URP web build is 10–11 MB+ before game assets; contiguous WebAssembly heap fragmentation risks OOM in browsers; requires Unity account/license and external desktop install.

## What this changes
- Because **Тёмная Резьба и Туман** depends on layered volumetric-style mist, ACES Filmic, selective bloom, fresnel rim, and wet PBR reflections on **both Browser and PC**, **Three.js + Rapier3D** delivers identical custom shaders across Browser and PC (via Tauri/Electron) and runs directly in the live preview without losing fog/post-FX in Godot's Compatibility renderer.
- **Godot 4 (GDScript)** remains the best alternative if the user wants a native PC-first desktop project and accepts simpler depth/particle fog on the web export + external Godot installation.

## Sources
- npm registry (`three@0.187.0`, `@dimforge/rapier3d-compat@0.21.0`, `postprocessing@6.39.6`, `@babylonjs/core@9.37.1`, `electron@45.4.1`, `@tauri-apps/cli@2.12.6`) — checked 2026-11-22
- Godot Engine Docs & BugNet Compatibility/WebGL2 volumetric fog restrictions (Godot 4.4–4.6) — checked 2026-11-22
- Unity 6 (`6000.3 LTS` / `6000.7`) WebGPU, Wasm64 & URP WebGL build size/heap docs — checked 2026-11-22
- Three.js `WebGPURenderer` / TSL & `pmndrs/postprocessing` architecture overview (2026) — checked 2026-11-22
