# Technology — Dark Slavic ARPG (Навь и Пепел)

<!-- Phase 3 (references/stack.md). ENGINE — one of: godot, godot-mono, unity,
unreal, web, defold, bevy (read by studio.py and envcheck.py). DIMENSION — 2D or 3D
(2.5D with 3D models is 3D); envcheck.py recommends Blender for 3D. -->
ENGINE: web
ENGINE VERSION: Three.js 0.187.0 + Rapier3D 0.21.0 + Tauri 2
DIMENSION: 3D
LANGUAGE: TypeScript
PLATFORMS: web (browser first), windows, macos, linux

## Decision
- context: Full 3D Dark Slavic Action-RPG («Навь и Пепел»); динамическая камера, плотный слоистый туман, selective bloom, френель-подсветка, мокрые PBR-отражения; сначала браузер (прямо здесь в превью), затем ПК-сборка (Steam / itch.io).
- options: Three.js r187 + Rapier3D + Tauri 2 — единые шейдеры/туман/постобработка на браузере и ПК, быстрая загрузка (~3–5 МБ), мгновенные плейтесты через Playwright, минус: архитектуру ARPG пишем в TS; Godot 4.6/4.7 — нативный ПК-редактор, но Web-экспорт ограничен Compatibility/WebGL2 без Volumetric Fog/FogVolume и требует локальной установки; Babylon.js 9 + Havok — мощный 3D-стек, но тяжелее ядро и сложнее связка с нашим React/Vite UI; Unity 6 LTS — зрелый 3D/URP, но 10–11 МБ+ пустой билд, риски памяти WebAssembly heap и внешний Unity Editor/лицензия; Unreal 5 и Godot C# отсечены (нет веб-экспорта).
- choice and why: web (`Three.js 0.187.0` + `@dimforge/rapier3d-compat 0.21.0` + `postprocessing 6.39.6` + Tauri 2 для ПК) — выбран пользователем: единственный стек, где слоистый туман и световой контраст из ART_BIBLE.md выглядят идентично в браузере и на ПК без деградации WebGL2-порта и без ручных внешних установок на старте.
- consequences: процедурные PBR-текстуры/материалы и GLB-пайплайн собираем в коде (`src/view/`) с детектом `isSoftwareGl` для headless-проверок; физику держим в фиксированном шаге `1/60` (`Rapier3D` WASM); ПК-упаковку под Windows/Mac/Linux через Tauri 2 добавляем на фазе релиза.

## Budgets
- Web: 60 fps на среднем ноутбуке в бою (≤ 16.6 мс/кадр на пике схватки), ≤ 120–180 draw calls (instancing для деревьев, рун, обломков), начальная загрузка ≤ 15 МБ (≤ 30 МБ максимум), загрузка уровня ≤ 3–5 с, текстуры пропов 512–1K, героя 1–2K, нулевые аллокации в игровом тике.
- PC (Tauri 2): 60+ fps в 1080p/1440p, лимит памяти процесса ≤ 1.5 ГБ, сохранение в AppData/localStorage со схемой версий (`SCHEMA_VERSION`).

## Project structure
- `src/main.ts` — точка входа, разбор `?seed=&gym=&state=&debug=`, запуск цикла и инъекция `window.__GAME__` / `window.__metrics`.
- `src/core/` — фиксированный цикл с интерполяцией (`loop.ts`), детерминированный ГПСЧ `mulberry32` (`rng.ts`), типизированная шина событий (`events.ts`), ввод по `event.code` (`input.ts`), загрузка ассетов (`assets.ts`), версионированные сохранения (`save.ts`), обёрнутый звук `playSound` (`audio.ts`).
- `src/systems/` — чистая симуляция механик по папкам из `DESIGN.md` (`movement/`, `combat/`, `nav/`, `dungeon/`, `progression/`, `loot/`) без рендера.
- `src/view/` — Three.js рендер, композитные 3D-модели, процедурные PBR-текстуры, туман, selective bloom и сок боя; только читает состояние и слушает события.
- `src/ui/` — HUD и экраны (древо навыков, алтарь Нави, инвентарь, меню) поверх canvas; только читает состояние и отправляет интенты.
- `src/data/` — JSON/TS-баланс и настройки всех механик (`tuning/*.json`, `balance/*.json`).
- `src/content/` — описания биомов, врагов, навыков, рун, аспектов и диалогов для загрузчика.
- `src/gyms/` — изолированные полигоны каждой механики и их сценарный харнесс (основная игра отсюда ничего не импортирует).
- `src/debug/` — панель тюнинга, оверлей метрик и пресеты состояний (отключаются вне `import.meta.env.DEV`).
- `tools/` — скрипты автоматической съёмки кадров (`capture.mjs`) и входные сценарии (`inputs/*.json`).
- `tests/` — Vitest-тесты чистых формул (урон, генерация по сиду, сохранения/миграции).
