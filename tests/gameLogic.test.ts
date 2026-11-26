import {describe, expect, it} from 'vitest';
import {
  DEFAULT_BINDINGS,
  DEFAULT_SETTINGS,
  formatBindingLabel,
  rebindAction,
} from '../src/core/settings';
import {
  LANGUAGES,
  LOCALES,
  getLocaleDir,
  getStrings,
  type LanguageId,
} from '../src/data/locales';
import {PLAYER_BASE} from '../src/data/balance';
import {
  generateDungeon,
  isPointWalkable,
} from '../src/systems/dungeonGen';
import {
  createGameSimState,
  detectGroundSurface,
  evalJumpHeightCurve,
  getLockedTarget,
  getTargetCandidates,
  resolveSpiritBargain,
  stepGameSim,
  type SimInput,
} from '../src/systems/gameSim';
import {isEnemyDarknessShielded, type QuestEventType} from '../src/systems/quests';

const IDLE_INPUT: SimInput = {
  strafeX: 0,
  forwardZ: 0,
  cameraYaw: 0,
  steerToCamera: false,
  primaryPressed: false,
  daggerPressed: false,
  targetCyclePressed: false,
  evadePressed: false,
  skill1Pressed: false,
  skill2Pressed: false,
  skill3Pressed: false,
  skill4Pressed: false,
  interactPressed: false,
  potionPressed: false,
};

describe('16-Language Localization & Defaults', () => {
  it('defaults initial language to English and supports all 16 required languages', () => {
    expect(DEFAULT_SETTINGS.language).toBe('en');
    const expected: LanguageId[] = [
      'en', 'fr', 'de', 'es', 'pt', 'zh', 'ar', 'uk',
      'ru', 'ja', 'pl', 'it', 'vi', 'fa', 'elvish', 'orcish',
    ];
    expect(LANGUAGES.map((l) => l.id)).toEqual(expected);
    for (const lang of expected) {
      const strings = getStrings(lang);
      expect(strings.gameTitle.length).toBeGreaterThan(0);
      expect(strings.playBtn.length).toBeGreaterThan(0);
      expect(strings.skillDagger.length).toBeGreaterThan(0);
      expect(strings.mapTitle.length).toBeGreaterThan(0);
      expect(Object.keys(strings).length).toBe(Object.keys(LOCALES.en).length);
    }
  });

  it('marks Arabic and Farsi as RTL and others as LTR', () => {
    expect(getLocaleDir('ar')).toBe('rtl');
    expect(getLocaleDir('fa')).toBe('rtl');
    expect(getLocaleDir('en')).toBe('ltr');
    expect(getLocaleDir('ru')).toBe('ltr');
  });
});

describe('Keyboard & Mouse Rebinding', () => {
  it('rebinds actions cleanly and swaps colliding bindings', () => {
    expect(DEFAULT_BINDINGS.daggerThrow).toBe('KeyR');
    expect(DEFAULT_BINDINGS.targetCycle).toBe('Tab');
    expect(DEFAULT_BINDINGS.mapToggle).toBe('KeyM');

    const rebound = rebindAction(DEFAULT_BINDINGS, 'evade', 'Space');
    expect(rebound.evade).toBe('Space');
    expect(formatBindingLabel('MouseRight')).toBe('RMB');
    expect(formatBindingLabel('MouseLeft')).toBe('LMB');
    expect(formatBindingLabel('Tab')).toBe('Tab');
    expect(formatBindingLabel('KeyM')).toBe('M');

    // Swapping primary (MouseLeft) onto Space swaps evade back to MouseLeft cleanly
    const swapped = rebindAction(rebound, 'primary', 'Space');
    expect(swapped.primary).toBe('Space');
    expect(swapped.evade).toBe('MouseLeft');
  });
});

describe('Dungeon Generation & Nav Gate Path Inversion', () => {
  it('spawns hero on open clearing, builds 7 expanded zones (>170m span), and blocks Sanctum until Nav Gate opens', () => {
    const layout = generateDungeon(1307);
    expect(layout.rooms.length).toBe(7);
    expect(isPointWalkable(layout, layout.spawnX, layout.spawnZ, 0.5, false)).toBe(true);
    // Open valley grass outside old narrow corridors has zero invisible walls
    expect(isPointWalkable(layout, -7.5, -13.0, 0.5, false)).toBe(true);
    expect(isPointWalkable(layout, -15.0, -20.0, 0.5, false)).toBe(true);
    // Visible Ostrog palisade wing at z = -6.2 blocks physically
    expect(isPointWalkable(layout, -6.5, -6.2, 0.5, false)).toBe(false);
    // East Wing (Sunken Watchpost) & Deep North Wing (Ashfen Necropolis) are walkable
    expect(isPointWalkable(layout, 38, -34, 0.5, false)).toBe(true);
    expect(isPointWalkable(layout, -1, -118, 0.5, false)).toBe(true);
    // Sanctum boss room at z = -162 is sealed until Nav Altar inverts the gate
    expect(isPointWalkable(layout, 0, -162, 0.5, false)).toBe(false);
    expect(isPointWalkable(layout, 0, -162, 0.5, true)).toBe(true);
  });
});

describe('ARPG Combat, Target Cycling, Throwing Dagger & Combat Weight', () => {
  it('executes heavy jump windup -> cached LUT parabolic air curve -> landing impact with ground surface', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const startHp = sim.hp;
    for (let i = 0; i < 120; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(sim.hp).toBe(startHp);

    // Asymmetric heavy-armor jump curve: brisk upward launch (peaks ~0.34) and heavier, faster descent
    expect(evalJumpHeightCurve(0)).toBe(0);
    expect(evalJumpHeightCurve(0.34)).toBeGreaterThan(0.95);
    expect(evalJumpHeightCurve(0.8)).toBeLessThan(evalJumpHeightCurve(0.2));
    expect(evalJumpHeightCurve(1)).toBe(0);

    // Trigger evade jump while moving North (-Z): verify windup -> air -> land lifecycle
    const zBefore = sim.heroZ;
    let sawWindup = false;
    let sawDash = false;
    let sawLandSurface: string | null = null;
    let maxJumpY = 0;
    for (let i = 0; i < 36; i++) {
      const ev = stepGameSim(
        sim,
        {...IDLE_INPUT, forwardZ: 1, evadePressed: i === 0},
        1 / 60,
      );
      if (ev.jumpAnticipated || sim.jumpState === 'windup') sawWindup = true;
      if (ev.dashed) sawDash = true;
      if (ev.jumpLanded) sawLandSurface = ev.jumpLanded;
      maxJumpY = Math.max(maxJumpY, sim.heroY);
    }
    expect(sawWindup).toBe(true);
    expect(sawDash).toBe(true);
    expect(sawLandSurface).toBeTruthy();
    expect(sim.heroZ).toBeLessThan(zBefore - 2.0);
    expect(maxJumpY).toBeGreaterThan(0.75);
  });

  it('cycles Tab targets nearest -> next farther -> wraps and ignores sealed Sanctum', () => {
    const sim = createGameSimState(1307, 'vityaz');
    // Move hero near central forest road where enemies reside
    sim.heroX = 0;
    sim.heroZ = -18;
    const candidates = getTargetCandidates(sim);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.some((c) => c.roomId === 'sanctum')).toBe(false);

    // Confirm ascending distance order
    for (let i = 1; i < candidates.length; i++) {
      const dPrev = Math.hypot(candidates[i - 1].x - sim.heroX, candidates[i - 1].z - sim.heroZ);
      const dCur = Math.hypot(candidates[i].x - sim.heroX, candidates[i].z - sim.heroZ);
      expect(dCur).toBeGreaterThanOrEqual(dPrev - 0.001);
    }

    // First Tab -> nearest target
    const ev1 = stepGameSim(sim, {...IDLE_INPUT, targetCyclePressed: true}, 1 / 60);
    expect(ev1.targetChanged).toBe(true);
    expect(sim.lockedTargetId).toBe(candidates[0].id);

    // Second Tab -> second nearest target
    const ev2 = stepGameSim(sim, {...IDLE_INPUT, targetCyclePressed: true}, 1 / 60);
    expect(ev2.targetChanged).toBe(true);
    expect(sim.lockedTargetId).toBe(candidates[1].id);

    // Cycling all the way around wraps back to candidates[0]
    for (let i = 2; i < candidates.length; i++) {
      stepGameSim(sim, {...IDLE_INPUT, targetCyclePressed: true}, 1 / 60);
    }
    stepGameSim(sim, {...IDLE_INPUT, targetCyclePressed: true}, 1 / 60);
    expect(sim.lockedTargetId).toBe(candidates[0].id);
  });

  it('throws quartered-damage daggers (5 dmg) and aggros nearby pack allies around the struck enemy', () => {
    expect(PLAYER_BASE.daggerDamage).toBe(5);

    const sim = createGameSimState(1307, 'vityaz');
    // Position hero in Mire outside normal aggro radius (> 10.5m) of Mire pack
    sim.heroX = 0;
    sim.heroZ = -12;
    const mire1 = sim.enemies.find((e) => e.id === 'e_mire_1')!;
    const mire2 = sim.enemies.find((e) => e.id === 'e_mire_2')!;
    const distantBarrow = sim.enemies.find((e) => e.id === 'e_barrow_1')!;
    mire1.x = 0;
    mire1.z = -24; // 12m north of hero (outside 10.2m passive aggro)
    mire2.x = 4.5;
    mire2.z = -26; // ~5m from mire1, ~14.7m from hero
    mire1.hp = 100;
    mire1.aggroed = false;
    mire2.aggroed = false;
    distantBarrow.aggroed = false;

    sim.lockedTargetId = mire1.id;
    expect(getLockedTarget(sim)?.id).toBe(mire1.id);

    // Throw dagger #1
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    expect(sim.actionLock).toBe('windup');

    let sawDaggerSpawn = false;
    for (let i = 0; i < 50; i++) {
      const ev = stepGameSim(sim, IDLE_INPUT, 1 / 60);
      if (ev.daggerThrown) sawDaggerSpawn = true;
    }
    expect(sawDaggerSpawn).toBe(true);
    // Dagger deals quartered 5 damage (100 -> 95)
    expect(100 - mire1.hp).toBe(5);
    // Ranged hit alerts both the struck target AND its nearby packmate, while far rooms stay idle
    expect(mire1.aggroed).toBe(true);
    expect(mire2.aggroed).toBe(true);
    expect(distantBarrow.aggroed).toBe(false);
    expect(sim.actionLock).toBe('none');

    // Wait through dagger cooldown (0.72s = ~44 frames; we already waited 50 frames) and chain dagger #2
    const hpAfterFirst = mire1.hp;
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    for (let i = 0; i < 50; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(mire1.hp).toBeLessThan(hpAfterFirst);
  });

  it('activates Nav Altar, opens Sanctum gate, drops Blood Sigil and detonates on Dash', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const altar = sim.layout.altars[0];
    sim.heroX = altar.x;
    sim.heroZ = altar.z + 1.8;

    const shiftEv = stepGameSim(sim, {...IDLE_INPUT, interactPressed: true}, 1 / 60);
    expect(shiftEv.navShifted).toBe(true);
    expect(sim.navShifted).toBe(true);
    expect(sim.navGateOpen).toBe(true);

    // Cast Nav Cleave -> leaves Blood Sigil in Nav, wait through 0.18s recovery
    stepGameSim(sim, {...IDLE_INPUT, skill3Pressed: true}, 1 / 60);
    expect(sim.sigils.length).toBe(1);
    for (let i = 0; i < 12; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }

    // Place an enemy near the sigil and dash straight into it
    const targetEnemy = sim.enemies[0];
    targetEnemy.x = sim.sigils[0].x + 0.5;
    targetEnemy.z = sim.sigils[0].z;
    const prevHp = targetEnemy.hp;

    let sawBlast = false;
    for (let i = 0; i < 16; i++) {
      const ev = stepGameSim(
        sim,
        {...IDLE_INPUT, forwardZ: 1, evadePressed: i === 0},
        1 / 60,
      );
      if (ev.slashes.some((s) => s.type === 'sigilBlast')) sawBlast = true;
    }
    expect(sawBlast).toBe(true);
    expect(targetEnemy.hp).toBeLessThan(prevHp);
  });

  it('tracks root-motion stride footsteps across wood/stone/earth and weighted melee windup + hitstop', () => {
    expect(detectGroundSurface(3.5, 1.0)).toBe('wood');
    expect(detectGroundSurface(0, 1.0)).toBe('stone');
    expect(detectGroundSurface(8.0, -25.0)).toBe('earth');

    const sim = createGameSimState(1307, 'vityaz');
    let stepEvents = 0;
    for (let i = 0; i < 30; i++) {
      const ev = stepGameSim(sim, {...IDLE_INPUT, forwardZ: 1}, 1 / 60);
      stepEvents += ev.footsteps.length;
    }
    expect(sim.heroStrideDist).toBeGreaterThan(1.0);
    expect(stepEvents).toBeGreaterThanOrEqual(1);

    // Armored momentum preserves smooth deceleration instead of instant stop
    stepGameSim(sim, IDLE_INPUT, 1 / 60);
    expect(Math.hypot(sim.heroVx, sim.heroVz)).toBeGreaterThan(1.0);
  });

  it('supports Shift sprint boost and Campfire warmth/kindling', () => {
    const simWalk = createGameSimState(1307, 'vityaz');
    const simSprint = createGameSimState(1307, 'vityaz');
    for (let i = 0; i < 40; i++) {
      stepGameSim(simWalk, {...IDLE_INPUT, forwardZ: 1, sprintHeld: false}, 1 / 60);
      stepGameSim(simSprint, {...IDLE_INPUT, forwardZ: 1, sprintHeld: true}, 1 / 60);
    }
    expect(simSprint.heroSprintFactor).toBeGreaterThan(0.8);
    expect(simSprint.heroZ).toBeLessThan(simWalk.heroZ - 0.6);

    // Campfire warmth & kindling [E]
    const fire = simWalk.layout.campfires[1];
    simWalk.heroX = fire.x + 1.4;
    simWalk.heroZ = fire.z;
    simWalk.torchlight = 40;
    simWalk.hp = 60;
    const ev = stepGameSim(simWalk, {...IDLE_INPUT, interactPressed: true}, 1 / 60);
    expect(ev.campfireKindled).toBe(true);
    expect(simWalk.torchlight).toBeGreaterThan(70);
    expect(simWalk.hp).toBeGreaterThan(80);
  });

  it('triggers victory on Leshy defeat after weighted cleave windup and permadeath on One Life', () => {
    const sim = createGameSimState(1307, 'one_life');
    const boss = sim.enemies.find((e) => e.archetype === 'leshy')!;
    sim.navGateOpen = true;
    sim.heroX = boss.x;
    sim.heroZ = boss.z + 1.4;
    sim.heroYaw = Math.PI;
    boss.hp = 10;

    let bossDefeated = false;
    for (let i = 0; i < 12; i++) {
      const ev = stepGameSim(sim, {...IDLE_INPUT, primaryPressed: i === 0}, 1 / 60);
      if (ev.bossDefeated) bossDefeated = true;
    }
    expect(bossDefeated).toBe(true);
    expect(sim.outcome?.victory).toBe(true);
    expect(sim.hitstopTimer).toBeGreaterThanOrEqual(0.1);

    // Verify defeat & One Life permadeath
    const simDead = createGameSimState(1307, 'one_life');
    simDead.hp = 0;
    for (let i = 0; i < 45; i++) {
      stepGameSim(simDead, IDLE_INPUT, 1 / 60);
    }
    expect(simDead.outcome?.victory).toBe(false);
    expect(simDead.outcome?.permadeathTriggered).toBe(true);
  });
});

describe('Enemy Root-Motion Locomotion, >90° Turn-in-Place & Heavy Inertia', () => {
  it('pivots via turn-in-place lateral step when hero is behind (>90°) and advances strideDist from real displacement', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const enemy = sim.enemies.find((e) => e.archetype === 'upyr')!;
    enemy.x = 0;
    enemy.z = -18;
    enemy.yaw = 0; // Facing North (+Z in model yaw=0 -> sin(0)=0, cos(0)=1)
    enemy.aggroed = true;
    enemy.state = 'chase';
    enemy.strideDist = 0;

    // Place hero 6m behind the enemy (-Z relative to enemy)
    sim.heroX = 0.4;
    sim.heroZ = -24;

    stepGameSim(sim, IDLE_INPUT, 1 / 60);
    expect(enemy.turnStepDir).not.toBe(0);
    const strideAfterTurn = enemy.strideDist;

    // Step forward for 0.4s: enemy turns smoothly toward hero and advances strideDist cleanly
    for (let i = 0; i < 24; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(enemy.strideDist).toBeGreaterThan(strideAfterTurn + 0.15);
  });

  it('gives heavy beasts (volkolak/leshy) heavier momentum carry during deceleration than agile upyr', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const volk = sim.enemies.find((e) => e.archetype === 'volkolak')!;
    const upyr = sim.enemies.find((e) => e.archetype === 'upyr')!;

    volk.aggroed = true;
    volk.state = 'recover';
    volk.stateTimer = 0.5;
    volk.vx = 4.0;
    volk.vz = 0;

    upyr.aggroed = true;
    upyr.state = 'recover';
    upyr.stateTimer = 0.5;
    upyr.vx = 4.0;
    upyr.vz = 0;

    for (let i = 0; i < 10; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    // Heavy beast retains significantly more forward velocity after stopping input
    expect(Math.abs(volk.vx)).toBeGreaterThan(Math.abs(upyr.vx));
  });
});

describe('Observer-Driven Slavic World Quests', () => {
  it('awakens Mirror Shrine and completes Echoes of Nav upon collecting all 3 Shards', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const seenEvents: QuestEventType[] = [];
    sim.questManager.subscribe((ev) => {
      seenEvents.push(ev.type);
    });

    const startMaxHp = sim.maxHp;
    const startAshes = sim.ashes;

    // Stand near Mirror Shrine and interact
    sim.heroX = sim.quest.echoShrine.x;
    sim.heroZ = sim.quest.echoShrine.z + 1.0;
    stepGameSim(sim, {...IDLE_INPUT, interactPressed: true}, 1 / 60);
    expect(sim.quest.echoShrine.revealed).toBe(true);
    expect(seenEvents).toContain('echo:revealed');

    // Collect all 3 revealed Echo Shards
    for (const sh of sim.quest.echoShards) {
      sim.heroX = sh.x;
      sim.heroZ = sh.z;
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }

    expect(sim.quest.echoCompleted).toBe(true);
    expect(sim.questManager.objectives.get('echoes_of_nav')?.completed).toBe(true);
    expect(sim.maxHp).toBe(startMaxHp + 20);
    expect(sim.ashes).toBe(startAshes + 65);
  });

  it('protects Barrow Volkolak with 90% Darkness Shield until Flame Surge [2] burns all 3 Cursed Totems', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const elite = sim.enemies.find((e) => e.id === 'e_barrow_elite')!;
    expect(isEnemyDarknessShielded(sim.quest, elite.id)).toBe(true);

    // Strike shielded elite with Throwing Dagger -> deals 90% reduced damage (~2 dmg instead of 22)
    sim.heroX = elite.x;
    sim.heroZ = elite.z + 2.5;
    sim.lockedTargetId = elite.id;
    const hpBeforeShieldHit = elite.hp;
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    for (let i = 0; i < 30; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    const shieldedDmgTaken = hpBeforeShieldHit - elite.hp;
    expect(shieldedDmgTaken).toBeGreaterThan(0);
    expect(shieldedDmgTaken).toBeLessThanOrEqual(4);

    // Burn all 3 Cursed Totems using Flame Surge [2]
    const burnedIds: string[] = [];
    sim.questManager.subscribe((ev) => {
      if (ev.type === 'totem:burned' && ev.targetId) burnedIds.push(ev.targetId);
    });

    for (const totem of sim.quest.cursedTotems) {
      sim.skillCooldowns.flameSurge = 0;
      sim.spirit = sim.maxSpirit;
      sim.actionLock = 'none';
      sim.heroX = totem.x;
      sim.heroZ = totem.z + 1.5;
      stepGameSim(sim, {...IDLE_INPUT, skill2Pressed: true}, 1 / 60);
      for (let i = 0; i < 15; i++) {
        stepGameSim(sim, IDLE_INPUT, 1 / 60);
      }
    }

    expect(burnedIds.length).toBe(3);
    expect(sim.quest.totemPactBroken).toBe(true);
    expect(isEnemyDarknessShielded(sim.quest, elite.id)).toBe(false);

    // Throwing Dagger now deals full unshielded quartered damage (5)
    sim.hitstopTimer = 0;
    sim.actionLock = 'none';
    sim.lockedTargetId = elite.id;
    sim.heroX = elite.x;
    sim.heroZ = elite.z + 2.5;
    const hpAfterBreak = elite.hp;
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    for (let i = 0; i < 30; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(hpAfterBreak - elite.hp).toBe(5);
  });

  it('resolves Whispering Birch Spirit moral bargain with permanent Resonance floor vs Blood Sigil burst', () => {
    const simLight = createGameSimState(1307, 'vityaz');
    const leshyLight = simLight.enemies.find((e) => e.archetype === 'leshy')!;
    const leshyOrigMaxHp = leshyLight.maxHp;
    const ashesBefore = simLight.ashes;

    expect(resolveSpiritBargain(simLight, 'offerLight')).toBe(true);
    expect(simLight.quest.bargainSpirit.outcome).toBe('blessed');
    expect(simLight.quest.resonanceFloor).toBe(1);
    expect(simLight.resonance).toBeGreaterThanOrEqual(1);
    expect(simLight.ashes).toBe(ashesBefore + 35);
    expect(leshyLight.maxHp).toBeLessThan(leshyOrigMaxHp);
    // Double resolution is prevented
    expect(resolveSpiritBargain(simLight, 'shatter')).toBe(false);

    const simDark = createGameSimState(1307, 'vityaz');
    simDark.spirit = 10;
    expect(resolveSpiritBargain(simDark, 'shatter')).toBe(true);
    expect(simDark.quest.bargainSpirit.outcome).toBe('shattered');
    expect(simDark.spirit).toBe(60);
    expect(simDark.sigils.length).toBe(1);
  });

  it('discovers Carved Lore Runestones via [E], rewarding Ashes, Spirit, and updating lore_chronicles', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const lore = sim.quest.loreStones[0];
    const startAshes = sim.ashes;
    const startSpirit = sim.spirit;

    sim.heroX = lore.x + 1.0;
    sim.heroZ = lore.z;
    stepGameSim(sim, IDLE_INPUT, 1 / 60);
    expect(sim.nearLoreId).toBe(lore.id);

    const ev = stepGameSim(sim, {...IDLE_INPUT, interactPressed: true}, 1 / 60);
    expect(ev.questChanged).toBe(true);
    expect(lore.discovered).toBe(true);
    expect(sim.ashes).toBe(startAshes + 15);
    expect(sim.spirit).toBeGreaterThanOrEqual(startSpirit + 15);
    expect(sim.quest.whisperKey).toBe(lore.whisperKey);
    expect(sim.questManager.objectives.get('lore_chronicles')?.currentCount).toBe(1);
  });

  it('enforces reasonable cooldowns on Sekira Cleave, Throwing Dagger, and Healing Brew', () => {
    const sim = createGameSimState(1307, 'vityaz');

    // Primary cleave sets primaryCooldownTimer (0.55s) and blocks premature re-swing after recovery
    stepGameSim(sim, {...IDLE_INPUT, primaryPressed: true}, 1 / 60);
    expect(sim.primaryCooldownTimer).toBeCloseTo(PLAYER_BASE.primaryCooldown, 2);
    for (let i = 0; i < 18; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(sim.actionLock).toBe('none');
    expect(sim.primaryCooldownTimer).toBeGreaterThan(0.1);
    stepGameSim(sim, {...IDLE_INPUT, primaryPressed: true}, 1 / 60);
    expect(sim.actionLock).toBe('none');

    // Once primaryCooldownTimer expires, primary strike works again
    for (let i = 0; i < 20; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(sim.primaryCooldownTimer).toBe(0);
    stepGameSim(sim, {...IDLE_INPUT, primaryPressed: true}, 1 / 60);
    expect(sim.actionLock).toBe('windup');

    // Throwing dagger sets daggerCooldownTimer (0.72s) and blocks immediate re-throw
    sim.actionLock = 'none';
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    expect(sim.daggerCooldownTimer).toBeCloseTo(PLAYER_BASE.daggerCooldown, 2);
    for (let i = 0; i < 16; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }
    expect(sim.actionLock).toBe('none');
    stepGameSim(sim, {...IDLE_INPUT, daggerPressed: true}, 1 / 60);
    expect(sim.actionLock).toBe('none');

    // Healing Brew [Q] sets potionCooldownTimer (4.5s) and blocks rapid double-chug
    sim.hp = 40;
    const ev1 = stepGameSim(sim, {...IDLE_INPUT, potionPressed: true}, 1 / 60);
    expect(ev1.potionUsed).toBe(true);
    expect(sim.potionCooldownTimer).toBeCloseTo(PLAYER_BASE.potionCooldown, 2);
    const ev2 = stepGameSim(sim, {...IDLE_INPUT, potionPressed: true}, 1 / 60);
    expect(ev2.potionUsed).toBe(false);
  });

  it('opens Perfect Evade Nav Counter-Strike window (+45% damage + Spirit bonus)', () => {
    const sim = createGameSimState(1307, 'vityaz');
    const upyr = sim.enemies.find((e) => e.archetype === 'upyr')!;
    upyr.x = 0;
    upyr.z = -18;
    upyr.hp = 200;
    upyr.aggroed = true;
    upyr.state = 'windup';
    upyr.stateTimer = 0.01;
    upyr.attackTargetX = 0;
    upyr.attackTargetZ = -18;
    upyr.attackRadius = 2.1;

    // Position hero inside perfect-evade ring (2.6m away during active dash)
    sim.heroX = 0;
    sim.heroZ = -15.4;
    sim.heroYaw = Math.PI;
    sim.dashTimer = 0.2;
    sim.spirit = 20;

    stepGameSim(sim, IDLE_INPUT, 1 / 60);
    expect(sim.resonance).toBe(1);
    expect(sim.counterTimer).toBeGreaterThan(1.5);

    // Move into melee range and execute empowered counter strike
    sim.heroZ = -16.8;
    sim.primaryCooldownTimer = 0;
    sim.actionLock = 'none';
    const spiritBefore = sim.spirit;
    let sawNavPrimary = false;
    stepGameSim(sim, {...IDLE_INPUT, primaryPressed: true}, 1 / 60);
    for (let i = 0; i < 10; i++) {
      const ev = stepGameSim(sim, IDLE_INPUT, 1 / 60);
      if (ev.slashes.some((s) => s.type === 'primary' && s.isNav)) sawNavPrimary = true;
    }
    expect(sawNavPrimary).toBe(true);
    expect(sim.counterTimer).toBe(0);
    // 28 * 1.45 = 40.6 -> 41 dmg (instead of base 28)
    expect(200 - upyr.hp).toBe(41);
    expect(sim.spirit).toBeGreaterThanOrEqual(spiritBefore + 16);
  });

  it("casts Perun's Whirlwind [5] 360 AoE and Svarog's Ward [6] (-55% DMG + heal + Torch)", () => {
    const sim = createGameSimState(1307, 'vityaz');
    const upyrBehind = sim.enemies.find((e) => e.archetype === 'upyr')!;
    upyrBehind.x = sim.heroX;
    upyrBehind.z = sim.heroZ + 2.4; // Directly behind hero (facing North -Z)
    upyrBehind.hp = 300;
    upyrBehind.aggroed = true;
    sim.spirit = 100;

    // Skill 5: Perun's Whirlwind hits 360 degrees (including enemies behind) and sets 7.0s cooldown
    const ev5 = stepGameSim(sim, {...IDLE_INPUT, skill5Pressed: true}, 1 / 60);
    expect(ev5.slashes.some((s) => s.type === 'whirlwind')).toBe(true);
    expect(sim.skillCooldowns.whirlwind).toBeCloseTo(7.0, 1);
    expect(upyrBehind.hp).toBeLessThan(245);

    // Wait out hitstop (0.115s) + 0.2s recovery naturally
    for (let i = 0; i < 24; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }

    // Skill 6: Svarog's Ward heals +18 HP, restores +22 Torchlight, grants 2.6s ward (-55% DMG), 11.0s CD
    sim.hp = 80;
    sim.torchlight = 50;
    sim.spirit = 80;
    const ev6 = stepGameSim(sim, {...IDLE_INPUT, skill6Pressed: true}, 1 / 60);
    expect(ev6.slashes.some((s) => s.type === 'svarogWard')).toBe(true);
    expect(sim.skillCooldowns.svarogWard).toBeCloseTo(11.0, 1);
    expect(sim.wardTimer).toBeGreaterThan(2.4);
    expect(sim.hp).toBe(98);
    expect(sim.torchlight).toBeGreaterThan(70);

    // Clear Svarog's Ward hitstop naturally before testing enemy strike
    for (let i = 0; i < 12; i++) {
      stepGameSim(sim, IDLE_INPUT, 1 / 60);
    }

    // Incoming enemy strike during Ward is mitigated by 55% (13 * 0.45 = 5.85 -> 6 dmg)
    upyrBehind.x = sim.heroX;
    upyrBehind.z = sim.heroZ + 1.1;
    upyrBehind.state = 'windup';
    upyrBehind.stateTimer = 0.01;
    upyrBehind.attackTargetX = sim.heroX;
    upyrBehind.attackTargetZ = sim.heroZ;
    upyrBehind.attackRadius = 2.1;
    const hpBeforeEnemyHit = sim.hp;
    stepGameSim(sim, IDLE_INPUT, 1 / 60);
    expect(hpBeforeEnemyHit - sim.hp).toBe(6);
  });
});

