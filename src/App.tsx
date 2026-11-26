import RAPIER from '@dimforge/rapier3d-compat';
import {useCallback, useEffect, useRef, useState} from 'react';
import {SlavicSoundEngine} from './audio/soundEngine';
import {EventBus} from './core/events';
import {ActionInputController, InputTracker} from './core/input';
import {readBootParams} from './core/params';
import {
  DEFAULT_BINDINGS,
  loadSettings,
  rebindAction,
  saveSettings,
  type BindingCode,
  type GameAction,
  type GameSettings,
} from './core/settings';
import type {DifficultyId} from './data/balance';
import {getLocaleDir, getStrings, type LanguageId} from './data/locales';
import {
  createGameSimState,
  getLockedTarget,
  resolveSpiritBargain,
  stepGameSim,
  type GameSimState,
  type RunSummary,
} from './systems/gameSim';
import {createHelloState, stepHelloState} from './systems/hello/helloSim';
import {GameHud, type HudSnapshot} from './ui/GameHud';
import {OutcomeModal, PauseModal} from './ui/GameModals';
import {HelloHud} from './ui/HelloHud';
import {LookdevHud} from './ui/LookdevHud';
import {MenuHud} from './ui/MenuHud';
import {SettingsModal} from './ui/SettingsModal';
import {WorldMapModal} from './ui/WorldMapModal';
import {createGameView, type GameView, type ScenePhase} from './view/gameScene';
import {createHelloView, type HelloView} from './view/helloScene';
import {
  createLookdevView,
  type LookdevPreset,
  type LookdevView,
} from './view/lookdevScene';

declare global {
  interface Window {
    __GAME__?: {
      ready: boolean;
      scene: string;
      seed: number;
      isSoftwareGl: boolean;
      rapierReady: boolean;
      toggleCamera: () => void;
      toggleNav: () => void;
      setLookdevPreset?: (preset: LookdevPreset) => void;
    };
    __metrics?: {
      completed: boolean;
      events: string[];
      distanceMoved: number;
      navShifted: boolean;
      cameraMode: string;
    };
  }
}

type UiPhase = 'title' | 'transition' | 'playing' | 'paused' | 'gameover';

function snapshotFromSim(sim: GameSimState): HudSnapshot {
  const locked = getLockedTarget(sim);
  return {
    hp: sim.hp,
    maxHp: sim.maxHp,
    spirit: sim.spirit,
    maxSpirit: sim.maxSpirit,
    torchlight: sim.torchlight,
    maxTorchlight: sim.maxTorchlight,
    potions: sim.potions,
    ashes: sim.ashes,
    vesselMutation: sim.vesselMutation,
    navShifted: sim.navShifted,
    navGateOpen: sim.navGateOpen,
    resonance: sim.resonance,
    nearAltarId: sim.nearAltarId,
    nearNpcId: sim.nearNpcId,
    maraDialogueIndex: sim.maraDialogueIndex,
    maraDialogueTimer: sim.maraDialogueTimer,
    bossActive: sim.bossActive,
    bossHpRatio: sim.bossHpRatio,
    lockedTarget: locked
      ? {
          id: locked.id,
          archetype: locked.archetype,
          hp: locked.hp,
          maxHp: locked.maxHp,
          dist: Math.hypot(locked.x - sim.heroX, locked.z - sim.heroZ),
        }
      : null,
    actionLock: sim.actionLock,
    heroX: sim.heroX,
    heroZ: sim.heroZ,
    heroYaw: sim.heroYaw,
    heroHitFlash: sim.heroHitFlash,
    nearMirror: sim.nearMirror,
    nearSpirit: sim.nearSpirit,
    nearLoreId: sim.nearLoreId,
    whisperKey: sim.quest.whisperKey,
    whisperTimer: sim.quest.whisperTimer,
    questMarkers: [
      ...(!sim.quest.echoShrine.revealed
        ? [{x: sim.quest.echoShrine.x, z: sim.quest.echoShrine.z, kind: 'mirror' as const}]
        : sim.quest.echoShards
            .filter((s) => !s.collected)
            .map((s) => ({x: s.x, z: s.z, kind: 'shard' as const}))),
      ...sim.quest.cursedTotems
        .filter((t) => !t.burned)
        .map((t) => ({x: t.x, z: t.z, kind: 'totem' as const})),
      ...(sim.quest.bargainSpirit.outcome === 'pending'
        ? [{x: sim.quest.bargainSpirit.x, z: sim.quest.bargainSpirit.z, kind: 'spirit' as const}]
        : []),
      ...sim.quest.loreStones
        .filter((l) => !l.discovered)
        .map((l) => ({x: l.x, z: l.z, kind: 'lore' as const})),
    ],
    enemiesPos: sim.enemies
      .filter((e) => e.state !== 'ko')
      .map((e) => ({
        x: e.x,
        z: e.z,
        isBoss: e.archetype === 'leshy',
        isLocked: sim.lockedTargetId === e.id,
      })),
    counterTimer: sim.counterTimer,
    wardTimer: sim.wardTimer,
    cooldowns: {
      primary: sim.primaryCooldownTimer,
      dagger: sim.daggerCooldownTimer,
      potion: sim.potionCooldownTimer,
      shieldWave: sim.skillCooldowns.shieldWave,
      flameSurge: sim.skillCooldowns.flameSurge,
      navCleave: sim.skillCooldowns.navCleave,
      crescendo: sim.skillCooldowns.crescendo,
      whirlwind: sim.skillCooldowns.whirlwind,
      svarogWard: sim.skillCooldowns.svarogWard,
      dash: sim.dashCooldown,
    },
  };
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const paramsRef = useRef(readBootParams(window.location.search));
  const mode =
    paramsRef.current.gym === 'hello'
      ? 'hello'
      : paramsRef.current.gym === 'lookdev'
        ? 'lookdev'
        : 'game';

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const settingsRef = useRef<GameSettings>(settings);

  const soundRef = useRef<SlavicSoundEngine | null>(null);
  if (!soundRef.current) {
    soundRef.current = new SlavicSoundEngine();
  }

  const inputCtrlRef = useRef<ActionInputController | null>(null);
  if (!inputCtrlRef.current) {
    inputCtrlRef.current = new ActionInputController(settings.bindings);
  }

  const simRef = useRef<GameSimState>(
    createGameSimState(paramsRef.current.seed, settings.difficulty),
  );
  const gameViewRef = useRef<GameView | null>(null);

  const [uiPhase, setUiPhase] = useState<UiPhase>(() =>
    mode === 'game' && paramsRef.current.autostart ? 'playing' : 'title',
  );
  const uiPhaseRef = useRef<UiPhase>(uiPhase);
  uiPhaseRef.current = uiPhase;

  const transitionTimerRef = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsOpenRef = useRef(false);
  settingsOpenRef.current = settingsOpen;
  const [mapOpen, setMapOpen] = useState(false);
  const mapOpenRef = useRef(false);
  mapOpenRef.current = mapOpen;

  const [hud, setHud] = useState<HudSnapshot>(() => snapshotFromSim(simRef.current));
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  // Legacy hello/lookdev refs
  const helloViewRef = useRef<HelloView | null>(null);
  const lookdevViewRef = useRef<LookdevView | null>(null);
  const helloSimRef = useRef(createHelloState());
  const busRef = useRef(new EventBus());
  const [legacyHud, setLegacyHud] = useState(() => ({
    seed: paramsRef.current.seed,
    cameraMode: 'iso' as 'iso' | 'cinematic',
    lookdevPreset: 'iso' as LookdevPreset,
    navShifted: false,
    nearAltar: false,
    heroX: helloSimRef.current.heroX,
    heroZ: helloSimRef.current.heroZ,
    collapsed: false,
  }));

  // Keep body data-state mirrored for accessibility & test automation
  useEffect(() => {
    if (mode !== 'game') {
      document.body.dataset.state = mode;
      return;
    }
    const bodyState = uiPhase === 'transition' ? 'playing' : uiPhase;
    document.body.dataset.state = bodyState;
    inputCtrlRef.current?.setEnabled(
      (uiPhase === 'playing' || uiPhase === 'transition') && !settingsOpen && !mapOpen,
    );
  }, [mode, uiPhase, settingsOpen, mapOpen]);

  // Apply sound & graphics settings reactively
  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    inputCtrlRef.current?.setBindings(settings.bindings);
    soundRef.current?.setVolumes(
      settings.masterVolume,
      settings.musicVolume,
      settings.sfxVolume,
      settings.muted,
    );
    gameViewRef.current?.setGraphicsQuality(settings.graphics);
    gameViewRef.current?.setCameraStyle(settings.cameraStyle);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({...prev, ...patch}));
  }, []);

  const handleRebind = useCallback((action: GameAction, code: BindingCode) => {
    setSettings((prev) => ({
      ...prev,
      bindings: rebindAction(prev.bindings, action, code),
    }));
  }, []);

  const handleResetBindings = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      bindings: {...DEFAULT_BINDINGS},
    }));
  }, []);

  const beginRun = useCallback((skipCinematic = false) => {
    soundRef.current?.unlock();
    const fresh = createGameSimState(paramsRef.current.seed, settingsRef.current.difficulty);
    simRef.current = fresh;
    gameViewRef.current?.rebuildWorld(fresh);
    setRunSummary(null);
    setSettingsOpen(false);
    setHud(snapshotFromSim(fresh));
    inputCtrlRef.current?.clearAll();
    (document.activeElement as HTMLElement | null)?.blur?.();

    if (skipCinematic) {
      transitionTimerRef.current = 0;
      setUiPhase('playing');
    } else {
      transitionTimerRef.current = 0.85;
      setUiPhase('transition');
    }
  }, []);

  const handleStartFromMenu = useCallback(() => {
    beginRun(false);
  }, [beginRun]);

  const handleRestartRun = useCallback(() => {
    beginRun(true);
  }, [beginRun]);

  const handleQuitToMenu = useCallback(() => {
    const fresh = createGameSimState(paramsRef.current.seed, settingsRef.current.difficulty);
    simRef.current = fresh;
    gameViewRef.current?.rebuildWorld(fresh);
    setRunSummary(null);
    setSettingsOpen(false);
    setHud(snapshotFromSim(fresh));
    inputCtrlRef.current?.clearAll();
    setUiPhase('title');
  }, []);

  const handleHeroSalute = useCallback(() => {
    soundRef.current?.heroSalute();
    gameViewRef.current?.triggerHeroSalute();
  }, []);

  // Keyboard Enter/Space on Title Screen + M World Map + Esc/P Pause
  useEffect(() => {
    if (mode !== 'game') return;
    const onKey = (e: KeyboardEvent) => {
      soundRef.current?.unlock();
      if (uiPhaseRef.current === 'title' && !settingsOpenRef.current) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          soundRef.current?.uiClick();
          handleStartFromMenu();
        }
      } else if (
        (uiPhaseRef.current === 'playing' || uiPhaseRef.current === 'paused') &&
        !settingsOpenRef.current
      ) {
        const mapCode = settingsRef.current.bindings.mapToggle;
        const pauseCode = settingsRef.current.bindings.pause;
        if (uiPhaseRef.current === 'playing' && (e.code === mapCode || e.code === 'KeyM')) {
          e.preventDefault();
          soundRef.current?.uiClick();
          setHud(snapshotFromSim(simRef.current));
          setMapOpen((prev) => !prev);
          return;
        }
        if (e.code === pauseCode || e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          if (mapOpenRef.current) {
            setMapOpen(false);
          } else {
            setUiPhase((prev) => (prev === 'playing' ? 'paused' : 'playing'));
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, handleStartFromMenu]);

  // Mount Three.js + Rapier3D simulation loop once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const params = paramsRef.current;
    let disposed = false;
    let rafId = 0;

    if (mode === 'lookdev') {
      const view = createLookdevView(mount, params.seed, window.innerWidth, window.innerHeight);
      lookdevViewRef.current = view;
      const metricsLog: string[] = [];
      window.__metrics = {
        completed: true,
        events: metricsLog,
        distanceMoved: 0,
        navShifted: false,
        cameraMode: 'iso',
      };
      const setPreset = (p: LookdevPreset) => {
        view.setPreset(p);
        metricsLog.push(`preset:${p}`);
        if (window.__metrics) window.__metrics.cameraMode = p;
        setLegacyHud((prev) => ({...prev, lookdevPreset: p}));
      };
      const toggleNav = () => {
        const next = view.toggleNavShifted();
        metricsLog.push(`nav:${next ? 'on' : 'off'}`);
        if (window.__metrics) window.__metrics.navShifted = next;
        setLegacyHud((prev) => ({...prev, navShifted: next}));
      };
      window.__GAME__ = {
        ready: true,
        scene: 'lookdev',
        seed: params.seed,
        isSoftwareGl: view.isSoftwareGl,
        rapierReady: true,
        toggleCamera: () => setPreset(view.preset === 'iso' ? 'hero' : 'iso'),
        toggleNav,
        setLookdevPreset: setPreset,
      };
      const onResize = () => view.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onResize);
      let last = performance.now();
      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        view.renderFrame(Math.max(dt, 1 / 60), () => {
          if (!disposed) rafId = window.requestAnimationFrame(tick);
        });
      };
      rafId = window.requestAnimationFrame(tick);
      return () => {
        disposed = true;
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        view.dispose();
        lookdevViewRef.current = null;
      };
    }

    if (mode === 'hello') {
      const bus = busRef.current;
      const simState = helloSimRef.current;
      const tracker = new InputTracker();
      const detachInput = tracker.attach(window);
      const view = createHelloView(mount, params.seed, window.innerWidth, window.innerHeight);
      helloViewRef.current = view;
      window.__metrics = {
        completed: false,
        events: [],
        distanceMoved: 0,
        navShifted: false,
        cameraMode: 'iso',
      };
      const onResize = () => view.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onResize);
      let physicsWorld: RAPIER.World | null = null;
      let heroBody: RAPIER.RigidBody | null = null;
      void RAPIER.init().then(() => {
        if (disposed) return;
        physicsWorld = new RAPIER.World({x: 0, y: -9.81, z: 0});
        const hb = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(simState.heroX, 0.9, simState.heroZ);
        heroBody = physicsWorld.createRigidBody(hb);
        physicsWorld.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.35), heroBody);
        window.__GAME__ = {
          ready: true,
          scene: 'hello',
          seed: params.seed,
          isSoftwareGl: view.isSoftwareGl,
          rapierReady: true,
          toggleCamera: () => bus.emit('camera:mode', {mode: view.toggleCameraMode()}),
          toggleNav: () => {
            simState.navShifted = !simState.navShifted;
            bus.emit('nav:toggled', {active: simState.navShifted});
          },
        };
      });
      const STEP = 1 / 60;
      let acc = 0;
      let last = performance.now();
      let hudT = 0;
      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const rawDt = Math.min((now - last) / 1000, 0.25);
        last = now;
        acc += rawDt;
        const input = tracker.sample();
        let dashQ = input.dashPressed;
        let navQ = input.interactPressed;
        while (acc >= STEP) {
          stepHelloState(simState, {moveX: input.moveX, moveZ: input.moveZ, dash: dashQ, toggleNav: navQ}, STEP);
          dashQ = false;
          navQ = false;
          if (physicsWorld && heroBody) {
            heroBody.setNextKinematicTranslation({x: simState.heroX, y: 0.9, z: simState.heroZ});
            physicsWorld.step();
          }
          acc -= STEP;
        }
        if (window.__metrics) {
          window.__metrics.distanceMoved = Number(simState.distanceMoved.toFixed(2));
          window.__metrics.navShifted = simState.navShifted;
          window.__metrics.completed = simState.distanceMoved > 0.5 && Boolean(physicsWorld);
        }
        hudT += rawDt;
        if (hudT >= 0.12) {
          hudT = 0;
          setLegacyHud((prev) => ({
            ...prev,
            navShifted: simState.navShifted,
            nearAltar: simState.nearAltar,
            heroX: simState.heroX,
            heroZ: simState.heroZ,
          }));
        }
        view.syncAndRender(simState, Math.max(rawDt, 1 / 60), () => {
          if (!disposed) rafId = window.requestAnimationFrame(tick);
        });
      };
      rafId = window.requestAnimationFrame(tick);
      return () => {
        disposed = true;
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        detachInput();
        physicsWorld?.free();
        view.dispose();
        helloViewRef.current = null;
      };
    }

    // Default Mode: Full Playable Dark Slavic ARPG ("game")
    const sound = soundRef.current!;
    const inputCtrl = inputCtrlRef.current!;
    const view = createGameView(
      mount,
      simRef.current,
      settingsRef.current.graphics,
      settingsRef.current.cameraStyle,
      window.innerWidth,
      window.innerHeight,
    );
    gameViewRef.current = view;

    const detachInput = inputCtrl.attach(window, view.canvas);
    const onCanvasClick = (e: MouseEvent) => {
      sound.unlock();
      if (uiPhaseRef.current === 'title' && !settingsOpenRef.current) {
        if (view.tryPickHeroPreview(e.clientX, e.clientY)) {
          sound.heroSalute();
        }
      }
    };
    view.canvas.addEventListener('mousedown', onCanvasClick);

    const onResize = () => view.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);

    const metricsLog: string[] = [];
    window.__metrics = {
      completed: false,
      events: metricsLog,
      distanceMoved: 0,
      navShifted: false,
      cameraMode: settingsRef.current.cameraStyle,
    };

    let physicsWorld: RAPIER.World | null = null;
    let heroBody: RAPIER.RigidBody | null = null;

    window.__GAME__ = {
      ready: false,
      scene: 'game',
      seed: params.seed,
      isSoftwareGl: view.isSoftwareGl,
      rapierReady: false,
      toggleCamera: () => {
        const next = view.toggleCameraStyle();
        setSettings((prev) => ({...prev, cameraStyle: next}));
      },
      toggleNav: () => {
        simRef.current.navShifted = !simRef.current.navShifted;
        if (simRef.current.navShifted) simRef.current.navGateOpen = true;
      },
    };

    void RAPIER.init().then(() => {
      if (disposed) return;
      physicsWorld = new RAPIER.World({x: 0, y: -9.81, z: 0});
      for (const obs of simRef.current.layout.obstacles) {
        const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(obs.x, 0.8, obs.z);
        const body = physicsWorld.createRigidBody(desc);
        physicsWorld.createCollider(RAPIER.ColliderDesc.cylinder(0.8, obs.radius), body);
      }
      for (const w of simRef.current.layout.wallSegments) {
        const cx = (w.x1 + w.x2) * 0.5;
        const cz = (w.z1 + w.z2) * 0.5;
        const hx = Math.abs(w.x2 - w.x1) * 0.5 + w.halfThick;
        const hz = Math.abs(w.z2 - w.z1) * 0.5 + w.halfThick;
        const wDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, 1.5, cz);
        const wBody = physicsWorld.createRigidBody(wDesc);
        physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(hx, 1.5, hz), wBody);
      }
      const hb = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        simRef.current.heroX,
        0.9,
        simRef.current.heroZ,
      );
      heroBody = physicsWorld.createRigidBody(hb);
      physicsWorld.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.38), heroBody);

      if (window.__GAME__) {
        window.__GAME__.ready = true;
        window.__GAME__.rapierReady = true;
      }
    });

    const STEP = 1 / 60;
    let acc = 0;
    let last = performance.now();
    let hudTimer = 0;
    let prevHeroX = simRef.current.heroX;
    let prevHeroZ = simRef.current.heroZ;
    let totalDistance = 0;

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const wallDt = Math.min((now - last) / 1000, 0.25);
      const rawDt = Math.min(wallDt, 0.05);
      last = now;

      const phase = uiPhaseRef.current;
      const sim = simRef.current;

      if (phase === 'transition') {
        transitionTimerRef.current = Math.max(0, transitionTimerRef.current - wallDt);
        if (transitionTimerRef.current <= 0) {
          setUiPhase('playing');
        }
      }

      if (phase === 'playing' && !settingsOpenRef.current && !mapOpenRef.current) {
        const sample = inputCtrl.sample(now / 1000);

        if (sample.orbitDeltaX !== 0 || sample.orbitDeltaY !== 0 || sample.zoomDelta !== 0) {
          view.applyOrbitInput(sample.orbitDeltaX, sample.orbitDeltaY, sample.zoomDelta);
        }
        if (sample.cameraTogglePressed) {
          const nextCam = view.toggleCameraStyle();
          setSettings((prev) => ({...prev, cameraStyle: nextCam}));
          metricsLog.push(`camera:${nextCam}`);
        }

        acc += rawDt;
        let pQ = sample.primaryPressed;
        let dQ = sample.daggerPressed;
        let tcQ = sample.targetCyclePressed;
        let eQ = sample.evadePressed;
        let s1Q = sample.skill1Pressed;
        let s2Q = sample.skill2Pressed;
        let s3Q = sample.skill3Pressed;
        let s4Q = sample.skill4Pressed;
        let s5Q = sample.skill5Pressed;
        let s6Q = sample.skill6Pressed;
        let iQ = sample.interactPressed;
        let potQ = sample.potionPressed;

        while (acc >= STEP) {
          const ev = stepGameSim(
            sim,
            {
              strafeX: sample.strafeX,
              forwardZ: sample.forwardZ,
              cameraYaw: view.cameraYaw,
              steerToCamera: sample.steerHeroToCamera,
              primaryPressed: pQ,
              daggerPressed: dQ,
              targetCyclePressed: tcQ,
              evadePressed: eQ,
              skill1Pressed: s1Q,
              skill2Pressed: s2Q,
              skill3Pressed: s3Q,
              skill4Pressed: s4Q,
              skill5Pressed: s5Q,
              skill6Pressed: s6Q,
              interactPressed: iQ,
              potionPressed: potQ,
              sprintHeld: sample.sprintHeld,
            },
            STEP,
          );
          pQ = dQ = tcQ = eQ = s1Q = s2Q = s3Q = s4Q = s5Q = s6Q = iQ = potQ = false;

          if (ev.jumpAnticipated) {
            sound.jumpAnticipate();
            metricsLog.push('jumpWindup');
          }
          if (ev.dashed) {
            sound.dash();
            metricsLog.push('dash');
          }
          if (ev.jumpLanded) {
            sound.jumpLand(ev.jumpLanded);
            metricsLog.push(`jumpLand:${ev.jumpLanded}`);
          }
          if (ev.daggerThrown) {
            sound.daggerThrow();
            metricsLog.push('dagger');
          }
          if (ev.targetChanged) {
            sound.uiHover();
            metricsLog.push(`lock:${sim.lockedTargetId ?? 'none'}`);
          }
          if (ev.navShifted) {
            sound.navShift(sim.navShifted);
            metricsLog.push(`nav:${sim.navShifted ? 'on' : 'off'}`);
          }
          if (ev.potionUsed || ev.campfireKindled) sound.potion();
          for (const fs of ev.footsteps) {
            sound.playFootstep(fs.surface);
          }
          for (const sp of ev.sparks) {
            view.spawnSparks(sp);
          }
          for (const d of ev.dusts) {
            view.spawnDust(d);
          }
          for (const sl of ev.slashes) {
            view.spawnSlashFx(sl);
            if (sl.type === 'primary') sound.swing(false);
            else if (
              sl.type === 'flameSurge' ||
              sl.type === 'navCleave' ||
              sl.type === 'crescendo' ||
              sl.type === 'whirlwind'
            ) {
              sound.swing(true);
            } else if (sl.type === 'svarogWard') {
              sound.potion();
              sound.sigilBlast();
            } else if (sl.type === 'sigilBlast') {
              sound.sigilBlast();
            } else if (sl.type === 'enemyHit' || sl.type === 'playerHit') {
              sound.hit(ev.heavyImpact);
            }
          }

          if (physicsWorld && heroBody) {
            heroBody.setNextKinematicTranslation({x: sim.heroX, y: 0.9, z: sim.heroZ});
            physicsWorld.step();
          }

          totalDistance += Math.hypot(sim.heroX - prevHeroX, sim.heroZ - prevHeroZ);
          prevHeroX = sim.heroX;
          prevHeroZ = sim.heroZ;
          acc -= STEP;
        }

        if (sim.outcome) {
          sound.outcome(sim.outcome.victory);
          setRunSummary(sim.outcome);
          setUiPhase('gameover');
        }
      }

      // Adaptive Web Audio Mood + Nearest Hearth Proximity Update across expanded valley
      let distCamp = 99;
      for (const cf of sim.layout.campfires) {
        distCamp = Math.min(distCamp, Math.hypot(sim.heroX - cf.x, sim.heroZ - cf.z));
      }
      const campfireProximity = Math.max(0, 1 - distCamp / 8.5);
      if (phase === 'title') {
        sound.setAdaptiveState('menu', sim.navBlend, 0, 0.75);
      } else if (phase === 'paused' || phase === 'gameover') {
        sound.setAdaptiveState('silent', sim.navBlend, 0, 0);
      } else if (sim.bossActive) {
        sound.setAdaptiveState('boss', sim.navBlend, sim.resonance, 0);
      } else {
        const nearbyEnemy = sim.enemies.some(
          (e) => e.state !== 'ko' && e.aggroed,
        );
        sound.setAdaptiveState(nearbyEnemy ? 'combat' : 'explore', sim.navBlend, sim.resonance, campfireProximity);
      }

      if (window.__metrics) {
        window.__metrics.distanceMoved = Number(totalDistance.toFixed(2));
        window.__metrics.navShifted = sim.navShifted;
        window.__metrics.cameraMode = view.cameraStyle;
        window.__metrics.completed = totalDistance > 0.35 || sim.kills > 0 || sim.navShiftsCount > 0;
      }

      hudTimer += rawDt;
      if (hudTimer >= 0.1) {
        hudTimer = 0;
        setHud(snapshotFromSim(sim));
      }

      const scenePhase: ScenePhase = phase;
      const transFrac = phase === 'transition' ? 1 - transitionTimerRef.current / 0.85 : 1;

      view.renderFrame(sim, scenePhase, transFrac, Math.max(rawDt, 1 / 60), () => {
        if (!disposed) rafId = window.requestAnimationFrame(tick);
      });
    };

    view.renderFrame(simRef.current, uiPhaseRef.current, 1, 1 / 60);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      view.canvas.removeEventListener('mousedown', onCanvasClick);
      detachInput();
      physicsWorld?.free();
      view.dispose();
      gameViewRef.current = null;
    };
  }, [mode]);

  if (mode === 'lookdev') {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[#131815]">
        <div ref={mountRef} className="h-full w-full" />
        <LookdevHud
          preset={legacyHud.lookdevPreset}
          navShifted={legacyHud.navShifted}
          collapsed={legacyHud.collapsed}
          onSelectPreset={(p) => {
            lookdevViewRef.current?.setPreset(p);
            setLegacyHud((prev) => ({...prev, lookdevPreset: p}));
          }}
          onToggleNav={() => {
            const next = lookdevViewRef.current?.toggleNavShifted() ?? false;
            setLegacyHud((prev) => ({...prev, navShifted: next}));
          }}
          onToggleCollapse={() =>
            setLegacyHud((prev) => ({...prev, collapsed: !prev.collapsed}))
          }
        />
      </main>
    );
  }

  if (mode === 'hello') {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[#131815]">
        <div ref={mountRef} className="h-full w-full" />
        <HelloHud
          seed={legacyHud.seed}
          cameraMode={legacyHud.cameraMode}
          navShifted={legacyHud.navShifted}
          nearAltar={legacyHud.nearAltar}
          heroX={legacyHud.heroX}
          heroZ={legacyHud.heroZ}
          collapsed={legacyHud.collapsed}
          onToggleCollapse={() =>
            setLegacyHud((prev) => ({...prev, collapsed: !prev.collapsed}))
          }
          onToggleCamera={() => {
            const next = helloViewRef.current?.toggleCameraMode() ?? 'iso';
            setLegacyHud((prev) => ({...prev, cameraMode: next}));
          }}
          onToggleNav={() => {
            helloSimRef.current.navShifted = !helloSimRef.current.navShifted;
            setLegacyHud((prev) => ({...prev, navShifted: helloSimRef.current.navShifted}));
          }}
        />
      </main>
    );
  }

  const t = getStrings(settings.language);
  const dir = getLocaleDir(settings.language);

  return (
    <main
      dir={dir}
      className="relative h-screen w-screen overflow-hidden bg-[#131815] text-[#e6dcc9]"
    >
      {/* Persistent isolated 3D WebGL Canvas Mount */}
      <div ref={mountRef} data-testid="game-canvas-mount" className="h-full w-full" />

      {(uiPhase === 'title' || uiPhase === 'transition') && (
        <MenuHud
          t={t}
          language={settings.language}
          difficulty={settings.difficulty}
          fadingOut={uiPhase === 'transition'}
          onStart={handleStartFromMenu}
          onOpenSettings={() => setSettingsOpen(true)}
          onSelectDifficulty={(d: DifficultyId) => updateSettings({difficulty: d})}
          onSelectLanguage={(l: LanguageId) => updateSettings({language: l})}
          onHeroSalute={handleHeroSalute}
          onHoverSfx={() => soundRef.current?.uiHover()}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}

      {uiPhase === 'playing' && (
        <GameHud
          t={t}
          hud={hud}
          layout={simRef.current.layout}
          bindings={settings.bindings}
          cameraStyle={settings.cameraStyle}
          muted={settings.muted}
          onTriggerAction={(act) => {
            soundRef.current?.unlock();
            inputCtrlRef.current?.triggerTouchAction(act);
          }}
          onSpiritBargain={(choice) => {
            soundRef.current?.unlock();
            if (resolveSpiritBargain(simRef.current, choice)) {
              soundRef.current?.navShift(choice === 'offerLight');
              setHud(snapshotFromSim(simRef.current));
            }
          }}
          onOpenMap={() => {
            setHud(snapshotFromSim(simRef.current));
            setMapOpen(true);
          }}
          onTouchJoystick={(x, y) => inputCtrlRef.current?.setTouchJoystick(x, y)}
          onToggleCamera={() => {
            const next = gameViewRef.current?.toggleCameraStyle() ?? 'orbit';
            updateSettings({cameraStyle: next});
          }}
          onToggleMute={() => updateSettings({muted: !settings.muted})}
          onOpenPause={() => setUiPhase('paused')}
          onOpenSettings={() => setSettingsOpen(true)}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}

      {uiPhase === 'playing' && mapOpen && !settingsOpen && (
        <WorldMapModal
          t={t}
          hud={hud}
          layout={simRef.current.layout}
          mapBindLabel={settings.bindings.mapToggle.replace(/^Key/, '')}
          onClose={() => setMapOpen(false)}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}

      {uiPhase === 'paused' && !settingsOpen && (
        <PauseModal
          t={t}
          onResume={() => setUiPhase('playing')}
          onOpenSettings={() => setSettingsOpen(true)}
          onRestart={handleRestartRun}
          onQuitToMenu={handleQuitToMenu}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}

      {uiPhase === 'gameover' && runSummary && (
        <OutcomeModal
          t={t}
          summary={runSummary}
          onPlayAgain={handleRestartRun}
          onQuitToMenu={handleQuitToMenu}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          t={t}
          settings={settings}
          inGame={uiPhase === 'playing' || uiPhase === 'paused'}
          onUpdateSettings={updateSettings}
          onRebind={handleRebind}
          onResetBindings={handleResetBindings}
          onClose={() => setSettingsOpen(false)}
          onHoverSfx={() => soundRef.current?.uiHover()}
          onClickSfx={() => soundRef.current?.uiClick()}
        />
      )}
    </main>
  );
}
