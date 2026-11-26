import type {DifficultyId} from '../data/balance';
import {LANGUAGES, type LanguageId, type LocaleStrings} from '../data/locales';
import {FullscreenButton} from './FullscreenButton';

interface MenuHudProps {
  t: LocaleStrings;
  language: LanguageId;
  difficulty: DifficultyId;
  fadingOut: boolean;
  onStart: () => void;
  onOpenSettings: () => void;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onSelectLanguage: (lang: LanguageId) => void;
  onHeroSalute: () => void;
  onHoverSfx: () => void;
  onClickSfx: () => void;
}

const DIFF_IDS: DifficultyId[] = ['wanderer', 'vityaz', 'nightmare', 'one_life'];

export function MenuHud({
  t,
  language,
  difficulty,
  fadingOut,
  onStart,
  onOpenSettings,
  onSelectDifficulty,
  onSelectLanguage,
  onHeroSalute,
  onHoverSfx,
  onClickSfx,
}: MenuHudProps) {
  const diffLabel = (id: DifficultyId) => {
    if (id === 'wanderer') return t.diffWanderer;
    if (id === 'vityaz') return t.diffVityaz;
    if (id === 'nightmare') return t.diffNightmare;
    return t.diffOneLife;
  };

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 transition-opacity duration-700 md:p-10 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'linear-gradient(90deg, rgba(10,14,12,0.88) 0%, rgba(10,14,12,0.52) 42%, rgba(10,14,12,0.06) 76%, rgba(10,14,12,0.35) 100%)',
      }}
    >
      {/* Top Row: Quick Language Selector + Fullscreen */}
      <div className="flex items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <label htmlFor="menu-lang-select" className="sr-only">
            {t.languageLabel}
          </label>
          <select
            id="menu-lang-select"
            value={language}
            onMouseEnter={onHoverSfx}
            onChange={(e) => {
              onClickSfx();
              onSelectLanguage(e.target.value as LanguageId);
            }}
            className="h-10 border border-[#705838]/80 bg-[#101412]/90 px-3 text-sm text-[#e6dcc9] outline-none hover:border-[#e07026] focus-visible:outline-2 focus-visible:outline-[#e07026]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} className="bg-[#121614] text-[#e6dcc9]">
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onHeroSalute();
            }}
            onMouseEnter={onHoverSfx}
            className="pointer-events-auto hidden border border-[#705838]/65 bg-[#101412]/80 px-3 py-2 text-xs text-[#cbbba0] transition-colors hover:border-[#e07026] hover:text-[#fff3e0] sm:inline-flex"
          >
            {t.clickHeroHint}
          </button>
          <FullscreenButton
            enterLabel={t.fullscreenEnter}
            exitLabel={t.fullscreenExit}
            onSoundClick={onClickSfx}
          />
        </div>
      </div>

      {/* Main Asymmetric Left Panel */}
      <div className="my-auto max-w-md space-y-6">
        <div className="space-y-3">
          {/* Bespoke Inline Slavic Axe & Sun Crest SVG */}
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 64 64"
              aria-hidden="true"
              className="h-12 w-12 shrink-0 text-[#e07026]"
              fill="none"
            >
              <circle cx="32" cy="32" r="28" stroke="#8b6a3e" strokeWidth="2.2" />
              <circle cx="32" cy="32" r="20" stroke="#3be88c" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="4 3" />
              <path
                d="M32 10 L35 28 L49 19 L39 33 L52 44 L34 38 L32 55 L30 38 L12 44 L25 33 L15 19 L29 28 Z"
                fill="currentColor"
                fillOpacity="0.88"
              />
            </svg>
            <div>
              <h1
                className="font-slavic-display text-4xl font-bold tracking-wide text-[#f4ead4] sm:text-5xl"
                style={{textShadow: '0 3px 16px rgba(0,0,0,0.92)'}}
              >
                {t.gameTitle}
              </h1>
              <p className="font-slavic-body text-xs tracking-[0.22em] text-[#cbb898] uppercase">
                {t.gameSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="pointer-events-auto space-y-2">
          <div className="text-xs tracking-widest text-[#b5a58d] uppercase">
            {t.difficultyLabel}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFF_IDS.map((id) => {
              const active = difficulty === id;
              const isOneLife = id === 'one_life';
              return (
                <button
                  key={id}
                  type="button"
                  onMouseEnter={onHoverSfx}
                  onClick={() => {
                    onClickSfx();
                    onSelectDifficulty(id);
                  }}
                  className={`whitespace-nowrap border px-2.5 py-2 text-xs font-medium transition-all ${
                    active
                      ? isOneLife
                        ? 'border-[#a82024] bg-[#4a1214]/90 text-[#ffe6e6] shadow-[0_0_16px_rgba(168,32,36,0.45)]'
                        : 'border-[#e07026] bg-[#362012]/90 text-[#fff3e0] shadow-[0_0_14px_rgba(224,112,38,0.35)]'
                      : 'border-[#4a4338] bg-[#121614]/85 text-[#a89d8a] hover:border-[#8b6a3e] hover:text-[#e6dcc9]'
                  }`}
                >
                  {diffLabel(id)}
                </button>
              );
            })}
          </div>
          {difficulty === 'one_life' && (
            <p className="text-xs text-[#e26367]">{t.diffOneLifeWarn}</p>
          )}
        </div>

        {/* Primary Menu Actions (<= 3 clear actions) */}
        <div className="pointer-events-auto flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            data-start="true"
            onMouseEnter={onHoverSfx}
            onClick={() => {
              onClickSfx();
              onStart();
            }}
            className="slavic-wood-frame font-slavic-display flex-1 cursor-pointer border-[#e07026] bg-gradient-to-b from-[#8f380f] to-[#572108] px-6 py-3.5 text-center text-base font-bold tracking-[0.14em] text-[#fff5e8] uppercase shadow-[0_0_24px_rgba(224,112,38,0.35)] transition-all hover:from-[#a84414] hover:to-[#6a280a] hover:shadow-[0_0_30px_rgba(224,112,38,0.6)] active:scale-[0.99]"
          >
            {t.playBtn}
          </button>

          <button
            type="button"
            onMouseEnter={onHoverSfx}
            onClick={() => {
              onClickSfx();
              onOpenSettings();
            }}
            className="slavic-iron-plate cursor-pointer px-5 py-3.5 text-sm font-medium tracking-wider text-[#dcd1bc] uppercase transition-all hover:border-[#b5a58d] hover:text-[#fff5e8]"
          >
            {t.settingsBtn}
          </button>
        </div>
      </div>

      {/* Bottom Safe Margin Control Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9c917d]">
        <span>{t.menuHint}</span>
      </div>
    </div>
  );
}
