export interface BootParams {
  seed: number;
  gym: string | null;
  state: string | null;
  debug: boolean;
  capture: boolean;
  autostart: boolean;
}

export function readBootParams(search: string): BootParams {
  const sp = new URLSearchParams(search);
  const rawSeed = Number(sp.get('seed'));
  return {
    seed: Number.isFinite(rawSeed) && rawSeed !== 0 ? Math.trunc(rawSeed) : 1307,
    gym: sp.get('gym') ?? sp.get('scene'),
    state: sp.get('state'),
    debug: sp.has('debug'),
    capture: sp.get('capture') === '1',
    autostart: sp.get('autostart') === '1',
  };
}
