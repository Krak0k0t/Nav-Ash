import type {FC} from 'react';
import type {LookdevPreset} from '../view/lookdevScene';

export interface LookdevHudProps {
  preset: LookdevPreset;
  navShifted: boolean;
  collapsed: boolean;
  onSelectPreset: (preset: LookdevPreset) => void;
  onToggleNav: () => void;
  onToggleCollapse: () => void;
}

const PRESET_LABELS: {id: LookdevPreset; key: string; label: string}[] = [
  {id: 'iso', key: '1', label: 'Изометрия'},
  {id: 'hero', key: '2', label: 'Витязь'},
  {id: 'altar', key: '3', label: 'Алтарь и Упырь'},
  {id: 'wide', key: '4', label: 'Общий план'},
];

const SkillRuneAxe: FC = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5 stroke-[#e07026]" fill="none" strokeWidth="1.8">
    <path d="M8 25L23 10" />
    <path d="M17 7c4 0 7 3 7 8-3-1-5-1-8 1l1-9z" fill="#e07026" fillOpacity="0.22" />
  </svg>
);

const SkillRuneShield: FC = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5 stroke-[#d8c8ad]" fill="none" strokeWidth="1.8">
    <path d="M16 5l9 4v7c0 6-4 9-9 11-5-2-9-5-9-11V9l9-4z" fill="#b5a58d" fillOpacity="0.16" />
    <circle cx="16" cy="15" r="3" />
  </svg>
);

const SkillRuneTorch: FC = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5 stroke-[#e07026]" fill="none" strokeWidth="1.8">
    <path d="M16 26v-9" />
    <path d="M12 17h8" />
    <path d="M16 5c3 3 4 6 4 8a4 4 0 0 1-8 0c0-2 1-5 4-8z" fill="#e07026" fillOpacity="0.3" />
  </svg>
);

const SkillRuneNav: FC = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5 stroke-[#3be88c]" fill="none" strokeWidth="1.8">
    <polygon points="16,5 25,16 16,27 7,16" fill="#3be88c" fillOpacity="0.18" />
    <path d="M16 9v14M11 16h10" />
  </svg>
);

export const LookdevHud: FC<LookdevHudProps> = ({
  preset,
  navShifted,
  collapsed,
  onSelectPreset,
  onToggleNav,
  onToggleCollapse,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3.5 select-none">
      {/* Top row: Location plaque (left) + Look-Dev angle controls (right) */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto border border-[#4b4235] bg-[#111513]/88 px-3.5 py-2 shadow-xl">
          <div className="flex items-center gap-2.5">
            <h1
              className="text-base font-semibold tracking-widest text-[#d8c8ad] uppercase"
              style={{fontFamily: "Georgia, 'Times New Roman', serif"}}
            >
              Навь и Пепел
            </h1>
            <span className="border border-[#3f382d] bg-[#1a201d] px-1.5 py-0.5 text-[10px] tracking-wider text-[#9f927d] uppercase">
              Look-Dev · Тёмная Резьба
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-[#9c907b]">
            <span>Погост Залесья</span>
            <span className={navShifted ? 'text-[#3be88c]' : 'text-[#e07026]'}>
              {navShifted ? 'Сдвиг Нави активен' : 'Явь: Свет костра и факела'}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1 border border-[#4b4235] bg-[#111513]/88 p-1 text-[11px] shadow-xl">
          {PRESET_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPreset(item.id)}
              className={`border px-2 py-1 transition-colors ${
                preset === item.id
                  ? 'border-[#e07026] bg-[#2a1d14] text-[#f3e7d3]'
                  : 'border-[#332e26] bg-[#181d1a] text-[#9c907b] hover:text-[#e0d6c5]'
              }`}
            >
              {item.key}. {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onToggleNav}
            className={`border px-2.5 py-1 transition-colors ${
              navShifted
                ? 'border-[#3be88c] bg-[#0f291d] text-[#3be88c]'
                : 'border-[#332e26] bg-[#181d1a] text-[#b5a58d] hover:border-[#3be88c]'
            }`}
          >
            E. {navShifted ? 'Вернуть Явь' : 'Сдвиг в Навь'}
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Скрыть или показать HUD (H)"
            className="border border-[#332e26] bg-[#181d1a] px-2 py-1 text-[#9c907b] hover:text-[#e07026]"
          >
            {collapsed ? 'HUD (H)' : 'Чистый кадр (H)'}
          </button>
        </div>
      </div>

      {/* Bottom ARPG Forged-Iron Action Bar Mockup */}
      {!collapsed && (
        <div className="flex justify-center pb-0.5">
          <div className="pointer-events-auto flex items-end gap-2.5">
            {/* Blood Health Orb */}
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#6a5c49] bg-[#180708] shadow-2xl">
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#6b1114] via-[#a82024] to-[#c9363b]"
                style={{height: '76%'}}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_2px_8px_rgba(255,210,180,0.2)]" />
              <span className="relative z-10 font-mono text-[11px] font-semibold text-[#f3e7d3] drop-shadow">
                420
              </span>
            </div>

            {/* 4 Skill Slots + Evade + Potion */}
            <div className="flex items-center gap-1.5 border border-[#5a4d3c] bg-[#121614]/94 px-2 py-1.5 shadow-2xl">
              {[
                {key: 'ЛКМ', title: 'Секира', icon: <SkillRuneAxe />, active: false},
                {key: 'ПКМ', title: 'Свет Щита', icon: <SkillRuneShield />, active: false},
                {key: '1', title: 'Жар Огнища', icon: <SkillRuneTorch />, active: false},
                {key: '2', title: 'Зов Нави', icon: <SkillRuneNav />, active: navShifted},
              ].map((slot) => (
                <div
                  key={slot.key}
                  title={slot.title}
                  className={`relative flex h-10 w-10 items-center justify-center border ${
                    slot.active
                      ? 'border-[#3be88c] bg-[#10261c]'
                      : 'border-[#4a4134] bg-[#1a1f1b]'
                  }`}
                >
                  {slot.icon}
                  <span className="absolute right-0.5 bottom-0 font-mono text-[8px] text-[#9f927d]">
                    {slot.key}
                  </span>
                </div>
              ))}
              <div className="mx-0.5 h-7 w-px bg-[#333834]" />
              <div className="flex flex-col items-center justify-center border border-[#4a4134] bg-[#1a1f1b] px-2 py-0.5 text-[9px] text-[#b5a58d]">
                <span className="font-mono text-[#e0d6c5]">Space</span>
                <span>Рывок</span>
              </div>
              <div className="flex flex-col items-center justify-center border border-[#4a4134] bg-[#1a1f1b] px-2 py-0.5 text-[9px] text-[#b5a58d]">
                <span className="font-mono text-[#c9363b]">Q · 4/4</span>
                <span>Отвар</span>
              </div>
            </div>

            {/* Torchlight / Spirit Orb */}
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#6a5c49] bg-[#141714] shadow-2xl">
              <div
                className={`absolute inset-x-0 bottom-0 transition-colors ${
                  navShifted
                    ? 'bg-gradient-to-t from-[#115e38] via-[#26a664] to-[#3be88c]'
                    : 'bg-gradient-to-t from-[#7d3209] via-[#c85a18] to-[#e07026]'
                }`}
                style={{height: navShifted ? '58%' : '84%'}}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_2px_8px_rgba(255,230,200,0.2)]" />
              <span className="relative z-10 font-mono text-[11px] font-semibold text-[#f3e7d3] drop-shadow">
                {navShifted ? '58%' : '84%'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
