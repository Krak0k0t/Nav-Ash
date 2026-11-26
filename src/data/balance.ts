export type DifficultyId = 'wanderer' | 'vityaz' | 'nightmare' | 'one_life';
export type GraphicsQualityId = 'low' | 'medium' | 'high' | 'ultra';
export type CameraStyleId = 'iso' | 'orbit';

export interface DifficultyConfig {
  id: DifficultyId;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemySpeedMult: number;
  telegraphScale: number;
  dropMult: number;
  permadeath: boolean;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  wanderer: {
    id: 'wanderer',
    enemyHpMult: 0.78,
    enemyDmgMult: 0.72,
    enemySpeedMult: 0.9,
    telegraphScale: 1.2,
    dropMult: 1.0,
    permadeath: false,
  },
  vityaz: {
    id: 'vityaz',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemySpeedMult: 1.0,
    telegraphScale: 1.0,
    dropMult: 1.15,
    permadeath: false,
  },
  nightmare: {
    id: 'nightmare',
    enemyHpMult: 1.42,
    enemyDmgMult: 1.45,
    enemySpeedMult: 1.12,
    telegraphScale: 0.85,
    dropMult: 1.5,
    permadeath: false,
  },
  one_life: {
    id: 'one_life',
    enemyHpMult: 1.32,
    enemyDmgMult: 1.38,
    enemySpeedMult: 1.1,
    telegraphScale: 0.88,
    dropMult: 1.85,
    permadeath: true,
  },
};

export interface GraphicsPresetConfig {
  id: GraphicsQualityId;
  pixelRatioMax: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  postprocessing: boolean;
  bloom: boolean;
  foliageDensity: number;
  mistLayers: number;
  emberCount: number;
  drawDistance: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsQualityId, GraphicsPresetConfig> = {
  low: {
    id: 'low',
    pixelRatioMax: 1.0,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postprocessing: false,
    bloom: false,
    foliageDensity: 0.35,
    mistLayers: 1,
    emberCount: 16,
    drawDistance: 75,
  },
  medium: {
    id: 'medium',
    pixelRatioMax: 1.25,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    postprocessing: false,
    bloom: false,
    foliageDensity: 0.62,
    mistLayers: 2,
    emberCount: 30,
    drawDistance: 98,
  },
  high: {
    id: 'high',
    pixelRatioMax: 1.75,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postprocessing: true,
    bloom: true,
    foliageDensity: 0.85,
    mistLayers: 3,
    emberCount: 48,
    drawDistance: 125,
  },
  ultra: {
    id: 'ultra',
    pixelRatioMax: 2.0,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postprocessing: true,
    bloom: true,
    foliageDensity: 1.0,
    mistLayers: 3,
    emberCount: 64,
    drawDistance: 155,
  },
};

export interface SkillSpec {
  id: 'shieldWave' | 'flameSurge' | 'navCleave' | 'crescendo' | 'whirlwind' | 'svarogWard';
  cooldown: number;
  spiritCost: number;
  damageMult: number;
  radius: number;
}

export const SKILL_SPECS: Record<SkillSpec['id'], SkillSpec> = {
  shieldWave: {
    id: 'shieldWave',
    cooldown: 3.5,
    spiritCost: 15,
    damageMult: 1.35,
    radius: 3.1,
  },
  flameSurge: {
    id: 'flameSurge',
    cooldown: 5.5,
    spiritCost: 26,
    damageMult: 2.1,
    radius: 3.8,
  },
  navCleave: {
    id: 'navCleave',
    cooldown: 6.5,
    spiritCost: 28,
    damageMult: 2.45,
    radius: 4.1,
  },
  crescendo: {
    id: 'crescendo',
    cooldown: 9.0,
    spiritCost: 0,
    damageMult: 3.6,
    radius: 5.4,
  },
  whirlwind: {
    id: 'whirlwind',
    cooldown: 7.0,
    spiritCost: 30,
    damageMult: 2.25,
    radius: 3.9,
  },
  svarogWard: {
    id: 'svarogWard',
    cooldown: 11.0,
    spiritCost: 22,
    damageMult: 1.1,
    radius: 3.2,
  },
};

export type EnemyArchetype = 'upyr' | 'kikimora' | 'volkolak' | 'leshy';

export interface EnemyArchetypeConfig {
  id: EnemyArchetype;
  maxHp: number;
  speed: number;
  attackRange: number;
  preferredDist: number;
  damage: number;
  telegraphSec: number;
  cooldownSec: number;
  radius: number;
  isElite: boolean;
  isBoss: boolean;
  ashesReward: number;
}

export const ENEMY_CONFIGS: Record<EnemyArchetype, EnemyArchetypeConfig> = {
  upyr: {
    id: 'upyr',
    maxHp: 78,
    speed: 3.7,
    attackRange: 2.1,
    preferredDist: 1.45,
    damage: 13,
    telegraphSec: 0.48,
    cooldownSec: 1.45,
    radius: 0.65,
    isElite: false,
    isBoss: false,
    ashesReward: 18,
  },
  kikimora: {
    id: 'kikimora',
    maxHp: 56,
    speed: 3.0,
    attackRange: 10.5,
    preferredDist: 6.8,
    damage: 14,
    telegraphSec: 0.62,
    cooldownSec: 2.35,
    radius: 0.58,
    isElite: false,
    isBoss: false,
    ashesReward: 22,
  },
  volkolak: {
    id: 'volkolak',
    maxHp: 210,
    speed: 4.1,
    attackRange: 3.1,
    preferredDist: 1.85,
    damage: 24,
    telegraphSec: 0.68,
    cooldownSec: 2.0,
    radius: 0.95,
    isElite: true,
    isBoss: false,
    ashesReward: 65,
  },
  leshy: {
    id: 'leshy',
    maxHp: 620,
    speed: 2.85,
    attackRange: 4.6,
    preferredDist: 2.8,
    damage: 28,
    telegraphSec: 0.78,
    cooldownSec: 2.25,
    radius: 1.35,
    isElite: true,
    isBoss: true,
    ashesReward: 250,
  },
};

export type VesselMutationId = 'none' | 'wolfFury' | 'mireVenom' | 'ashBrand';

export const PLAYER_BASE = {
  maxHp: 140,
  maxSpirit: 100,
  maxTorchlight: 100,
  maxPotions: 4,
  moveSpeed: 6.4,
  backpedalFactor: 0.66,
  armorAccelRate: 8.6,
  armorDecelRate: 6.4,
  turnRate: 11.0,
  dashSpeed: 14.5,
  jumpWindupSec: 0.095,
  dashDuration: 0.31,
  jumpLandSec: 0.16,
  dashCooldown: 0.95,
  primaryCooldown: 0.55,
  meleeWindupSec: 0.105,
  meleeRecoverSec: 0.135,
  hitstopMeleeSec: 0.115,
  primaryDamage: 28,
  primaryRange: 2.95,
  daggerCooldown: 0.72,
  daggerDamage: 5,
  daggerSpeed: 24.0,
  daggerRange: 26.0,
  daggerWindupSec: 0.065,
  daggerRecoverSec: 0.155,
  potionCooldown: 4.5,
  counterWindowSec: 1.8,
  counterDamageMult: 1.45,
  wardDurationSec: 2.6,
  wardDamageMult: 0.45,
  targetLockRange: 26.0,
  targetBreakRange: 32.0,
  altarTorchCost: 22,
  crescendoMaxStacks: 5,
  bloodSigilDamage: 46,
  bloodSigilRadius: 3.2,
};
