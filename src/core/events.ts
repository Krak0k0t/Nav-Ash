type Listener<T> = (payload: T) => void;

export interface GameEventMap {
  'hero:moved': {x: number; z: number; distance: number};
  'hero:dashed': {x: number; z: number};
  'nav:toggled': {active: boolean};
  'camera:mode': {mode: 'iso' | 'cinematic'};
}

export class EventBus {
  private listeners = new Map<keyof GameEventMap, Set<Listener<never>>>();

  on<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => {
      set?.delete(fn as Listener<never>);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as Listener<GameEventMap[K]>)(payload);
    }
  }
}
