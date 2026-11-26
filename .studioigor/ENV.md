# Environment — Dark Slavic ARPG (Навь и Пепел)

<!-- Phase 4 (references/environment.md). Commands verified by a real run.
VERIFIED is switched only by `studio.py verify`. CAPTURE writes images to
.studioigor/captures/. -->
VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node.js + npm | 22.23.2 | Vite 8 + TypeScript toolchain |
| Vite | 8.3.0 | dev server (:3000) и бандлер |
| TypeScript | 7.0.2 | строгая типизация (`tsc --noEmit`) |
| Three.js + @types/three | 0.187.0 | 3D PBR-рендер, FogExp2, InstancedMesh, RoomEnvironment |
| @dimforge/rapier3d-compat | 0.21.0 | WASM 3D-физика и коллизии |
| postprocessing | 6.39.6 | selective bloom, vignette, ACES Filmic |
| Vitest | 5.1.1 | юнит-тесты чистых формул, сидов и симуляции |
| ESLint + Prettier | 10.15.0 / 3.10.1 | конфиг/форматирование кода |
| Playwright + headless shell | 1.65.1 / rev 1247 | автоматический захват кадров (`tools/capture.mjs`) |

## Agent integrations
- Автозахват кадров и консольных ошибок через `tools/capture.mjs` (Playwright + `/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell` на SwiftShader с детектом `isSoftwareGl` и `afterDraw`).
- Интерактивный браузерный просмотр через `playwright-cli` и превью AI Studio на порту `3000`.
- `claude` CLI / `brew` / Blender GUI отсутствуют в облачном Linux-контейнере; сборка 3D-ассетов и текстур настраивается процедурно в коде (`3D without Blender` на подтверждении пользователя).

## Commands
RUN: npm run dev
TEST: npx tsc --noEmit && npx vitest run
BUILD: npm run build
CAPTURE: npm run build && PW_CHROMIUM=/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell node tools/capture.mjs --dir dist --out .studioigor/captures/hello --duration 6 --every 1 --inputs tools/inputs/hello.json --wait-for "window.__GAME__?.ready" --seed 1307 --require-completed
EDITOR: none — TypeScript/Three.js code in repository

## Pitfalls
- TypeScript 7.0.2 (`tsgo`) не поддерживается текущим `typescript-eslint@8.73.0`; для проверки типов и неиспользуемых переменных используем `tsc --noEmit` (`noUnusedLocals` + `noUnusedParameters`).
- В контейнере нет GPU — headless Chromium работает на SwiftShader (`isSoftwareGl === true`); рендер-петля обязана использовать `afterDraw` и пропускать тяжёлые многопроходные эффекты (postprocessing/shadows) только на software WebGL без изменения сцены и освещения.
- Предзагруженный браузер контейнера находится в `/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell`, поэтому передаём `PW_CHROMIUM=...` в `capture.mjs`.
