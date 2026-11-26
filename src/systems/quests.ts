export type QuestEventType =
  | 'echo:revealed'
  | 'echo:shardCollected'
  | 'totem:burned'
  | 'spirit:bargained'
  | 'lore:discovered';

export interface QuestEventPayload {
  type: QuestEventType;
  targetId?: string;
  choice?: 'offerLight' | 'shatter';
}

export interface QuestObjective {
  id: string;
  requiredCount: number;
  currentCount: number;
  completed: boolean;
  onEvent: (ev: QuestEventPayload) => boolean;
}

export interface EchoShardNode {
  id: string;
  x: number;
  z: number;
  collected: boolean;
}

export interface CursedTotemNode {
  id: string;
  x: number;
  z: number;
  burned: boolean;
  protectedEnemyId: string;
}

export interface MirrorShrineNode {
  id: string;
  x: number;
  z: number;
  revealed: boolean;
}

export interface BargainSpiritNode {
  id: string;
  x: number;
  z: number;
  outcome: 'pending' | 'blessed' | 'shattered';
}

export interface LoreStoneNode {
  id: string;
  x: number;
  z: number;
  whisperKey: string;
  discovered: boolean;
}

export interface WorldQuestState {
  echoShrine: MirrorShrineNode;
  echoShards: EchoShardNode[];
  echoCompleted: boolean;
  cursedTotems: CursedTotemNode[];
  totemPactBroken: boolean;
  bargainSpirit: BargainSpiritNode;
  spiritInteracted: boolean;
  loreStones: LoreStoneNode[];
  resonanceFloor: number;
  whisperKey: string | null;
  whisperTimer: number;
}

export type QuestObserver = (ev: QuestEventPayload, world: WorldQuestState) => void;

export class QuestManager {
  readonly objectives = new Map<string, QuestObjective>();
  private observers = new Set<QuestObserver>();

  subscribe(fn: QuestObserver): () => void {
    this.observers.add(fn);
    return () => this.observers.delete(fn);
  }

  registerObjective(obj: QuestObjective): void {
    this.objectives.set(obj.id, obj);
  }

  emit(ev: QuestEventPayload, world: WorldQuestState): void {
    for (const obj of this.objectives.values()) {
      if (!obj.completed) {
        obj.onEvent(ev);
      }
    }
    for (const obs of this.observers) {
      obs(ev, world);
    }
  }
}

export function createWorldQuestState(): {world: WorldQuestState; manager: QuestManager} {
  const world: WorldQuestState = {
    echoShrine: {id: 'mirror_mire', x: -10.5, z: -24.5, revealed: false},
    echoShards: [
      {id: 'shard_1', x: -6.5, z: -39.0, collected: false},
      {id: 'shard_2', x: 38.5, z: -34.0, collected: false},
      {id: 'shard_3', x: -34.0, z: -32.0, collected: false},
    ],
    echoCompleted: false,
    cursedTotems: [
      {id: 'totem_1', x: -6.0, z: -76.5, burned: false, protectedEnemyId: 'e_barrow_elite'},
      {id: 'totem_2', x: 10.0, z: -77.5, burned: false, protectedEnemyId: 'e_barrow_elite'},
      {id: 'totem_3', x: 2.0, z: -86.0, burned: false, protectedEnemyId: 'e_barrow_elite'},
    ],
    totemPactBroken: false,
    bargainSpirit: {id: 'spirit_hollow', x: -42.0, z: -35.5, outcome: 'pending'},
    spiritInteracted: false,
    loreStones: [
      {id: 'lore_ostrog', x: 4.8, z: 3.2, whisperKey: 'loreOstrog', discovered: false},
      {id: 'lore_mire', x: 8.5, z: -29.0, whisperKey: 'loreMire', discovered: false},
      {id: 'lore_barrow', x: -7.5, z: -72.0, whisperKey: 'loreBarrow', discovered: false},
      {id: 'lore_watchpost', x: 31.0, z: -34.0, whisperKey: 'loreWatchpost', discovered: false},
    ],
    resonanceFloor: 0,
    whisperKey: null,
    whisperTimer: 0,
  };

  const manager = new QuestManager();

  // Objective 1: Gather 3 Echo Shards after awakening Mirror memory
  const echoObj: QuestObjective = {
    id: 'echoes_of_nav',
    requiredCount: 3,
    currentCount: 0,
    completed: false,
    onEvent: (ev) => {
      if (ev.type === 'echo:shardCollected') {
        echoObj.currentCount = Math.min(echoObj.requiredCount, echoObj.currentCount + 1);
        if (echoObj.currentCount >= echoObj.requiredCount) {
          echoObj.completed = true;
          world.echoCompleted = true;
        }
        return true;
      }
      return false;
    },
  };

  // Objective 2: Burn all 3 Cursed Totems with Flame Surge [2] to strip Volkolak's Darkness Shield
  const totemObj: QuestObjective = {
    id: 'cursed_totems',
    requiredCount: 3,
    currentCount: 0,
    completed: false,
    onEvent: (ev) => {
      if (ev.type === 'totem:burned') {
        totemObj.currentCount = Math.min(totemObj.requiredCount, totemObj.currentCount + 1);
        if (totemObj.currentCount >= totemObj.requiredCount) {
          totemObj.completed = true;
          world.totemPactBroken = true;
        }
        return true;
      }
      return false;
    },
  };

  // Objective 3: Birch Spirit Moral Deal
  const spiritObj: QuestObjective = {
    id: 'spirit_bargain',
    requiredCount: 1,
    currentCount: 0,
    completed: false,
    onEvent: (ev) => {
      if (ev.type === 'spirit:bargained') {
        spiritObj.currentCount = 1;
        spiritObj.completed = true;
        return true;
      }
      return false;
    },
  };

  // Objective 4: Ancient Lore Runestones across the Mire
  const loreObj: QuestObjective = {
    id: 'lore_chronicles',
    requiredCount: 4,
    currentCount: 0,
    completed: false,
    onEvent: (ev) => {
      if (ev.type === 'lore:discovered') {
        loreObj.currentCount = Math.min(loreObj.requiredCount, loreObj.currentCount + 1);
        if (loreObj.currentCount >= loreObj.requiredCount) {
          loreObj.completed = true;
        }
        return true;
      }
      return false;
    },
  };

  manager.registerObjective(echoObj);
  manager.registerObjective(totemObj);
  manager.registerObjective(spiritObj);
  manager.registerObjective(loreObj);

  return {world, manager};
}

export function isEnemyDarknessShielded(world: WorldQuestState, enemyId: string): boolean {
  return world.cursedTotems.some((t) => !t.burned && t.protectedEnemyId === enemyId);
}
