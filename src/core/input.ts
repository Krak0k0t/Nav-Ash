import {mouseButtonToCode, type GameAction, type KeyBindings} from './settings';

export interface InputState {
  moveX: number;
  moveZ: number;
  dashPressed: boolean;
  interactPressed: boolean;
  cameraTogglePressed: boolean;
  hudTogglePressed: boolean;
}

export class InputTracker {
  private held = new Set<string>();
  private queued = new Set<string>();

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.held.has(e.code)) {
      this.queued.add(e.code);
    }
    this.held.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onBlur = (): void => {
    this.held.clear();
    this.queued.clear();
  };

  attach(target: Window): () => void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
    return () => {
      target.removeEventListener('keydown', this.onKeyDown);
      target.removeEventListener('keyup', this.onKeyUp);
      target.removeEventListener('blur', this.onBlur);
    };
  }

  sample(): InputState {
    const left = this.held.has('KeyA') || this.held.has('ArrowLeft') ? 1 : 0;
    const right = this.held.has('KeyD') || this.held.has('ArrowRight') ? 1 : 0;
    const up = this.held.has('KeyW') || this.held.has('ArrowUp') ? 1 : 0;
    const down = this.held.has('KeyS') || this.held.has('ArrowDown') ? 1 : 0;

    let moveX = right - left;
    let moveZ = down - up;
    const len = Math.hypot(moveX, moveZ);
    if (len > 1e-6) {
      moveX /= len;
      moveZ /= len;
    }

    const dashPressed = this.queued.delete('Space');
    const interactPressed = this.queued.delete('KeyE');
    const cameraTogglePressed = this.queued.delete('KeyC');
    const hudTogglePressed = this.queued.delete('KeyH');

    return {
      moveX,
      moveZ,
      dashPressed,
      interactPressed,
      cameraTogglePressed,
      hudTogglePressed,
    };
  }
}

export interface ActionInputSample {
  strafeX: number; // -1 left, +1 right (camera-relative)
  forwardZ: number; // +1 forward, -1 backpedal (camera-relative)
  primaryPressed: boolean;
  daggerPressed: boolean;
  targetCyclePressed: boolean;
  evadePressed: boolean;
  skill1Pressed: boolean;
  skill2Pressed: boolean;
  skill3Pressed: boolean;
  skill4Pressed: boolean;
  skill5Pressed: boolean;
  skill6Pressed: boolean;
  interactPressed: boolean;
  potionPressed: boolean;
  cameraTogglePressed: boolean;
  mapTogglePressed: boolean;
  pausePressed: boolean;
  orbitDeltaX: number;
  orbitDeltaY: number;
  zoomDelta: number;
  steerHeroToCamera: boolean;
  bothMouseHeld: boolean;
  sprintHeld: boolean;
}

export class ActionInputController {
  private held = new Set<string>();
  private queued = new Set<string>();
  private bufferedUntil = new Map<GameAction, number>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchActions = new Set<GameAction>();

  private lmbDown = false;
  private rmbDown = false;
  private lmbDragDist = 0;
  private rmbDragDist = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private orbitDeltaX = 0;
  private orbitDeltaY = 0;
  private zoomDelta = 0;
  private canvasEl: HTMLElement | null = null;
  private bindings: KeyBindings;
  private enabled = true;

  constructor(initialBindings: KeyBindings) {
    this.bindings = {...initialBindings};
  }

  setBindings(bindings: KeyBindings): void {
    this.bindings = {...bindings};
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAll();
    }
  }

  setTouchJoystick(x: number, y: number): void {
    this.touchMoveX = x;
    this.touchMoveY = y;
  }

  triggerTouchAction(action: GameAction): void {
    this.touchActions.add(action);
  }

  clearAll(): void {
    this.held.clear();
    this.queued.clear();
    this.bufferedUntil.clear();
    this.lmbDown = false;
    this.rmbDown = false;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.orbitDeltaX = 0;
    this.orbitDeltaY = 0;
    this.zoomDelta = 0;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) {
      if (e.code === this.bindings.pause || e.code === 'Escape') {
        this.queued.add(e.code);
      }
      return;
    }
    if (
      e.code === 'Tab' ||
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'INPUT') {
        e.preventDefault();
      }
    }
    if (!this.held.has(e.code)) {
      this.queued.add(e.code);
    }
    this.held.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.enabled) return;
    // Only capture mouse presses inside the WebGL canvas, never over HUD buttons/modals
    if (this.canvasEl && e.target !== this.canvasEl) return;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    if (e.button === 0) {
      this.lmbDown = true;
      this.lmbDragDist = 0;
    } else if (e.button === 2) {
      this.rmbDown = true;
      this.rmbDragDist = 0;
    } else {
      const code = mouseButtonToCode(e.button);
      if (!this.held.has(code)) this.queued.add(code);
      this.held.add(code);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;
    if (!this.lmbDown && !this.rmbDown) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const dist = Math.hypot(dx, dy);
    if (this.lmbDown) this.lmbDragDist += dist;
    if (this.rmbDown) this.rmbDragDist += dist;

    if (this.lmbDown || this.rmbDown) {
      this.orbitDeltaX += dx;
      this.orbitDeltaY += dy;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      if (this.lmbDown && this.lmbDragDist <= 7) {
        this.queued.add('MouseLeft');
      }
      this.lmbDown = false;
      this.held.delete('MouseLeft');
    } else if (e.button === 2) {
      if (this.rmbDown && this.rmbDragDist <= 7) {
        this.queued.add('MouseRight');
      }
      this.rmbDown = false;
      this.held.delete('MouseRight');
    } else {
      this.held.delete(mouseButtonToCode(e.button));
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    if (this.canvasEl && e.target !== this.canvasEl) return;
    this.zoomDelta += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 120);
  };

  private onContextMenu = (e: MouseEvent): void => {
    if (this.canvasEl && e.target === this.canvasEl) {
      e.preventDefault();
    }
  };

  private onBlur = (): void => {
    this.clearAll();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clearAll();
  };

  attach(win: Window, canvasEl: HTMLElement): () => void {
    this.canvasEl = canvasEl;
    win.addEventListener('keydown', this.onKeyDown);
    win.addEventListener('keyup', this.onKeyUp);
    win.addEventListener('mousedown', this.onMouseDown);
    win.addEventListener('mousemove', this.onMouseMove);
    win.addEventListener('mouseup', this.onMouseUp);
    win.addEventListener('wheel', this.onWheel, {passive: true});
    win.addEventListener('contextmenu', this.onContextMenu);
    win.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    return () => {
      win.removeEventListener('keydown', this.onKeyDown);
      win.removeEventListener('keyup', this.onKeyUp);
      win.removeEventListener('mousedown', this.onMouseDown);
      win.removeEventListener('mousemove', this.onMouseMove);
      win.removeEventListener('mouseup', this.onMouseUp);
      win.removeEventListener('wheel', this.onWheel);
      win.removeEventListener('contextmenu', this.onContextMenu);
      win.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.canvasEl = null;
    };
  }

  private consumeAction(action: GameAction, nowSec: number, bufferSec = 0): boolean {
    if (this.touchActions.delete(action)) return true;

    const bound = this.bindings[action];
    let fired = this.queued.delete(bound);

    // Helpful secondary defaults for action accessibility
    if (!fired && action === 'evade' && bound !== 'Space') {
      fired = this.queued.delete('Space');
    }
    if (!fired && action === 'primary' && bound !== 'KeyF') {
      fired = this.queued.delete('KeyF');
    }

    if (fired) {
      this.bufferedUntil.delete(action);
      return true;
    }

    if (bufferSec > 0) {
      const exp = this.bufferedUntil.get(action);
      if (exp !== undefined && nowSec <= exp) {
        this.bufferedUntil.delete(action);
        return true;
      }
    }
    return false;
  }

  bufferAction(action: GameAction, nowSec: number, duration = 0.12): void {
    this.bufferedUntil.set(action, nowSec + duration);
  }

  sample(nowSec: number): ActionInputSample {
    const b = this.bindings;
    const fwdHeld = this.held.has(b.moveFwd) || this.held.has('ArrowUp');
    const backHeld = this.held.has(b.moveBack) || this.held.has('ArrowDown');
    const leftHeld = this.held.has(b.strafeLeft) || this.held.has('ArrowLeft');
    const rightHeld = this.held.has(b.strafeRight) || this.held.has('ArrowRight');

    const bothMouseHeld = this.lmbDown && this.rmbDown;

    let forwardZ = (fwdHeld || bothMouseHeld ? 1 : 0) - (backHeld ? 1 : 0) - this.touchMoveY;
    let strafeX = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0) + this.touchMoveX;

    const len = Math.hypot(strafeX, forwardZ);
    if (len > 1) {
      strafeX /= len;
      forwardZ /= len;
    }

    const out: ActionInputSample = {
      strafeX,
      forwardZ,
      primaryPressed: this.consumeAction('primary', nowSec, 0.1),
      daggerPressed: this.consumeAction('daggerThrow', nowSec, 0.08),
      targetCyclePressed: this.consumeAction('targetCycle', nowSec),
      evadePressed: this.consumeAction('evade', nowSec, 0.12),
      skill1Pressed: this.consumeAction('skill1', nowSec),
      skill2Pressed: this.consumeAction('skill2', nowSec),
      skill3Pressed: this.consumeAction('skill3', nowSec),
      skill4Pressed: this.consumeAction('skill4', nowSec),
      skill5Pressed: this.consumeAction('skill5', nowSec),
      skill6Pressed: this.consumeAction('skill6', nowSec),
      interactPressed: this.consumeAction('interact', nowSec),
      potionPressed: this.consumeAction('potion', nowSec),
      cameraTogglePressed: this.consumeAction('cameraToggle', nowSec),
      mapTogglePressed: this.consumeAction('mapToggle', nowSec),
      pausePressed: this.consumeAction('pause', nowSec),
      orbitDeltaX: this.orbitDeltaX,
      orbitDeltaY: this.orbitDeltaY,
      zoomDelta: this.zoomDelta,
      steerHeroToCamera: this.rmbDown,
      bothMouseHeld,
      sprintHeld: this.held.has('ShiftLeft') || this.held.has('ShiftRight'),
    };

    this.orbitDeltaX = 0;
    this.orbitDeltaY = 0;
    this.zoomDelta = 0;

    return out;
  }
}
