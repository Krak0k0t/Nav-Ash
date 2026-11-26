# Assets — Dark Slavic ARPG (Навь и Пепел)

<!-- Phase 5 (references/assets.md). -->

## Inventory
<!-- one line per asset card: asset · category · style · budget · source · status -->
| asset | category | style | budget | source | status |
|---|---|---|---|---|---|
| A001 · CH_Vityaz | character/hero | шлем-шишак, кольчуга, плащ, резной щит, пылающий факел (`#e07026`) + френель-контур | ≤3.5k tris, 512px PBR | procedural Three.js (`THREE.Group`) | done |
| A002 · CH_Volhv_Lovets | character/classes | силуэты Волхва (посох-череп/руны) и Ловца (лук/мех) для M07 | ≤3.5k tris each | procedural Three.js | plan |
| A003 · PR_NavAltar | prop/hero | резной дубовый чур на мшистом камне, свечи, монолиты Нави, рунный венец (`#3be88c`) | ≤1.2k tris, 512px oak/stone | procedural Three.js (`THREE.Group`) | done |
| A004 · PR_Campfire_Torch | prop/hero | кострище Острога и вехи света Яви (`#e07026`, живое мерцание и угли) | ≤500 tris | procedural Three.js | done |
| A005 · KIT_DungeonModular | kit/environment | плиты погоста/капища, резные столбы, арки, корни и раздвижные стены Нави (`M03/M12`) | ≤400 tris/piece, instanced | procedural Three.js + PBR | plan |
| A006 · ENV_BirchDeadwood | environment/foliage | берёзы с ветвями, камыш, валуны, голубцы, тын периметра в тумане (`FogExp2`) | ≤300 tris/tree, `InstancedMesh` | procedural Three.js | done |
| A007 · EN_Upyr_Nav | character/enemy | скрюченный рогатый упырь Нави с изумрудным ядром, ветвями и длинными когтями | ≤1.8k tris | procedural Three.js | done |
| A008 · EN_Kikimora_Archer | character/enemy | болотная кикимора-стрелок в лохмотьях мха, светящийся посох телеграфа | ≤1.8k tris | procedural Three.js | plan |
| A009 · EN_Volkolak_Elite | character/elite | крупный волколак с резной руной на груди (`M09` сосуд) и мощным замахом | ≤2.6k tris | procedural Three.js | plan |
| A010 · BS_Leshy_Boss | character/boss | босс вертикального среза: рогатый Леший-Хранитель Огнища с корнями-клешнями | ≤5k tris | procedural Three.js | plan |
| A011 · NPC_Mara_Yaromir | character/npc | Ведунья Мара и Кузнец Яромир в хабе Острог (`M06`) | ≤2k tris each | procedural Three.js | plan |
| A012 · VFX_Combat_Nav | vfx | рунный телеграф на земле, искры костра, объёмные лучи луны, блуждающие огни Нави | instanced / custom shader | procedural Three.js | done |
| A013 · UI_ForgedParchment | ui/2d | кованые рамки, сферы здоровья/света факела, резные иконки навыков и рун | inline SVG + CSS | procedural SVG | done |
| A014 · SND_Combat_World | audio/sfx | звон стали, хруст костей, шипение факела, гул Алтаря Нави, шаги по грязи | mono procedural buffer | procedural Web Audio | plan |
| A015 · MUS_NavChoir | audio/music | мрачный оркестровый дрон (виолончели/духовые) + адаптивный хор под `M10` | dynamic layered synth | procedural Web Audio (+ optional CC0) | plan |

## Strategy by category
| category | source (pack / Blender / procedural / generation / user) | why | status |
|---|---|---|---|
| Герой, классы, враги и боссы | procedural (композитные иерархии `THREE.Group` с шарнирными конечностями и процедурной кинематикой) | 3D без Blender; 100% совпадение силуэтов с палитрой и стилем «Билибин 3D», ноль сторонних игрушечных паков | approved |
| Окружение, подземелье и Алтари Нави | procedural (модульные тайлы, резные идолы, берёзы через `InstancedMesh`) | минимальные draw calls (`<180`), мгновенная смена геометрии при сдвиге в Навь (`M02/M12`) | approved |
| Текстуры, материалы и свет | procedural (`CanvasTexture` / `DataTexture` PBR + `onBeforeCompile` френель и туман) | нулевой риск 404 в браузере и Tauri; строгий контроль roughness луж и тонов Явь/Навь | approved |
| VFX и телеграфы боя | procedural (шейдерные рунные круги, искры факела, полосы рассечения) | чёткое чтение телеграфов на расстоянии изометрии (50°) поверх тёмной земли | approved |
| UI и иконки навыков/рун | procedural (SVG в коде + CSS кованого железа и пергамента, антиква) | резкие иконки в любом разрешении без внешних шрифтов и эмодзи | approved |
| Звук и музыка (SFX + саундтрек) | procedural Web Audio (оркестровый дрон + адаптивный хор для `M10`, с опцией CC0/своих треков) | мгновенно реагирует на ритм боя и сдвиг Нави без задержек загрузки | approved |

## Conventions
- Единицы: метрическая система (`1 unit = 1 m`); оси: `+Y` вверх, `+Z` вперёд (`Right-handed`); пивот всех пропов и персонажей — строго по центру нижней подошвы (`y = 0`), чтобы ничего не парило над землёй.
- Материалы и цвет: альбедо-текстуры в `THREE.SRGBColorSpace`, карты нормалей/шероховатости/рельефа — в `THREE.NoColorSpace`; соседние материалы различаются по `roughness` минимум на `0.25`; обязателен `RoomEnvironment` в `scene.environment`.
- Имена и пути: только ASCII без пробелов (`src/view/assets/...`), без внешних незадекларированных URL (ноль 404).
- Бюджеты: `< 180` draw calls на кадр (всё повторяемое в `InstancedMesh`), суммарно `< 150k` треугольников в кадре для Web, пропсы `≤ 1.2k` tris, враги `≤ 2.6k`, герой/босс `≤ 5k`, текстуры `256–512 px`.

## Requests to the user
- Стратегия утверждена (процедурный Three.js + PBR + адаптивный Web Audio хор); ждём утверждения Look-Dev сцены.

## License registry
| asset / pack | source (URL) | license | author | path | attribution |
|---|---|---|---|---|---|
| Все текущие ассеты фазы 4–5 | собственные процедурные генераторы проекта | Project Source (MIT) | Команда проекта (код) | `src/view/` | не требуется |
