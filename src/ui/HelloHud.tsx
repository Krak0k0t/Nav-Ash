import type {FC} from 'react';

export interface HelloHudProps {
  seed: number;
  cameraMode: 'iso' | 'cinematic';
  navShifted: boolean;
  nearAltar: boolean;
  heroX: number;
  heroZ: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleCamera: () => void;
  onToggleNav: () => void;
}

export const HelloHud: FC<HelloHudProps> = ({
  seed,
  cameraMode,
  navShifted,
  nearAltar,
  heroX,
  heroZ,
  collapsed,
  onToggleCollapse,
  onToggleCamera,
  onToggleNav,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 select-none">
      {/* Top-left minimal carved nameplate (leaves 100% center viewport unobstructed) */}
      <div className="flex items-start justify-between">
        <div className="pointer-events-auto border border-[#4a4235] bg-[#131815]/90 px-4 py-2.5 shadow-lg">
          <h1
            className="text-lg font-semibold tracking-wider text-[#b5a58d] uppercase"
            style={{fontFamily: "Georgia, 'Times New Roman', serif"}}
          >
            Навь и Пепел
          </h1>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-[#9c907b]">
            <span>Среда движка · Seed {seed}</span>
            <span className={navShifted ? 'text-[#3be88c]' : 'text-[#e07026]'}>
              {navShifted ? 'Сдвиг: Тёмная Навь' : 'Явь: Огонь факела'}
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible bottom control dock */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto border border-b-0 border-[#4a4235] bg-[#131815]/95 px-3 py-1 text-[11px] tracking-widest text-[#b5a58d] uppercase hover:text-[#e07026]"
        >
          {collapsed ? '▲ Показать панель (H)' : '▼ Скрыть панель (H)'}
        </button>

        {!collapsed && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 border border-[#4a4235] bg-[#131815]/95 px-4 py-2.5 text-xs text-[#b5a58d] shadow-2xl">
            <div className="flex items-center gap-2 border-r border-[#2e342f] pr-3">
              <span className="text-[#8e8270]">Ходьба:</span>
              <kbd className="border border-[#4a4235] bg-[#1b221e] px-1.5 py-0.5 font-mono text-[11px] text-[#e0d6c5]">
                WASD / Стрелки
              </kbd>
              <span className="text-[#8e8270]">Рывок:</span>
              <kbd className="border border-[#4a4235] bg-[#1b221e] px-1.5 py-0.5 font-mono text-[11px] text-[#e0d6c5]">
                Space
              </kbd>
            </div>

            <button
              type="button"
              onClick={onToggleCamera}
              className="border border-[#5a4e3e] bg-[#1c2320] px-3 py-1.5 text-xs font-medium text-[#e0d6c5] hover:border-[#e07026]"
            >
              Камера (C): {cameraMode === 'iso' ? 'Изометрия' : 'Крупный план'}
            </button>

            <button
              type="button"
              onClick={onToggleNav}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
                navShifted
                  ? 'border-[#3be88c] bg-[#10291f] text-[#3be88c]'
                  : nearAltar
                    ? 'border-[#3be88c]/80 bg-[#17241e] text-[#b5f5d1]'
                    : 'border-[#5a4e3e] bg-[#1c2320] text-[#b5a58d] hover:border-[#3be88c]'
              }`}
            >
              {navShifted ? 'Вернуть Явь (E)' : 'Алтарь Нави (E)'}
            </button>

            <div className="border-l border-[#2e342f] pl-3 font-mono text-[11px] text-[#8e8270]">
              X {heroX.toFixed(1)} · Z {heroZ.toFixed(1)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
