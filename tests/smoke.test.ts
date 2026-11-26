import {describe, expect, it} from 'vitest';
import {createRng} from '../src/core/rng';
import {createHelloState, stepHelloState} from '../src/systems/hello/helloSim';

describe('Phase 4 smoke simulation', () => {
  it('test_rng_same_seed_is_deterministic', () => {
    const a = createRng(1307);
    const b = createRng(1307);
    const seqA = [a.next(), a.next(), a.int(1, 100)];
    const seqB = [b.next(), b.next(), b.int(1, 100)];
    expect(seqA).toEqual(seqB);
  });

  it('test_hello_hero_moves_dashes_and_shifts_nav', () => {
    const state = createHelloState();
    const startZ = state.heroZ;

    for (let i = 0; i < 30; i++) {
      stepHelloState(
        state,
        {moveX: 0, moveZ: -1, dash: i === 0, toggleNav: i === 15},
        1 / 60,
      );
    }

    expect(state.heroZ).toBeLessThan(startZ);
    expect(state.distanceMoved).toBeGreaterThan(2.0);
    expect(state.navShifted).toBe(true);
    expect(state.navBlend).toBeGreaterThan(0);
  });
});
