# Assets & Pipeline — research (2026-11-22)

Pipeline: **3D without Blender** (`Three.js 0.187.0` + Vite + Tauri 2), Art Bible **«Тёмная Резьба и Туман (Билибин 3D)»**.

## Findings
- **3D Props, Kits & Characters (without Blender):**
  - Composite `THREE.Group` assembly (3–12+ beveled/extruded/lathed/tubed parts with articulated shoulder/hip/weapon pivots and procedural walk/attack/dash/hit kinematics) + `InstancedMesh` for groves, ruins, and projectiles produces 100% cohesive silhouettes in the Bilibin/woodcut palette with zero GLB/404 failure risk.
  - External CC0 packs (Kenney, KayKit, Quaternius) are chunky/toy-like and clash with realistic dark Slavic PBR (`ART_BIBLE.md` forbids cartoony silhouettes); **Tripo / Meshy** require paid user API keys ($20/mo Pro or prepaid credits). **Poly Pizza** hosts CC0 `.glb` props that can be re-textured if ever needed (`Loader` + `NoColorSpace` normal maps).
- **Textures & Shaders:**
  - Procedural `CanvasTexture` + `DataTexture` (`SRGBColorSpace` albedo, `NoColorSpace` normal/roughness/bump) + `MeshStandardMaterial.onBeforeCompile` (fresnel rim light, Nav corruption dissolve, mud/puddle wetness) render identically across WebGL2/WebGPU and pack zero static network assets.
  - **ambientCG** (CC0 PBR maps) and **Poly Haven** (CC0 HDRIs/PBR) remain valid external CC0 fallbacks via API (`ambientcg.com/api/v3/assets`) if high-res photoreal stone/bark scans are wanted later.
- **UI, Icons & VFX:**
  - Inline procedural SVG runes/crests (9-slice iron & parchment frames, Cormorant/Georgia serif + monospace/grotesque telemetry) + Three.js `InstancedMesh` / custom shader billboards for embers, Nav spores, blood sigils, and telegraphs.
- **Audio & Haunting Orchestral/Choral Soundscape:**
  - Real-time **Web Audio API procedural synthesizer** (layered bowed string drones, dark Slavic choral formant filter choir that swells dynamically with *Резонанс Нави* `M10`, war-horn stingers, plus procedural steel/bone/fire/rune SFX) delivers zero-latency adaptive music + zero 404s.
  - Alternative external CC0/CC-BY music sources: **OpenGameArt**, **incompetech** (CC-BY 4.0, requires attribution), **Openverse Audio** (`api.openverse.org/v1/audio/?license=cc0`), or **ElevenLabs Music** (paid key).

## What this changes
- Default strategy for **«Навь и Пепел»**: **100% процедурный Three.js + Canvas PBR + Web Audio стек** (никаких сторонних игрушечных паков, никаких внешних 404, 100% попадание в палитру `#131815 / #1d2833 / #e07026 / #3be88c` и адаптивный хор под `M10`).
- Спросить пользователя одним вопросом подтверждение стратегии по категориям и выбора подхода к музыке (процедурный оркестровый/хоровой синтез + CC0 фоновые слои vs своя музыка).

## Sources
- Poly Pizza (CC0 `.glb` models) & ambientCG (CC0 PBR maps / ORM packing) — checked 2026-11-22
- Three.js r187 `CanvasTexture` / `PMREMGenerator` / `MeshStandardMaterial.onBeforeCompile` — checked 2026-11-22
- `references/assets.md` (Kenney, KayKit, Quaternius, OpenGameArt, Openverse, Tripo/Meshy pricing) — checked 2026-11-22
