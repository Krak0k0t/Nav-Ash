import tuning from '../../data/hello.json';

export interface HelloInput {
  moveX: number;
  moveZ: number;
  dash: boolean;
  toggleNav: boolean;
}

export interface HelloState {
  heroX: number;
  heroZ: number;
  facingYaw: number;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirZ: number;
  distanceMoved: number;
  nearAltar: boolean;
  navShifted: boolean;
  navBlend: number;
  elapsed: number;
}

export interface HelloTickEvents {
  dashed: boolean;
  navToggled: boolean;
}

export function createHelloState(): HelloState {
  return {
    heroX: tuning.heroStart.x,
    heroZ: tuning.heroStart.z,
    facingYaw: Math.PI,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirZ: -1,
    distanceMoved: 0,
    nearAltar: false,
    navShifted: false,
    navBlend: 0,
    elapsed: 0,
  };
}

export function stepHelloState(
  state: HelloState,
  input: HelloInput,
  dt: number,
): HelloTickEvents {
  const events: HelloTickEvents = {dashed: false, navToggled: false};
  state.elapsed += dt;

  if (state.dashCooldown > 0) {
    state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  }

  const hasMove = Math.abs(input.moveX) > 1e-4 || Math.abs(input.moveZ) > 1e-4;
  if (hasMove && state.dashTimer <= 0) {
    state.facingYaw = Math.atan2(input.moveX, input.moveZ);
  }

  if (input.dash && state.dashCooldown <= 0 && state.dashTimer <= 0) {
    state.dashTimer = tuning.dashDuration;
    state.dashCooldown = tuning.dashCooldown;
    if (hasMove) {
      state.dashDirX = input.moveX;
      state.dashDirZ = input.moveZ;
    } else {
      state.dashDirX = Math.sin(state.facingYaw);
      state.dashDirZ = Math.cos(state.facingYaw);
    }
    events.dashed = true;
  }

  let vx = 0;
  let vz = 0;
  if (state.dashTimer > 0) {
    state.dashTimer = Math.max(0, state.dashTimer - dt);
    vx = state.dashDirX * tuning.dashSpeed;
    vz = state.dashDirZ * tuning.dashSpeed;
  } else if (hasMove) {
    vx = input.moveX * tuning.moveSpeed;
    vz = input.moveZ * tuning.moveSpeed;
  }

  const prevX = state.heroX;
  const prevZ = state.heroZ;
  let nextX = prevX + vx * dt;
  let nextZ = prevZ + vz * dt;

  // Keep hero outside altar pillar core (radius 1.1m) and inside grove clearing
  const dxAltar = nextX - tuning.altarPosition.x;
  const dzAltar = nextZ - tuning.altarPosition.z;
  const distAltar = Math.hypot(dxAltar, dzAltar);
  const minAltarDist = 1.25;
  if (distAltar < minAltarDist) {
    const nx = distAltar > 1e-4 ? dxAltar / distAltar : 0;
    const nz = distAltar > 1e-4 ? dzAltar / distAltar : 1;
    nextX = tuning.altarPosition.x + nx * minAltarDist;
    nextZ = tuning.altarPosition.z + nz * minAltarDist;
  }

  const distOrigin = Math.hypot(nextX, nextZ);
  if (distOrigin > tuning.arenaRadius) {
    const scale = tuning.arenaRadius / distOrigin;
    nextX *= scale;
    nextZ *= scale;
  }

  state.heroX = nextX;
  state.heroZ = nextZ;
  state.distanceMoved += Math.hypot(nextX - prevX, nextZ - prevZ);

  const altarDistance = Math.hypot(
    nextX - tuning.altarPosition.x,
    nextZ - tuning.altarPosition.z,
  );
  state.nearAltar = altarDistance <= tuning.altarRadius;

  if (input.toggleNav) {
    state.navShifted = !state.navShifted;
    events.navToggled = true;
  }

  const targetBlend = state.navShifted ? 1 : 0;
  const blendStep = dt * 2.5;
  if (state.navBlend < targetBlend) {
    state.navBlend = Math.min(targetBlend, state.navBlend + blendStep);
  } else if (state.navBlend > targetBlend) {
    state.navBlend = Math.max(targetBlend, state.navBlend - blendStep);
  }

  return events;
}
