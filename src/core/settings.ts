import type {CameraStyleId, DifficultyId, GraphicsQualityId} from '../data/balance';
import type {LanguageId} from '../data/locales';

export type GameAction =
  | 'moveFwd'
  | 'moveBack'
  | 'strafeLeft'
  | 'strafeRight'
  | 'primary'
  | 'daggerThrow'
  | 'targetCycle'
  | 'evade'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'skill5'
  | 'skill6'
  | 'interact'
  | 'potion'
  | 'cameraToggle'
  | 'mapToggle'
  | 'pause';

export type BindingCode = string; // KeyboardEvent.code (e.g. 'KeyW', 'Space') or 'MouseLeft' | 'MouseRight' | 'MouseMiddle' | 'Mouse4' | 'Mouse5'

export type KeyBindings = Record<GameAction, BindingCode>;

export const DEFAULT_BINDINGS: KeyBindings = {
  moveFwd: 'KeyW',
  moveBack: 'KeyS',
  strafeLeft: 'KeyA',
  strafeRight: 'KeyD',
  primary: 'MouseLeft',
  daggerThrow: 'KeyR',
  targetCycle: 'Tab',
  evade: 'MouseRight',
  skill1: 'Digit1',
  skill2: 'Digit2',
  skill3: 'Digit3',
  skill4: 'Digit4',
  skill5: 'Digit5',
  skill6: 'Digit6',
  interact: 'KeyE',
  potion: 'KeyQ',
  cameraToggle: 'KeyV',
  mapToggle: 'KeyM',
  pause: 'Escape',
};

export interface GameSettings {
  language: LanguageId;
  difficulty: DifficultyId;
  graphics: GraphicsQualityId;
  cameraStyle: CameraStyleId;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  bindings: KeyBindings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'en', // Required initial default: English
  difficulty: 'vityaz',
  graphics: 'high',
  cameraStyle: 'orbit',
  masterVolume: 0.72,
  musicVolume: 0.62,
  sfxVolume: 0.8,
  muted: false,
  bindings: {...DEFAULT_BINDINGS},
};

const STORAGE_KEY = 'nav_ash_settings_v1';

export function cloneDefaultSettings(): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    bindings: {...DEFAULT_BINDINGS},
  };
}

export function loadSettings(): GameSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return cloneDefaultSettings();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      bindings: {
        ...DEFAULT_BINDINGS,
        ...(parsed.bindings ?? {}),
      },
    };
  } catch {
    return cloneDefaultSettings();
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage quota errors in sandboxed iframes
  }
}

/**
 * Assigns a binding code to an action. If another action already uses `newCode`,
 * the two actions cleanly swap codes so no action is ever left unbound.
 */
export function rebindAction(
  bindings: KeyBindings,
  action: GameAction,
  newCode: BindingCode,
): KeyBindings {
  const prevCode = bindings[action];
  if (prevCode === newCode) return bindings;
  const next: KeyBindings = {...bindings};
  for (const k of Object.keys(next) as GameAction[]) {
    if (k !== action && next[k] === newCode) {
      next[k] = prevCode;
    }
  }
  next[action] = newCode;
  return next;
}

export function mouseButtonToCode(button: number): BindingCode {
  if (button === 0) return 'MouseLeft';
  if (button === 1) return 'MouseMiddle';
  if (button === 2) return 'MouseRight';
  if (button === 3) return 'Mouse4';
  return 'Mouse5';
}

export function formatBindingLabel(code: BindingCode): string {
  if (code === 'MouseLeft') return 'LMB';
  if (code === 'MouseRight') return 'RMB';
  if (code === 'MouseMiddle') return 'MMB';
  if (code === 'Mouse4') return 'M4';
  if (code === 'Mouse5') return 'M5';
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'Esc';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  return code;
}
