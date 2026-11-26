import {createRng, type Rng} from '../core/rng';
import {
  DIFFICULTY_CONFIGS,
  ENEMY_CONFIGS,
  PLAYER_BASE,
  SKILL_SPECS,
  type DifficultyId,
  type EnemyArchetype,
  type VesselMutationId,
} from '../data/balance';
import {
  generateDungeon,
  resolveWalkableMovement,
  type DungeonLayout,
} from './dungeonGen';
import {
  createWorldQuestState,
  isEnemyDarknessShielded,
  type QuestManager,
  type WorldQuestState,
} from './quests';

export interface SimInput {
  strafeX: number;
  forwardZ: number;
  cameraYaw: number;
  steerToCamera: boolean;
  primaryPressed: boolean;
  daggerPressed?: boolean;
  targetCyclePressed?: boolean;
  evadePressed: boolean;
  skill1Pressed: boolean;
  skill2Pressed: boolean;
  skill3Pressed: boolean;
  skill4Pressed: boolean;
  skill5Pressed?: boolean;
  skill6Pressed?: boolean;
  interactPressed: boolean;
  potionPressed: boolean;
  sprintHeld?: boolean;
}

export interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  roomId: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  state: 'idle' | 'chase' | 'windup' | 'recover' | 'ko';
  stateTimer: number;
  windupDuration: number;
  cooldownTimer: number;
  attackTargetX: number;
  attackTargetZ: number;
  attackRadius: number;
  hitFlashTimer: number;
  koTimer: number;
  phase2Triggered: boolean;
  aggroed: boolean;
  strideDist: number;
  speedRatio: number;
  turnStepDir: number;
}

export interface ProjectileEntity {
  id: number;
  fromPlayer: boolean;
  kind: 'mireBolt' | 'dagger';
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  radius: number;
  damage: number;
  life: number;
  isNav: boolean;
}

export interface BloodSigilEntity {
  id: number;
  x: number;
  z: number;
  radius: number;
  life: number;
  detonated: boolean;
}

export interface VesselOrbEntity {
  id: number;
  x: number;
  z: number;
  mutation: Exclude<VesselMutationId, 'none'>;
  life: number;
}

export interface SlashEffectEvent {
  type: 'primary' | 'dagger' | 'shieldWave' | 'flameSurge' | 'navCleave' | 'crescendo' | 'whirlwind' | 'svarogWard' | 'sigilBlast' | 'enemyHit' | 'playerHit';
  x: number;
  z: number;
  yaw: number;
  radius: number;
  isNav: boolean;
}

export type GroundSurface = 'stone' | 'earth' | 'wood';

export interface FootstepEvent {
  surface: GroundSurface;
  x: number;
  z: number;
}

export interface SparkEvent {
  x: number;
  y: number;
  z: number;
  isNav: boolean;
  metal: boolean;
}

export interface DustEvent {
  x: number;
  z: number;
  count: number;
}

export type JumpPhase = 'none' | 'windup' | 'air' | 'land';

export interface SimFrameEvents {
  slashes: SlashEffectEvent[];
  footsteps: FootstepEvent[];
  sparks: SparkEvent[];
  dusts: DustEvent[];
  dashed: boolean;
  jumpAnticipated: boolean;
  jumpLanded: GroundSurface | null;
  daggerThrown: boolean;
  targetChanged: boolean;
  navShifted: boolean;
  enemyKilled: number;
  vesselPicked: Exclude<VesselMutationId, 'none'> | null;
  potionUsed: boolean;
  talkedToMara: boolean;
  bossDefeated: boolean;
  playerDied: boolean;
  heavyImpact: boolean;
  questChanged: boolean;
  campfireKindled: boolean;
}

export interface RunSummary {
  victory: boolean;
  difficulty: DifficultyId;
  elapsedSec: number;
  kills: number;
  navShifts: number;
  maxResonance: number;
  ashes: number;
  permadeathTriggered: boolean;
}

export type CombatActionLock = 'none' | 'windup' | 'recover';

export interface GameSimState {
  seed: number;
  difficulty: DifficultyId;
  layout: DungeonLayout;
  rng: Rng;
  elapsedSec: number;
  hitstopTimer: number;
  cameraTrauma: number;

  // Player
  heroX: number;
  heroZ: number;
  heroY: number;
  heroVx: number;
  heroVz: number;
  heroYaw: number;
  heroSpeedRatio: number;
  heroSprintFactor: number;
  heroStrideDist: number;
  nextFootstepDist: number;
  hp: number;
  maxHp: number;
  spirit: number;
  maxSpirit: number;
  torchlight: number;
  maxTorchlight: number;
  potions: number;
  ashes: number;
  vesselMutation: VesselMutationId;

  // Combat & Action states
  attackCombo: number;
  attackAnimTimer: number;
  attackCooldown: number;
  primaryCooldownTimer: number;
  daggerCooldownTimer: number;
  potionCooldownTimer: number;
  counterTimer: number;
  wardTimer: number;
  actionLock: CombatActionLock;
  actionTimer: number;
  pendingStrikeKind: 'primary' | 'dagger' | null;
  daggerAnimTimer: number;
  lockedTargetId: string | null;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirZ: number;
  jumpState: JumpPhase;
  jumpWindupTimer: number;
  jumpLandTimer: number;
  jumpSquash: number;
  invulnTimer: number;
  heroHitFlash: number;
  skillCooldowns: {
    shieldWave: number;
    flameSurge: number;
    navCleave: number;
    crescendo: number;
    whirlwind: number;
    svarogWard: number;
  };

  // Signature Realm & Resonance hooks
  navShifted: boolean;
  navBlend: number;
  navGateOpen: boolean;
  navShiftsCount: number;
  resonance: number;
  maxResonanceReached: number;
  resonanceDecayTimer: number;

  // World entities
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  sigils: BloodSigilEntity[];
  vesselOrbs: VesselOrbEntity[];
  nextEntityId: number;

  // Prompts, Diegetic Quests & Progression
  nearAltarId: string | null;
  nearNpcId: 'mara' | 'ratnik' | null;
  nearMirror: boolean;
  nearSpirit: boolean;
  nearLoreId: string | null;
  maraDialogueIndex: number;
  maraDialogueTimer: number;
  quest: WorldQuestState;
  questManager: QuestManager;
  kills: number;
  bossHpRatio: number;
  bossActive: boolean;
  outcome: RunSummary | null;
  defeatDelayTimer: number;
}

export function createGameSimState(seed: number, difficulty: DifficultyId): GameSimState {
  const layout = generateDungeon(seed);
  const diff = DIFFICULTY_CONFIGS[difficulty];
  const rng = createRng(seed ^ 0x6c8e9cf5);

  const enemies: EnemyEntity[] = layout.enemySpawns.map((sp) => {
    const cfg = ENEMY_CONFIGS[sp.archetype];
    const maxHp = Math.round(cfg.maxHp * diff.enemyHpMult);
    return {
      id: sp.id,
      archetype: sp.archetype,
      roomId: sp.roomId,
      x: sp.x,
      z: sp.z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: maxHp,
      maxHp,
      radius: cfg.radius,
      speed: cfg.speed * diff.enemySpeedMult,
      damage: Math.round(cfg.damage * diff.enemyDmgMult),
      state: 'idle',
      stateTimer: 0,
      windupDuration: cfg.telegraphSec * diff.telegraphScale,
      cooldownTimer: rng.range(0.2, 0.9),
      attackTargetX: sp.x,
      attackTargetZ: sp.z,
      attackRadius: cfg.attackRange,
      hitFlashTimer: 0,
      koTimer: 0,
      phase2Triggered: false,
      aggroed: false,
      strideDist: 0,
      speedRatio: 0,
      turnStepDir: 0,
    };
  });

  const {world: quest, manager: questManager} = createWorldQuestState();

  return {
    seed,
    difficulty,
    layout,
    rng,
    elapsedSec: 0,
    hitstopTimer: 0,
    cameraTrauma: 0,

    heroX: layout.spawnX,
    heroZ: layout.spawnZ,
    heroY: 0,
    heroVx: 0,
    heroVz: 0,
    heroYaw: Math.PI, // Facing North (-Z) from spawn into the Ostrog clearing
    heroSpeedRatio: 0,
    heroSprintFactor: 0,
    heroStrideDist: 0,
    nextFootstepDist: 0.95,
    hp: PLAYER_BASE.maxHp,
    maxHp: PLAYER_BASE.maxHp,
    spirit: 60,
    maxSpirit: PLAYER_BASE.maxSpirit,
    torchlight: PLAYER_BASE.maxTorchlight,
    maxTorchlight: PLAYER_BASE.maxTorchlight,
    potions: PLAYER_BASE.maxPotions,
    ashes: 0,
    vesselMutation: 'none',

    attackCombo: 0,
    attackAnimTimer: 0,
    attackCooldown: 0,
    primaryCooldownTimer: 0,
    daggerCooldownTimer: 0,
    potionCooldownTimer: 0,
    counterTimer: 0,
    wardTimer: 0,
    actionLock: 'none',
    actionTimer: 0,
    pendingStrikeKind: null,
    daggerAnimTimer: 0,
    lockedTargetId: null,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirZ: -1,
    jumpState: 'none',
    jumpWindupTimer: 0,
    jumpLandTimer: 0,
    jumpSquash: 0,
    invulnTimer: 0,
    heroHitFlash: 0,
    skillCooldowns: {
      shieldWave: 0,
      flameSurge: 0,
      navCleave: 0,
      crescendo: 0,
      whirlwind: 0,
      svarogWard: 0,
    },

    navShifted: false,
    navBlend: 0,
    navGateOpen: false,
    navShiftsCount: 0,
    resonance: 0,
    maxResonanceReached: 0,
    resonanceDecayTimer: 0,

    enemies,
    projectiles: [],
    sigils: [],
    vesselOrbs: [],
    nextEntityId: 1,

    nearAltarId: null,
    nearNpcId: null,
    nearMirror: false,
    nearSpirit: false,
    nearLoreId: null,
    maraDialogueIndex: 0,
    maraDialogueTimer: 0,
    quest,
    questManager,
    kills: 0,
    bossHpRatio: 1,
    bossActive: false,
    outcome: null,
    defeatDelayTimer: 0,
  };
}

// Pre-baked 65-sample Animation Curve LUT for asymmetric heavy-armor jump: brisk upward launch + heavier, faster descent
const JUMP_LUT_SAMPLES = 64;
const JUMP_CURVE_LUT = new Float32Array(JUMP_LUT_SAMPLES + 1);
for (let i = 0; i <= JUMP_LUT_SAMPLES; i++) {
  const u = i / JUMP_LUT_SAMPLES;
  const w = Math.pow(u, 0.64);
  const p = 4 * w * (1 - w);
  JUMP_CURVE_LUT[i] = Math.pow(Math.max(0, p), 0.78);
}

export function evalJumpHeightCurve(u: number): number {
  const clamped = Math.max(0, Math.min(1, u));
  const scaled = clamped * JUMP_LUT_SAMPLES;
  const i0 = Math.min(JUMP_LUT_SAMPLES - 1, Math.floor(scaled));
  const frac = scaled - i0;
  return JUMP_CURVE_LUT[i0] + (JUMP_CURVE_LUT[i0 + 1] - JUMP_CURVE_LUT[i0]) * frac;
}

export function detectGroundSurface(x: number, z: number): GroundSurface {
  // Timber floor inside Ostrog palisade gate & Sunken Watchpost bridgework
  if (
    (z >= -6.2 && Math.abs(x) <= 7.8 && Math.abs(x) > 1.35) ||
    (x >= 26 && Math.abs(z + 34) <= 6.5)
  ) {
    return 'wood';
  }
  // Flagstone slabs along central N-S road, causeways, Barrow, Necropolis & Sanctum
  if (
    Math.abs(x - Math.sin(z * 0.22) * 0.85) <= 1.45 ||
    (Math.abs(z + 33) <= 1.5 && Math.abs(x) <= 42) ||
    (z <= -66 && Math.hypot(x - 2, z + 76) <= 7.5) ||
    (z <= -108 && Math.hypot(x + 1, z + 118) <= 7.5) ||
    (z <= -148 && Math.hypot(x, z + 162) <= 9.5)
  ) {
    return 'stone';
  }
  return 'earth';
}

export function getTargetCandidates(state: GameSimState): EnemyEntity[] {
  const candidates: {enemy: EnemyEntity; distSq: number}[] = [];
  const maxSq = PLAYER_BASE.targetLockRange * PLAYER_BASE.targetLockRange;
  for (const enemy of state.enemies) {
    if (enemy.state === 'ko' || enemy.hp <= 0) continue;
    if (enemy.roomId === 'sanctum' && !state.navGateOpen) continue;
    const dx = enemy.x - state.heroX;
    const dz = enemy.z - state.heroZ;
    const dSq = dx * dx + dz * dz;
    if (dSq <= maxSq) {
      candidates.push({enemy, distSq: dSq});
    }
  }
  candidates.sort((a, b) => a.distSq - b.distSq);
  return candidates.map((c) => c.enemy);
}

export function cycleTargetLock(state: GameSimState): EnemyEntity | null {
  const candidates = getTargetCandidates(state);
  if (candidates.length === 0) {
    state.lockedTargetId = null;
    return null;
  }
  if (!state.lockedTargetId) {
    state.lockedTargetId = candidates[0].id;
    return candidates[0];
  }
  const idx = candidates.findIndex((c) => c.id === state.lockedTargetId);
  const next = idx === -1 ? candidates[0] : candidates[(idx + 1) % candidates.length];
  state.lockedTargetId = next.id;
  return next;
}

export function getLockedTarget(state: GameSimState): EnemyEntity | null {
  if (!state.lockedTargetId) return null;
  const found = state.enemies.find((e) => e.id === state.lockedTargetId && e.state !== 'ko' && e.hp > 0);
  if (!found) {
    state.lockedTargetId = null;
    return null;
  }
  const dist = Math.hypot(found.x - state.heroX, found.z - state.heroZ);
  if (dist > PLAYER_BASE.targetBreakRange) {
    state.lockedTargetId = null;
    return null;
  }
  return found;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function angleDiff(from: number, to: number): number {
  return wrapAngle(to - from);
}

function alertNearbyAllies(
  state: GameSimState,
  struckEnemy: EnemyEntity,
  radius: number,
): void {
  for (const ally of state.enemies) {
    if (ally.id === struckEnemy.id || ally.aggroed || ally.state === 'ko' || ally.hp <= 0) {
      continue;
    }
    if (ally.roomId === 'sanctum' && !state.navGateOpen) continue;
    if (Math.hypot(ally.x - struckEnemy.x, ally.z - struckEnemy.z) <= radius) {
      ally.aggroed = true;
      if (ally.state === 'idle') {
        ally.state = 'chase';
      }
    }
  }
}

function applyDamageToEnemy(
  state: GameSimState,
  enemy: EnemyEntity,
  rawDmg: number,
  knockX: number,
  knockZ: number,
  knockForce: number,
  events: SimFrameEvents,
  isRangedAttack = false,
): void {
  if (enemy.state === 'ko' || enemy.hp <= 0) return;

  const isShielded = isEnemyDarknessShielded(state.quest, enemy.id);
  const mult = (state.vesselMutation === 'wolfFury' ? 1.25 : 1.0) * (isShielded ? 0.1 : 1.0);
  const dmg = Math.max(1, Math.round(rawDmg * mult));
  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.hitFlashTimer = 0.085;
  enemy.aggroed = true;
  if (enemy.state === 'idle') {
    enemy.state = 'chase';
  }
  // Pack aggro: ranged attacks (and close melee strikes) alert nearby allies around the struck enemy
  alertNearbyAllies(state, enemy, isRangedAttack ? 11.5 : 7.5);
  enemy.vx += knockX * knockForce * (isShielded ? 0.2 : 1.0);
  enemy.vz += knockZ * knockForce * (isShielded ? 0.2 : 1.0);

  if (isShielded) {
    state.quest.whisperKey = 'volkolakShieldedWhisper';
    state.quest.whisperTimer = 4.2;
  }

  events.slashes.push({
    type: 'enemyHit',
    x: enemy.x,
    z: enemy.z,
    yaw: enemy.yaw,
    radius: enemy.radius,
    isNav: state.navShifted,
  });
  events.sparks.push({
    x: enemy.x,
    y: 0.95,
    z: enemy.z,
    isNav: state.navShifted,
    metal: true,
  });

  if (enemy.hp <= 0) {
    enemy.state = 'ko';
    enemy.koTimer = 0.42;
    if (state.lockedTargetId === enemy.id) {
      state.lockedTargetId = null;
    }
    state.kills += 1;
    events.enemyKilled += 1;
    events.heavyImpact = true;
    state.hitstopTimer = Math.max(
      state.hitstopTimer,
      enemy.archetype === 'leshy' ? 0.145 : PLAYER_BASE.hitstopMeleeSec,
    );
    state.cameraTrauma = Math.min(1, state.cameraTrauma + (enemy.archetype === 'leshy' ? 0.85 : 0.36));

    const cfg = ENEMY_CONFIGS[enemy.archetype];
    const diff = DIFFICULTY_CONFIGS[state.difficulty];
    state.ashes += Math.round(cfg.ashesReward * diff.dropMult);

    // Build Nav Crescendo resonance on kills
    state.resonance = Math.min(PLAYER_BASE.crescendoMaxStacks, state.resonance + 1);
    state.maxResonanceReached = Math.max(state.maxResonanceReached, state.resonance);
    state.resonanceDecayTimer = 8.0;

    // Elite Volkolak drops a Spirit Vessel Mutation orb (M09)
    if (enemy.archetype === 'volkolak') {
      const pool: Exclude<VesselMutationId, 'none'>[] = ['wolfFury', 'mireVenom', 'ashBrand'];
      const chosen = pool[state.rng.int(0, pool.length - 1)];
      state.vesselOrbs.push({
        id: state.nextEntityId++,
        x: enemy.x,
        z: enemy.z,
        mutation: chosen,
        life: 30,
      });
    }

    if (enemy.archetype === 'leshy') {
      events.bossDefeated = true;
      state.bossHpRatio = 0;
      state.outcome = {
        victory: true,
        difficulty: state.difficulty,
        elapsedSec: state.elapsedSec,
        kills: state.kills,
        navShifts: state.navShiftsCount,
        maxResonance: state.maxResonanceReached,
        ashes: state.ashes,
        permadeathTriggered: false,
      };
    }
  }
}

function hurtPlayer(state: GameSimState, dmg: number, sourceX: number, sourceZ: number, events: SimFrameEvents): void {
  if (state.invulnTimer > 0 || state.hp <= 0 || state.outcome) return;

  const actualDmg = state.wardTimer > 0 ? Math.max(1, Math.round(dmg * PLAYER_BASE.wardDamageMult)) : dmg;
  state.hp = Math.max(0, state.hp - actualDmg);
  state.heroHitFlash = 0.12;
  state.invulnTimer = 0.35;
  state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.48);
  state.hitstopTimer = Math.max(state.hitstopTimer, 0.045);
  events.heavyImpact = true;

  const dx = state.heroX - sourceX;
  const dz = state.heroZ - sourceZ;
  const len = Math.max(0.01, Math.hypot(dx, dz));
  state.heroVx += (dx / len) * 5.2;
  state.heroVz += (dz / len) * 5.2;

  events.slashes.push({
    type: 'playerHit',
    x: state.heroX,
    z: state.heroZ,
    yaw: state.heroYaw,
    radius: 0.9,
    isNav: false,
  });

  if (state.hp <= 0) {
    state.defeatDelayTimer = 0.55;
    events.playerDied = true;
  }
}

export function resolveSpiritBargain(
  state: GameSimState,
  choice: 'offerLight' | 'shatter',
): boolean {
  if (state.quest.bargainSpirit.outcome !== 'pending') return false;
  if (choice === 'offerLight') {
    if (state.torchlight < 35) return false;
    state.torchlight = Math.max(5, state.torchlight - 35);
    state.quest.bargainSpirit.outcome = 'blessed';
    state.quest.resonanceFloor = 1;
    state.resonance = Math.max(state.resonance, 1);
    state.maxResonanceReached = Math.max(state.maxResonanceReached, state.resonance);
    state.ashes += 35;
    const leshy = state.enemies.find((e) => e.archetype === 'leshy');
    if (leshy && leshy.hp > 0) {
      leshy.maxHp = Math.round(leshy.maxHp * 0.85);
      leshy.hp = Math.min(leshy.hp, leshy.maxHp);
    }
    state.quest.whisperKey = 'questSpiritOffered';
  } else {
    state.quest.bargainSpirit.outcome = 'shattered';
    state.spirit = Math.min(state.maxSpirit, state.spirit + 50);
    state.sigils.push({
      id: state.nextEntityId++,
      x: state.quest.bargainSpirit.x,
      z: state.quest.bargainSpirit.z,
      radius: PLAYER_BASE.bloodSigilRadius,
      life: 14,
      detonated: false,
    });
    state.quest.whisperKey = 'questSpiritRefused';
  }
  state.quest.spiritInteracted = true;
  state.quest.whisperTimer = 4.8;
  state.questManager.emit({type: 'spirit:bargained', choice}, state.quest);
  return true;
}

export function stepGameSim(
  state: GameSimState,
  input: SimInput,
  rawDt: number,
): SimFrameEvents {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const events: SimFrameEvents = {
    slashes: [],
    footsteps: [],
    sparks: [],
    dusts: [],
    dashed: false,
    jumpAnticipated: false,
    jumpLanded: null,
    daggerThrown: false,
    targetChanged: false,
    navShifted: false,
    enemyKilled: 0,
    vesselPicked: null,
    potionUsed: false,
    talkedToMara: false,
    bossDefeated: false,
    playerDied: false,
    heavyImpact: false,
    questChanged: false,
    campfireKindled: false,
  };

  // Visual timers continue ticking smoothly even during hitstop
  state.cameraTrauma = Math.max(0, state.cameraTrauma - dt * 1.9);
  state.heroHitFlash = Math.max(0, state.heroHitFlash - dt);
  state.maraDialogueTimer = Math.max(0, state.maraDialogueTimer - dt);
  state.quest.whisperTimer = Math.max(0, state.quest.whisperTimer - dt);
  for (const e of state.enemies) {
    e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
  }

  // Smooth Nav realm blend
  state.navBlend += ((state.navShifted ? 1 : 0) - state.navBlend) * Math.min(1, dt * 4.5);

  if (state.outcome) return events;

  // Defeat brief cinematic beat before showing Game Over card
  if (state.hp <= 0) {
    state.defeatDelayTimer -= dt;
    if (state.defeatDelayTimer <= 0) {
      const diff = DIFFICULTY_CONFIGS[state.difficulty];
      state.outcome = {
        victory: false,
        difficulty: state.difficulty,
        elapsedSec: state.elapsedSec,
        kills: state.kills,
        navShifts: state.navShiftsCount,
        maxResonance: state.maxResonanceReached,
        ashes: state.ashes,
        permadeathTriggered: diff.permadeath,
      };
    }
    return events;
  }

  // Hitstop freezes simulation & animations for 100-145ms on meaty hits while camera trauma decays
  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return events;
  }

  state.elapsedSec += dt;

  // Tick animation timers outside hitstop so freeze feels truly crisp
  state.attackAnimTimer = Math.max(0, state.attackAnimTimer - dt);
  state.daggerAnimTimer = Math.max(0, state.daggerAnimTimer - dt);

  // Cooldowns & Regen
  state.attackCooldown = Math.max(0, state.attackCooldown - dt);
  state.primaryCooldownTimer = Math.max(0, state.primaryCooldownTimer - dt);
  state.daggerCooldownTimer = Math.max(0, state.daggerCooldownTimer - dt);
  state.potionCooldownTimer = Math.max(0, state.potionCooldownTimer - dt);
  state.counterTimer = Math.max(0, state.counterTimer - dt);
  state.wardTimer = Math.max(0, state.wardTimer - dt);
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  state.skillCooldowns.shieldWave = Math.max(0, state.skillCooldowns.shieldWave - dt);
  state.skillCooldowns.flameSurge = Math.max(0, state.skillCooldowns.flameSurge - dt);
  state.skillCooldowns.navCleave = Math.max(0, state.skillCooldowns.navCleave - dt);
  state.skillCooldowns.crescendo = Math.max(0, state.skillCooldowns.crescendo - dt);
  state.skillCooldowns.whirlwind = Math.max(0, state.skillCooldowns.whirlwind - dt);
  state.skillCooldowns.svarogWard = Math.max(0, state.skillCooldowns.svarogWard - dt);

  state.spirit = Math.min(state.maxSpirit, state.spirit + dt * 7.5);
  let nearCampfire: (typeof state.layout.campfires)[number] | null = null;
  let minFireDist = 999;
  for (const cf of state.layout.campfires) {
    const fd = Math.hypot(state.heroX - cf.x, state.heroZ - cf.z);
    if (fd < minFireDist) {
      minFireDist = fd;
      nearCampfire = cf;
    }
  }
  const nearFireWarmth = minFireDist <= 3.2;
  const torchDrain = state.navShifted ? -1.45 : state.vesselMutation === 'ashBrand' ? 2.6 : 0.75;
  const campfireTorchBonus = nearFireWarmth && !state.navShifted ? 14.0 : 0;
  state.torchlight = Math.max(
    0,
    Math.min(state.maxTorchlight, state.torchlight + (torchDrain + campfireTorchBonus) * dt),
  );
  if (nearFireWarmth && !state.navShifted) {
    const threatNearby = state.enemies.some(
      (e) => e.state !== 'ko' && e.aggroed && Math.hypot(e.x - state.heroX, e.z - state.heroZ) <= 9.0,
    );
    if (!threatNearby) {
      state.hp = Math.min(state.maxHp, state.hp + 2.5 * dt);
    }
  }

  // If Torchlight runs out in Nav, return gently to Yav
  if (state.navShifted && state.torchlight <= 0.1) {
    state.navShifted = false;
    events.navShifted = true;
  }

  if (state.resonance > state.quest.resonanceFloor) {
    state.resonanceDecayTimer -= dt;
    if (state.resonanceDecayTimer <= 0) {
      state.resonance = Math.max(state.quest.resonanceFloor, state.resonance - 1);
      state.resonanceDecayTimer = 3.5;
    }
  }

  // Maintain or cycle [Tab] Target Lock (nearest -> farther -> wrap)
  if (input.targetCyclePressed) {
    cycleTargetLock(state);
    events.targetChanged = true;
  } else {
    getLockedTarget(state);
  }
  const lockedTarget = getLockedTarget(state);

  // Camera-relative planar basis (camera looks along [-sin(yaw), 0, -cos(yaw)])
  const camFwdX = -Math.sin(input.cameraYaw);
  const camFwdZ = -Math.cos(input.cameraYaw);
  const camRightX = Math.cos(input.cameraYaw);
  const camRightZ = -Math.sin(input.cameraYaw);

  const wishX = camFwdX * input.forwardZ + camRightX * input.strafeX;
  const wishZ = camFwdZ * input.forwardZ + camRightZ * input.strafeX;
  const wishLen = Math.hypot(wishX, wishZ);
  const normWishX = wishLen > 1e-4 ? wishX / wishLen : 0;
  const normWishZ = wishLen > 1e-4 ? wishZ / wishLen : 0;

  // Cannot cancel mid-windup or mid-recovery with dash (combat commitment); otherwise enter Jump Anticipation crouch!
  const canEvade = state.actionLock === 'none' && state.jumpState !== 'windup' && state.jumpState !== 'air';
  if (canEvade && input.evadePressed && state.dashCooldown <= 0 && state.dashTimer <= 0) {
    state.jumpState = 'windup';
    state.jumpWindupTimer = PLAYER_BASE.jumpWindupSec;
    state.jumpLandTimer = 0;
    state.jumpSquash = 0.15;
    state.dashCooldown = PLAYER_BASE.dashCooldown;
    if (wishLen > 1e-4) {
      state.dashDirX = normWishX;
      state.dashDirZ = normWishZ;
    } else {
      state.dashDirX = Math.sin(state.heroYaw);
      state.dashDirZ = Math.cos(state.heroYaw);
    }
    events.jumpAnticipated = true;
  }

  // Heavy Physically Grounded Jump Lifecycle: Anticipation Crouch -> Cached LUT Parabolic Air -> Impact Squash
  if (state.jumpState === 'windup') {
    state.jumpWindupTimer -= dt;
    const wFrac = 1 - Math.max(0, state.jumpWindupTimer) / PLAYER_BASE.jumpWindupSec;
    state.jumpSquash = wFrac * 0.72;
    state.heroY = 0;
    // Compress forward momentum slightly while knees coil before spring launch
    state.heroVx *= Math.exp(-10 * dt);
    state.heroVz *= Math.exp(-10 * dt);
    state.heroSpeedRatio = Math.min(0.45, state.heroSpeedRatio);
    if (state.jumpWindupTimer <= 0) {
      state.jumpState = 'air';
      state.jumpSquash = 0;
      state.dashTimer = PLAYER_BASE.dashDuration;
      state.invulnTimer = Math.max(state.invulnTimer, PLAYER_BASE.dashDuration + 0.08);
      events.dashed = true;
      events.dusts.push({x: state.heroX, z: state.heroZ, count: 7});
    }
  } else if (state.dashTimer > 0) {
    state.jumpState = 'air';
    state.jumpSquash = 0;
    const prevDash = state.dashTimer;
    state.dashTimer = Math.max(0, state.dashTimer - dt);
    const dashFrac = 1 - state.dashTimer / PLAYER_BASE.dashDuration;
    state.heroY = evalJumpHeightCurve(dashFrac) * 0.88;
    state.heroVx = state.dashDirX * PLAYER_BASE.dashSpeed;
    state.heroVz = state.dashDirZ * PLAYER_BASE.dashSpeed;
    state.heroSpeedRatio = 1.35;
    if (prevDash > 0 && state.dashTimer <= 0) {
      state.heroY = 0;
      state.jumpState = 'land';
      state.jumpLandTimer = PLAYER_BASE.jumpLandSec;
      state.jumpSquash = 1.0;
      const surface = detectGroundSurface(state.heroX, state.heroZ);
      events.jumpLanded = surface;
      events.dusts.push({x: state.heroX, z: state.heroZ, count: 12});
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.19);
    }
  } else {
    state.heroY = 0;
    if (state.jumpState === 'land') {
      state.jumpLandTimer = Math.max(0, state.jumpLandTimer - dt);
      const landFrac = state.jumpLandTimer / PLAYER_BASE.jumpLandSec;
      state.jumpSquash = Math.sin(landFrac * Math.PI * 0.5);
      if (state.jumpLandTimer <= 0) {
        state.jumpState = 'none';
        state.jumpSquash = 0;
      }
    } else {
      state.jumpState = 'none';
      state.jumpSquash = 0;
    }

    const isBackpedal = input.forwardZ < -0.2 && Math.abs(input.strafeX) < 0.4;
    const wantsSprint =
      Boolean(input.sprintHeld) &&
      wishLen > 0.1 &&
      state.actionLock === 'none' &&
      state.jumpState === 'none' &&
      !isBackpedal;
    state.heroSprintFactor += ((wantsSprint ? 1 : 0) - state.heroSprintFactor) * Math.min(1, dt * 8.0);
    const sprintMult = 1 + 0.36 * state.heroSprintFactor;

    const actionMoveMult =
      state.actionLock === 'windup'
        ? 0.35
        : state.actionLock === 'recover'
          ? 0.48
          : state.jumpState === 'land'
            ? 0.52
            : 1.0;
    const moveSpd =
      PLAYER_BASE.moveSpeed *
      (isBackpedal ? PLAYER_BASE.backpedalFactor : 1) *
      actionMoveMult *
      sprintMult;
    const targetVx = normWishX * moveSpd * Math.min(1, wishLen);
    const targetVz = normWishZ * moveSpd * Math.min(1, wishLen);

    // Asymmetric armored acceleration vs deceleration curves (weighty start & stop inertia)
    const accelerating = wishLen > 0.08 && Math.hypot(targetVx, targetVz) >= Math.hypot(state.heroVx, state.heroVz) * 0.85;
    const rate = accelerating ? PLAYER_BASE.armorAccelRate : PLAYER_BASE.armorDecelRate;
    const ease = 1 - Math.exp(-rate * dt);
    state.heroVx += (targetVx - state.heroVx) * ease;
    state.heroVz += (targetVz - state.heroVz) * ease;
    if (wishLen < 0.05 && Math.hypot(state.heroVx, state.heroVz) < 0.04) {
      state.heroVx = 0;
      state.heroVz = 0;
    }
    state.heroSpeedRatio = Math.min(1.36, Math.hypot(state.heroVx, state.heroVz) / PLAYER_BASE.moveSpeed);
  }

  // Hero Orientation: locked target auto-aligns during windup/throw, RMB steers to camera, else weighted turn toward movement
  if (state.actionLock === 'windup' && lockedTarget) {
    const faceTargetYaw = Math.atan2(lockedTarget.x - state.heroX, lockedTarget.z - state.heroZ);
    state.heroYaw = wrapAngle(state.heroYaw + angleDiff(state.heroYaw, faceTargetYaw) * Math.min(1, dt * 18));
  } else if (input.steerToCamera) {
    const targetYaw = Math.atan2(camFwdX, camFwdZ);
    state.heroYaw = wrapAngle(state.heroYaw + angleDiff(state.heroYaw, targetYaw) * Math.min(1, dt * 16));
  } else if (wishLen > 0.1 && state.actionLock === 'none') {
    const moveYaw = Math.atan2(normWishX, normWishZ);
    state.heroYaw = wrapAngle(
      state.heroYaw + angleDiff(state.heroYaw, moveYaw) * Math.min(1, dt * PLAYER_BASE.turnRate),
    );
  }

  const prevX = state.heroX;
  const prevZ = state.heroZ;
  const nextPos = resolveWalkableMovement(
    state.layout,
    state.heroX,
    state.heroZ,
    state.heroX + state.heroVx * dt,
    state.heroZ + state.heroVz * dt,
    0.52,
    state.navGateOpen,
  );
  state.heroX = nextPos.x;
  state.heroZ = nextPos.z;

  // Root-Motion Displacement Lock: stride advance & footsteps trigger strictly from real planar movement
  const movedDist = Math.hypot(state.heroX - prevX, state.heroZ - prevZ);
  if (state.dashTimer <= 0 && movedDist > 0.0005) {
    state.heroStrideDist += movedDist;
    if (state.heroStrideDist >= state.nextFootstepDist) {
      state.nextFootstepDist = state.heroStrideDist + 0.95;
      const surface = detectGroundSurface(state.heroX, state.heroZ);
      events.footsteps.push({surface, x: state.heroX, z: state.heroZ});
      events.dusts.push({x: state.heroX, z: state.heroZ, count: 2});
    }
  }

  // Check proximity to Altars, NPCs, Mirror Shrine & Bargain Spirit
  state.nearAltarId = null;
  for (const altar of state.layout.altars) {
    if (Math.hypot(state.heroX - altar.x, state.heroZ - altar.z) <= 3.1) {
      state.nearAltarId = altar.id;
      break;
    }
  }
  state.nearNpcId = null;
  for (const npc of state.layout.npcs) {
    if (Math.hypot(state.heroX - npc.x, state.heroZ - npc.z) <= 2.9) {
      state.nearNpcId = npc.id;
      break;
    }
  }
  const mirror = state.quest.echoShrine;
  state.nearMirror = !mirror.revealed && Math.hypot(state.heroX - mirror.x, state.heroZ - mirror.z) <= 3.0;
  const spirit = state.quest.bargainSpirit;
  state.nearSpirit = spirit.outcome === 'pending' && Math.hypot(state.heroX - spirit.x, state.heroZ - spirit.z) <= 3.1;
  state.nearLoreId = null;
  for (const ls of state.quest.loreStones) {
    if (!ls.discovered && Math.hypot(state.heroX - ls.x, state.heroZ - ls.z) <= 3.0) {
      state.nearLoreId = ls.id;
      break;
    }
  }

  // Echoes of Nav: standing near the Mirror in Nav OR collecting revealed Echo Shards
  if (!mirror.revealed && state.navShifted && Math.hypot(state.heroX - mirror.x, state.heroZ - mirror.z) <= 4.0) {
    mirror.revealed = true;
    state.quest.whisperKey = 'questEchoWhisper';
    state.quest.whisperTimer = 5.0;
    state.questManager.emit({type: 'echo:revealed', targetId: mirror.id}, state.quest);
    events.questChanged = true;
  }
  if (mirror.revealed && !state.quest.echoCompleted) {
    for (const sh of state.quest.echoShards) {
      if (sh.collected) continue;
      if (Math.hypot(state.heroX - sh.x, state.heroZ - sh.z) <= 1.85) {
        sh.collected = true;
        state.questManager.emit({type: 'echo:shardCollected', targetId: sh.id}, state.quest);
        events.questChanged = true;
        events.slashes.push({
          type: 'navCleave',
          x: sh.x,
          z: sh.z,
          yaw: 0,
          radius: 1.6,
          isNav: true,
        });
        if (state.quest.echoCompleted) {
          state.maxHp += 20;
          state.hp = Math.min(state.maxHp, state.hp + 35);
          state.ashes += 65;
          state.spirit = Math.min(state.maxSpirit, state.spirit + 35);
          state.quest.whisperKey = 'questEchoDone';
          state.quest.whisperTimer = 5.2;
          state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.3);
        } else {
          state.quest.whisperKey = 'questEchoShardFound';
          state.quest.whisperTimer = 3.8;
        }
      }
    }
  }

  // Interaction [E]: Nav Altar Shift + Path Inversion OR Mirror Echo OR Spirit Bargain OR Mara
  if (input.interactPressed) {
    if (state.nearAltarId) {
      if (!state.navShifted && state.torchlight >= PLAYER_BASE.altarTorchCost) {
        state.torchlight = Math.max(10, state.torchlight - PLAYER_BASE.altarTorchCost);
        state.navShifted = true;
        state.navGateOpen = true; // Shatter/lower cursed Sanctum barrier (M12)
        state.navShiftsCount += 1;
        events.navShifted = true;
        state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.35);
      } else if (state.navShifted) {
        state.navShifted = false;
        events.navShifted = true;
      }
    } else if (state.nearMirror) {
      mirror.revealed = true;
      if (!state.navShifted && state.torchlight >= 12) {
        state.torchlight -= 12;
        state.navShifted = true;
        events.navShifted = true;
      }
      state.quest.whisperKey = 'questEchoWhisper';
      state.quest.whisperTimer = 5.0;
      state.questManager.emit({type: 'echo:revealed', targetId: mirror.id}, state.quest);
      events.questChanged = true;
    } else if (state.nearSpirit) {
      if (resolveSpiritBargain(state, state.torchlight >= 35 ? 'offerLight' : 'shatter')) {
        events.questChanged = true;
      }
    } else if (state.nearLoreId) {
      const lore = state.quest.loreStones.find((l) => l.id === state.nearLoreId);
      if (lore && !lore.discovered) {
        lore.discovered = true;
        state.ashes += 15;
        state.spirit = Math.min(state.maxSpirit, state.spirit + 15);
        state.quest.whisperKey = lore.whisperKey;
        state.quest.whisperTimer = 6.2;
        state.questManager.emit({type: 'lore:discovered', targetId: lore.id}, state.quest);
        events.questChanged = true;
        events.sparks.push({
          x: lore.x,
          y: 1.05,
          z: lore.z,
          isNav: true,
          metal: false,
        });
      }
    } else if (state.nearNpcId === 'mara') {
      state.maraDialogueIndex = (state.maraDialogueIndex % 2) + 1;
      state.maraDialogueTimer = 6.5;
      state.torchlight = state.maxTorchlight;
      state.hp = Math.min(state.maxHp, state.hp + 25);
      events.talkedToMara = true;
    } else if (nearFireWarmth && nearCampfire) {
      state.torchlight = Math.min(state.maxTorchlight, state.torchlight + 35);
      state.hp = Math.min(state.maxHp, state.hp + 25);
      events.campfireKindled = true;
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.08);
      events.sparks.push({
        x: nearCampfire.x,
        y: 0.75,
        z: nearCampfire.z,
        isNav: false,
        metal: false,
      });
    }
  }

  // Healing Brew [Q] (with reasonable potion cooldown)
  if (input.potionPressed && state.potionCooldownTimer <= 0 && state.potions > 0 && state.hp < state.maxHp) {
    state.potions -= 1;
    state.potionCooldownTimer = PLAYER_BASE.potionCooldown;
    state.hp = Math.min(state.maxHp, state.hp + Math.round(state.maxHp * 0.45));
    events.potionUsed = true;
  }

  // Helper: perform directional or radial hero cleave
  const hitCone = (
    dmg: number,
    range: number,
    minDot: number,
    knock: number,
    fxType: SlashEffectEvent['type'],
    isNav: boolean,
  ) => {
    const faceX = Math.sin(state.heroYaw);
    const faceZ = Math.cos(state.heroYaw);
    let landed = 0;
    for (const enemy of state.enemies) {
      if (enemy.state === 'ko') continue;
      const dx = enemy.x - state.heroX;
      const dz = enemy.z - state.heroZ;
      const dist = Math.hypot(dx, dz);
      if (dist > range + enemy.radius) continue;
      const dirX = dist > 0.01 ? dx / dist : faceX;
      const dirZ = dist > 0.01 ? dz / dist : faceZ;
      const dot = dirX * faceX + dirZ * faceZ;
      if (dot >= minDot || dist < 1.35) {
        applyDamageToEnemy(state, enemy, dmg, dirX, dirZ, knock, events);
        landed += 1;
      }
    }
    if (landed > 0) {
      state.spirit = Math.min(state.maxSpirit, state.spirit + landed * 9);
      state.hitstopTimer = Math.max(state.hitstopTimer, PLAYER_BASE.hitstopMeleeSec);
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.24);
      events.heavyImpact = true;
    }
    events.slashes.push({
      type: fxType,
      x: state.heroX + faceX * 1.15,
      z: state.heroZ + faceZ * 1.15,
      yaw: state.heroYaw,
      radius: range,
      isNav,
    });
  };

  const resolveDaggerThrow = () => {
    let aimX = Math.sin(state.heroYaw);
    let aimZ = Math.cos(state.heroYaw);
    if (lockedTarget) {
      const dx = lockedTarget.x - state.heroX;
      const dz = lockedTarget.z - state.heroZ;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        aimX = dx / d;
        aimZ = dz / d;
        state.heroYaw = Math.atan2(aimX, aimZ);
      }
    }
    const projYaw = Math.atan2(aimX, aimZ);
    state.projectiles.push({
      id: state.nextEntityId++,
      fromPlayer: true,
      kind: 'dagger',
      x: state.heroX + aimX * 0.68,
      z: state.heroZ + aimZ * 0.68,
      vx: aimX * PLAYER_BASE.daggerSpeed,
      vz: aimZ * PLAYER_BASE.daggerSpeed,
      yaw: projYaw,
      radius: 0.34,
      damage: PLAYER_BASE.daggerDamage,
      life: PLAYER_BASE.daggerRange / PLAYER_BASE.daggerSpeed,
      isNav: false,
    });
    events.daggerThrown = true;
    events.slashes.push({
      type: 'dagger',
      x: state.heroX + aimX * 0.8,
      z: state.heroZ + aimZ * 0.8,
      yaw: projYaw,
      radius: 0.9,
      isNav: false,
    });
  };

  // Combat Anticipation (Windup) -> Active Resolution -> Recovery (no animation canceling!)
  if (state.actionLock !== 'none') {
    state.actionTimer -= dt;
    if (state.actionTimer <= 0) {
      if (state.actionLock === 'windup') {
        if (state.pendingStrikeKind === 'primary') {
          state.attackCombo = (state.attackCombo + 1) % 3;
          const comboMult = state.attackCombo === 0 ? 1.32 : 1.0;
          const isCounter = state.counterTimer > 0;
          if (isCounter) {
            state.counterTimer = 0;
            state.spirit = Math.min(state.maxSpirit, state.spirit + 8);
            state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.18);
            events.sparks.push({
              x: state.heroX + Math.sin(state.heroYaw) * 1.1,
              y: 1.05,
              z: state.heroZ + Math.cos(state.heroYaw) * 1.1,
              isNav: true,
              metal: true,
            });
          }
          state.attackAnimTimer = 0.28;
          hitCone(
            PLAYER_BASE.primaryDamage * comboMult * (isCounter ? PLAYER_BASE.counterDamageMult : 1.0),
            PLAYER_BASE.primaryRange,
            0.15,
            (state.attackCombo === 0 ? 7.5 : 4.2) * (isCounter ? 1.25 : 1.0),
            'primary',
            isCounter,
          );
          state.actionLock = 'recover';
          state.actionTimer = PLAYER_BASE.meleeRecoverSec;
          state.pendingStrikeKind = null;
        } else if (state.pendingStrikeKind === 'dagger') {
          state.daggerAnimTimer = 0.2;
          resolveDaggerThrow();
          state.actionLock = 'recover';
          state.actionTimer = PLAYER_BASE.daggerRecoverSec;
          state.pendingStrikeKind = null;
        } else {
          state.actionLock = 'none';
          state.actionTimer = 0;
        }
      } else {
        // Recovery finished
        state.actionLock = 'none';
        state.actionTimer = 0;
      }
    }
  } else {
    // Only allow initiating attacks/skills when not locked in windup or recovery
    if (input.primaryPressed && state.primaryCooldownTimer <= 0) {
      state.primaryCooldownTimer = PLAYER_BASE.primaryCooldown;
      state.actionLock = 'windup';
      state.actionTimer = PLAYER_BASE.meleeWindupSec;
      state.pendingStrikeKind = 'primary';
      state.attackAnimTimer = 0.36;
      if (lockedTarget && Math.hypot(lockedTarget.x - state.heroX, lockedTarget.z - state.heroZ) <= 5.5) {
        state.heroYaw = Math.atan2(lockedTarget.x - state.heroX, lockedTarget.z - state.heroZ);
      }
    } else if (input.daggerPressed && state.daggerCooldownTimer <= 0) {
      state.daggerCooldownTimer = PLAYER_BASE.daggerCooldown;
      state.actionLock = 'windup';
      state.actionTimer = PLAYER_BASE.daggerWindupSec;
      state.pendingStrikeKind = 'dagger';
      state.daggerAnimTimer = 0.24;
      if (lockedTarget) {
        state.heroYaw = Math.atan2(lockedTarget.x - state.heroX, lockedTarget.z - state.heroZ);
      }
    } else if (
      input.skill1Pressed &&
      state.skillCooldowns.shieldWave <= 0 &&
      state.spirit >= SKILL_SPECS.shieldWave.spiritCost
    ) {
      const spec = SKILL_SPECS.shieldWave;
      state.spirit -= spec.spiritCost;
      state.skillCooldowns.shieldWave = spec.cooldown;
      state.attackAnimTimer = 0.32;
      state.actionLock = 'recover';
      state.actionTimer = 0.16;
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult, spec.radius, -0.1, 10.5, 'shieldWave', false);
    } else if (
      input.skill2Pressed &&
      state.skillCooldowns.flameSurge <= 0 &&
      state.spirit >= SKILL_SPECS.flameSurge.spiritCost
    ) {
      const spec = SKILL_SPECS.flameSurge;
      state.spirit -= spec.spiritCost;
      state.skillCooldowns.flameSurge = spec.cooldown;
      state.attackAnimTimer = 0.36;
      state.actionLock = 'recover';
      state.actionTimer = 0.18;
      state.torchlight = Math.min(state.maxTorchlight, state.torchlight + 12);
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult, spec.radius, -1, 7.2, 'flameSurge', false);

      // Flame Surge burns Cursed Shadow Totems within 4.35m (Light vs Darkness quest puzzle!)
      for (const totem of state.quest.cursedTotems) {
        if (totem.burned) continue;
        if (Math.hypot(state.heroX - totem.x, state.heroZ - totem.z) <= 4.35) {
          totem.burned = true;
          state.questManager.emit({type: 'totem:burned', targetId: totem.id}, state.quest);
          events.questChanged = true;
          events.heavyImpact = true;
          events.slashes.push({
            type: 'sigilBlast',
            x: totem.x,
            z: totem.z,
            yaw: 0,
            radius: 2.2,
            isNav: false,
          });
          events.sparks.push({x: totem.x, y: 1.1, z: totem.z, isNav: false, metal: true});
          state.quest.whisperKey = state.quest.totemPactBroken ? 'questTotemAllBurned' : 'questTotemBurned';
          state.quest.whisperTimer = 4.6;
        }
      }
    } else if (
      input.skill3Pressed &&
      state.skillCooldowns.navCleave <= 0 &&
      state.spirit >= SKILL_SPECS.navCleave.spiritCost
    ) {
      const spec = SKILL_SPECS.navCleave;
      state.spirit -= spec.spiritCost;
      state.skillCooldowns.navCleave = spec.cooldown;
      state.attackAnimTimer = 0.36;
      state.actionLock = 'recover';
      state.actionTimer = 0.18;
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult, spec.radius, -0.35, 6.4, 'navCleave', true);

      if (state.navShifted || state.vesselMutation === 'mireVenom') {
        const fx = Math.sin(state.heroYaw) * 2.1;
        const fz = Math.cos(state.heroYaw) * 2.1;
        state.sigils.push({
          id: state.nextEntityId++,
          x: state.heroX + fx,
          z: state.heroZ + fz,
          radius: PLAYER_BASE.bloodSigilRadius,
          life: 9.0,
          detonated: false,
        });
      }
    } else if (input.skill4Pressed && state.skillCooldowns.crescendo <= 0 && (state.resonance >= 2 || state.spirit >= 40)) {
      const spec = SKILL_SPECS.crescendo;
      const bonus = 1 + state.resonance * 0.2;
      state.skillCooldowns.crescendo = spec.cooldown;
      state.attackAnimTimer = 0.45;
      state.actionLock = 'recover';
      state.actionTimer = 0.22;
      state.hp = Math.min(state.maxHp, state.hp + 18 + state.resonance * 4);
      state.torchlight = Math.min(state.maxTorchlight, state.torchlight + 28);
      state.resonance = 0;
      events.heavyImpact = true;
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.55);
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult * bonus, spec.radius, -1, 11.0, 'crescendo', true);
    } else if (
      input.skill5Pressed &&
      state.skillCooldowns.whirlwind <= 0 &&
      state.spirit >= SKILL_SPECS.whirlwind.spiritCost
    ) {
      const spec = SKILL_SPECS.whirlwind;
      state.spirit -= spec.spiritCost;
      state.skillCooldowns.whirlwind = spec.cooldown;
      state.attackAnimTimer = 0.42;
      state.actionLock = 'recover';
      state.actionTimer = 0.2;
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.35);
      events.sparks.push({
        x: state.heroX,
        y: 1.0,
        z: state.heroZ,
        isNav: false,
        metal: true,
      });
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult, spec.radius, -1, 9.5, 'whirlwind', false);
    } else if (
      input.skill6Pressed &&
      state.skillCooldowns.svarogWard <= 0 &&
      state.spirit >= SKILL_SPECS.svarogWard.spiritCost
    ) {
      const spec = SKILL_SPECS.svarogWard;
      state.spirit -= spec.spiritCost;
      state.skillCooldowns.svarogWard = spec.cooldown;
      state.wardTimer = PLAYER_BASE.wardDurationSec;
      state.hp = Math.min(state.maxHp, state.hp + 18);
      state.torchlight = Math.min(state.maxTorchlight, state.torchlight + 22);
      state.attackAnimTimer = 0.32;
      state.actionLock = 'recover';
      state.actionTimer = 0.16;
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.24);
      hitCone(PLAYER_BASE.primaryDamage * spec.damageMult, spec.radius, -1, 8.0, 'svarogWard', false);
    }
  }

  // M11 Blood Sigil: Detonate burning ground sigils when hero dashes/jumps through them!
  for (let i = state.sigils.length - 1; i >= 0; i--) {
    const sig = state.sigils[i];
    sig.life -= dt;
    if (state.dashTimer > 0 && !sig.detonated) {
      const d = Math.hypot(state.heroX - sig.x, state.heroZ - sig.z);
      if (d <= sig.radius + 0.65) {
        sig.detonated = true;
        events.heavyImpact = true;
        state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.4);
        events.slashes.push({
          type: 'sigilBlast',
          x: sig.x,
          z: sig.z,
          yaw: 0,
          radius: sig.radius + 1.2,
          isNav: true,
        });
        for (const enemy of state.enemies) {
          if (enemy.state === 'ko') continue;
          const ed = Math.hypot(enemy.x - sig.x, enemy.z - sig.z);
          if (ed <= sig.radius + 1.2 + enemy.radius) {
            const dx = enemy.x - sig.x;
            const dz = enemy.z - sig.z;
            const dl = Math.max(0.01, Math.hypot(dx, dz));
            applyDamageToEnemy(state, enemy, PLAYER_BASE.bloodSigilDamage, dx / dl, dz / dl, 9.5, events);
          }
        }
      }
    }
    if (sig.detonated || sig.life <= 0) {
      state.sigils.splice(i, 1);
    }
  }

  // Spirit Vessel Orbs pickup (M09)
  for (let i = state.vesselOrbs.length - 1; i >= 0; i--) {
    const orb = state.vesselOrbs[i];
    orb.life -= dt;
    if (Math.hypot(state.heroX - orb.x, state.heroZ - orb.z) <= 1.65) {
      state.vesselMutation = orb.mutation;
      events.vesselPicked = orb.mutation;
      state.hp = Math.min(state.maxHp, state.hp + 30);
      state.vesselOrbs.splice(i, 1);
      continue;
    }
    if (orb.life <= 0) {
      state.vesselOrbs.splice(i, 1);
    }
  }

  // Enemy AI & Attack Token Pool (max 3 concurrent windups for combat clarity)
  let activeAttackers = state.enemies.filter((e) => e.state === 'windup').length;
  state.bossActive = false;

  for (const enemy of state.enemies) {
    if (enemy.state === 'ko') {
      enemy.koTimer -= dt;
      enemy.x += enemy.vx * dt;
      enemy.z += enemy.vz * dt;
      enemy.vx *= Math.exp(-8 * dt);
      enemy.vz *= Math.exp(-8 * dt);
      continue;
    }

    const cfg = ENEMY_CONFIGS[enemy.archetype];
    const dx = state.heroX - enemy.x;
    const dz = state.heroZ - enemy.z;
    const dist = Math.hypot(dx, dz);
    const dirX = dist > 0.01 ? dx / dist : 0;
    const dirZ = dist > 0.01 ? dz / dist : 1;

    if (enemy.archetype === 'leshy') {
      state.bossHpRatio = enemy.hp / enemy.maxHp;
      if (dist < 14 && (state.navGateOpen || enemy.aggroed)) {
        state.bossActive = true;
      }
      // Leshy Phase 2 summons helper Upyr once below 55% HP
      if (!enemy.phase2Triggered && enemy.hp < enemy.maxHp * 0.55) {
        enemy.phase2Triggered = true;
        const diff = DIFFICULTY_CONFIGS[state.difficulty];
        const addCfg = ENEMY_CONFIGS.upyr;
        const addHp = Math.round(addCfg.maxHp * diff.enemyHpMult);
        state.enemies.push({
          id: `summon_${state.nextEntityId++}`,
          archetype: 'upyr',
          roomId: 'sanctum',
          x: enemy.x + 3.2,
          z: enemy.z + 2.5,
          vx: 0,
          vz: 0,
          yaw: 0,
          hp: addHp,
          maxHp: addHp,
          radius: addCfg.radius,
          speed: addCfg.speed * diff.enemySpeedMult,
          damage: Math.round(addCfg.damage * diff.enemyDmgMult),
          state: 'chase',
          stateTimer: 0,
          windupDuration: addCfg.telegraphSec,
          cooldownTimer: 0.8,
          attackTargetX: state.heroX,
          attackTargetZ: state.heroZ,
          attackRadius: addCfg.attackRange,
          hitFlashTimer: 0,
          koTimer: 0,
          phase2Triggered: false,
          aggroed: true,
          strideDist: 0,
          speedRatio: 0,
          turnStepDir: 0,
        });
      }
    }

    // Aggro activation (never attacks across locked Sanctum gate or from across map)
    if (!enemy.aggroed) {
      const aggroRadius = enemy.archetype === 'leshy' ? 12.5 : 10.2;
      const gateBlocking = enemy.roomId === 'sanctum' && !state.navGateOpen;
      if (!gateBlocking && dist <= aggroRadius) {
        enemy.aggroed = true;
        enemy.state = 'chase';
      } else {
        enemy.speedRatio = 0;
        enemy.turnStepDir = 0;
        continue;
      }
    }

    enemy.cooldownTimer = Math.max(0, enemy.cooldownTimer - dt);
    const isHeavyBeast = enemy.archetype === 'volkolak' || enemy.archetype === 'leshy';
    const accelRate = isHeavyBeast ? 5.0 : 8.2;
    const decelRate = isHeavyBeast ? 3.8 : 6.4;

    if (enemy.state === 'windup') {
      enemy.stateTimer -= dt;
      enemy.vx *= Math.exp(-decelRate * 1.4 * dt);
      enemy.vz *= Math.exp(-decelRate * 1.4 * dt);
      enemy.turnStepDir = 0;
      if (enemy.stateTimer <= 0) {
        if (enemy.archetype === 'kikimora') {
          // Fires telegraphed mire bolt projectile
          const bdx = enemy.attackTargetX - enemy.x;
          const bdz = enemy.attackTargetZ - enemy.z;
          const bl = Math.max(0.01, Math.hypot(bdx, bdz));
          state.projectiles.push({
            id: state.nextEntityId++,
            fromPlayer: false,
            kind: 'mireBolt',
            x: enemy.x + (bdx / bl) * 0.7,
            z: enemy.z + (bdz / bl) * 0.7,
            vx: (bdx / bl) * 9.5,
            vz: (bdz / bl) * 9.5,
            yaw: Math.atan2(bdx, bdz),
            radius: 0.36,
            damage: enemy.damage,
            life: 2.2,
            isNav: true,
          });
        } else {
          // Melee / Ground slam AoE resolve inside telegraphed zone
          const hitDist = Math.hypot(state.heroX - enemy.attackTargetX, state.heroZ - enemy.attackTargetZ);
          if (hitDist <= enemy.attackRadius) {
            hurtPlayer(state, enemy.damage, enemy.x, enemy.z, events);
          } else if (state.dashTimer > 0 && hitDist <= enemy.attackRadius + 1.2) {
            // Perfect evade grants +1 Nav Crescendo stack (M10) AND opens Counter-Strike Window!
            state.resonance = Math.min(PLAYER_BASE.crescendoMaxStacks, state.resonance + 1);
            state.maxResonanceReached = Math.max(state.maxResonanceReached, state.resonance);
            state.resonanceDecayTimer = 8.0;
            state.counterTimer = PLAYER_BASE.counterWindowSec;
          }
          events.slashes.push({
            type: 'enemyHit',
            x: enemy.attackTargetX,
            z: enemy.attackTargetZ,
            yaw: enemy.yaw,
            radius: enemy.attackRadius,
            isNav: true,
          });
        }
        enemy.state = 'recover';
        enemy.stateTimer = 0.42;
        enemy.cooldownTimer = cfg.cooldownSec;
      }
    } else if (enemy.state === 'recover') {
      enemy.stateTimer -= dt;
      enemy.vx *= Math.exp(-decelRate * dt);
      enemy.vz *= Math.exp(-decelRate * dt);
      enemy.turnStepDir = 0;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'chase';
      }
    } else {
      // Enemy Locomotion: Turn-in-place (>90° side-step pivot), Archetype Steering & Heavy Momentum Easing
      const desiredYaw = Math.atan2(dirX, dirZ);
      const yawErr = angleDiff(enemy.yaw, desiredYaw);
      const absErr = Math.abs(yawErr);

      let moveScale = 1.0;
      let moveX = dirX;
      let moveZ = dirZ;

      if (absErr > Math.PI * 0.5) {
        // Turn-in-place: enemy brakes forward charge and steps laterally while pivoting!
        enemy.turnStepDir = yawErr >= 0 ? 1 : -1;
        const turnRate = isHeavyBeast ? 3.2 : 4.6;
        enemy.yaw = wrapAngle(enemy.yaw + Math.sign(yawErr) * Math.min(absErr, turnRate * dt));
        moveX = -Math.cos(enemy.yaw) * enemy.turnStepDir * 0.45;
        moveZ = Math.sin(enemy.yaw) * enemy.turnStepDir * 0.45;
        moveScale = 0.52;
      } else {
        enemy.turnStepDir = 0;
        const turnRate = isHeavyBeast ? 4.8 : 7.5;
        enemy.yaw = wrapAngle(enemy.yaw + yawErr * Math.min(1, dt * turnRate));
        if (enemy.archetype === 'kikimora') {
          if (dist < 4.5) {
            moveX = -dirX;
            moveZ = -dirZ;
          } else if (dist <= cfg.preferredDist + 1.5) {
            moveX = -dirZ * 0.6;
            moveZ = dirX * 0.6;
          }
        } else if (dist <= cfg.preferredDist) {
          moveScale = 0;
        }
      }

      const targetVx = moveX * enemy.speed * moveScale;
      const targetVz = moveZ * enemy.speed * moveScale;
      const speedCur = Math.hypot(enemy.vx, enemy.vz);
      const speedTarget = Math.hypot(targetVx, targetVz);
      const rate = speedTarget > speedCur * 0.85 ? accelRate : decelRate;
      const ease = 1 - Math.exp(-rate * dt);
      enemy.vx += (targetVx - enemy.vx) * ease;
      enemy.vz += (targetVz - enemy.vz) * ease;

      if (absErr <= Math.PI * 0.45 && dist <= cfg.attackRange && enemy.cooldownTimer <= 0 && activeAttackers < 3) {
        activeAttackers += 1;
        enemy.state = 'windup';
        enemy.stateTimer = enemy.windupDuration;
        if (enemy.archetype === 'volkolak' || enemy.archetype === 'leshy') {
          enemy.attackTargetX = state.heroX;
          enemy.attackTargetZ = state.heroZ;
          enemy.attackRadius = enemy.archetype === 'leshy' ? 3.5 : 2.6;
        } else if (enemy.archetype === 'kikimora') {
          enemy.attackTargetX = state.heroX;
          enemy.attackTargetZ = state.heroZ;
          enemy.attackRadius = 1.0;
        } else {
          enemy.attackTargetX = enemy.x + dirX * 1.45;
          enemy.attackTargetZ = enemy.z + dirZ * 1.45;
          enemy.attackRadius = 1.95;
        }
      }
    }

    const oldEx = enemy.x;
    const oldEz = enemy.z;
    const moved = resolveWalkableMovement(
      state.layout,
      enemy.x,
      enemy.z,
      enemy.x + enemy.vx * dt,
      enemy.z + enemy.vz * dt,
      enemy.radius,
      state.navGateOpen,
    );
    enemy.x = moved.x;
    enemy.z = moved.z;
    const stepDisp = Math.hypot(enemy.x - oldEx, enemy.z - oldEz);
    enemy.strideDist += stepDisp;
    enemy.speedRatio = Math.min(1.2, Math.hypot(enemy.vx, enemy.vz) / Math.max(0.5, enemy.speed));
  }

  // Prune expired KO enemies
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].state === 'ko' && state.enemies[i].koTimer <= 0) {
      state.enemies.splice(i, 1);
    }
  }

  // Projectiles (both Enemy mire bolts and Player Throwing Daggers)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (!p.fromPlayer) {
      if (Math.hypot(p.x - state.heroX, p.z - state.heroZ) <= p.radius + 0.48) {
        hurtPlayer(state, p.damage, p.x, p.z, events);
        state.projectiles.splice(i, 1);
        continue;
      }
    } else {
      let consumed = false;
      for (const enemy of state.enemies) {
        if (enemy.state === 'ko' || enemy.hp <= 0) continue;
        if (enemy.roomId === 'sanctum' && !state.navGateOpen) continue;
        const d = Math.hypot(p.x - enemy.x, p.z - enemy.z);
        if (d <= p.radius + enemy.radius + 0.15) {
          const pl = Math.max(0.01, Math.hypot(p.vx, p.vz));
          applyDamageToEnemy(state, enemy, p.damage, p.vx / pl, p.vz / pl, 3.6, events, true);
          state.spirit = Math.min(state.maxSpirit, state.spirit + 5);
          state.hitstopTimer = Math.max(state.hitstopTimer, 0.06);
          state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.14);
          consumed = true;
          break;
        }
      }
      if (consumed) {
        state.projectiles.splice(i, 1);
        continue;
      }
    }
    if (p.life <= 0) {
      state.projectiles.splice(i, 1);
    }
  }

  return events;
}
