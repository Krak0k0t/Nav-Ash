import type {LocaleStrings} from '../data/locales';
import type {DungeonLayout} from '../systems/dungeonGen';
import type {HudSnapshot} from './GameHud';

interface WorldMapModalProps {
  t: LocaleStrings;
  hud: HudSnapshot;
  layout: DungeonLayout;
  mapBindLabel: string;
  onClose: () => void;
  onClickSfx: () => void;
}

export function WorldMapModal({
  t,
  hud,
  layout,
  mapBindLabel,
  onClose,
  onClickSfx,
}: WorldMapModalProps) {
  const heroDeg = (-hud.heroYaw * 180) / Math.PI;

  return (
    <div
      data-testid="world-map-modal"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClickSfx();
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.mapTitle}
        className="slavic-wood-frame flex max-h-[92vh] w-full max-w-2xl flex-col text-[#e6dcc9]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a2e20] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#e07026]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
              <path d="M9 4v14M15 6v14" />
            </svg>
            <h2 className="font-slavic-display text-xl font-bold tracking-wide text-[#f2e8d5] sm:text-2xl">
              {t.mapTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onClose();
            }}
            className="slavic-iron-plate px-3 py-1.5 text-xs tracking-wider text-[#dcd1bc] uppercase hover:border-[#e07026]"
          >
            {t.closeBtn} [{mapBindLabel}]
          </button>
        </div>

        {/* Full Cartography SVG */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#0b0f0d] p-3 sm:p-5">
          <svg
            viewBox="-64 -190 124 214"
            className="h-[56vh] max-h-[560px] w-full border border-[#4a3e2d] bg-[#0e1411]"
          >
            {/* Subtle cartography grid lines */}
            <defs>
              <pattern id="mapGrid" width="14" height="14" patternUnits="userSpaceOnUse">
                <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#18221c" strokeWidth="0.45" />
              </pattern>
            </defs>
            <rect x="-64" y="-190" width="124" height="214" fill="url(#mapGrid)" />

            {/* Corridors */}
            {layout.corridors.map((c, idx) => (
              <rect
                key={`mc_${idx}`}
                x={c.cx - c.halfW}
                y={c.cz - c.halfD}
                width={c.halfW * 2}
                height={c.halfD * 2}
                fill="#1d2822"
                stroke="#334036"
                strokeWidth="0.35"
              />
            ))}

            {/* Rooms */}
            {layout.rooms.map((r) => (
              <rect
                key={r.id}
                x={r.cx - r.halfW}
                y={r.cz - r.halfD}
                width={r.halfW * 2}
                height={r.halfD * 2}
                fill={r.requiresNavGate && !hud.navGateOpen ? '#151d1a' : '#243129'}
                stroke="#5e4d36"
                strokeWidth="0.55"
              />
            ))}

            {/* Sanctum Nav Gate Status */}
            {layout.navGates.map((g) => (
              <rect
                key={g.id}
                x={g.x - g.halfW}
                y={g.z - g.halfD}
                width={g.halfW * 2}
                height={g.halfD * 2}
                fill={hud.navGateOpen ? 'none' : '#3be88c'}
                stroke="#3be88c"
                strokeWidth="0.4"
                strokeDasharray={hud.navGateOpen ? '0.9 0.7' : undefined}
                opacity={hud.navGateOpen ? 0.5 : 0.9}
              />
            ))}

            {/* Campfires */}
            {layout.campfires.map((cf) => (
              <circle key={cf.id} cx={cf.x} cy={cf.z} r="1.65" fill="#e07026" opacity="0.88" />
            ))}

            {/* Nav Altars */}
            {layout.altars.map((a) => (
              <g key={a.id} transform={`translate(${a.x}, ${a.z})`}>
                <polygon points="0,-2.6 2.2,0 0,2.6 -2.2,0" fill="#3be88c" stroke="#082414" strokeWidth="0.5" />
              </g>
            ))}

            {/* Active Diegetic World Quest Markers (Echo Mirror/Shards, Cursed Totems, Bargain Spirit, Lore Runestones) */}
            {hud.questMarkers.map((qm, idx) => (
              <g key={`qm_${idx}`} transform={`translate(${qm.x}, ${qm.z})`}>
                {qm.kind === 'totem' ? (
                  <polygon points="0,-2.2 2.0,1.8 -2.0,1.8" fill="#a855f7" stroke="#f3e8ff" strokeWidth="0.45" />
                ) : qm.kind === 'spirit' ? (
                  <circle cx="0" cy="0" r="2.1" fill="#9ff7c8" stroke="#ffffff" strokeWidth="0.5" />
                ) : qm.kind === 'lore' ? (
                  <polygon points="0,-2.3 1.7,0 0,2.3 -1.7,0" fill="#63b3ed" stroke="#0b1f33" strokeWidth="0.45" />
                ) : (
                  <polygon points="0,-2.1 2.1,0 0,2.1 -2.1,0" fill="#ffd27a" stroke="#181209" strokeWidth="0.45" />
                )}
              </g>
            ))}

            {/* Live Enemies */}
            {hud.enemiesPos.map((e, idx) => (
              <circle
                key={`me_${idx}`}
                cx={e.x}
                cy={e.z}
                r={e.isBoss ? 3.2 : e.isLocked ? 2.4 : 1.65}
                fill={e.isBoss ? '#3be88c' : e.isLocked ? '#ffb16b' : '#c92a2a'}
                stroke={e.isLocked ? '#ffffff' : '#101412'}
                strokeWidth="0.5"
              />
            ))}

            {/* Hero Directional Chevron */}
            <g transform={`translate(${hud.heroX}, ${hud.heroZ}) rotate(${heroDeg})`}>
              <polygon
                points="0,3.8 -2.4,-2.7 0,-1.1 2.4,-2.7"
                fill="#e07026"
                stroke="#fff3e0"
                strokeWidth="0.65"
              />
            </g>

            {/* Atmospheric Area Labels (top layer with dark stroke halo for crisp legibility) */}
            {layout.rooms.map((r) => (
              <text
                key={`lbl_${r.id}`}
                x={r.cx - r.halfW + 1.5}
                y={r.cz - r.halfD + 3.6}
                textAnchor="start"
                fill="#c2b296"
                stroke="#0d1311"
                strokeWidth="1.4"
                paintOrder="stroke"
                fontSize="3.2"
                fontFamily="serif"
              >
                {r.nameKey}
              </text>
            ))}
          </svg>
        </div>

        {/* Cartography Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-[#3a342a] bg-[#0e1210] px-4 py-2.5 text-[11px] text-[#cbbba0]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#e07026] ring-1 ring-[#fff3e0]" />
            {t.mapLegendHero}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c92a2a]" />
            {t.mapLegendEnemy}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#3be88c]" />
            {t.mapLegendAltar}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#ffd27a]" />
            {t.mapLegendQuest}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#63b3ed]" />
            {t.mapLegendLore}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-4 bg-[#3be88c]" />
            {hud.navGateOpen ? t.mapLegendGateOpen : t.mapLegendGateSealed}
          </span>
        </div>
      </div>
    </div>
  );
}
