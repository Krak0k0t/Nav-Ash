import {useEffect, useState} from 'react';
import {
  formatBindingLabel,
  mouseButtonToCode,
  type BindingCode,
  type GameAction,
  type GameSettings,
} from '../core/settings';
import type {DifficultyId, GraphicsQualityId} from '../data/balance';
import {LANGUAGES, type LanguageId, type LocaleStrings} from '../data/locales';
import {FullscreenButton} from './FullscreenButton';

interface SettingsModalProps {
  t: LocaleStrings;
  settings: GameSettings;
  inGame: boolean;
  onUpdateSettings: (next: Partial<GameSettings>) => void;
  onRebind: (action: GameAction, code: BindingCode) => void;
  onResetBindings: () => void;
  onClose: () => void;
  onHoverSfx: () => void;
  onClickSfx: () => void;
}

const ACTION_ORDER: GameAction[] = [
  'moveFwd',
  'moveBack',
  'strafeLeft',
  'strafeRight',
  'primary',
  'daggerThrow',
  'targetCycle',
  'evade',
  'skill1',
  'skill2',
  'skill3',
  'skill4',
  'skill5',
  'skill6',
  'interact',
  'potion',
  'cameraToggle',
  'mapToggle',
  'pause',
];

const GRAPHICS_TIERS: GraphicsQualityId[] = ['low', 'medium', 'high', 'ultra'];
const DIFF_IDS: DifficultyId[] = ['wanderer', 'vityaz', 'nightmare', 'one_life'];

export function SettingsModal({
  t,
  settings,
  inGame,
  onUpdateSettings,
  onRebind,
  onResetBindings,
  onClose,
  onHoverSfx,
  onClickSfx,
}: SettingsModalProps) {
  const [tab, setTab] = useState<'general' | 'graphics' | 'controls'>('general');
  const [listeningAction, setListeningAction] = useState<GameAction | null>(null);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') {
        onRebind(listeningAction, e.code);
      }
      setListeningAction(null);
    };

    const handleMouse = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRebind(listeningAction, mouseButtonToCode(e.button));
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('mousedown', handleMouse, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('mousedown', handleMouse, true);
    };
  }, [listeningAction, onRebind]);

  const actionLabel = (a: GameAction): string => {
    const map: Record<GameAction, string> = {
      moveFwd: t.actionMoveFwd,
      moveBack: t.actionMoveBack,
      strafeLeft: t.actionStrafeL,
      strafeRight: t.actionStrafeR,
      primary: t.actionPrimary,
      daggerThrow: t.actionDaggerThrow,
      targetCycle: t.actionTargetCycle,
      evade: t.actionEvade,
      skill1: t.actionSkill1,
      skill2: t.actionSkill2,
      skill3: t.actionSkill3,
      skill4: t.actionSkill4,
      skill5: t.actionSkill5,
      skill6: t.actionSkill6,
      interact: t.actionInteract,
      potion: t.actionPotion,
      cameraToggle: t.actionCameraToggle,
      mapToggle: t.actionMapToggle,
      pause: t.actionPause,
    };
    return map[a];
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsBtn}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col border border-[#8b6a3e] bg-[#121614] text-[#e6dcc9] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a342a] px-5 py-4">
          <h2
            className="text-2xl font-semibold tracking-wide text-[#f2e8d5]"
            style={{fontFamily: '"Cormorant Garamond", Georgia, serif'}}
          >
            {t.settingsBtn}
          </h2>
          <div className="flex items-center gap-2">
            <FullscreenButton
              enterLabel={t.fullscreenEnter}
              exitLabel={t.fullscreenExit}
              onSoundClick={onClickSfx}
            />
            <button
              type="button"
              onClick={() => {
                onClickSfx();
                onClose();
              }}
              className="border border-[#5c4b34] bg-[#1a201c] px-3 py-1.5 text-xs tracking-wider text-[#dcd1bc] uppercase hover:border-[#e07026]"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#3a342a] bg-[#0e1210] px-5">
          {(
            [
              ['general', t.generalTab],
              ['graphics', t.graphicsTab],
              ['controls', t.controlsTab],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onMouseEnter={onHoverSfx}
              onClick={() => {
                onClickSfx();
                setTab(id);
              }}
              className={`border-b-2 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
                tab === id
                  ? 'border-[#e07026] text-[#fff3e0]'
                  : 'border-transparent text-[#8c8270] hover:text-[#dcd1bc]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {tab === 'general' && (
            <>
              {/* 16 Languages */}
              <div className="space-y-2">
                <div className="text-xs tracking-widest text-[#b5a58d] uppercase">
                  {t.languageLabel}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onMouseEnter={onHoverSfx}
                      onClick={() => {
                        onClickSfx();
                        onUpdateSettings({language: lang.id as LanguageId});
                      }}
                      className={`truncate border px-2.5 py-2 text-xs transition-colors ${
                        settings.language === lang.id
                          ? 'border-[#e07026] bg-[#362012] text-[#fff5e8]'
                          : 'border-[#38332b] bg-[#171c19] text-[#b5a58d] hover:border-[#8b6a3e]'
                      }`}
                    >
                      {lang.nativeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <div className="text-xs tracking-widest text-[#b5a58d] uppercase">
                  {t.difficultyLabel}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DIFF_IDS.map((d) => {
                    const label =
                      d === 'wanderer'
                        ? t.diffWanderer
                        : d === 'vityaz'
                          ? t.diffVityaz
                          : d === 'nightmare'
                            ? t.diffNightmare
                            : t.diffOneLife;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={inGame}
                        onClick={() => {
                          onClickSfx();
                          onUpdateSettings({difficulty: d});
                        }}
                        className={`border px-3 py-2 text-xs transition-colors ${
                          settings.difficulty === d
                            ? 'border-[#e07026] bg-[#362012] text-[#fff5e8]'
                            : 'border-[#38332b] bg-[#171c19] text-[#b5a58d] hover:border-[#8b6a3e]'
                        } ${inGame ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Sliders */}
              <div className="space-y-3 border-t border-[#2d2922] pt-4">
                <div className="text-xs tracking-widest text-[#b5a58d] uppercase">
                  {t.audioLabel}
                </div>
                {(
                  [
                    ['masterVolume', t.masterVol, settings.masterVolume],
                    ['musicVolume', t.musicVol, settings.musicVolume],
                    ['sfxVolume', t.sfxVol, settings.sfxVolume],
                  ] as const
                ).map(([key, label, val]) => (
                  <label key={key} className="flex items-center justify-between gap-4 text-xs">
                    <span className="w-28 text-[#cbbba0]">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={val}
                      onChange={(e) =>
                        onUpdateSettings({[key]: Number(e.target.value)})
                      }
                      className="flex-1 accent-[#e07026]"
                    />
                    <span className="w-10 text-end tabular-nums text-[#dcd1bc]">
                      {Math.round(val * 100)}%
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {tab === 'graphics' && (
            <div className="space-y-3">
              <div className="text-xs tracking-widest text-[#b5a58d] uppercase">
                {t.graphicsLabel}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {GRAPHICS_TIERS.map((g) => {
                  const label =
                    g === 'low'
                      ? t.gfxLow
                      : g === 'medium'
                        ? t.gfxMedium
                        : g === 'high'
                          ? t.gfxHigh
                          : t.gfxUltra;
                  return (
                    <button
                      key={g}
                      type="button"
                      onMouseEnter={onHoverSfx}
                      onClick={() => {
                        onClickSfx();
                        onUpdateSettings({graphics: g});
                      }}
                      className={`border px-3 py-3 text-xs font-semibold uppercase transition-colors ${
                        settings.graphics === g
                          ? 'border-[#e07026] bg-[#362012] text-[#fff5e8]'
                          : 'border-[#38332b] bg-[#171c19] text-[#b5a58d] hover:border-[#8b6a3e]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-widest text-[#b5a58d] uppercase">
                  {t.controlsTab}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClickSfx();
                    onResetBindings();
                  }}
                  className="border border-[#5c4b34] bg-[#181d1a] px-3 py-1.5 text-xs text-[#dcd1bc] hover:border-[#e07026]"
                >
                  {t.resetBindings}
                </button>
              </div>
              <div className="divide-y divide-[#29241d] border border-[#38332b] bg-[#0e1210]">
                {ACTION_ORDER.map((act) => {
                  const waiting = listeningAction === act;
                  return (
                    <div
                      key={act}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    >
                      <span className="text-[#dcd1bc]">{actionLabel(act)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClickSfx();
                          setListeningAction(act);
                        }}
                        className={`min-w-28 border px-3 py-1.5 font-mono text-xs transition-colors ${
                          waiting
                            ? 'border-[#3be88c] bg-[#0c2d1c] text-[#9ff7c8]'
                            : 'border-[#5c4b34] bg-[#181d1a] text-[#f2e8d5] hover:border-[#e07026]'
                        }`}
                      >
                        {waiting ? t.pressAnyKey : formatBindingLabel(settings.bindings[act])}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
