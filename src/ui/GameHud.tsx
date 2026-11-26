import {useEffect, useRef, useState} from 'react';
import {formatBindingLabel, type GameAction, type KeyBindings} from '../core/settings';
import type {CameraStyleId, EnemyArchetype, VesselMutationId} from '../data/balance';
import type {LocaleStrings} from '../data/locales';
import type {DungeonLayout} from '../systems/dungeonGen';
import type {CombatActionLock} from '../systems/gameSim';
import {FullscreenButton} from './FullscreenButton';
import {SkillIcon, type SkillIconAction} from './SkillIcons';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  spirit: number;
  maxSpirit: number;
  torchlight: number;
  maxTorchlight: number;
  potions: number;
  ashes: number;
  vesselMutation: VesselMutationId;
  navShifted: boolean;
  navGateOpen: boolean;
  resonance: number;
  nearAltarId: string | null;
  nearNpcId: 'mara' | 'ratnik' | null;
  maraDialogueIndex: number;
  maraDialogueTimer: number;
  bossActive: boolean;
  bossHpRatio: number;
  lockedTarget: {
    id: string;
    archetype: EnemyArchetype;
    hp: number;
    maxHp: number;
    dist: number;
  } | null;
  actionLock: CombatActionLock;
  heroX: number;
  heroZ: number;
  heroYaw: number;
  heroHitFlash: number;
  nearMirror: boolean;
  nearSpirit: boolean;
  nearLoreId: string | null;
  whisperKey: string | null;
  whisperTimer: number;
  questMarkers: {x: number; z: number; kind: 'mirror' | 'shard' | 'totem' | 'spirit' | 'lore'}[];
  enemiesPos: {x: number; z: number; isBoss: boolean; isLocked?: boolean}[];
  counterTimer: number;
  wardTimer: number;
  cooldowns: {
    primary: number;
    dagger: number;
    potion: number;
    shieldWave: number;
    flameSurge: number;
    navCleave: number;
    crescendo: number;
    whirlwind: number;
    svarogWard: number;
    dash: number;
  };
}

interface GameHudProps {
  t: LocaleStrings;
  hud: HudSnapshot;
  layout: DungeonLayout;
  bindings: KeyBindings;
  cameraStyle: CameraStyleId;
  muted: boolean;
  onTriggerAction: (action: GameAction) => void;
  onSpiritBargain: (choice: 'offerLight' | 'shatter') => void;
  onOpenMap: () => void;
  onTouchJoystick: (x: number, y: number) => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onOpenPause: () => void;
  onOpenSettings: () => void;
  onClickSfx: () => void;
}

function getEnemyDisplayName(t: LocaleStrings, arch: EnemyArchetype): string {
  switch (arch) {
    case 'upyr':
      return t.enemyUpyr;
    case 'kikimora':
      return t.enemyKikimora;
    case 'volkolak':
      return t.enemyVolkolak;
    case 'leshy':
      return t.enemyLeshy;
  }
}

function CarvedCornerStuds() {
  return (
    <>
      <span className="pointer-events-none absolute top-1 left-1 h-1.5 w-1.5 rotate-45 border border-[#8d744c] bg-[#2a2218]" />
      <span className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rotate-45 border border-[#8d744c] bg-[#2a2218]" />
      <span className="pointer-events-none absolute bottom-1 left-1 h-1.5 w-1.5 rotate-45 border border-[#8d744c] bg-[#2a2218]" />
      <span className="pointer-events-none absolute right-1 bottom-1 h-1.5 w-1.5 rotate-45 border border-[#8d744c] bg-[#2a2218]" />
    </>
  );
}

export function GameHud({
  t,
  hud,
  layout,
  bindings,
  cameraStyle,
  muted,
  onTriggerAction,
  onSpiritBargain,
  onOpenMap,
  onTouchJoystick,
  onToggleCamera,
  onToggleMute,
  onOpenPause,
  onOpenSettings,
  onClickSfx,
}: GameHudProps) {
  const [isTouchViewport, setIsTouchViewport] = useState(false);
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState({x: 0, y: 0});
  const joyActiveId = useRef<number | null>(null);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const spPct = Math.max(0, Math.min(100, (hud.spirit / Math.max(1, hud.maxSpirit)) * 100));
  const torchPct = Math.max(0, Math.min(100, (hud.torchlight / Math.max(1, hud.maxTorchlight)) * 100));

  // Delayed HP damage trail + brief damage shake feedback
  const prevHpRef = useRef(hud.hp);
  const [trailHpPct, setTrailHpPct] = useState(hpPct);
  const [damageShake, setDamageShake] = useState(false);

  useEffect(() => {
    if (hud.hp < prevHpRef.current - 0.5) {
      setDamageShake(true);
      const shakeTimer = window.setTimeout(() => setDamageShake(false), 300);
      const trailTimer = window.setTimeout(() => setTrailHpPct(hpPct), 220);
      prevHpRef.current = hud.hp;
      return () => {
        window.clearTimeout(shakeTimer);
        window.clearTimeout(trailTimer);
      };
    }
    prevHpRef.current = hud.hp;
    setTrailHpPct(hpPct);
  }, [hud.hp, hpPct]);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsTouchViewport(coarse || window.innerWidth < 900);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const objectiveText = hud.bossActive
    ? t.objectiveSlayLeshy
    : !hud.navGateOpen
      ? t.objectiveShiftAltar
      : t.objectiveSlayLeshy;

  const vesselText =
    hud.vesselMutation === 'wolfFury'
      ? t.vesselWolfFury
      : hud.vesselMutation === 'mireVenom'
        ? t.vesselMireVenom
        : hud.vesselMutation === 'ashBrand'
          ? t.vesselAshBrand
          : t.vesselNone;

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({x: dx, y: dy});
    onTouchJoystick(dx / maxR, dy / maxR);
  };

  const desktopSlots: readonly {
    act: SkillIconAction;
    label: string;
    cd: number;
    isNav: boolean;
    count?: number;
  }[] = [
    {act: 'primary', label: t.skillStrike, cd: hud.cooldowns.primary, isNav: false},
    {act: 'daggerThrow', label: t.skillDagger, cd: hud.cooldowns.dagger, isNav: false},
    {act: 'skill1', label: t.skillShieldWave, cd: hud.cooldowns.shieldWave, isNav: false},
    {act: 'skill2', label: t.skillFlameSurge, cd: hud.cooldowns.flameSurge, isNav: false},
    {act: 'skill3', label: t.skillNavCleave, cd: hud.cooldowns.navCleave, isNav: true},
    {act: 'skill4', label: t.skillCrescendo, cd: hud.cooldowns.crescendo, isNav: true},
    {act: 'skill5', label: t.skillWhirlwind, cd: hud.cooldowns.whirlwind, isNav: false},
    {act: 'skill6', label: t.skillSvarogWard, cd: hud.cooldowns.svarogWard, isNav: false},
    {act: 'evade', label: t.actionEvade, cd: hud.cooldowns.dash, isNav: false},
    {act: 'potion', label: t.actionPotion, cd: hud.cooldowns.potion, isNav: false, count: hud.potions},
    {act: 'targetCycle', label: t.targetCycleHint, cd: 0, isNav: false},
  ];

  const isLowHp = hpPct <= 35 && hud.hp > 0;
  const hasInteractPrompt = Boolean(
    hud.nearAltarId || hud.nearMirror || hud.nearLoreId || hud.nearNpcId === 'mara',
  );

  return (
    <>
      {/* Low-HP Pulsing Crimson Screen Vignette */}
      {isLowHp && (
        <div
          aria-hidden="true"
          className="ui-low-hp-vignette pointer-events-none fixed inset-0 z-10"
        />
      )}

      <div className="font-slavic-body pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 select-none md:p-5">
        {/* Top Row: Carved Wood Vitals Left · Boss + Locked Target Center · Parchment Minimap + Forged Controls Right */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-3">
          {/* Top-Left Vitals Cluster (Carved Dark Oak + Forged Iron) */}
          <div
            className={`slavic-wood-frame relative w-40 shrink-0 space-y-1.5 p-2.5 text-[11px] text-[#e6dcc9] sm:w-68 sm:space-y-2 sm:p-3.5 sm:text-xs ${
              damageShake || hud.heroHitFlash > 0.01 ? 'ui-damage-shake' : ''
            }`}
          >
            <CarvedCornerStuds />

            <div className="flex items-center justify-between gap-1 border-b border-[#3a2c1c] pb-1">
              <span className="font-slavic-display text-xs font-bold tracking-[0.14em] uppercase sm:text-sm">
                {hud.navShifted ? (
                  <span className="text-[#4df09a]">{t.realmNav}</span>
                ) : (
                  <span className="text-[#ea863b]">{t.realmYav}</span>
                )}
              </span>
              <span className="tabular-nums text-[#b9a68a]">
                {t.ashesLabel}: <strong className="text-[#f7edd8]">{hud.ashes}</strong>
              </span>
            </div>

            {/* Vitality (Cracked Blood Fill + Delayed Ember-White Damage Trail) */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex justify-between text-[10px] tracking-wide text-[#d4c2a4] sm:text-[11px]">
                <span>{t.hpLabel}</span>
                <span className="tabular-nums font-semibold text-[#f7edd8]">
                  {Math.round(hud.hp)} / {hud.maxHp}
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden border border-[#4f2424] bg-[#160b0b] shadow-inner sm:h-3">
                <div
                  className="absolute inset-y-0 left-0 bg-[#e89d58]/80 transition-all duration-300"
                  style={{width: `${Math.max(hpPct, trailHpPct)}%`}}
                />
                <div
                  className="slavic-blood-fill relative h-full transition-all duration-120"
                  style={{width: `${hpPct}%`}}
                />
              </div>
            </div>

            {/* Spirit / Fury (Molten Ember Fill) */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex justify-between text-[10px] tracking-wide text-[#d4c2a4] sm:text-[11px]">
                <span>{t.spiritLabel}</span>
                <span className="tabular-nums font-semibold text-[#ffe0b0]">{Math.round(hud.spirit)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden border border-[#46331b] bg-[#14100a] shadow-inner sm:h-2.5">
                <div
                  className="slavic-ember-fill h-full transition-all duration-100"
                  style={{width: `${spPct}%`}}
                />
              </div>
            </div>

            {/* Torchlight + Carved Resonance Plate */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5 sm:gap-2">
              <div className="flex-1 space-y-0.5 sm:space-y-1">
                <div className="flex justify-between text-[10px] tracking-wide text-[#d4c2a4] sm:text-[11px]">
                  <span>{t.torchLabel}</span>
                  <span className="tabular-nums">{Math.round(hud.torchlight)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden border border-[#3d2914] bg-[#141310] sm:h-2">
                  <div
                    className="slavic-torch-fill h-full transition-all duration-150"
                    style={{width: `${torchPct}%`}}
                  />
                </div>
              </div>
              <div className="slavic-iron-plate px-2 py-0.5 text-center tabular-nums sm:px-2.5 sm:py-1">
                <div className="hidden text-[9px] tracking-wider text-[#8be8b3] uppercase sm:block">
                  {t.resonanceLabel}
                </div>
                <div className="font-slavic-display text-xs font-bold text-[#4df09a] sm:text-sm">
                  {hud.resonance}/5
                </div>
              </div>
            </div>

            {hud.vesselMutation !== 'none' && (
              <div className="border-t border-[#3b3022] pt-1 text-[10px] text-[#8df5bd] sm:pt-1.5 sm:text-[11px]">
                {t.vesselLabel}: {vesselText}
              </div>
            )}
          </div>

          {/* Top-Center: Sanctum Boss Bar & Tab Locked Target Card */}
          <div className="hidden max-w-md flex-1 flex-col items-center gap-2 md:flex">
            {hud.bossActive && (
              <div className="slavic-wood-frame flex w-full flex-col items-center gap-1.5 border-[#3be88c]/70 px-4 py-2.5">
                <div className="font-slavic-display text-base font-bold tracking-[0.18em] text-[#d7fae6] uppercase">
                  {t.enemyLeshy} · Sanctum
                </div>
                <div className="h-3 w-full overflow-hidden border border-[#244a34] bg-[#0a140f]">
                  <div
                    className="h-full bg-gradient-to-r from-[#228e54] via-[#3be88c] to-[#7fffbd] transition-all duration-150"
                    style={{width: `${Math.max(0, Math.min(100, hud.bossHpRatio * 100))}%`}}
                  />
                </div>
              </div>
            )}

            {hud.lockedTarget && (
              <div
                data-testid="locked-target-card"
                className="slavic-iron-plate pointer-events-auto flex w-72 flex-col gap-1.5 border-[#c46a2c] px-3.5 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="font-slavic-display flex items-center gap-1.5 text-sm font-bold tracking-wide text-[#ffe0c6]">
                    <SkillIcon action="targetCycle" className="h-3.5 w-3.5 text-[#ea863b]" />
                    <span>{getEnemyDisplayName(t, hud.lockedTarget.archetype)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-[#bfae94]">
                    <span>{hud.lockedTarget.dist.toFixed(1)}m</span>
                    <button
                      type="button"
                      onClick={() => onTriggerAction('targetCycle')}
                      className="slavic-stone-slot px-1.5 py-0.5 text-[10px] text-[#f2e8d5] hover:border-[#e07026]"
                    >
                      {formatBindingLabel(bindings.targetCycle)}
                    </button>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden border border-[#4a2626] bg-[#160b0b]">
                  <div
                    className="slavic-blood-fill h-full transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.lockedTarget.hp / Math.max(1, hud.lockedTarget.maxHp)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Top-Right Aged Parchment Minimap + Forged Utility Controls */}
          <div className="flex min-w-0 flex-col items-end gap-2">
            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1 sm:flex-nowrap sm:gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onToggleCamera();
                }}
                className="slavic-iron-plate h-9 px-2 text-[11px] text-[#e5d9c3] hover:border-[#e07026] sm:h-10 sm:px-2.5 sm:text-xs"
              >
                <span className="sm:hidden">{cameraStyle === 'orbit' ? 'Orbit' : 'Iso'}</span>
                <span className="hidden sm:inline">
                  {cameraStyle === 'orbit' ? t.camOrbit : t.camIso} [{formatBindingLabel(bindings.cameraToggle)}]
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onToggleMute();
                }}
                aria-label={t.muteBtn}
                title={t.muteBtn}
                className={`slavic-iron-plate flex h-9 w-9 items-center justify-center text-xs transition-colors sm:h-10 sm:w-10 ${
                  muted ? 'border-[#a82024] text-[#e8989a]' : 'text-[#e5d9c3] hover:border-[#e07026]'
                }`}
              >
                {muted ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zm4.5 2.5a6.5 6.5 0 0 1 0 9M19 5a10 10 0 0 1 0 14" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onOpenSettings();
                }}
                aria-label={t.settingsBtn}
                title={t.settingsBtn}
                className="slavic-iron-plate flex h-9 w-9 items-center justify-center text-[#e5d9c3] hover:border-[#e07026] sm:h-10 sm:w-10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.74 0-1.25.4-1.51 1z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onOpenPause();
                }}
                aria-label={t.pauseTitle}
                title={t.pauseTitle}
                className="slavic-iron-plate flex h-9 items-center gap-1 px-2 text-[11px] text-[#e5d9c3] hover:border-[#e07026] sm:h-10 sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                <span>{t.quitToMenuBtn}</span>
                <span className="hidden font-mono text-[10px] text-[#a89a82] sm:inline">[{formatBindingLabel(bindings.pause)}]</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onOpenMap();
                }}
                aria-label={t.mapTitle}
                title={`${t.mapTitle} [${formatBindingLabel(bindings.mapToggle)}]`}
                className="slavic-iron-plate flex h-9 items-center gap-1 px-2 text-[11px] text-[#e5d9c3] hover:border-[#e07026] sm:h-10 sm:px-2.5 sm:text-xs"
              >
                <span>{t.mapBtn}</span>
                <span className="hidden font-mono text-[10px] text-[#a89a82] sm:inline">[{formatBindingLabel(bindings.mapToggle)}]</span>
              </button>
              <FullscreenButton
                enterLabel={t.fullscreenEnter}
                exitLabel={t.fullscreenExit}
                onSoundClick={onClickSfx}
              />
            </div>

            {/* Aged Inked Parchment Minimap + Objective Plaque (Desktop/Tablet) */}
            <div className="hidden flex-col items-end gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => {
                  onClickSfx();
                  onOpenMap();
                }}
                title={`${t.mapTitle} [${formatBindingLabel(bindings.mapToggle)}]`}
                className="slavic-parchment-tablet pointer-events-auto relative p-1.5 transition-colors hover:border-[#d9843b]"
              >
                <svg viewBox="-64 -190 124 214" className="h-32 w-24">
                  {/* Inked parchment compass ticks */}
                  <text x="-2" y="-179" fontSize="9" fontFamily="serif" fontWeight="bold" fill="#2b1e12">N</text>
                  {layout.corridors.map((c, idx) => (
                    <rect
                      key={`c_${idx}`}
                      x={c.cx - c.halfW}
                      y={c.cz - c.halfD}
                      width={c.halfW * 2}
                      height={c.halfD * 2}
                      fill="#8d7250"
                      fillOpacity="0.65"
                    />
                  ))}
                  {layout.rooms.map((r) => (
                    <rect
                      key={r.id}
                      x={r.cx - r.halfW}
                      y={r.cz - r.halfD}
                      width={r.halfW * 2}
                      height={r.halfD * 2}
                      fill="#745938"
                      fillOpacity="0.82"
                      stroke="#2a1d10"
                      strokeWidth="0.9"
                    />
                  ))}
                  {!hud.navGateOpen &&
                    layout.navGates.map((g) => (
                      <rect
                        key={g.id}
                        x={g.x - g.halfW}
                        y={g.z - g.halfD}
                        width={g.halfW * 2}
                        height={g.halfD * 2}
                        fill="#1d854b"
                      />
                    ))}
                  {layout.altars.map((a) => (
                    <circle key={a.id} cx={a.x} cy={a.z} r="1.6" fill="#187842" stroke="#1c140d" strokeWidth="0.4" />
                  ))}
                  {hud.questMarkers.map((qm, idx) => (
                    <circle
                      key={`mq_${idx}`}
                      cx={qm.x}
                      cy={qm.z}
                      r="1.35"
                      fill={
                        qm.kind === 'totem'
                          ? '#6b21a8'
                          : qm.kind === 'spirit'
                            ? '#0f766e'
                            : qm.kind === 'lore'
                              ? '#1d4ed8'
                              : '#b45309'
                      }
                    />
                  ))}
                  {hud.enemiesPos.map((e, idx) => (
                    <circle
                      key={idx}
                      cx={e.x}
                      cy={e.z}
                      r={e.isLocked ? 1.7 : e.isBoss ? 2.3 : 1.2}
                      fill={e.isLocked ? '#ea580c' : e.isBoss ? '#065f46' : '#991b1b'}
                    />
                  ))}
                  <circle cx={hud.heroX} cy={hud.heroZ} r="2.1" fill="#d95314" stroke="#1b1108" strokeWidth="0.7" />
                </svg>
              </button>
              <div className="slavic-iron-plate max-w-56 px-2.5 py-1.5 text-end text-[11px] text-[#e5d9c3]">
                {objectiveText}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Target Lock Card (upper strip below top row, never covering hero) */}
        {hud.lockedTarget && (
          <div className="slavic-iron-plate mt-1.5 flex w-52 flex-col gap-1 self-center border-[#e07026]/80 px-2.5 py-1 md:hidden">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#ffdcc2]">
              <span>{getEnemyDisplayName(t, hud.lockedTarget.archetype)}</span>
              <span className="font-mono text-[10px] text-[#b5a58d]">{hud.lockedTarget.dist.toFixed(1)}m</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-[#1b0e0e]">
              <div
                className="slavic-blood-fill h-full"
                style={{
                  width: `${Math.max(0, Math.min(100, (hud.lockedTarget.hp / Math.max(1, hud.lockedTarget.maxHp)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Diegetic World Whispers, Spirit Bargain RPG Choice & Contextual Prompts */}
        <div className="my-auto flex flex-col items-center gap-2.5">
          {hud.whisperKey && hud.whisperTimer > 0 && (
            <div
              data-testid="quest-whisper-banner"
              className="slavic-wood-frame font-slavic-display max-w-lg border-[#4ea673]/80 px-5 py-2.5 text-center text-sm font-semibold tracking-wide text-[#d4fae5] sm:text-base"
            >
              {(t as unknown as Record<string, string>)[hud.whisperKey] ?? hud.whisperKey}
            </div>
          )}

          {hud.maraDialogueTimer > 0 && (
            <div className="slavic-wood-frame max-w-lg px-5 py-3 text-center text-sm text-[#f2e8d5]">
              {hud.maraDialogueIndex === 1 ? t.maraLine1 : t.maraLine2}
            </div>
          )}

          {hud.nearSpirit && (
            <div
              data-testid="spirit-bargain-card"
              className="slavic-wood-frame pointer-events-auto max-w-md space-y-2.5 px-5 py-3.5 text-center"
            >
              <div className="font-slavic-display text-lg font-bold tracking-wider text-[#9ff7c8] uppercase">
                {t.questSpiritTitle}
              </div>
              <p className="text-xs leading-relaxed text-[#e0d3bc]">{t.questSpiritBody}</p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={hud.torchlight < 35}
                  onClick={() => {
                    onClickSfx();
                    onSpiritBargain('offerLight');
                  }}
                  className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    hud.torchlight >= 35
                      ? 'border-[#3be88c] bg-[#0e261a] text-[#c7fae0] hover:bg-[#173c29]'
                      : 'cursor-not-allowed border-[#3c3830] bg-[#161816] text-[#6d675c]'
                  }`}
                >
                  {t.questSpiritOfferBtn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClickSfx();
                    onSpiritBargain('shatter');
                  }}
                  className="border border-[#a82024] bg-[#2c1112] px-3 py-1.5 text-xs font-semibold text-[#ffd2d2] transition-colors hover:bg-[#42181a]"
                >
                  {t.questSpiritRefuseBtn}
                </button>
              </div>
            </div>
          )}

          {hud.wardTimer > 0.05 && (
            <div
              data-testid="svarog-ward-badge"
              className="slavic-iron-plate border-[#ffb84d]/90 px-3.5 py-1 text-xs font-bold tracking-wider text-[#ffe8ba] uppercase"
            >
              {t.wardActive} · {hud.wardTimer.toFixed(1)}s
            </div>
          )}

          {hud.counterTimer > 0.05 && (
            <div
              data-testid="counter-ready-badge"
              className="slavic-iron-plate border-[#3be88c]/90 px-3.5 py-1 text-xs font-bold tracking-wider text-[#b7fae0] uppercase"
            >
              {t.counterReady} · {hud.counterTimer.toFixed(1)}s
            </div>
          )}

          {hasInteractPrompt && (
            <button
              type="button"
              onClick={() => onTriggerAction('interact')}
              className="slavic-wood-frame pointer-events-auto border-[#4cc987] px-4 py-2 text-xs font-semibold tracking-wider text-[#d1fce6] uppercase"
            >
              [{formatBindingLabel(bindings.interact)}]{' '}
              {hud.nearAltarId
                ? t.promptAltar
                : hud.nearMirror
                  ? t.promptMirror
                  : hud.nearLoreId
                    ? t.promptLoreStone
                    : t.promptTalkMara}
            </button>
          )}
        </div>

        {/* Bottom Row: Carved Stone/Oak Action Bar (Desktop) OR Mobile Touch Joystick + Icon Combat Pad */}
        {isTouchViewport ? (
          <div className="flex items-end justify-between gap-2 pb-1">
            {/* Left Thumb Virtual Joystick */}
            <div
              ref={joyRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                joyActiveId.current = e.pointerId;
                updateJoystickFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (joyActiveId.current === e.pointerId) {
                  updateJoystickFromPointer(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                if (joyActiveId.current === e.pointerId) {
                  joyActiveId.current = null;
                  setJoyKnob({x: 0, y: 0});
                  onTouchJoystick(0, 0);
                }
              }}
              onPointerCancel={() => {
                joyActiveId.current = null;
                setJoyKnob({x: 0, y: 0});
                onTouchJoystick(0, 0);
              }}
              className="pointer-events-auto relative flex h-24 w-24 shrink-0 touch-none items-center justify-center rounded-full border-2 border-[#7b6240] bg-[#16120d]/90 shadow-lg"
            >
              <div
                className="h-10 w-10 rounded-full border border-[#e07026] bg-[#78300e] shadow-md"
                style={{transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`}}
              />
            </div>

            {/* Right Thumb Tactile SVG Icon Combat Pad (5x2, compact for 390px screens) */}
            <div className="pointer-events-auto grid grid-cols-5 gap-1">
              <button
                type="button"
                aria-label={t.skillShieldWave}
                onClick={() => onTriggerAction('skill1')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#705838] bg-[#191d1b] text-[#e6dcc9]"
              >
                <SkillIcon action="skill1" className="h-4 w-4" />
                {hud.cooldowns.shieldWave > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.shieldWave.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillFlameSurge}
                onClick={() => onTriggerAction('skill2')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e07026]/80 bg-[#361e10] text-[#ffdcc2]"
              >
                <SkillIcon action="skill2" className="h-4 w-4" />
                {hud.cooldowns.flameSurge > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.flameSurge.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillNavCleave}
                onClick={() => onTriggerAction('skill3')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#3be88c]/80 bg-[#0d2419] text-[#9ff7c8]"
              >
                <SkillIcon action="skill3" className="h-4 w-4" />
                {hud.cooldowns.navCleave > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.navCleave.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillWhirlwind}
                onClick={() => onTriggerAction('skill5')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#c99b4a] bg-[#241b10] text-[#ffe4b5]"
              >
                <SkillIcon action="skill5" className="h-4 w-4" />
                {hud.cooldowns.whirlwind > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.whirlwind.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillSvarogWard}
                onClick={() => onTriggerAction('skill6')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#ffb84d] bg-[#2b1f0b] text-[#ffebc2]"
              >
                <SkillIcon action="skill6" className="h-4 w-4" />
                {hud.cooldowns.svarogWard > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.svarogWard.toFixed(0)}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label={t.actionTargetCycle}
                onClick={() => onTriggerAction('targetCycle')}
                className={`flex h-10 w-10 items-center justify-center rounded-full border bg-[#141816] ${
                  hud.lockedTarget ? 'border-[#e07026] text-[#ffb980]' : 'border-[#5c4b34] text-[#cbbba0]'
                }`}
              >
                <SkillIcon action="targetCycle" className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t.actionPotion}
                onClick={() => onTriggerAction('potion')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#a82024] bg-[#2c1112] text-[#ffcfd0]"
              >
                <SkillIcon action="potion" className="h-4 w-4" />
                <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#a82024] bg-[#160a0a] font-mono text-[8px] font-bold text-[#fff3e0]">
                  {hud.potions}
                </span>
                {hud.cooldowns.potion > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.potion.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.actionEvade}
                onClick={() => onTriggerAction('evade')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#b5a58d] bg-[#1c2220] text-[#fff5e8]"
              >
                <SkillIcon action="evade" className="h-4 w-4" />
                {hud.cooldowns.dash > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.dash.toFixed(1)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillDagger}
                onClick={() => onTriggerAction('daggerThrow')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#c99b4a] bg-[#241e12] text-[#ffebc2]"
              >
                <SkillIcon action="daggerThrow" className="h-4 w-4" />
                {hud.cooldowns.dagger > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.dagger.toFixed(1)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t.skillStrike}
                onClick={() => onTriggerAction('primary')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#e07026] bg-[#78300e] text-[#fff5e8]"
              >
                <SkillIcon action="primary" className="h-4 w-4" />
                {hud.cooldowns.primary > 0.05 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80 font-mono text-[10px] font-bold">
                    {hud.cooldowns.primary.toFixed(1)}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              data-testid="desktop-action-bar"
              className="slavic-wood-frame pointer-events-auto relative flex items-center gap-1.5 px-3 py-2"
            >
              <CarvedCornerStuds />
              {desktopSlots.map(({act, label, cd, isNav, count}) => {
                const isLockedHighlight = act === 'targetCycle' && Boolean(hud.lockedTarget);
                const isInWindup = hud.actionLock !== 'none' && (act === 'primary' || act === 'daggerThrow');
                const isCounterGlow = act === 'primary' && hud.counterTimer > 0.05;
                return (
                  <button
                    key={act}
                    type="button"
                    data-action={act}
                    onClick={() => onTriggerAction(act)}
                    className={`slavic-stone-slot relative flex h-16 min-w-[4.15rem] flex-col items-center justify-center gap-0.5 px-1.5 transition-colors ${
                      isCounterGlow
                        ? 'border-[#3be88c] bg-[#102c1d] text-[#c7fae0]'
                        : isLockedHighlight
                          ? 'border-[#e07026] bg-[#301c0e] text-[#ffdcc2]'
                          : act === 'skill6' && hud.wardTimer > 0.05
                            ? 'border-[#ffb84d] bg-[#2e1e09] text-[#ffe9be]'
                            : isNav
                              ? 'border-[#3be88c]/55 text-[#c7fae0] hover:border-[#3be88c]'
                              : isInWindup
                                ? 'border-[#ffb16b] bg-[#3b2010] text-[#fff3e0]'
                                : 'text-[#f2e8d5] hover:border-[#e07026]'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <SkillIcon
                        action={act}
                        className={`h-5 w-5 ${
                          isNav || isCounterGlow
                            ? 'text-[#3be88c]'
                            : act === 'potion'
                              ? 'text-[#e86b6e]'
                              : act === 'primary' || act === 'daggerThrow' || act === 'skill2'
                                ? 'text-[#e89143]'
                                : 'text-[#e6dcc9]'
                        }`}
                      />
                      {typeof count === 'number' && (
                        <span className="font-mono text-[11px] font-bold tabular-nums text-[#ffd2d2]">
                          ×{count}
                        </span>
                      )}
                    </div>
                    <span className="max-w-[4.6rem] truncate text-[10px] font-semibold tracking-tight">
                      {label}
                    </span>
                    <span className="font-mono text-[9px] text-[#a8987c]">
                      {formatBindingLabel(bindings[act])}
                    </span>
                    {cd > 0.05 && (
                      <span className="absolute inset-0 z-10 flex items-center justify-center bg-[#090d0b]/90 font-mono text-sm font-bold tabular-nums text-[#ffe6c4]">
                        {cd.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
