import type {LocaleStrings} from '../data/locales';
import type {RunSummary} from '../systems/gameSim';
import {FullscreenButton} from './FullscreenButton';

interface PauseModalProps {
  t: LocaleStrings;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
  onClickSfx: () => void;
}

export function PauseModal({
  t,
  onResume,
  onOpenSettings,
  onRestart,
  onQuitToMenu,
  onClickSfx,
}: PauseModalProps) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.pauseTitle}
        className="w-full max-w-sm border border-[#8b6a3e] bg-[#121614] p-6 text-[#e6dcc9] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
      >
        <div className="mb-5 flex items-center justify-between border-b border-[#342e25] pb-3">
          <h2
            className="text-2xl font-semibold tracking-wide text-[#f2e8d5]"
            style={{fontFamily: '"Cormorant Garamond", Georgia, serif'}}
          >
            {t.pauseTitle}
          </h2>
          <FullscreenButton
            enterLabel={t.fullscreenEnter}
            exitLabel={t.fullscreenExit}
            onSoundClick={onClickSfx}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onResume();
            }}
            className="border border-[#e07026] bg-[#78300e] px-4 py-3 text-xs font-semibold tracking-wider text-[#fff5e8] uppercase transition-colors hover:bg-[#9c4014]"
          >
            {t.resumeBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onOpenSettings();
            }}
            className="border border-[#5c4b34] bg-[#181d1a] px-4 py-3 text-xs font-medium tracking-wider text-[#dcd1bc] uppercase transition-colors hover:border-[#b5a58d]"
          >
            {t.settingsBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onRestart();
            }}
            className="border border-[#5c4b34] bg-[#181d1a] px-4 py-3 text-xs font-medium tracking-wider text-[#dcd1bc] uppercase transition-colors hover:border-[#b5a58d]"
          >
            {t.restartBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onQuitToMenu();
            }}
            className="border border-[#4a2626] bg-[#241313] px-4 py-3 text-xs font-medium tracking-wider text-[#e8b8b8] uppercase transition-colors hover:border-[#a82024]"
          >
            {t.quitToMenuBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OutcomeModalProps {
  t: LocaleStrings;
  summary: RunSummary;
  onPlayAgain: () => void;
  onQuitToMenu: () => void;
  onClickSfx: () => void;
}

export function OutcomeModal({
  t,
  summary,
  onPlayAgain,
  onQuitToMenu,
  onClickSfx,
}: OutcomeModalProps) {
  const mins = Math.floor(summary.elapsedSec / 60);
  const secs = Math.floor(summary.elapsedSec % 60);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/78 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={summary.victory ? t.victoryTitle : t.defeatTitle}
        className={`w-full max-w-md border bg-[#121614] p-6 text-[#e6dcc9] shadow-[0_24px_64px_rgba(0,0,0,0.9)] ${
          summary.victory ? 'border-[#3be88c]/80' : 'border-[#a82024]/90'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#342e25] pb-3">
          <h2
            className={`text-3xl font-semibold ${
              summary.victory ? 'text-[#8df5bd]' : 'text-[#f29b9d]'
            }`}
            style={{fontFamily: '"Cormorant Garamond", Georgia, serif'}}
          >
            {summary.victory ? t.victoryTitle : t.defeatTitle}
          </h2>
          <FullscreenButton
            enterLabel={t.fullscreenEnter}
            exitLabel={t.fullscreenExit}
            onSoundClick={onClickSfx}
          />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 tabular-nums">
          <div className="border border-[#342e25] bg-[#0e1210] p-3">
            <div className="text-[11px] text-[#9c917d] uppercase">{t.statTime}</div>
            <div className="text-xl font-semibold text-[#f2e8d5]">{timeStr}</div>
          </div>
          <div className="border border-[#342e25] bg-[#0e1210] p-3">
            <div className="text-[11px] text-[#9c917d] uppercase">{t.statKills}</div>
            <div className="text-xl font-semibold text-[#f2e8d5]">{summary.kills}</div>
          </div>
          <div className="border border-[#342e25] bg-[#0e1210] p-3">
            <div className="text-[11px] text-[#9c917d] uppercase">{t.statShifts}</div>
            <div className="text-xl font-semibold text-[#3be88c]">{summary.navShifts}</div>
          </div>
          <div className="border border-[#342e25] bg-[#0e1210] p-3">
            <div className="text-[11px] text-[#9c917d] uppercase">{t.ashesLabel}</div>
            <div className="text-xl font-semibold text-[#e07026]">{summary.ashes}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              onClickSfx();
              onPlayAgain();
            }}
            className="flex-1 border border-[#e07026] bg-[#78300e] px-4 py-3 text-xs font-semibold tracking-wider text-[#fff5e8] uppercase hover:bg-[#9c4014]"
          >
            {t.playAgainBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              onClickSfx();
              onQuitToMenu();
            }}
            className="border border-[#5c4b34] bg-[#181d1a] px-4 py-3 text-xs font-medium tracking-wider text-[#dcd1bc] uppercase hover:border-[#b5a58d]"
          >
            {t.quitToMenuBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
