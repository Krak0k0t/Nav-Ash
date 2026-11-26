# Decisions

One line = one decision. `by`: user — the user decided; agent — the agent decided on its own
(the user chose "you decide" or the question wasn't worth their time). A cancelled
decision is not deleted: a new line says "replaces #N".

| # | date | phase | decision | options | by | why |
|---|---|---|---|---|---|---|
| 1 | 2026-11-22 | 0 | project folder: /app/applet | — | agent | active applet workspace directory |
| 2 | 2026-11-22 | 1 | concept: Dark Slavic ARPG 'Навь и Пепел' — Diablo IV с Алтарями Нави, сдвигающими уровень в Навь (Смелее) | Утверждаю / Смелее / Поменять | user | карточка концепта утверждена в варианте Смелее |
| 3 | 2026-11-22 | 1 | scale and platform: крупная игра (4 акта, 3 класса, эндгейм, One Life); мультиплатформа ПК и браузер; динамическая камера | — | user | ответы раунда 1 и 3 |
| 4 | 2026-11-22 | 1 | combat and progression: быстрый ARPG (уворот, комбо, кулдауны), древо навыков с рунами и аспектами, тёмная сага с кат-сценами | — | user | ответы раунда 2 и 3 |
| 5 | 2026-11-22 | 1 | anti-pillars: без онлайн-мультиплеера/PvP, автобоя, строительства базы/голода и юмора | — | user | ответ раунда 3 |
| 6 | 2026-11-22 | 1 | defaults: 4 активных навыка + генератор + рывок; штраф смерти на обычной сложности сжигает мутации Нави | — | agent | указано в Допущениях утверждённой карточки |
| 7 | 2026-11-22 | 1 | hooks: выбраны все 4 — Одержимость трофеем (M09), Резонанс Нави (M10), Шепот крови (M11), Выворот лабиринта (M12) | — | user | пользователь отметил все 4 крючка |
| 8 | 2026-11-22 | 2 | style locked: 'Тёмная Резьба и Туман (Билибин 3D)' — резные славянские силуэты в слоистом тумане, огонь Яви + изумруд Нави | — | user | выбор пользователя после R1/R2 досок (лайки: туман, резной идол, читаемость боя D4/PoE2/Hellblade; дизлайки: плоская тьма Darkwood и сказочный Bramble) |
| 9 | 2026-11-22 | 3 | platforms: browser first, then PC (Steam / itch.io) | — | user | Игра сразу доступна в живом превью и веб-билде, затем упаковывается в десктопную сборку под Windows/Mac/Linux. |
| 10 | 2026-11-22 | 3 | engine: web (Three.js 0.187.0 + Rapier3D 0.21.0 + Tauri 2) | Three.js r187 + Rapier3D + Tauri \| Godot 4.6/4.7 GDScript \| Babylon.js 9 + Havok + Tauri \| Unity 6 LTS | user | Сохраняет слоистый туман, ACES Filmic, selective bloom и PBR-материалы одинаковыми в браузере и на ПК без потерь WebGL2-порта Godot. |
| 11 | 2026-11-22 | 4 | hello verified: 3D scene runs in Preview, movement, dash, Nav shift and camera toggle work | — | user | Пользователь увидел и проверил работу Three.js + Rapier3D тестовой сцены в браузере. |
| 12 | 2026-11-22 | 4 | 3D without Blender: procedural composite Three.js models and Canvas/Shader PBR textures | — | user | В облачном контейнере нет Blender; процедурный 3D-пайплайн исключает 404 внешних ассетов и сразу рендерится в вебе и Tauri. |
| 13 | 2026-11-22 | 5 | asset strategy: 100% procedural Three.js composite models + PBR Canvas/Shader textures + adaptive Web Audio orchestra/choir | — | user | Исключает внешние 404, точно попадает в арт-библию «Тёмная Резьба и Туман» и позволяет хору и уровню реагировать на сдвиг в Навь. |
| 14 | 2026-11-23 | 5 | look-dev approved & full build order: proceed to playable ARPG + animated 3D menu + 16-language i18n + rebindable controls + instancing LOD optimization | — | user | Пользователь утвердил Look-Dev и поручил переход к следующему этапу с улучшением производительности, графики, управления, меню и UI. |
