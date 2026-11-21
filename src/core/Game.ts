import * as THREE from 'three';
import { EmergencyResponseManager } from '../ai/EmergencyResponseManager';
import { SpecialOpsEncounterManager } from '../ai/SpecialOpsEncounterManager';
import { SquadManager } from '../ai/SquadManager';
import { AudioManager } from '../audio/AudioManager';
import { CombatSystem, ShootableTarget } from '../combat/CombatSystem';
import {
  computeEmpireIncomePerMin,
  DHAKA_PROPERTIES,
  getChopShopSellPrice,
  getMafiaRankForRep,
} from '../data/empire';
import { ENTERABLE_BUILDINGS, GARAGE_PAINT_SWATCHES, OUTFIT_CATALOG, SHOP_CATALOGS } from '../data/shops';
import { SPEC_OPS_OUTFITS, TUTORIAL_STEPS } from '../data/specialOps';
import { WEAPON_CATALOG, WeaponAmmoState } from '../data/weapons';
import { TRANSLATIONS } from '../i18n/translations';
import { MissionManager } from '../missions/MissionManager';
import { NPCManager } from '../npcs/NPCManager';
import { PlayerCamera } from '../player/PlayerCamera';
import { PlayerController } from '../player/PlayerController';
import { PoliceManager } from '../police/PoliceManager';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_INVENTORY,
  DEFAULT_OWNED_VEHICLES,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  SaveManager,
} from '../save/SaveManager';
import { TrafficManager } from '../traffic/TrafficManager';
import {
  BuildingFootprint,
  EnterableBuildingDef,
  GameSettings,
  GpsState,
  GraphicsQuality,
  HudState,
  InputState,
  InteractionPrompt,
  InventoryItem,
  Language,
  MapMarker,
  MiniMapSnapshot,
  MissionDifficulty,
  MissionHistoryEntry,
  NpcDialogueSnapshot,
  OwnedVehicleRecord,
  PlayerAppearance,
  PlayerStats,
  RadioStationId,
  SquadCommand,
  StuntBonusBanner,
  TutorialProgress,
  VehicleCameraPreset,
  WeaponId,
  WeatherType,
} from '../types/game';
import {
  DrivableVehicle,
  StuntLandedEvent,
  VehicleManager,
  VehicleRamHitEvent,
} from '../vehicles/VehicleManager';
import { DayNightSystem } from '../world/DayNightSystem';
import { DhakaWorld } from '../world/DhakaWorld';
import { InteriorManager } from '../world/InteriorManager';
import { TextureFactory } from '../world/TextureFactory';
import { WeatherSystem } from '../world/WeatherSystem';
import { WorldChunkManager } from '../world/WorldChunkManager';
import { DynamicObstacleCircle, PhysicsWorld } from './PhysicsWorld';
import { SceneManager } from './SceneManager';

export interface GameCallbacks {
  onHudUpdate: (hud: HudState) => void;
  onSettingsUpdate: (settings: GameSettings) => void;
  onPlayerDataUpdate: (data: PlayerProgressionSnapshot) => void;
  onOpenShop: (building: EnterableBuildingDef) => void;
  onOpenSpecOpsTerminal: (tab?: 'ops' | 'armory' | 'results') => void;
  onToggleMap: () => void;
  onToggleInventory: () => void;
  onToggleMissions: () => void;
  onTogglePhone: () => void;
  onToggleWeaponWheel: () => void;
  onContextLost: (lost: boolean) => void;
}

export interface PlayerProgressionSnapshot {
  money: number;
  health: number;
  appearance: PlayerAppearance;
  inventory: InventoryItem[];
  ownedVehicles: OwnedVehicleRecord[];
  completedMissionIds: string[];
  missionHistory: Record<string, MissionHistoryEntry>;
  unlockedSpecOpsRewards: string[];
  completionPercentage: number;
  stats: PlayerStats;
  cooldownsSec: Record<string, number>;
  garageTargetVehicle: {
    id: string;
    kind: import('../types/game').VehicleKind;
    nameEn: string;
    nameBn: string;
    health: number;
    paintHex: number;
    engineLevel: number;
    chopShopPrice: number;
  } | null;
  mafiaRep: number;
  mafiaRankIndex: number;
  ownedPropertyIds: string[];
  empireVaultCash: number;
  empireIncomePerMin: number;
  shopRobCooldownSec: Record<string, number>;
  favoriteMapIds: string[];
  discoveredPlaceIds: string[];
}

interface PendingUnlock {
  vehicleId: string;
  isTraffic: boolean;
  elapsed: number;
  duration: number;
}

const EMPTY_GPS: GpsState = {
  active: false,
  labelEn: '',
  labelBn: '',
  targetX: 0,
  targetZ: 0,
  distanceMeters: 0,
  path: [],
};

export class Game {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private physics: PhysicsWorld;
  private textures: TextureFactory;
  private world: DhakaWorld;
  private interior: InteriorManager;
  private dayNight: DayNightSystem;
  private weather: WeatherSystem;
  private player: PlayerController;
  private playerCamera: PlayerCamera;
  private vehicles: VehicleManager;
  private traffic: TrafficManager;
  private police: PoliceManager;
  private npcs: NPCManager;
  private missions: MissionManager;
  private encounters: SpecialOpsEncounterManager;
  private squad: SquadManager;
  private emergency: EmergencyResponseManager;
  private combat: CombatSystem;
  private audio: AudioManager;
  private chunkManager = new WorldChunkManager();
  private favoriteMapIds = new Set<string>();

  private callbacks: GameCallbacks;
  private settings: GameSettings;

  private started = false;
  private paused = false;
  private modalOpen = false;
  private transitioning = false;
  private photoMode = false;

  private money = 25000;
  private health = 100;
  private appearance: PlayerAppearance = { ...DEFAULT_APPEARANCE };
  private inventory: InventoryItem[] = DEFAULT_INVENTORY.map((i) => ({ ...i }));
  private ownedVehicles: OwnedVehicleRecord[] = DEFAULT_OWNED_VEHICLES.map((v) => ({ ...v }));
  private unlockedSpecOpsRewards = new Set<string>();
  private stats: PlayerStats = { ...DEFAULT_STATS };
  private mafiaRep = 0;
  private ownedPropertyIds = new Set<string>();
  private empireVaultCash = 0;
  private passiveIncomeAccum = 0;
  private bankRobCooldown = 0;
  private shopRobCooldowns = new Map<string, number>();
  private smashedShopCooldowns = new Map<string, number>();
  private ramHitCooldowns = new Map<string, number>();
  private activeHeist: {
    type: 'bank';
    elapsed: number;
    duration: number;
    labelEn: string;
    labelBn: string;
  } | null = null;
  private wastedBustedState: { type: 'wasted' | 'busted'; timer: number; fee: number } | null =
    null;
  private policeCornerTimer = 0;
  private stuntBanner: StuntBonusBanner | null = null;
  private stuntBannerTimer = 0;

  // Pre-allocated zero-GC per-frame collision & shooting buffers
  private combinedExternalBuf: DynamicObstacleCircle[] = [];
  private allObstaclesBuf: DynamicObstacleCircle[] = [];
  private shootTargetsBuf: ShootableTarget[] = [];

  private tutorial: TutorialProgress = { completed: false, skipped: false, stepIndex: 0 };
  private tutorialMoveAccum = 0;
  private tutorialDriveAccum = 0;
  private lastDrivenVehicle: DrivableVehicle | null = null;
  private subdueCooldown = 0;

  private savedExteriorPos = { x: -12.5, z: 17.5, yaw: 0.35 };
  private customGps: { active: boolean; x: number; z: number; labelEn: string; labelBn: string } = {
    active: false,
    x: 0,
    z: 0,
    labelEn: '',
    labelBn: '',
  };
  private cachedGps: GpsState = { ...EMPTY_GPS };
  private gpsRecalcAccum = 0;

  private activeDialogue: NpcDialogueSnapshot | null = null;
  private dialogueTimer = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;
  private pendingUnlock: PendingUnlock | null = null;
  private lastPurchaseTime = 0;
  private crashSoundCooldown = 0;
  private transitionTimeoutId = 0;

  private keys = new Set<string>();
  private aimToggle = false;
  private mouseAim = false;
  private mouseFire = false;
  private mouseDownOrigin = { x: 0, y: 0, onViewport: false };
  private mouseTapFireQueued = false;
  private muzzleVec = new THREE.Vector3();
  private aimTargetLocked = false;
  private aimProbeAccum = 0;
  private touchInput: InputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jump: false,
    steer: 0,
    throttle: 0,
    brake: 0,
    reverse: false,
    handbrake: false,
    boost: false,
    horn: false,
    fire: false,
    aim: false,
    ascend: false,
    descend: false,
  };
  private mergedInput: InputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jump: false,
    steer: 0,
    throttle: 0,
    brake: 0,
    reverse: false,
    handbrake: false,
    boost: false,
    horn: false,
    fire: false,
    aim: false,
    ascend: false,
    descend: false,
  };
  private steerButtonLeft = false;
  private steerButtonRight = false;

  private frameId = 0;
  private running = false;
  private lastTimestamp = 0;
  private hudEmitAccum = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private titleOrbitAngle = 0.45;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const saved = SaveManager.load();
    this.settings = saved
      ? { ...DEFAULT_SETTINGS, ...saved.settings }
      : { ...DEFAULT_SETTINGS, quality: SaveManager.detectRecommendedQuality() };
    if (saved) {
      this.money = saved.money;
      this.health = saved.health;
      this.appearance = { ...saved.appearance };
      this.inventory = saved.inventory.map((it) => ({ ...it }));
      this.ownedVehicles = saved.ownedVehicles.map((v) => ({ ...v }));
      this.unlockedSpecOpsRewards = new Set(saved.unlockedSpecOpsRewards ?? []);
      this.stats = { ...DEFAULT_STATS, ...(saved.stats ?? {}) };
      this.mafiaRep = saved.mafiaRep ?? 0;
      this.ownedPropertyIds = new Set(saved.ownedPropertyIds ?? []);
      this.empireVaultCash = saved.empireVaultCash ?? 0;
      this.favoriteMapIds = new Set(saved.favoriteMapIds ?? []);
      this.chunkManager.hydrateDiscovered(saved.discoveredPlaceIds);
      this.tutorial = {
        completed: Boolean(saved.tutorialCompleted),
        skipped: Boolean(saved.tutorialCompleted),
        stepIndex: saved.tutorialCompleted ? TUTORIAL_STEPS.length : 0,
      };
    }

    this.sceneManager = new SceneManager(container, this.settings.quality);
    this.sceneManager.setContextHandlers(
      () => this.callbacks.onContextLost(true),
      () => this.callbacks.onContextLost(false)
    );

    this.physics = new PhysicsWorld();
    this.physics.setWorldBounds({ minX: -132, maxX: 132, minZ: -124, maxZ: 108 });

    this.textures = new TextureFactory(this.sceneManager.maxAnisotropy);
    const contactShadowTex = this.textures.createContactShadowTexture();

    this.world = new DhakaWorld(this.textures, this.physics);
    this.sceneManager.scene.add(this.world.group);

    this.interior = new InteriorManager(contactShadowTex);
    this.sceneManager.scene.add(this.interior.group);

    this.dayNight = new DayNightSystem(
      this.sceneManager.scene,
      this.sceneManager.isSoftwareGl,
      this.settings.quality
    );
    this.dayNight.timeScale = this.settings.timeScale;
    this.dayNight.setTimeOfDay(saved ? saved.timeOfDay : 16.4);

    this.weather = new WeatherSystem();
    this.weather.setWeather(this.settings.weather, this.settings.weatherAuto);
    this.sceneManager.scene.add(this.weather.group);

    this.player = new PlayerController(contactShadowTex, this.appearance);
    if (saved) {
      this.player.setPosition(saved.playerX, saved.playerZ, saved.playerYaw);
    }
    this.sceneManager.scene.add(this.player.root);

    this.playerCamera = new PlayerCamera(this.sceneManager.camera);
    this.playerCamera.yaw = this.player.yaw + Math.PI;
    this.playerCamera.setVehicleCameraPreset(this.settings.vehicleCameraPreset, false);
    this.playerCamera.setManualVehicleZoom(this.settings.vehicleCameraZoom);

    this.vehicles = new VehicleManager(contactShadowTex, this.physics);
    this.sceneManager.scene.add(this.vehicles.group);
    this.lastDrivenVehicle = this.vehicles.vehicles[0] ?? null;

    this.traffic = new TrafficManager(this.world.roads, contactShadowTex);
    this.traffic.setDensity(this.settings.trafficDensity);
    this.sceneManager.scene.add(this.traffic.group);

    this.police = new PoliceManager(contactShadowTex);
    this.sceneManager.scene.add(this.police.group);

    this.npcs = new NPCManager(this.world.roads, contactShadowTex);
    this.sceneManager.scene.add(this.npcs.group);

    this.encounters = new SpecialOpsEncounterManager(contactShadowTex);
    this.sceneManager.scene.add(this.encounters.group);

    this.squad = new SquadManager(contactShadowTex);
    if (saved?.squadCommandDefault) {
      this.squad.command = saved.squadCommandDefault;
    }
    this.sceneManager.scene.add(this.squad.group);

    this.emergency = new EmergencyResponseManager();

    this.combat = new CombatSystem();
    this.sceneManager.scene.add(this.combat.group);
    this.player.setEquippedWeapon(this.combat.equippedWeapon);

    this.missions = new MissionManager();
    if (saved) {
      this.missions.loadProgression(
        saved.completedMissionIds,
        saved.missionHistory,
        saved.claimedRewardIds
      );
    }

    this.audio = new AudioManager();
    this.audio.setEnabled(this.settings.audioEnabled);
    this.audio.setVolume(this.settings.audioVolume);
    this.audio.setRadioStation(this.settings.radioStation);

    this.dayNight.setCallbacks({
      onNightFactorChange: (nf) => {
        this.world.setNightFactor(nf);
        this.vehicles.setNightFactor(nf);
        this.traffic.setNightFactor(nf);
        this.police.setNightFactor(nf);
      },
    });

    this.sceneManager.prewarmShaders();

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.container.addEventListener('contextmenu', this.handleContextMenu);

    this.callbacks.onSettingsUpdate({ ...this.settings });
    this.emitPlayerData();
    this.emitHud();

    this.running = true;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private t() {
    return TRANSLATIONS[this.settings.language];
  }

  public startGame(): void {
    this.started = true;
    this.paused = false;
    this.audio.unlock();
    this.audio.setPaused(false);
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (!this.started) return;
    this.paused = paused;
    this.clearAllInputs();
    this.audio.setPaused(paused);
    this.audio.setHorn(false, null);
    this.emitHud();
  }

  public setModalOpen(open: boolean): void {
    this.modalOpen = open;
    if (open) {
      this.clearAllInputs();
      this.audio.setHorn(false, null);
    } else {
      // Restore actual equipped outfit if user was trying on clothes
      this.player.applyAppearance(this.appearance);
    }
    this.emitPlayerData();
    this.emitHud();
  }

  public togglePause(): void {
    this.setPaused(!this.paused);
  }

  public rotateCamera(dx: number, dy: number): void {
    if (!this.started || this.paused || this.modalOpen) return;
    this.playerCamera.rotate(dx, dy, this.settings.cameraSensitivity);
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      this.advanceTutorial('camera');
    }
  }

  public cycleCameraMode(): void {
    if (!this.started || this.paused || this.modalOpen) return;
    const inVeh = Boolean(this.vehicles.activeVehicle);
    const next = this.playerCamera.cycleMode(inVeh);
    if (inVeh) {
      if (next === 'vehicle_close') this.settings.vehicleCameraPreset = 'close';
      else if (next === 'vehicle_normal') this.settings.vehicleCameraPreset = 'normal';
      else if (next === 'vehicle_far') this.settings.vehicleCameraPreset = 'far';
      this.callbacks.onSettingsUpdate({ ...this.settings });
      const labels: Record<string, { en: string; bn: string }> = {
        vehicle_close: { en: 'Camera: Close', bn: 'ক্যামেরা: কাছাকাছি (Close)' },
        vehicle_normal: { en: 'Camera: Normal', bn: 'ক্যামেরা: সাধারণ (Normal)' },
        vehicle_far: { en: 'Camera: Far', bn: 'ক্যামেরা: দূর (Far)' },
        vehicle_first_person: { en: 'Camera: Driver Cabin', bn: 'ক্যামেরা: ড্রাইভার ভিউ' },
      };
      const lbl = labels[next];
      if (lbl) {
        this.showToast(this.settings.language === 'bn' ? lbl.bn : lbl.en);
      }
    }
    this.advanceTutorial('camera');
    this.emitHud();
  }

  public setVehicleCameraPreset(preset: VehicleCameraPreset): void {
    this.updateSettings({ vehicleCameraPreset: preset });
    this.autoSaveSilent();
  }

  public adjustVehicleCameraZoom(delta: number): void {
    const next = Math.round(Math.max(0.72, Math.min(1.45, this.settings.vehicleCameraZoom + delta)) * 100) / 100;
    this.updateSettings({ vehicleCameraZoom: next });
    this.autoSaveSilent();
  }

  public toggleFavoriteMapId(markerId: string): string[] {
    if (this.favoriteMapIds.has(markerId)) {
      this.favoriteMapIds.delete(markerId);
    } else {
      this.favoriteMapIds.add(markerId);
    }
    this.autoSaveSilent();
    this.emitPlayerData();
    return Array.from(this.favoriteMapIds);
  }

  public advanceTutorial(stepId: string): void {
    if (this.tutorial.completed || this.tutorial.skipped) return;
    const expected = TUTORIAL_STEPS[this.tutorial.stepIndex];
    if (!expected || expected.id !== stepId) return;
    this.tutorial.stepIndex += 1;
    this.audio.playChime('clue');
    if (this.tutorial.stepIndex >= TUTORIAL_STEPS.length) {
      this.tutorial.completed = true;
      this.showToast(this.t().tutorialComplete);
      this.autoSaveSilent();
    }
    this.emitHud();
  }

  public skipTutorial(): void {
    this.tutorial.completed = true;
    this.tutorial.skipped = true;
    this.tutorial.stepIndex = TUTORIAL_STEPS.length;
    this.autoSaveSilent();
    this.emitHud();
  }

  public setSquadCommand(cmd: SquadCommand): void {
    const fx = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.x : this.player.x;
    const fz = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.z : this.player.z;
    this.squad.setCommand(cmd, fx, fz);
    this.audio.playChime('squad_cmd');
    const labels: Record<SquadCommand, string> = {
      follow: this.t().squadFollow,
      hold: this.t().squadHold,
      objective: this.t().squadObjective,
      regroup: this.t().squadRegroup,
      protect: this.t().squadProtect,
    };
    this.showToast(`${this.t().squadCommandTitle}: ${labels[cmd]}`);
    this.autoSaveSilent();
    this.emitHud();
  }

  public toggleSquadDeploy(): void {
    if (this.squad.active) {
      this.squad.recall();
      this.showToast(this.settings.language === 'bn' ? 'স্কোয়াড বেসে ফিরে গেছে' : 'Squad recalled to HQ');
    } else {
      const fx = this.interior.activeInterior ? this.savedExteriorPos.x : this.player.x;
      const fz = this.interior.activeInterior ? this.savedExteriorPos.z : this.player.z;
      this.squad.deploy(fx, fz, this.physics);
      this.audio.playChime('briefing');
      this.showToast(this.settings.language === 'bn' ? 'স্পেশাল অপস স্কোয়াড মোতায়েন!' : 'Special Ops Squad deployed!');
    }
    this.emitHud();
  }

  public subdueNearestHostile(): boolean {
    if (!this.started || this.paused || this.modalOpen || this.interior.activeInterior) return false;
    if (this.subdueCooldown > 0) return false;
    const fx = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.x : this.player.x;
    const fz = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.z : this.player.z;
    const target = this.encounters.findNearestHostile(fx, fz, 12.0);
    if (!target) return false;

    this.subdueCooldown = 0.55;
    const res = this.encounters.damageHostile(target.id, 55, fx, fz);
    this.audio.playChime(res.neutralized ? 'buy' : 'squad_cmd');
    if (res.neutralized) {
      this.stats.hostilesNeutralized += 1;
      const name = this.settings.language === 'bn' ? target.nameBn : target.nameEn;
      this.showToast(
        this.settings.language === 'bn' ? `নিয়ন্ত্রণে আনা হয়েছে: ${name}` : `Neutralized: ${name}`
      );
      this.emitPlayerData();
    }
    this.emitHud();
    return true;
  }

  public equipSpecOpsOutfit(outfitId: string): boolean {
    const def = SPEC_OPS_OUTFITS[outfitId];
    if (!def) return false;
    if (def.requiresUnlockId && !this.unlockedSpecOpsRewards.has(def.requiresUnlockId)) {
      this.showToast(this.t().lockedReward);
      return false;
    }
    this.appearance = { ...def.appearance };
    this.player.applyAppearance(this.appearance);
    this.audio.playChime('buy');
    const name = this.settings.language === 'bn' ? def.nameBn : def.nameEn;
    this.showToast(`${this.t().equipped}: ${name}`);
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public setJoystick(x: number, y: number): void {
    this.touchInput.moveX = x;
    this.touchInput.moveY = y;
    if (this.settings.drivingMode === 'joystick') {
      this.touchInput.steer = x;
    }
  }

  public setSteerButton(dir: 'left' | 'right', active: boolean): void {
    this.audio.unlock();
    if (dir === 'left') this.steerButtonLeft = active;
    else this.steerButtonRight = active;
    this.touchInput.steer = (this.steerButtonRight ? 1 : 0) - (this.steerButtonLeft ? 1 : 0);
  }

  public setTouchButton(
    btn:
      | 'sprint'
      | 'jump'
      | 'throttle'
      | 'brake'
      | 'reverse'
      | 'handbrake'
      | 'boost'
      | 'horn'
      | 'fire'
      | 'aim'
      | 'ascend'
      | 'descend',
    active: boolean
  ): void {
    this.audio.unlock();
    if (btn === 'throttle') {
      this.touchInput.throttle = active ? 1 : 0;
    } else if (btn === 'brake') {
      this.touchInput.brake = active ? 1 : 0;
    } else {
      this.touchInput[btn] = active;
    }
  }

  public equipWeapon(weaponId: WeaponId): void {
    this.audio.unlock();
    this.combat.equipWeapon(weaponId);
    this.player.setEquippedWeapon(weaponId);
    const def = WEAPON_CATALOG[weaponId];
    const name = this.settings.language === 'bn' ? def.nameBn : def.nameEn;
    this.showToast(`${this.t().equipped}: ${name}`);
    this.emitHud();
  }

  public cycleWeapon(delta = 1): void {
    this.audio.unlock();
    const next = this.combat.cycleWeapon(delta);
    this.player.setEquippedWeapon(next);
    const def = WEAPON_CATALOG[next];
    const name = this.settings.language === 'bn' ? def.nameBn : def.nameEn;
    this.showToast(name);
    this.emitHud();
  }

  public reloadWeapon(): boolean {
    this.audio.unlock();
    const started = this.combat.startReload();
    if (started) {
      this.audio.playReload();
      this.emitHud();
    }
    return started;
  }

  public refillAllAmmo(): boolean {
    const cost = 1200;
    if (this.money < cost) {
      this.audio.playChime('mission_fail');
      this.showToast(this.t().notEnoughMoney);
      return false;
    }
    this.money -= cost;
    this.combat.refillAllAmmo();
    this.audio.playChime('buy');
    this.showToast(this.t().ammoRefilled);
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public toggleAim(): void {
    this.aimToggle = !this.aimToggle;
    this.emitHud();
  }

  public getWeaponAmmoSnapshot(): Record<WeaponId, WeaponAmmoState> {
    return {
      fist: { ...this.combat.ammo.fist },
      pistol: { ...this.combat.ammo.pistol },
      smg: { ...this.combat.ammo.smg },
      shotgun: { ...this.combat.ammo.shotgun },
      rifle: { ...this.combat.ammo.rifle },
      sniper: { ...this.combat.ammo.sniper },
    };
  }

  // =========================================================================
  // UNIVERSAL INTERACTION SYSTEM (Single Closest Valid Prompt)
  // =========================================================================

  private computeNearestInteraction(): InteractionPrompt | null {
    if (!this.started || this.paused || this.modalOpen || this.transitioning || this.pendingUnlock) {
      return null;
    }

    // Driving a vehicle: vehicle controls show dedicated Exit button
    if (this.vehicles.activeVehicle) {
      return null;
    }

    // 1. Inside a 3D Building Interior
    const room = this.interior.activeInterior;
    if (room) {
      const b = room.building;
      const distExit = Math.hypot(this.player.x - room.exitX, this.player.z - room.exitZ);
      const distCounter = Math.hypot(this.player.x - room.counterX, this.player.z - room.counterZ);

      // Special Operations HQ dedicated stations (Mission Terminal & Tactical Armory)
      if (room.missionTerminal) {
        const distTerm = Math.hypot(
          this.player.x - room.missionTerminal.x,
          this.player.z - room.missionTerminal.z
        );
        if (distTerm < 3.0) {
          return {
            id: 'open_spec_ops_terminal',
            type: 'open_spec_ops_terminal',
            labelEn: this.t().openOpsTerminal,
            labelBn: TRANSLATIONS.bn.openOpsTerminal,
            sublabelEn: 'Launch Special Ops & View Ranks',
            sublabelBn: 'স্পেশাল অপস মিশন ও র‍্যাংক',
            targetId: b.id,
            distance: distTerm,
          };
        }
      }
      if (room.armoryStation) {
        const distArm = Math.hypot(
          this.player.x - room.armoryStation.x,
          this.player.z - room.armoryStation.z
        );
        if (distArm < 3.0) {
          return {
            id: 'open_spec_ops_armory',
            type: 'open_spec_ops_armory',
            labelEn: this.t().openArmory,
            labelBn: TRANSLATIONS.bn.openArmory,
            sublabelEn: 'Tactical Uniforms & Squad Prep',
            sublabelBn: 'ট্যাকটিক্যাল পোশাক ও প্রস্তুতি',
            targetId: b.id,
            distance: distArm,
          };
        }
      }

      if (distExit < 2.2 && distExit <= distCounter) {
        return {
          id: 'exit_room',
          type: 'exit_building',
          labelEn: `Exit ${b.nameEn}`,
          labelBn: `${b.nameBn} থেকে বের হোন`,
          targetId: b.id,
          distance: distExit,
        };
      }

      if (distCounter < 3.4) {
        if (b.isSpecOpsHq) {
          return {
            id: 'open_spec_ops_terminal_desk',
            type: 'open_spec_ops_terminal',
            labelEn: 'Brief with Major Tariq',
            labelBn: 'মেজর তারিকের সাথে ব্রিফিং',
            sublabelEn: 'Special Operations Command',
            sublabelBn: 'স্পেশাল অপস কমান্ড',
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.isGarage) {
          return {
            id: 'open_garage',
            type: 'open_garage',
            labelEn: 'Open Auto Garage',
            labelBn: 'অটো গ্যারেজ খুলুন',
            sublabelEn: b.shopKeeperNameEn,
            sublabelBn: b.shopKeeperNameBn,
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.isDealership) {
          return {
            id: 'open_dealership',
            type: 'open_dealership',
            labelEn: 'Browse Vehicles',
            labelBn: 'গাড়ির শোরুম দেখুন',
            sublabelEn: b.shopKeeperNameEn,
            sublabelBn: b.shopKeeperNameBn,
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.isSafeHouse) {
          return {
            id: 'save_safehouse',
            type: 'save_safehouse',
            labelEn: 'Rest & Save Progress',
            labelBn: 'বিশ্রাম নিন ও সেভ করুন',
            sublabelEn: '100% Health + Clear Heat',
            sublabelBn: '১০০% স্বাস্থ্য ও সেভ',
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.isHospital) {
          return {
            id: 'heal_hospital',
            type: 'heal_hospital',
            labelEn: 'Medical Treatment & Pharmacy',
            labelBn: 'চিকিৎসা ও ফার্মেসি',
            sublabelEn: b.shopKeeperNameEn,
            sublabelBn: b.shopKeeperNameBn,
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.hasShop) {
          return {
            id: 'open_shop',
            type: 'open_shop',
            labelEn: `Shop · ${b.nameEn}`,
            labelBn: `দোকান · ${b.nameBn}`,
            sublabelEn: b.shopKeeperNameEn,
            sublabelBn: b.shopKeeperNameBn,
            targetId: b.id,
            distance: distCounter,
          };
        }
        if (b.category === 'bank') {
          if (this.bankRobCooldown <= 0 && !this.activeHeist) {
            return {
              id: 'rob_dhaka_bank',
              type: 'rob_bank',
              labelEn: 'Crack Bank Vault (Heist)',
              labelBn: 'ব্যাংক ভল্ট লুট করুন',
              sublabelEn: '৳ 25,000+ · 3-Star Police Alert',
              sublabelBn: '৳ ২৫,০০০+ · ৩-স্টার পুলিশ অ্যালার্ট',
              targetId: b.id,
              distance: distCounter,
              locked: true,
            };
          }
          const rem = Math.ceil(this.bankRobCooldown);
          return {
            id: 'talk_host_bank',
            type: 'talk_npc',
            labelEn: `Vault Locked (${rem}s)`,
            labelBn: `ভল্ট লকড (${rem} সে.)`,
            targetId: `interior_host_${b.id}`,
            distance: distCounter,
          };
        }
        return {
          id: 'talk_host',
          type: 'talk_npc',
          labelEn: `Talk to ${b.shopKeeperNameEn}`,
          labelBn: `${b.shopKeeperNameBn}-এর সাথে কথা বলুন`,
          targetId: `interior_host_${b.id}`,
          distance: distCounter,
        };
      }
      return null;
    }

    // 2. Exterior Open World — compare all candidate interactables and pick strictly the nearest!
    const candidates: InteractionPrompt[] = [];

    // 2-specops-a. Interactive Special Operations Evidence Clues (high priority!)
    const nearClue = this.encounters.findNearestClue(this.player.x, this.player.z, 3.6);
    if (nearClue) {
      candidates.push({
        id: `clue_${nearClue.id}`,
        type: 'inspect_clue',
        labelEn: `Inspect: ${nearClue.labelEn}`,
        labelBn: `পরীক্ষা করুন: ${nearClue.labelBn}`,
        sublabelEn: 'Special Ops Intel',
        sublabelBn: 'স্পেশাল অপস তথ্য',
        targetId: nearClue.id,
        distance: nearClue.distance - 1.2,
      });
    }

    // 2-specops-b. Nearby Fictional Hostile (Tactical Subdue prompt)
    const nearHostile = this.encounters.findNearestHostile(this.player.x, this.player.z, 9.5);
    if (nearHostile) {
      candidates.push({
        id: `hostile_${nearHostile.id}`,
        type: 'subdue_hostile',
        labelEn: `Subdue ${nearHostile.nameEn}`,
        labelBn: `নিয়ন্ত্রণে আনুন · ${nearHostile.nameBn}`,
        sublabelEn: `${Math.round(nearHostile.hp)} HP · Tactical Pulse (R)`,
        sublabelBn: `${Math.round(nearHostile.hp)} HP · ট্যাকটিক্যাল পালস (R)`,
        targetId: nearHostile.id,
        distance: nearHostile.distance - 0.6,
      });
    }

    // 2a. Parked / Drivable vehicles (Cars, Bikes, Helicopter, Speedboat)
    const nearVeh = this.vehicles.findNearestVehicle(this.player.x, this.player.z, 4.9);
    if (nearVeh) {
      const dist = Math.hypot(nearVeh.x - this.player.x, nearVeh.z - this.player.z);
      const verbEn =
        nearVeh.domain === 'air'
          ? 'Fly'
          : nearVeh.domain === 'water'
            ? 'Pilot'
            : nearVeh.locked
              ? 'Unlock'
              : 'Drive';
      const verbBn =
        nearVeh.domain === 'air'
          ? 'উড়ান ·'
          : nearVeh.domain === 'water'
            ? 'চালান ·'
            : nearVeh.locked
              ? 'আনলক ·'
              : 'চালান ·';
      candidates.push({
        id: `enter_veh_${nearVeh.id}`,
        type: 'enter_vehicle',
        labelEn: `${verbEn} ${nearVeh.nameEn}`,
        labelBn: `${verbBn} ${nearVeh.nameBn}`,
        sublabelEn:
          nearVeh.domain === 'air'
            ? 'Helipad Ready · ↑ Lift / ↓ Land'
            : nearVeh.domain === 'water'
              ? 'Hatirjheel Lake Cruiser'
              : nearVeh.locked
                ? 'Alarm Risk · Crime Heat'
                : 'Press to Board',
        sublabelBn:
          nearVeh.domain === 'air'
            ? 'হেলিকপ্টার প্রস্তুত · ↑ উড়ুন / ↓ নামুন'
            : nearVeh.domain === 'water'
              ? 'হাতিরঝিল লেক স্পিডবোট'
              : nearVeh.locked
                ? 'অ্যালার্ম ও ক্রাইম হিট'
                : 'গাড়িতে উঠুন',
        targetId: `veh:${nearVeh.id}`,
        distance: nearVeh.domain !== 'ground' ? Math.max(0.5, dist - 2.6) : dist,
        locked: nearVeh.locked,
      });
    }

    // 2b. ANY street Traffic Vehicle!
    const nearTraffic = this.traffic.findNearestTrafficVehicle(this.player.x, this.player.z, 5.2);
    if (nearTraffic) {
      candidates.push({
        id: `enter_traffic_${nearTraffic.agent.id}`,
        type: 'enter_vehicle',
        labelEn: `Take ${nearTraffic.nameEn}`,
        labelBn: `${nearTraffic.nameBn} নিন`,
        sublabelEn: 'Street Vehicle · 1-Star Alert',
        sublabelBn: 'রাস্তার গাড়ি · ১-স্টার সতর্কতা',
        targetId: `traffic:${nearTraffic.agent.id}`,
        distance: nearTraffic.distance,
        locked: true,
      });
    }

    // 2c. Enterable Buildings (13 Dhaka interiors including Special Ops HQ)
    for (let i = 0; i < ENTERABLE_BUILDINGS.length; i++) {
      const b = ENTERABLE_BUILDINGS[i];
      const dist = Math.hypot(b.doorX - this.player.x, b.doorZ - this.player.z);
      if (dist < 3.4) {
        candidates.push({
          id: `enter_bldg_${b.id}`,
          type: 'enter_building',
          labelEn: `Enter ${b.nameEn}`,
          labelBn: `${b.nameBn}-এ প্রবেশ করুন`,
          targetId: b.id,
          distance: dist - 0.35, // Slight priority when standing directly on the doorway mat
        });
      }
    }

    // 2d. Nearby Dhaka NPC Pedestrians
    const nearNpc = this.npcs.findNearestNpc(this.player.x, this.player.z, 3.0);
    if (nearNpc) {
      candidates.push({
        id: `talk_npc_${nearNpc.id}`,
        type: 'talk_npc',
        labelEn: `Talk to ${nearNpc.nameEn}`,
        labelBn: `${nearNpc.nameBn}-এর সাথে কথা বলুন`,
        targetId: nearNpc.id,
        distance: nearNpc.distance + 0.4, // Prioritize vehicles/doors if equidistant
      });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0];
  }

  public triggerPrimaryInteraction(): void {
    if (!this.started || this.paused || this.modalOpen || this.transitioning || this.pendingUnlock) {
      return;
    }
    this.audio.unlock();

    if (this.vehicles.activeVehicle) {
      this.exitActiveVehicle();
      return;
    }

    const prompt = this.computeNearestInteraction();
    if (!prompt) return;

    switch (prompt.type) {
      case 'enter_vehicle':
        this.handleEnterVehiclePrompt(prompt.targetId);
        break;
      case 'enter_building':
        this.enterBuildingById(prompt.targetId);
        break;
      case 'exit_building':
        this.exitCurrentBuilding();
        break;
      case 'open_shop':
      case 'open_garage':
      case 'open_dealership': {
        const b = ENTERABLE_BUILDINGS.find((it) => it.id === prompt.targetId);
        if (b) {
          this.setModalOpen(true);
          this.callbacks.onOpenShop(b);
        }
        break;
      }
      case 'open_spec_ops_terminal':
        this.audio.playChime('briefing');
        this.setModalOpen(true);
        this.callbacks.onOpenSpecOpsTerminal('ops');
        break;
      case 'open_spec_ops_armory':
        this.audio.playChime('briefing');
        this.setModalOpen(true);
        this.callbacks.onOpenSpecOpsTerminal('armory');
        break;
      case 'inspect_clue': {
        if (this.encounters.inspectClue(prompt.targetId)) {
          this.stats.cluesInvestigated += 1;
          this.audio.playChime('clue');
          this.showToast(
            this.settings.language === 'bn'
              ? `তথ্য সংগ্রহ হয়েছে: ${prompt.labelBn}`
              : `Intel Collected: ${prompt.labelEn}`
          );
          this.emitPlayerData();
          this.emitHud();
        }
        break;
      }
      case 'subdue_hostile':
        this.subdueNearestHostile();
        break;
      case 'heal_hospital': {
        const b = ENTERABLE_BUILDINGS.find((it) => it.id === prompt.targetId);
        this.health = 100;
        this.audio.playChime('buy');
        this.showToast(this.t().hospitalHealed);
        this.emitPlayerData();
        if (b) {
          this.setModalOpen(true);
          this.callbacks.onOpenShop(b);
        }
        break;
      }
      case 'save_safehouse': {
        this.health = 100;
        this.police.clearWanted();
        this.audio.playChime('buy');
        this.saveProgress(this.t().safeHouseSaved);
        this.emitPlayerData();
        break;
      }
      case 'rob_bank': {
        this.startBankVaultHeist();
        break;
      }
      case 'talk_npc': {
        this.advanceTutorial('npc');
        if (prompt.targetId.startsWith('interior_host_')) {
          const bId = prompt.targetId.replace('interior_host_', '');
          const b = ENTERABLE_BUILDINGS.find((it) => it.id === bId);
          if (b) {
            this.showDialogue({
              npcId: prompt.targetId,
              nameEn: b.shopKeeperNameEn,
              nameBn: b.shopKeeperNameBn,
              roleEn: b.nameEn,
              roleBn: b.nameBn,
              lineEn: b.greetingEn,
              lineBn: b.greetingBn,
              mood: 'shopkeeper',
            });
          }
        } else {
          const dlg = this.npcs.getDialogueForNpc(prompt.targetId);
          if (dlg) this.showDialogue(dlg);
        }
        break;
      }
    }
  }

  private handleEnterVehiclePrompt(targetId: string): void {
    if (targetId.startsWith('traffic:')) {
      const agentId = targetId.replace('traffic:', '');
      const claimed = this.traffic.claimTrafficAgent(agentId);
      if (!claimed) return;

      const veh = this.vehicles.adoptTrafficVehicle(
        claimed.kind,
        claimed.paintHex,
        claimed.x,
        claimed.z,
        claimed.yaw,
        this.physics
      );
      this.audio.playAlarmBurst();
      veh.alarmTimer = 4.5;
      this.npcs.triggerNearbyReaction(veh.x, veh.z, 22);
      // Taking a random street car builds Crime Heat (60) instead of instant swarm
      this.police.addCrimeHeat(60, false, 3);
      this.boardVehicle(veh);
      return;
    }

    if (targetId.startsWith('veh:')) {
      const vehId = targetId.replace('veh:', '');
      const veh = this.vehicles.vehicles.find((v) => v.id === vehId);
      if (!veh) return;

      if (veh.locked) {
        this.pendingUnlock = {
          vehicleId: veh.id,
          isTraffic: false,
          elapsed: 0,
          duration: 0.85,
        };
        veh.alarmTimer = 5.5;
        this.audio.playAlarmBurst();
        this.npcs.triggerNearbyReaction(veh.x, veh.z, 24);
        this.police.addCrimeHeat(65, false, 3);
        this.emitHud();
      } else {
        this.boardVehicle(veh);
      }
    }
  }

  private boardVehicle(veh: DrivableVehicle): void {
    veh.locked = false;
    this.vehicles.triggerDoorSwing(veh);
    this.vehicles.activeVehicle = veh;
    this.lastDrivenVehicle = veh;
    this.player.setVisible(false);
    this.playerCamera.setInVehicle(true, veh.yaw);
    this.audio.playDoorSound();
    this.activeDialogue = null;
    this.advanceTutorial('enter_vehicle');
    this.emitPlayerData();
    this.emitHud();
  }

  public exitActiveVehicle(): void {
    const v = this.vehicles.activeVehicle;
    if (!v) return;

    const groundAtVeh = Math.max(0, this.physics.getGroundHeightAt(v.x, v.z));
    if (v.domain === 'air' && v.y - groundAtVeh > 6.2) {
      this.showToast(
        this.settings.language === 'bn'
          ? 'নামার আগে হেলিকপ্টার নিচে নামান!'
          : 'Descend closer to the ground before exiting!'
      );
      return;
    }

    this.vehicles.triggerDoorSwing(v);
    let exitX = v.x;
    let exitZ = v.z;
    if (v.domain === 'water' || (v.domain === 'air' && v.z > 68.8)) {
      // Step safely onto Hatirjheel Boat Pier or North Promenade so player never gets trapped in lake!
      if (Math.hypot(v.x + 68, v.z - 76) < 16) {
        exitX = -68;
        exitZ = 72.5;
      } else {
        exitX = Math.max(-108, Math.min(108, v.x));
        exitZ = 67.8;
      }
    } else {
      const safe = this.physics.findClearExitPoint(v.x, v.z, v.yaw, v.rig.width, v.rig.length, 0.52);
      exitX = safe.x;
      exitZ = safe.z;
    }
    this.player.setPosition(exitX, exitZ, v.yaw, Math.max(0.18, this.physics.getGroundHeightAt(exitX, exitZ)));
    this.player.setVisible(true);
    this.vehicles.activeVehicle = null;
    this.lastDrivenVehicle = v;
    this.playerCamera.setInVehicle(false, v.yaw);
    this.audio.setHorn(false, null);
    this.audio.playDoorSound();
    this.clearAllInputs();
    this.emitPlayerData();
    this.emitHud();
  }

  // =========================================================================
  // 3D WALK-IN BUILDING INTERIOR TRANSITIONS (Smooth Fade)
  // =========================================================================

  private enterBuildingById(buildingId: string): void {
    const def = ENTERABLE_BUILDINGS.find((b) => b.id === buildingId);
    if (!def || this.transitioning) return;

    this.transitioning = true;
    this.clearAllInputs();
    this.activeDialogue = null;
    this.audio.playDoorSound();
    this.emitHud();

    window.clearTimeout(this.transitionTimeoutId);
    this.transitionTimeoutId = window.setTimeout(() => {
      if (this.disposed) return;

      this.savedExteriorPos = { x: def.doorX, z: def.doorZ, yaw: def.exitYaw };

      // Hide exterior Dhaka city while inside dedicated 3D interior room
      this.world.group.visible = false;
      this.vehicles.group.visible = false;
      this.traffic.group.visible = false;
      this.npcs.group.visible = false;
      this.police.group.visible = false;
      this.encounters.group.visible = false;
      this.squad.group.visible = false;
      this.combat.group.visible = false;
      this.aimToggle = false;

      const info = this.interior.enterBuilding(def);
      this.physics.setInteriorMode(true, info.bounds, info.colliders);
      this.sceneManager.setInteriorMode(true);

      this.player.root.visible = true;
      this.aimTargetLocked = false;
      this.player.setPosition(info.spawnX, info.spawnZ, info.spawnYaw, 0);
      this.playerCamera.snapTo(info.spawnYaw + Math.PI, 0.2);

      // Welcome greeting from shopkeeper/host
      this.showDialogue({
        npcId: `host_${def.id}`,
        nameEn: def.shopKeeperNameEn,
        nameBn: def.shopKeeperNameBn,
        roleEn: def.nameEn,
        roleBn: def.nameBn,
        lineEn: def.greetingEn,
        lineBn: def.greetingBn,
        mood: 'shopkeeper',
      });

      this.transitioning = false;
      this.emitPlayerData();
      this.emitHud();
    }, 180);
  }

  private exitCurrentBuilding(): void {
    const info = this.interior.activeInterior;
    if (!info || this.transitioning) return;

    this.transitioning = true;
    this.clearAllInputs();
    this.activeDialogue = null;
    this.audio.playDoorSound();
    this.emitHud();

    window.clearTimeout(this.transitionTimeoutId);
    this.transitionTimeoutId = window.setTimeout(() => {
      if (this.disposed) return;

      this.interior.unloadRoom();
      this.physics.setInteriorMode(false);
      this.sceneManager.setInteriorMode(false);

      this.world.group.visible = true;
      this.vehicles.group.visible = true;
      this.traffic.group.visible = true;
      this.npcs.group.visible = true;
      this.police.group.visible = true;
      this.encounters.group.visible = true;
      this.squad.group.visible = true;
      this.combat.group.visible = true;

      const { x, z, yaw } = this.savedExteriorPos;
      const groundY = this.physics.getGroundHeightAt(x, z);
      this.player.setPosition(x, z, yaw, groundY);
      this.playerCamera.snapTo(yaw + Math.PI, 0.25);

      this.transitioning = false;
      this.emitPlayerData();
      this.emitHud();
    }, 180);
  }

  // =========================================================================
  // SHOPS, CLOTHING, GARAGE, DEALERSHIP & INVENTORY ACTIONS
  // =========================================================================

  public previewOutfit(outfitId: string): void {
    const app = OUTFIT_CATALOG[outfitId];
    if (app) {
      this.player.applyAppearance(app);
    }
  }

  public equipOutfit(outfitId: string): void {
    const app = OUTFIT_CATALOG[outfitId];
    if (!app) return;
    this.appearance = { ...app };
    this.player.applyAppearance(this.appearance);
    this.audio.playChime('buy');
    this.autoSaveSilent();
    this.emitPlayerData();
  }

  public buyShopItem(buildingId: string, itemId: string): boolean {
    const now = performance.now();
    if (now - this.lastPurchaseTime < 280) return false; // Duplicate-purchase click guard
    this.lastPurchaseTime = now;

    const bldg = ENTERABLE_BUILDINGS.find((b) => b.id === buildingId);
    if (!bldg) return false;
    const catalog = SHOP_CATALOGS[bldg.category] ?? [];
    const item = catalog.find((it) => it.id === itemId);
    if (!item) return false;

    // Prevent buying already-owned unique outfit or electronics item
    if (
      (item.category === 'clothing' || item.category === 'electronics') &&
      this.inventory.some((inv) => inv.id === item.id)
    ) {
      if (item.outfit) this.equipOutfit(item.outfit.outfitId);
      return true;
    }

    if (this.money < item.price) {
      this.audio.playChime('mission_fail');
      this.showToast(this.t().notEnoughMoney);
      return false;
    }

    this.money -= item.price;
    this.audio.playChime('buy');

    if (item.category === 'vehicle' && item.vehicleKind) {
      const owned: OwnedVehicleRecord = {
        id: `owned_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        kind: item.vehicleKind,
        nameEn: item.nameEn,
        nameBn: item.nameBn,
        paintHex: item.vehiclePaintHex ?? 0xdc2626,
        engineLevel: 1,
        armorLevel: 1,
      };
      this.ownedVehicles.push(owned);
      // Deliver freshly purchased vehicle cleanly outside Padma Motors!
      const spawned = this.vehicles.spawnVehicle(
        {
          id: `bought_${owned.id}`,
          kind: owned.kind,
          nameEn: owned.nameEn,
          nameBn: owned.nameBn,
          color: owned.paintHex,
          x: 20.0,
          z: 56.2,
          yaw: -Math.PI * 0.5,
          locked: false,
          ownedByPlayer: true,
        },
        this.physics
      );
      this.lastDrivenVehicle = spawned;
      const label = this.settings.language === 'bn' ? item.nameBn : item.nameEn;
      this.showToast(`${this.t().purchasedNotice}: ${label}`);
    } else if (item.category === 'clothing' && item.outfit) {
      this.inventory.push({
        id: item.id,
        nameEn: item.nameEn,
        nameBn: item.nameBn,
        category: 'clothing',
        quantity: 1,
        outfitId: item.outfit.outfitId,
        descriptionEn: item.descriptionEn,
        descriptionBn: item.descriptionBn,
      });
      this.appearance = { ...item.outfit };
      this.player.applyAppearance(this.appearance);
      const label = this.settings.language === 'bn' ? item.nameBn : item.nameEn;
      this.showToast(`${this.t().purchasedNotice}: ${label}`);
    } else {
      const existing = this.inventory.find((inv) => inv.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.inventory.push({
          id: item.id,
          nameEn: item.nameEn,
          nameBn: item.nameBn,
          category:
            item.category === 'service' || item.category === 'vehicle'
              ? 'collectible'
              : item.category,
          quantity: 1,
          healAmount: item.healAmount,
          descriptionEn: item.descriptionEn,
          descriptionBn: item.descriptionBn,
        });
      }
      const label = this.settings.language === 'bn' ? item.nameBn : item.nameEn;
      this.showToast(`${this.t().purchasedNotice}: ${label}`);
    }

    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public useInventoryItem(itemId: string): void {
    const idx = this.inventory.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const item = this.inventory[idx];

    if (item.category === 'clothing' && item.outfitId) {
      this.equipOutfit(item.outfitId);
      return;
    }

    if (item.healAmount && item.healAmount > 0) {
      this.health = Math.min(100, this.health + item.healAmount);
      this.player.stamina = Math.min(
        100,
        this.player.stamina + (item.category === 'drink' ? 50 : 25)
      );
      item.quantity -= 1;
      if (item.quantity <= 0) {
        this.inventory.splice(idx, 1);
      }
      this.audio.playChime('buy');
      this.showToast(`${this.t().eatHealed} (+${item.healAmount}%)`);
      this.autoSaveSilent();
      this.emitPlayerData();
      this.emitHud();
    }
  }

  public summonOwnedVehicle(ownedId: string): void {
    const rec = this.ownedVehicles.find((v) => v.id === ownedId);
    if (!rec) return;

    const baseX = this.interior.activeInterior ? this.savedExteriorPos.x : this.player.x;
    const baseZ = this.interior.activeInterior ? this.savedExteriorPos.z : this.player.z;

    // Place safely nearby on clear ground / avenue edge
    const spawnX = Math.max(-96, Math.min(96, baseX + 5.2));
    const spawnZ = Math.max(-88, Math.min(64, baseZ + 3.2));
    const spawned = this.vehicles.spawnVehicle(
      {
        kind: rec.kind,
        nameEn: rec.nameEn,
        nameBn: rec.nameBn,
        color: rec.paintHex,
        x: spawnX,
        z: spawnZ,
        yaw: this.player.yaw,
        locked: false,
        ownedByPlayer: true,
        engineLevel: rec.engineLevel,
      },
      this.physics
    );
    this.lastDrivenVehicle = spawned;
    this.audio.playChime('buy');
    const name = this.settings.language === 'bn' ? rec.nameBn : rec.nameEn;
    this.showToast(`${this.t().deliverVehicle}: ${name}`);
    this.emitPlayerData();
    this.emitHud();
  }

  private resolveGarageVehicle(): DrivableVehicle | null {
    if (this.lastDrivenVehicle) return this.lastDrivenVehicle;
    const nearGarage = this.vehicles.findNearestVehicle(38.0, 11.4, 28);
    return nearGarage ?? this.vehicles.vehicles[0] ?? null;
  }

  public garageAction(
    action: 'repair' | 'paint' | 'upgrade' | 'save',
    paintHex?: number
  ): boolean {
    const now = performance.now();
    if (now - this.lastPurchaseTime < 280) return false;
    this.lastPurchaseTime = now;

    const v = this.resolveGarageVehicle();
    if (!v) {
      this.showToast(this.t().noVehicleNearby);
      return false;
    }

    const ownsGarage = this.ownedPropertyIds.has('prop_banani_garage');

    if (action === 'repair') {
      const cost = ownsGarage ? 0 : 500;
      if (this.money < cost) {
        this.showToast(this.t().notEnoughMoney);
        return false;
      }
      this.money -= cost;
      this.vehicles.repairVehicle(v);
      this.audio.playChime('buy');
      if (this.police.wantedLevel > 0) {
        this.police.clearWanted();
        this.showToast(
          this.settings.language === 'bn'
            ? "পে 'এন' স্প্রে: পুলিশ ওয়ান্টেড ক্লিয়ার!"
            : "Pay 'n' Spray: Wanted Stars Cleared!"
        );
      } else {
        this.showToast(`${this.t().repairVehicle} · 100%${ownsGarage ? ' (FREE)' : ''}`);
      }
    } else if (action === 'paint' && typeof paintHex === 'number') {
      const swatch = GARAGE_PAINT_SWATCHES.find((s) => s.hex === paintHex);
      const cost = ownsGarage ? 0 : (swatch?.price ?? 1200);
      if (this.money < cost) {
        this.showToast(this.t().notEnoughMoney);
        return false;
      }
      this.money -= cost;
      this.vehicles.repaintVehicle(v, paintHex);
      this.audio.playChime('buy');
      const swName = this.settings.language === 'bn' ? swatch?.nameBn : swatch?.nameEn;
      if (this.police.wantedLevel > 0) {
        this.police.clearWanted();
        this.showToast(
          this.settings.language === 'bn'
            ? "পে 'এন' স্প্রে: রঙ পরিবর্তন ও পুলিশ মুক্ত!"
            : "Pay 'n' Spray: Repainted & Wanted Cleared!"
        );
      } else {
        this.showToast(`${this.t().paintVehicle}: ${swName ?? ''}`);
      }
    } else if (action === 'upgrade') {
      if (v.engineLevel >= 3) return false;
      const cost = v.engineLevel === 1 ? 2500 : 4500;
      if (this.money < cost) {
        this.showToast(this.t().notEnoughMoney);
        return false;
      }
      this.money -= cost;
      this.vehicles.upgradeVehicleEngine(v);
      this.audio.playChime('buy');
      this.showToast(`${this.t().upgradeEngine} · Lv.${v.engineLevel}`);
    } else if (action === 'save') {
      v.ownedByPlayer = true;
      const existing = this.ownedVehicles.find(
        (ov) => ov.kind === v.kind && ov.paintHex === v.paintHex && ov.nameEn === v.nameEn
      );
      if (!existing) {
        this.ownedVehicles.push({
          id: `saved_${Date.now()}`,
          kind: v.kind,
          nameEn: v.nameEn,
          nameBn: v.nameBn,
          paintHex: v.paintHex,
          engineLevel: v.engineLevel,
          armorLevel: 1,
        });
      }
      this.audio.playChime('buy');
      this.showToast(this.t().saveVehicle);
    }

    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  // =========================================================================
  // MAFIA EMPIRE, BANK HEIST, SHOP ROBBERY, VANDALISM & CHOP-SHOP LOGIC
  // =========================================================================

  private addMafiaRep(delta: number): void {
    if (delta <= 0) return;
    const prevRank = getMafiaRankForRep(this.mafiaRep);
    this.mafiaRep += delta;
    const nextRank = getMafiaRankForRep(this.mafiaRep);
    if (nextRank.index > prevRank.index) {
      this.audio.playChime('mission_win');
      const title = this.settings.language === 'bn' ? nextRank.titleBn : nextRank.titleEn;
      this.showToast(
        this.settings.language === 'bn'
          ? `মাফিয়া র‍্যাংক আপ! ${title}`
          : `MAFIA RANK UP: ${title}!`
      );
    }
  }

  public sellGarageVehicle(): boolean {
    const v = this.resolveGarageVehicle();
    if (!v) {
      this.showToast(this.t().noVehicleNearby);
      return false;
    }
    const ownsGarage = this.ownedPropertyIds.has('prop_banani_garage');
    const payout = getChopShopSellPrice(v.kind, v.health, ownsGarage);
    this.vehicles.removeOrRespawnVehicle(v.id);
    if (this.lastDrivenVehicle?.id === v.id) {
      this.lastDrivenVehicle = this.vehicles.vehicles.find((x) => x.respawnTimer <= 0) ?? null;
    }
    this.money += payout;
    this.stats.totalEarnedTaka += payout;
    this.stats.vehiclesSoldChopShop += 1;
    this.addMafiaRep(85);
    this.audio.playChime('buy');
    this.showToast(
      this.settings.language === 'bn'
        ? `চপ-শপে গাড়ি বিক্রি! +৳ ${payout.toLocaleString()} (+85 RP)`
        : `Chop-Shop Sold! +৳ ${payout.toLocaleString()} (+85 Mafia RP)`
    );
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  private startBankVaultHeist(): void {
    if (this.activeHeist || this.bankRobCooldown > 0) return;
    this.activeHeist = {
      type: 'bank',
      elapsed: 0,
      duration: 5.2,
      labelEn: 'Cracking Dhaka Central Bank Vault...',
      labelBn: 'ঢাকা সেন্ট্রাল ব্যাংক ভল্ট ভাঙা হচ্ছে...',
    };
    this.audio.playAlarmBurst();
    this.showToast(
      this.settings.language === 'bn'
        ? 'সতর্কতা! ব্যাংক অ্যালার্ম বেজেছে—ভল্ট খুলছে!'
        : 'Bank Alarm Triggered! Cracking Vault...'
    );
    this.emitHud();
  }

  public robShop(buildingId: string): boolean {
    const bldg = ENTERABLE_BUILDINGS.find((b) => b.id === buildingId);
    if (!bldg) return false;
    const rem = this.shopRobCooldowns.get(buildingId) ?? 0;
    if (rem > 0) {
      this.showToast(
        this.settings.language === 'bn'
          ? `ক্যাশ ড্রয়ার খালি (${Math.ceil(rem)} সে.)`
          : `Register empty (${Math.ceil(rem)}s)`
      );
      return false;
    }
    const loot = 3200 + Math.floor(Math.random() * 2500);
    this.money += loot;
    this.stats.totalEarnedTaka += loot;
    this.stats.shopsRobbed += 1;
    this.shopRobCooldowns.set(buildingId, 90);
    this.addMafiaRep(70);
    this.audio.playAlarmBurst();
    this.police.addWantedStars(2, 5);
    this.showToast(
      this.settings.language === 'bn'
        ? `দোকান লুট! +৳ ${loot.toLocaleString()} (+70 RP · ২-স্টার)`
        : `Shop Register Robbed! +৳ ${loot.toLocaleString()} (+70 RP · 2★)`
    );
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  private tryVandalizeShopfront(hitX: number, hitY: number, hitZ: number): boolean {
    for (let i = 0; i < ENTERABLE_BUILDINGS.length; i++) {
      const b = ENTERABLE_BUILDINGS[i];
      if (!b.hasShop && b.category !== 'bank') continue;
      if (b.isHospital || b.isSpecOpsHq || b.isSafeHouse) continue;
      const d = Math.hypot(hitX - b.doorX, hitZ - b.doorZ);
      if (d > 5.8) continue;
      const cd = this.smashedShopCooldowns.get(b.id) ?? 0;
      if (cd > 0) return false;

      this.smashedShopCooldowns.set(b.id, 90);
      this.combat.spawnImpactBurst(new THREE.Vector3(b.doorX, Math.max(1.2, hitY), b.doorZ), 0x7dd3fc, 14, 9);
      this.audio.playAlarmBurst();
      const loot = 1100 + Math.floor(Math.random() * 850);
      this.money += loot;
      this.stats.totalEarnedTaka += loot;
      this.stats.shopsSmashed += 1;
      this.addMafiaRep(45);
      this.police.addWantedStars(1, 5);
      this.npcs.triggerNearbyReaction(b.doorX, b.doorZ, 26);
      const bName = this.settings.language === 'bn' ? b.nameBn : b.nameEn;
      this.showToast(
        this.settings.language === 'bn'
          ? `${bName} ভাঙচুর ও লুট! +৳ ${loot.toLocaleString()}`
          : `Smashed ${bName}! +৳ ${loot.toLocaleString()} (+45 RP)`
      );
      this.emitPlayerData();
      return true;
    }
    return false;
  }

  public buyProperty(propId: string): boolean {
    const prop = DHAKA_PROPERTIES.find((p) => p.id === propId);
    if (!prop) return false;
    if (this.ownedPropertyIds.has(prop.id)) return true;
    const rank = getMafiaRankForRep(this.mafiaRep);
    if (rank.index < prop.minMafiaRank) {
      this.audio.playChime('mission_fail');
      this.showToast(
        this.settings.language === 'bn'
          ? 'আরো মাফিয়া র‍্যাংক প্রয়োজন!'
          : 'Higher Mafia Rank required!'
      );
      return false;
    }
    if (this.money < prop.price) {
      this.audio.playChime('mission_fail');
      this.showToast(this.t().notEnoughMoney);
      return false;
    }
    this.money -= prop.price;
    this.ownedPropertyIds.add(prop.id);
    this.addMafiaRep(120);
    this.audio.playChime('mission_win');
    const name = this.settings.language === 'bn' ? prop.nameBn : prop.nameEn;
    this.showToast(
      this.settings.language === 'bn' ? `মালিকানা কেনা হয়েছে: ${name}` : `Property Acquired: ${name}`
    );
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public collectEmpireCash(): boolean {
    if (this.empireVaultCash <= 0) return false;
    const collected = this.empireVaultCash;
    this.empireVaultCash = 0;
    this.money += collected;
    this.stats.totalEarnedTaka += collected;
    this.audio.playChime('buy');
    this.showToast(
      this.settings.language === 'bn'
        ? `সাম্রাজ্য ভল্ট থেকে ৳ ${collected.toLocaleString()} সংগ্রহ!`
        : `Collected ৳ ${collected.toLocaleString()} from Empire Safe!`
    );
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public usePenthousePerk(perk: 'clear_heat' | 'refill_ammo'): boolean {
    if (!this.ownedPropertyIds.has('prop_gulshan_penthouse')) return false;
    if (perk === 'clear_heat') {
      this.police.clearWanted();
      this.audio.playChime('buy');
      this.showToast(
        this.settings.language === 'bn'
          ? 'পেন্টহাউস সুবিধা: পুলিশ ওয়ান্টেড ফ্রি ক্লিয়ার!'
          : 'Penthouse Perk: Wanted Heat Cleared FREE!'
      );
    } else {
      this.combat.refillAllAmmo();
      this.audio.playChime('buy');
      this.showToast(
        this.settings.language === 'bn'
          ? 'পেন্টহাউস সুবিধা: সব গুলি ফ্রি রিফিল!'
          : 'Penthouse Perk: All Ammo Refilled FREE!'
      );
    }
    this.emitHud();
    return true;
  }

  private applyPlayerDamage(dmg: number): void {
    if (dmg <= 0 || this.wastedBustedState) return;
    this.health = Math.max(0, this.health - dmg);
    this.missions.recordPlayerDamage(dmg);
    if (this.health <= 0) {
      this.triggerWasted();
    }
  }

  private triggerWasted(): void {
    if (this.wastedBustedState) return;
    const fee = Math.min(2500, Math.round(this.money * 0.05));
    this.money = Math.max(0, this.money - fee);
    this.wastedBustedState = { type: 'wasted', timer: 2.4, fee };
    this.clearAllInputs();
    this.activeHeist = null;
    this.police.clearWanted();
    this.audio.playChime('mission_fail');
    this.emitPlayerData();
    this.emitHud();
  }

  private triggerBusted(): void {
    if (this.wastedBustedState) return;
    const fee = Math.min(1500, Math.round(this.money * 0.04));
    this.money = Math.max(0, this.money - fee);
    this.wastedBustedState = { type: 'busted', timer: 2.4, fee };
    this.clearAllInputs();
    this.activeHeist = null;
    this.police.clearWanted();
    this.audio.playChime('mission_fail');
    this.emitPlayerData();
    this.emitHud();
  }

  private handleVehicleRamHit(evt: VehicleRamHitEvent): void {
    const cd = this.ramHitCooldowns.get(evt.hitId) ?? 0;
    if (cd > 0) return;
    this.ramHitCooldowns.set(evt.hitId, 0.36);

    const impulseMag = Math.min(24, evt.impactSpeed * 0.95);
    const ix = evt.dirX * impulseMag;
    const iz = evt.dirZ * impulseMag;
    const ramDmg = Math.min(72, Math.max(14, (evt.impactSpeed - 3.2) * 3.1));

    this.combat.spawnImpactBurst(new THREE.Vector3(evt.hitX, evt.hitY, evt.hitZ), 0xfbbf24, 10, 9);
    this.combat.cameraShake = Math.max(this.combat.cameraShake, Math.min(0.42, evt.impactSpeed * 0.02));
    if (this.crashSoundCooldown <= 0) {
      this.crashSoundCooldown = 0.25;
      this.audio.playDoorSound();
    }

    if (evt.hitKind === 'vehicle') {
      const res = this.vehicles.ramVehicle(evt.hitId, ix, iz, ramDmg);
      if (res.destroyed) {
        this.stats.vehiclesSmashed += 1;
        this.addMafiaRep(50);
        this.triggerVehicleExplosion(res.x, res.y, res.z, false);
        this.emitPlayerData();
      } else if (evt.impactSpeed > 11) {
        this.addMafiaRep(12);
      }
    } else if (evt.hitKind === 'traffic') {
      const res = this.traffic.ramTrafficAgent(evt.hitId, ix, iz, ramDmg);
      if (res.destroyed) {
        this.stats.vehiclesSmashed += 1;
        this.addMafiaRep(55);
        this.triggerVehicleExplosion(res.x, res.y, res.z, false);
        this.emitPlayerData();
      } else if (evt.impactSpeed > 11) {
        // High-speed traffic hit adds Crime Heat instead of instant 1-star spam
        this.police.addCrimeHeat(45, false, 3);
        this.addMafiaRep(14);
      }
    } else if (evt.hitKind === 'police') {
      const res = this.police.ramPoliceUnit(evt.hitId, ix, iz, ramDmg);
      this.police.addCrimeHeat(110, true, 5);
      if (res.destroyed) {
        this.stats.vehiclesSmashed += 1;
        this.addMafiaRep(95);
        this.triggerVehicleExplosion(res.x, res.y, res.z, true);
        this.emitPlayerData();
      } else {
        this.addMafiaRep(20);
      }
    }
  }

  private handleStuntLanded(evt: StuntLandedEvent): void {
    const reward = Math.min(6000, 1200 + evt.distanceMeters * 65 + Math.round(evt.hangSec * 450));
    const repGain = Math.min(180, 45 + evt.distanceMeters * 2);
    this.money += reward;
    this.stats.totalEarnedTaka += reward;
    this.addMafiaRep(repGain);
    this.audio.playStuntBonus();

    const isInsane = evt.distanceMeters >= 24 || evt.hangSec >= 1.3;
    this.stuntBanner = {
      distanceMeters: evt.distanceMeters,
      hangSec: evt.hangSec,
      reward,
      labelEn: isInsane ? 'INSANE STUNT BONUS!' : 'STUNT JUMP COMPLETED!',
      labelBn: isInsane ? 'অবিশ্বাস্য স্টান্ট বোনাস!' : 'স্টান্ট জাম্প সফল!',
    };
    this.stuntBannerTimer = 3.2;
    this.emitPlayerData();
    this.emitHud();
  }

  // =========================================================================
  // MISSIONS & GPS NAVIGATION
  // =========================================================================

  public startMission(missionId: string, difficulty: MissionDifficulty): void {
    const res = this.missions.startMission(missionId, difficulty);
    if (!res.mission) {
      if (res.errorEn || res.errorBn) {
        this.audio.playChime('mission_fail');
        this.showToast(this.settings.language === 'bn' ? (res.errorBn ?? '') : (res.errorEn ?? ''));
      }
      return;
    }

    const def = res.mission;
    this.audio.unlock();
    this.encounters.clearEncounter();
    this.encounters.consumeMissionTotals();
    this.police.setSupportZone(false);

    const fx = this.interior.activeInterior
      ? this.savedExteriorPos.x
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.x
        : this.player.x;
    const fz = this.interior.activeInterior
      ? this.savedExteriorPos.z
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.z
        : this.player.z;

    if (def.initialWantedStars && def.initialWantedStars > 0) {
      this.police.setWantedLevel(def.initialWantedStars, fx, fz);
    }

    if (def.deploySquad) {
      this.squad.deploy(fx, fz, this.physics);
      this.audio.playChime('briefing');
    }

    const stage0 = this.missions.getCurrentStage();
    if (stage0) {
      this.encounters.spawnForStage(stage0, this.physics, false);
      if (stage0.encounter?.policeSupport) {
        this.police.setSupportZone(true, stage0.targetX, stage0.targetZ);
      }
    }

    this.advanceTutorial('mission');
    this.customGps.active = false;
    this.refreshGpsAndBeacon(true);
    this.audio.playChime('briefing');
    this.showDialogue({
      npcId: `brief_${def.id}`,
      nameEn: def.giverEn,
      nameBn: def.giverBn,
      roleEn: def.callerRoleEn ?? (def.chapterNumber ? `Chapter ${def.chapterNumber} Briefing` : 'Mission Contact'),
      roleBn: def.callerRoleBn ?? (def.chapterNumber ? `অধ্যায় ${def.chapterNumber} ব্রিফিং` : 'মিশন কন্টাক্ট'),
      lineEn: def.briefingEn ?? def.descriptionEn,
      lineBn: def.briefingBn ?? def.descriptionBn,
      mood: 'alert',
    });
    const title = this.settings.language === 'bn' ? def.titleBn : def.titleEn;
    this.showToast(`${this.t().startMission}: ${title}`);
    this.emitHud();
  }

  public cancelMission(): void {
    this.missions.cancelMission();
    this.encounters.clearEncounter();
    this.police.setSupportZone(false);
    this.refreshGpsAndBeacon(true);
    this.emitHud();
  }

  public retryLastMission(): void {
    if (this.missions.lastMissionId) {
      this.startMission(this.missions.lastMissionId, this.missions.lastDifficulty);
    }
  }

  public dismissMissionResult(): void {
    this.missions.dismissResult();
    this.emitHud();
  }

  public setGpsDestination(x: number, z: number, labelEn: string, labelBn: string): void {
    this.customGps = { active: true, x, z, labelEn, labelBn };
    this.refreshGpsAndBeacon(true);
    this.emitHud();
  }

  public clearGps(): void {
    this.customGps.active = false;
    this.refreshGpsAndBeacon(true);
    this.emitHud();
  }

  private refreshGpsAndBeacon(force: boolean): void {
    const fx = this.interior.activeInterior
      ? this.savedExteriorPos.x
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.x
        : this.player.x;
    const fz = this.interior.activeInterior
      ? this.savedExteriorPos.z
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.z
        : this.player.z;

    const missionStage = this.missions.getCurrentStage();
    let targetX = 0;
    let targetZ = 0;
    let labelEn = '';
    let labelBn = '';
    let active = false;
    let beaconColor = 0x22d3ee;

    if (this.customGps.active) {
      active = true;
      targetX = this.customGps.x;
      targetZ = this.customGps.z;
      labelEn = this.customGps.labelEn;
      labelBn = this.customGps.labelBn;
      beaconColor = 0x22d3ee;
    } else if (missionStage && missionStage.type !== 'escape_police') {
      active = true;
      targetX = missionStage.targetX;
      targetZ = missionStage.targetZ;
      labelEn = missionStage.titleEn;
      labelBn = missionStage.titleBn;
      beaconColor = 0xf59e0b;
    }

    if (!active) {
      this.cachedGps = { ...EMPTY_GPS };
      this.world.setWaypointBeacon(false);
      return;
    }

    const dist = Math.hypot(targetX - fx, targetZ - fz);
    if (this.customGps.active && !this.interior.activeInterior && dist < 7.5) {
      this.customGps.active = false;
      this.cachedGps = { ...EMPTY_GPS };
      this.world.setWaypointBeacon(false);
      this.showToast(this.settings.language === 'bn' ? 'গন্তব্যে পৌঁছেছেন!' : 'Arrived at GPS destination!');
      return;
    }

    if (force || this.gpsRecalcAccum >= 0.45) {
      this.gpsRecalcAccum = 0;
      const path = this.world.computeGpsRoute(fx, fz, targetX, targetZ);
      this.cachedGps = {
        active: true,
        labelEn,
        labelBn,
        targetX,
        targetZ,
        distanceMeters: Math.round(dist),
        path,
      };
      this.world.setWaypointBeacon(!this.interior.activeInterior, targetX, targetZ, beaconColor);
    } else {
      this.cachedGps.distanceMeters = Math.round(dist);
    }
  }

  public showDialogue(dlg: NpcDialogueSnapshot): void {
    this.activeDialogue = dlg;
    this.dialogueTimer = 6.5;
    this.emitHud();
  }

  public dismissDialogue(): void {
    this.activeDialogue = null;
    this.dialogueTimer = 0;
    this.emitHud();
  }

  // =========================================================================
  // SETTINGS, SAVE, RESPAWN & MAP DATA
  // =========================================================================

  public updateSettings(patch: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...patch };
    if (patch.quality) {
      this.sceneManager.applyQuality(patch.quality as GraphicsQuality);
      this.dayNight.applyShadowQuality(patch.quality as GraphicsQuality);
    }
    if (typeof patch.trafficDensity === 'number') {
      this.traffic.setDensity(patch.trafficDensity);
    }
    if (typeof patch.audioEnabled === 'boolean') {
      this.audio.setEnabled(patch.audioEnabled);
    }
    if (typeof patch.audioVolume === 'number') {
      this.audio.setVolume(patch.audioVolume);
    }
    if (typeof patch.timeScale === 'number') {
      this.dayNight.timeScale = patch.timeScale;
    }
    if (patch.drivingMode) {
      this.steerButtonLeft = false;
      this.steerButtonRight = false;
      this.touchInput.steer = 0;
    }
    if (patch.weather || typeof patch.weatherAuto === 'boolean') {
      this.weather.setWeather(this.settings.weather, this.settings.weatherAuto);
    }
    if (patch.radioStation) {
      this.audio.unlock();
      this.audio.setRadioStation(patch.radioStation);
    }
    if (patch.vehicleCameraPreset) {
      this.playerCamera.setVehicleCameraPreset(
        patch.vehicleCameraPreset,
        Boolean(this.vehicles.activeVehicle)
      );
    }
    if (typeof patch.vehicleCameraZoom === 'number') {
      this.playerCamera.setManualVehicleZoom(patch.vehicleCameraZoom);
    }
    if (
      patch.mobileControls ||
      patch.vehicleCameraPreset ||
      typeof patch.vehicleCameraZoom === 'number' ||
      patch.drivingMode
    ) {
      this.autoSaveSilent();
    }
    this.callbacks.onSettingsUpdate({ ...this.settings });
    this.emitHud();
  }

  public setPhotoMode(enabled: boolean): void {
    this.photoMode = enabled;
    if (enabled) {
      this.clearAllInputs();
    }
    this.emitHud();
  }

  public setWeather(weather: WeatherType, auto: boolean): void {
    this.updateSettings({ weather, weatherAuto: auto });
  }

  public setRadioStation(station: RadioStationId): void {
    this.updateSettings({ radioStation: station });
  }

  public useEmergencyService(service: 'clear_wanted' | 'med_drop'): boolean {
    if (service === 'clear_wanted') {
      if (this.police.wantedLevel <= 0) {
        this.showToast(
          this.settings.language === 'bn' ? 'কোনো পুলিশ ওয়ান্টেড নেই!' : 'No active wanted level!'
        );
        return false;
      }
      const cost = 1500;
      if (this.money < cost) {
        this.showToast(this.t().notEnoughMoney);
        return false;
      }
      this.money -= cost;
      this.police.clearWanted();
      this.audio.playChime('buy');
      this.showToast(
        this.settings.language === 'bn'
          ? 'পুলিশ ওয়ান্টেড ক্লিয়ার করা হয়েছে!'
          : 'Wanted stars cleared by Dhaka Fixer!'
      );
    } else {
      const cost = 400;
      if (this.money < cost) {
        this.showToast(this.t().notEnoughMoney);
        return false;
      }
      this.money -= cost;
      this.health = Math.min(100, this.health + 50);
      this.player.stamina = 100;
      this.audio.playChime('buy');
      this.showToast(
        this.settings.language === 'bn'
          ? 'মেড-ড্রপ পাওয়া গেছে (+৫০ HP, ১০০% স্ট্যামিনা)'
          : 'Quick Med-Drop delivered (+50 HP, 100% Stamina)'
      );
    }
    this.autoSaveSilent();
    this.emitPlayerData();
    this.emitHud();
    return true;
  }

  public setTimeOfDay(hours: number): void {
    this.dayNight.setTimeOfDay(hours);
    this.emitHud();
  }

  private autoSaveSilent(): void {
    const px = this.interior.activeInterior
      ? this.savedExteriorPos.x
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.x
        : this.player.x;
    const pz = this.interior.activeInterior
      ? this.savedExteriorPos.z
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.z
        : this.player.z;
    const yaw = this.interior.activeInterior
      ? this.savedExteriorPos.yaw
      : this.vehicles.activeVehicle
        ? this.vehicles.activeVehicle.yaw
        : this.player.yaw;

    SaveManager.save({
      playerX: px,
      playerZ: pz,
      playerYaw: yaw,
      money: this.money,
      health: this.health,
      timeOfDay: this.dayNight.timeOfDay,
      appearance: this.appearance,
      inventory: this.inventory,
      ownedVehicles: this.ownedVehicles,
      completedMissionIds: this.missions.getCompletedArray(),
      missionHistory: this.missions.missionHistory,
      claimedRewardIds: this.missions.getClaimedRewardsArray(),
      unlockedSpecOpsRewards: Array.from(this.unlockedSpecOpsRewards),
      squadCommandDefault: this.squad.command,
      tutorialCompleted: this.tutorial.completed || this.tutorial.skipped,
      stats: this.stats,
      settings: this.settings,
      mafiaRep: this.mafiaRep,
      ownedPropertyIds: Array.from(this.ownedPropertyIds),
      empireVaultCash: this.empireVaultCash,
      favoriteMapIds: Array.from(this.favoriteMapIds),
      discoveredPlaceIds: this.chunkManager.getDiscoveredIds(),
    });
  }

  public saveProgress(notice: string): void {
    this.autoSaveSilent();
    this.showToast(notice);
  }

  public respawnPlayer(notice: string): void {
    if (this.interior.activeInterior) {
      this.interior.unloadRoom();
      this.physics.setInteriorMode(false);
      this.sceneManager.setInteriorMode(false);
      this.world.group.visible = true;
      this.vehicles.group.visible = true;
      this.traffic.group.visible = true;
      this.npcs.group.visible = true;
      this.police.group.visible = true;
      this.encounters.group.visible = true;
      this.squad.group.visible = true;
      this.combat.group.visible = true;
    }
    if (this.vehicles.activeVehicle) {
      this.vehicles.activeVehicle.speed = 0;
      this.vehicles.activeVehicle.vy = 0;
      this.vehicles.activeVehicle = null;
      this.player.setVisible(true);
      this.playerCamera.setInVehicle(false, 0);
    }
    this.activeHeist = null;
    this.pendingUnlock = null;
    this.aimToggle = false;
    this.policeCornerTimer = 0;
    this.clearAllInputs();
    this.police.clearWanted();
    this.health = 100;
    this.player.setPosition(-12.5, 17.5, 0.35, 0.18);
    this.playerCamera.snapTo(0.35 + Math.PI, 0.25);
    this.showToast(notice);
    this.emitPlayerData();
    this.emitHud();
  }

  public showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastTimer = 2.9;
    this.emitHud();
  }

  public getWorldMapData(): {
    buildings: BuildingFootprint[];
    markers: MapMarker[];
    roadCoords: number[];
  } {
    return {
      buildings: this.world.buildingFootprints,
      markers: this.world.mapMarkers,
      roadCoords: this.world.getRoadCoords(),
    };
  }

  public getMiniMapSnapshot(): MiniMapSnapshot {
    const inside = this.interior.activeInterior;
    const activeVeh = this.vehicles.activeVehicle;
    const stage = this.missions.getCurrentStage();
    const encMap = this.encounters.getMiniMapData();
    const personalVeh =
      activeVeh ?? (this.lastDrivenVehicle && this.lastDrivenVehicle.respawnTimer <= 0 ? this.lastDrivenVehicle : null);
    return {
      playerX: inside ? this.savedExteriorPos.x : activeVeh ? activeVeh.x : this.player.x,
      playerZ: inside ? this.savedExteriorPos.z : activeVeh ? activeVeh.z : this.player.z,
      playerYaw: inside ? this.savedExteriorPos.yaw : activeVeh ? activeVeh.yaw : this.player.yaw,
      cameraYaw: this.playerCamera.yaw,
      inVehicle: Boolean(activeVeh),
      insideBuildingId: inside ? inside.building.id : null,
      playerVehicle: personalVeh
        ? {
            x: personalVeh.x,
            z: personalVeh.z,
            kind: personalVeh.kind,
            nameEn: personalVeh.nameEn,
            nameBn: personalVeh.nameBn,
          }
        : null,
      discoveredPlaceIds: this.chunkManager.getDiscoveredIds(),
      traffic: this.traffic.getMiniMapPositions(),
      parkedVehicles: this.vehicles.vehicles
        .filter((v) => v !== activeVeh && v.respawnTimer <= 0)
        .map((v) => ({ x: v.x, z: v.z, kind: v.kind })),
      police: this.police.getMiniMapPositions(),
      squad: this.squad.getMiniMapPositions(),
      hostiles: encMap.hostiles,
      civilians: encMap.civilians,
      gps: this.cachedGps,
      missionTarget:
        stage && stage.type !== 'escape_police'
          ? { x: stage.targetX, z: stage.targetZ }
          : null,
    };
  }

  public getLanguage(): Language {
    return this.settings.language;
  }

  // =========================================================================
  // INPUT HANDLING & STUCK-INPUT PROTECTION (BUG-03 & BUG-07 FIX)
  // =========================================================================

  private clearAllInputs(): void {
    this.keys.clear();
    this.steerButtonLeft = false;
    this.steerButtonRight = false;
    this.mouseAim = false;
    this.mouseFire = false;
    this.mouseTapFireQueued = false;
    this.touchInput.moveX = 0;
    this.touchInput.moveY = 0;
    this.touchInput.sprint = false;
    this.touchInput.jump = false;
    this.touchInput.steer = 0;
    this.touchInput.throttle = 0;
    this.touchInput.brake = 0;
    this.touchInput.reverse = false;
    this.touchInput.handbrake = false;
    this.touchInput.boost = false;
    this.touchInput.horn = false;
    this.touchInput.fire = false;
    this.touchInput.aim = false;
    this.touchInput.ascend = false;
    this.touchInput.descend = false;
  }

  private handleWindowBlur = (): void => {
    this.clearAllInputs();
    this.audio.setHorn(false, null);
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearAllInputs();
      this.audio.setHorn(false, null);
    }
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private isViewportEventTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target === this.sceneManager.renderer.domElement || target.dataset.viewportPad === 'true';
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.started || this.paused || this.modalOpen || this.photoMode) return;
    const onViewport = this.isViewportEventTarget(e.target);
    if (!onViewport) return;
    this.audio.unlock();
    if (e.button === 2) {
      this.mouseAim = true;
      return;
    }
    if (e.button === 0) {
      this.mouseDownOrigin = { x: e.clientX, y: e.clientY, onViewport: true };
      if (this.mouseAim || this.aimToggle) {
        this.mouseFire = true;
      }
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.mouseAim = false;
      return;
    }
    if (e.button === 0) {
      if (
        this.mouseDownOrigin.onViewport &&
        !this.mouseFire &&
        this.started &&
        !this.paused &&
        !this.modalOpen &&
        !this.photoMode
      ) {
        const moved = Math.hypot(
          e.clientX - this.mouseDownOrigin.x,
          e.clientY - this.mouseDownOrigin.y
        );
        // Quick left-click on viewport fires immediately while dragging still rotates camera!
        if (moved < 6) {
          this.mouseTapFireQueued = true;
        }
      }
      this.mouseFire = false;
      this.mouseDownOrigin.onViewport = false;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.started || this.paused || this.modalOpen || this.photoMode) return;
    if (!this.isViewportEventTarget(e.target)) return;
    if (Math.abs(e.deltaY) >= 12) {
      this.cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space' ||
      code === 'Tab'
    ) {
      e.preventDefault();
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.photoMode) {
        this.setPhotoMode(false);
        return;
      }
      if (this.started && !this.modalOpen) {
        this.togglePause();
      }
      return;
    }

    if (!this.started || this.paused || this.modalOpen) return;

    if (code === 'Tab') {
      if (!e.repeat) this.callbacks.onToggleWeaponWheel();
      return;
    }
    if (code === 'KeyQ') {
      if (!e.repeat) this.cycleWeapon(1);
      return;
    }
    if (code === 'KeyF' || code === 'KeyE') {
      if (!e.repeat) this.triggerPrimaryInteraction();
      return;
    }
    if (code === 'KeyC') {
      if (!e.repeat) this.cycleCameraMode();
      return;
    }
    if (code === 'KeyM') {
      if (!e.repeat) {
        this.advanceTutorial('map');
        this.callbacks.onToggleMap();
      }
      return;
    }
    if (code === 'KeyI') {
      if (!e.repeat) this.callbacks.onToggleInventory();
      return;
    }
    if (code === 'KeyJ') {
      if (!e.repeat) this.callbacks.onToggleMissions();
      return;
    }
    if (code === 'KeyT') {
      if (!e.repeat) {
        this.advanceTutorial('phone');
        this.callbacks.onTogglePhone();
      }
      return;
    }
    if (code === 'KeyR') {
      if (!e.repeat) {
        if (!this.reloadWeapon()) {
          this.subdueNearestHostile();
        }
      }
      return;
    }
    if (this.squad.active && !e.repeat) {
      if (code === 'Digit1') {
        this.setSquadCommand('follow');
        return;
      }
      if (code === 'Digit2') {
        this.setSquadCommand('hold');
        return;
      }
      if (code === 'Digit3') {
        this.setSquadCommand('objective');
        return;
      }
      if (code === 'Digit4') {
        this.setSquadCommand('regroup');
        return;
      }
      if (code === 'Digit5') {
        this.setSquadCommand('protect');
        return;
      }
    }

    this.keys.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private buildMergedInput(): void {
    let kbX = 0;
    let kbY = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbY += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbY -= 1;

    this.mergedInput.moveX = Math.abs(this.touchInput.moveX) > 0.05 ? this.touchInput.moveX : kbX;
    this.mergedInput.moveY = Math.abs(this.touchInput.moveY) > 0.05 ? this.touchInput.moveY : kbY;
    this.mergedInput.sprint =
      this.touchInput.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.mergedInput.jump = this.touchInput.jump || this.keys.has('Space');

    const touchSteer =
      this.settings.drivingMode === 'buttons'
        ? (this.steerButtonRight ? 1 : 0) - (this.steerButtonLeft ? 1 : 0)
        : this.touchInput.steer;

    this.mergedInput.steer = Math.abs(touchSteer) > 0.05 ? touchSteer : kbX;
    this.mergedInput.throttle = Math.max(this.touchInput.throttle, kbY > 0 ? 1 : 0);
    this.mergedInput.brake = Math.max(this.touchInput.brake, kbY < 0 ? 1 : 0);
    this.mergedInput.reverse = this.touchInput.reverse;
    const isFlying = this.vehicles.activeVehicle?.domain === 'air';
    this.mergedInput.handbrake = this.touchInput.handbrake || (!isFlying && this.keys.has('Space'));
    this.mergedInput.boost =
      this.touchInput.boost || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.mergedInput.horn = this.touchInput.horn || this.keys.has('KeyH');
    this.mergedInput.aim = this.touchInput.aim || this.mouseAim || this.aimToggle;
    this.mergedInput.fire =
      this.touchInput.fire ||
      this.mouseFire ||
      this.mouseTapFireQueued ||
      this.keys.has('KeyV');
    this.mergedInput.ascend = Boolean(this.touchInput.ascend) || (isFlying && this.keys.has('Space'));
    this.mergedInput.descend =
      Boolean(this.touchInput.descend) ||
      (isFlying && (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyX')));
  }

  private processPlayerShooting(activeVeh: DrivableVehicle | null): void {
    const inVehicle = Boolean(activeVeh);
    const wepDef = WEAPON_CATALOG[this.combat.equippedWeapon];
    if (inVehicle && !wepDef.driveByAllowed) return;

    if (activeVeh) {
      this.muzzleVec.set(activeVeh.x, activeVeh.y + 1.35, activeVeh.z);
    } else {
      this.player.getMuzzleWorldPosition(this.muzzleVec);
    }

    const targets = this.collectShootTargets(activeVeh?.id ?? null);

    const res = this.combat.tryFire(
      this.sceneManager.camera,
      this.muzzleVec,
      targets,
      [this.world.group],
      inVehicle
    );

    if (res.startedReload) {
      this.audio.playReload();
    }
    if (!res.fired) return;

    this.audio.playWeaponShot(res.weaponId);
    if (!inVehicle) {
      this.player.notifyFired(wepDef.category === 'melee');
    }
    this.playerCamera.addRecoilKick(wepDef.recoilKick);

    const shooterX = activeVeh ? activeVeh.x : this.player.x;
    const shooterZ = activeVeh ? activeVeh.z : this.player.z;
    if (wepDef.category !== 'melee') {
      this.npcs.triggerNearbyReaction(shooterX, shooterZ, 26);
    }

    let playerDataChanged = false;
    for (let i = 0; i < res.hits.length; i++) {
      const h = res.hits[i];
      if (h.kind === 'world') {
        this.tryVandalizeShopfront(h.point.x, h.point.y, h.point.z);
        continue;
      }
      if (!h.targetId) continue;

      if (h.kind === 'hostile') {
        const dmgRes = this.encounters.damageHostile(h.targetId, h.damage, shooterX, shooterZ);
        if (dmgRes.neutralized) {
          this.combat.triggerHitMarker('kill');
          this.stats.hostilesNeutralized += 1;
          const bonus = dmgRes.isBoss ? 1500 : 250;
          this.money += bonus;
          this.stats.totalEarnedTaka += bonus;
          this.addMafiaRep(dmgRes.isBoss ? 90 : 25);
          playerDataChanged = true;
          if (h.isHeadshot) {
            this.showToast(`${this.t().headshot} +৳ ${bonus}`);
          }
        } else {
          this.combat.triggerHitMarker(h.isHeadshot ? 'headshot' : 'hit');
        }
      } else if (h.kind === 'npc') {
        const npcRes = this.npcs.damageNpc(h.targetId, h.damage);
        if (npcRes.downed) {
          this.combat.triggerHitMarker('kill');
          this.police.addCrimeHeat(npcRes.isPolice ? 160 : 55, npcRes.isPolice, 5);
          this.addMafiaRep(npcRes.isPolice ? 30 : 12);
        } else {
          this.combat.triggerHitMarker(h.isHeadshot ? 'headshot' : 'hit');
          this.police.addCrimeHeat(npcRes.isPolice ? 110 : 30, npcRes.isPolice, 5);
        }
      } else if (h.kind === 'vehicle') {
        const vRes = this.vehicles.damageVehicleById(h.targetId, h.vehicleDamage);
        if (vRes.hit) {
          this.combat.triggerHitMarker(vRes.destroyed ? 'kill' : 'hit');
        }
        if (vRes.destroyed) {
          this.stats.vehiclesSmashed += 1;
          this.addMafiaRep(45);
          playerDataChanged = true;
          this.triggerVehicleExplosion(vRes.x, vRes.y, vRes.z, false);
        }
      } else if (h.kind === 'traffic') {
        const tRes = this.traffic.damageTrafficAgent(h.targetId, h.vehicleDamage);
        this.combat.triggerHitMarker(tRes.destroyed ? 'kill' : 'hit');
        if (tRes.destroyed) {
          this.stats.vehiclesSmashed += 1;
          this.addMafiaRep(50);
          playerDataChanged = true;
          this.triggerVehicleExplosion(tRes.x, tRes.y, tRes.z, false);
        }
      } else if (h.kind === 'police') {
        const pRes = this.police.damagePoliceUnit(h.targetId, h.vehicleDamage);
        this.combat.triggerHitMarker(pRes.destroyed ? 'kill' : 'hit');
        this.police.addWantedStars(1, 5);
        if (pRes.destroyed) {
          this.stats.vehiclesSmashed += 1;
          this.addMafiaRep(90);
          playerDataChanged = true;
          this.triggerVehicleExplosion(pRes.x, pRes.y, pRes.z, true);
        }
      }
    }

    if (playerDataChanged) {
      this.emitPlayerData();
    }
  }

  private triggerVehicleExplosion(x: number, y: number, z: number, wasPolice: boolean): void {
    this.combat.spawnExplosion(x, y, z);
    this.audio.playExplosion();
    this.npcs.triggerNearbyReaction(x, z, 36);
    this.police.addWantedStars(wasPolice ? 2 : 1, 5);
    this.showToast(this.t().vehicleDestroyed);

    // Blast splash damage to nearby hostiles & NPCs
    const nearbyHostiles = this.encounters.getShootableTargets();
    for (const ht of nearbyHostiles) {
      if (Math.hypot(ht.x - x, ht.z - z) < 9.5) {
        const r = this.encounters.damageHostile(ht.id, 140, x, z);
        if (r.neutralized) {
          this.stats.hostilesNeutralized += 1;
        }
      }
    }
    const nearbyNpcs = this.npcs.getShootableTargets();
    for (const nt of nearbyNpcs) {
      if (Math.hypot(nt.x - x, nt.z - z) < 8.0) {
        this.npcs.damageNpc(nt.id, 120);
      }
    }
  }

  // =========================================================================
  // MAIN SIMULATION & RENDER LOOP
  // =========================================================================

  private loop = (now: number): void => {
    if (!this.running || this.disposed) return;

    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    // Feed real frame time into Zero-Lag 60 FPS Dynamic Resolution Governor
    this.sceneManager.updateAdaptivePerformance(rawDt * 1000);

    this.fpsAccum += rawDt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastMessage = null;
        this.emitHud();
      }
    }

    if (this.stuntBannerTimer > 0) {
      this.stuntBannerTimer -= dt;
      if (this.stuntBannerTimer <= 0) {
        this.stuntBanner = null;
        this.emitHud();
      }
    }

    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        this.activeDialogue = null;
        this.emitHud();
      }
    }

    if (this.crashSoundCooldown > 0) {
      this.crashSoundCooldown = Math.max(0, this.crashSoundCooldown - dt);
    }
    if (this.subdueCooldown > 0) {
      this.subdueCooldown = Math.max(0, this.subdueCooldown - dt);
    }

    if (!this.started) {
      this.titleOrbitAngle += dt * 0.12;
      this.world.update(dt);
      this.traffic.update(dt, this.world.roads, 999, 999, []);
      this.npcs.update(dt, 999, 999, false);
      this.weather.update(dt, 0, 14, false);
      this.dayNight.update(
        dt * 0.35,
        0,
        14,
        this.weather.rainIntensity,
        this.weather.lightningFlash
      );
      const camX = Math.sin(this.titleOrbitAngle) * 34;
      const camZ = 14 + Math.cos(this.titleOrbitAngle) * 34;
      this.sceneManager.camera.position.set(camX, 13.5, camZ);
      this.sceneManager.camera.lookAt(0, 5, 10);
    } else if (!this.paused) {
      // Cooldowns & Empire Passive Income ticks
      if (this.bankRobCooldown > 0) this.bankRobCooldown = Math.max(0, this.bankRobCooldown - dt);
      for (const [k, v] of this.shopRobCooldowns) {
        if (v <= dt) this.shopRobCooldowns.delete(k);
        else this.shopRobCooldowns.set(k, v - dt);
      }
      for (const [k, v] of this.smashedShopCooldowns) {
        if (v <= dt) this.smashedShopCooldowns.delete(k);
        else this.smashedShopCooldowns.set(k, v - dt);
      }
      for (const [k, v] of this.ramHitCooldowns) {
        if (v <= dt) this.ramHitCooldowns.delete(k);
        else this.ramHitCooldowns.set(k, v - dt);
      }

      if (this.ownedPropertyIds.size > 0) {
        this.passiveIncomeAccum += dt;
        if (this.passiveIncomeAccum >= 15) {
          this.passiveIncomeAccum = 0;
          const perMin = computeEmpireIncomePerMin(
            Array.from(this.ownedPropertyIds),
            this.mafiaRep
          );
          const slice = Math.round(perMin / 4);
          if (slice > 0) {
            this.empireVaultCash = Math.min(250000, this.empireVaultCash + slice);
            this.emitPlayerData();
          }
        }
      }

      // WASTED / BUSTED Cinematic Recovery Countdown
      if (this.wastedBustedState) {
        this.clearAllInputs();
        this.wastedBustedState.timer -= dt;
        if (this.wastedBustedState.timer <= 0) {
          const wasWasted = this.wastedBustedState.type === 'wasted';
          this.wastedBustedState = null;
          this.respawnPlayer(
            wasWasted
              ? this.settings.language === 'bn'
                ? 'গুলশান হাসপাতালে চিকিৎসা শেষে ছাড়া পেয়েছেন।'
                : 'Discharged from Gulshan Care Hospital.'
              : this.settings.language === 'bn'
                ? 'জরিমানা দিয়ে পুলিশ স্টেশন থেকে ছাড়া পেয়েছেন।'
                : 'Released after paying DMP bail fine.'
          );
          if (wasWasted) {
            this.player.setPosition(-38.0, 12.6, Math.PI, 0.18);
          }
        }
        this.hudEmitAccum += dt;
        if (this.hudEmitAccum >= 0.11) {
          this.hudEmitAccum = 0;
          this.emitHud();
        }
      } else {
        if (this.modalOpen || this.transitioning) {
          this.clearAllInputs();
        }
        this.buildMergedInput();

        // Active Free-Roam Bank Vault Drilling Timer
        if (this.activeHeist) {
          this.activeHeist.elapsed += dt;
          if (this.activeHeist.elapsed >= this.activeHeist.duration) {
            this.activeHeist = null;
            const loot = 25000 + Math.floor(Math.random() * 9500);
            this.money += loot;
            this.stats.totalEarnedTaka += loot;
            this.stats.banksRobbed += 1;
            this.bankRobCooldown = 120;
            this.addMafiaRep(260);
            this.police.setWantedLevel(3, this.savedExteriorPos.x, this.savedExteriorPos.z);
            this.audio.playChime('mission_win');
            this.showToast(
              this.settings.language === 'bn'
                ? `ব্যাংক লুট সফল! +৳ ${loot.toLocaleString()} · পালান!`
                : `BANK VAULT LOOTED! +৳ ${loot.toLocaleString()} (+260 RP) · ESCAPE!`
            );
            this.autoSaveSilent();
            this.emitPlayerData();
            this.emitHud();
          }
        }

        // Dynamic city emergency dispatch alerts
        const newAlert = this.emergency.update(dt);
        if (newAlert && !this.missions.activeMission) {
          this.audio.playChime('alert');
        }

        // Handle locked-vehicle unlocking timer
        if (this.pendingUnlock) {
          this.pendingUnlock.elapsed += dt;
          if (this.pendingUnlock.elapsed >= this.pendingUnlock.duration) {
            const targetVeh = this.vehicles.vehicles.find(
              (v) => v.id === this.pendingUnlock?.vehicleId
            );
            this.pendingUnlock = null;
            if (targetVeh) {
              this.boardVehicle(targetVeh);
            }
          }
        }

        const inside = this.interior.activeInterior;

      if (inside) {
        this.player.update(dt, this.mergedInput, this.playerCamera.yaw, this.physics, []);
        this.playerCamera.update(
          dt,
          this.player.x,
          this.player.y,
          this.player.z,
          this.player.yaw,
          false,
          0,
          this.physics
        );
        this.interior.update(dt);
        this.audio.updateFootsteps(dt, this.player.speedRatio, this.player.grounded);
        this.audio.updateVehicleEngine(false, 0, 0, null);
        this.audio.setHorn(false, null);

        // Wanted heat cools faster indoors!
        const pStatus = this.police.update(
          dt,
          this.savedExteriorPos.x,
          this.savedExteriorPos.z,
          0,
          true,
          this.physics
        );
        this.audio.updatePoliceSiren(dt, this.police.wantedLevel > 0, pStatus.nearestDist);
        if (pStatus.justCleared) {
          this.stats.wantedEscapes += 1;
          this.showToast(
            this.settings.language === 'bn' ? 'পুলিশ ধাওয়া থেকে মুক্ত!' : 'Escaped Dhaka Police!'
          );
        }

        const mUpd = this.missions.update(
          dt,
          this.savedExteriorPos.x,
          this.savedExteriorPos.z,
          false,
          inside.building.id,
          this.police.wantedLevel,
          this.encounters.getStatus()
        );
        this.handleMissionEvents(mUpd);
        this.weather.update(dt, this.savedExteriorPos.x, this.savedExteriorPos.z, true);
        this.audio.updateAtmosphereAndRadio(dt, this.weather.rainIntensity, true, false);
      } else {
        const activeVeh = this.vehicles.activeVehicle;
        const trafficCircles = this.traffic.getObstacleCircles();
        const policeCircles = this.police.getObstacleCircles();
        const combinedExternal = this.combinedExternalBuf;
        combinedExternal.length = 0;
        for (let i = 0; i < trafficCircles.length; i++) combinedExternal.push(trafficCircles[i]);
        for (let i = 0; i < policeCircles.length; i++) combinedExternal.push(policeCircles[i]);

        this.combat.update(dt);
        this.combat.isAiming = !activeVeh && this.mergedInput.aim;
        const activeWepDef = WEAPON_CATALOG[this.combat.equippedWeapon];

        if (activeVeh) {
          this.vehicles.update(
            dt,
            this.mergedInput,
            this.settings,
            this.physics,
            combinedExternal,
            (severity, destroyed, vx, vy, vz) => {
              if (destroyed) {
                this.triggerVehicleExplosion(vx, vy, vz, false);
                this.player.setVisible(true);
                this.player.setPosition(vx + 2.4, vz + 2.4, activeVeh.yaw, vy);
                this.playerCamera.setInVehicle(false, activeVeh.yaw);
                this.applyPlayerDamage(55);
                return;
              }
              if (this.crashSoundCooldown <= 0) {
                this.crashSoundCooldown = 0.45;
                this.audio.playDoorSound();
                this.npcs.triggerNearbyReaction(activeVeh.x, activeVeh.z, 18);
                this.tryVandalizeShopfront(activeVeh.x, activeVeh.y + 1.2, activeVeh.z);
                if (severity > 16) {
                  const dmg = Math.round((severity - 14) * 0.75);
                  this.applyPlayerDamage(dmg);
                }
              }
            },
            (ramEvt) => {
              this.handleVehicleRamHit(ramEvt);
            },
            (stuntEvt) => {
              this.handleStuntLanded(stuntEvt);
            }
          );

          // Check ground vehicle ramming into street pedestrians
          if (
            this.vehicles.activeVehicle === activeVeh &&
            activeVeh.domain === 'ground' &&
            !activeVeh.airborne &&
            Math.abs(activeVeh.speed) > 4.6
          ) {
            const dirX = Math.sin(activeVeh.yaw) * (activeVeh.speed >= 0 ? 1 : -1);
            const dirZ = Math.cos(activeVeh.yaw) * (activeVeh.speed >= 0 ? 1 : -1);
            const pedRam = this.npcs.checkVehicleRam(
              activeVeh.x,
              activeVeh.z,
              activeVeh.speed,
              activeVeh.rig.radius,
              dirX,
              dirZ
            );
            if (pedRam.hits > 0) {
              this.combat.spawnImpactBurst(new THREE.Vector3(pedRam.hitX, 0.9, pedRam.hitZ), 0xef4444, 7, 5);
              this.audio.playDoorSound();
              this.police.addCrimeHeat(pedRam.hitPolice ? 160 : 52, pedRam.hitPolice, 5);
              this.addMafiaRep(pedRam.hitPolice ? 30 : 12);
            }
          }

          const distDrivenMeters = Math.abs(activeVeh.speed) * dt;
          this.stats.distanceDrivenKm += distDrivenMeters / 1000;
          if (!this.tutorial.completed && this.tutorial.stepIndex === 3 && Math.abs(activeVeh.speed) > 2.5) {
            this.tutorialDriveAccum += dt;
            if (this.tutorialDriveAccum >= 2.2) {
              this.advanceTutorial('drive');
            }
          }

          this.player.x = activeVeh.x;
          this.player.y = activeVeh.y;
          this.player.z = activeVeh.z;
          this.player.yaw = activeVeh.yaw;

          this.playerCamera.update(
            dt,
            activeVeh.x,
            activeVeh.y,
            activeVeh.z,
            activeVeh.yaw,
            true,
            activeVeh.speed,
            this.physics,
            false,
            58,
            this.combat.cameraShake,
            false,
            activeVeh.kind
          );

          this.audio.updateVehicleEngine(
            true,
            Math.abs(activeVeh.speed) * 3.6,
            this.mergedInput.throttle,
            activeVeh.kind
          );
          this.audio.setHorn(this.mergedInput.horn, activeVeh.kind);
        } else {
          const vehCircles = this.vehicles.getObstacleCircles();
          const allObstacles = this.allObstaclesBuf;
          allObstacles.length = 0;
          for (let i = 0; i < vehCircles.length; i++) allObstacles.push(vehCircles[i]);
          for (let i = 0; i < combinedExternal.length; i++) allObstacles.push(combinedExternal[i]);
          this.player.update(
            dt,
            this.mergedInput,
            this.playerCamera.yaw,
            this.physics,
            allObstacles,
            this.combat.isAiming,
            this.combat.punchSwingTimer
          );
          if (!this.tutorial.completed && this.tutorial.stepIndex === 0 && this.player.speedRatio > 0.25) {
            this.tutorialMoveAccum += dt;
            if (this.tutorialMoveAccum >= 1.4) {
              this.advanceTutorial('move');
            }
          }
          this.vehicles.update(dt, this.mergedInput, this.settings, this.physics, combinedExternal);
          const holdingGun = activeWepDef.category !== 'melee';
          const sniperScoped = this.combat.isAiming && this.combat.equippedWeapon === 'sniper';
          this.player.root.visible = !sniperScoped;
          this.playerCamera.update(
            dt,
            this.player.x,
            this.player.y,
            this.player.z,
            this.player.yaw,
            false,
            0,
            this.physics,
            this.combat.isAiming,
            activeWepDef.aimFov,
            this.combat.cameraShake,
            holdingGun
          );
          this.audio.updateFootsteps(dt, this.player.speedRatio, this.player.grounded);
          this.audio.updateVehicleEngine(false, 0, 0, null);
          this.audio.setHorn(false, null);
        }

        // Throttled live reticle target-lock probe so crosshair turns crimson on enemy/vehicle aim
        const canAimWeapon = activeVeh
          ? activeWepDef.driveByAllowed
          : activeWepDef.category !== 'melee' || this.combat.isAiming;
        if (!canAimWeapon) {
          this.aimTargetLocked = false;
        } else {
          this.aimProbeAccum += dt;
          if (this.aimProbeAccum >= 0.08) {
            this.aimProbeAccum = 0;
            if (activeVeh) {
              this.muzzleVec.set(activeVeh.x, activeVeh.y + 1.35, activeVeh.z);
            } else {
              this.player.getMuzzleWorldPosition(this.muzzleVec);
            }
            const probeTargets = this.collectShootTargets(activeVeh?.id ?? null);
            this.aimTargetLocked = this.combat.hasTargetUnderCrosshair(
              this.sceneManager.camera,
              this.muzzleVec,
              probeTargets,
              Boolean(activeVeh)
            );
          }
        }

        // Process GTA-style free-aim shooting (on foot OR drive-by)
        if (this.mergedInput.fire) {
          this.processPlayerShooting(activeVeh);
        }
        this.mouseTapFireQueued = false;

        const fx = activeVeh ? activeVeh.x : this.player.x;
        const fy = activeVeh ? activeVeh.y : this.player.y;
        const fz = activeVeh ? activeVeh.z : this.player.z;
        const fyaw = activeVeh ? activeVeh.yaw : this.player.yaw;

        this.world.update(dt);
        const discoveredMarker = this.chunkManager.update(
          dt,
          fx,
          fz,
          this.settings.quality,
          this.world.mapMarkers
        );
        if (discoveredMarker) {
          this.money += 250;
          this.audio.playChime('clue');
          this.showToast(
            this.settings.language === 'bn'
              ? `নতুন স্থান আবিষ্কৃত: ${discoveredMarker.labelBn} (+৳২৫০)`
              : `Discovered: ${discoveredMarker.labelEn} (+৳250)`
          );
          this.autoSaveSilent();
          this.emitPlayerData();
        }
        this.traffic.update(
          dt,
          this.world.roads,
          fx,
          fz,
          this.vehicles.getObstacleCircles(activeVeh?.id ?? null)
        );
        this.npcs.update(dt, fx, fz, Boolean(activeVeh && this.mergedInput.horn));

        // Special Operations & GTA Heist Encounters (hostiles, rescued civilians/VIPs, clues)
        const encEvt = this.encounters.update(
          dt,
          fx,
          fz,
          Boolean(activeVeh),
          activeVeh ? Math.abs(activeVeh.speed) : 0,
          this.physics
        );
        if (encEvt.enemyShots.length > 0) {
          for (let s = 0; s < encEvt.enemyShots.length; s++) {
            const shot = encEvt.enemyShots[s];
            this.combat.spawnEnemyTracer(
              shot.fromX,
              shot.fromY,
              shot.fromZ,
              fx + (Math.random() - 0.5) * 0.9,
              fy + 1.15 + (Math.random() - 0.5) * 0.4,
              fz + (Math.random() - 0.5) * 0.9
            );
          }
          this.audio.playWeaponShot('smg');
        }
        if (encEvt.playerDamageTaken > 0) {
          this.applyPlayerDamage(encEvt.playerDamageTaken);
        }
        if (encEvt.civilianJustHarmed) {
          this.showToast(
            this.settings.language === 'bn'
              ? 'সতর্কতা! নাগরিক আহত হয়েছেন!'
              : 'Warning! A protected civilian was injured!'
          );
        }

        // 3-Member AI Squad Companion Update
        const curStage = this.missions.getCurrentStage();
        const sqEvt = this.squad.update(
          dt,
          fx,
          fz,
          fyaw,
          Boolean(activeVeh),
          false,
          curStage ? curStage.targetX : null,
          curStage ? curStage.targetZ : null,
          this.encounters,
          this.physics
        );
        if (sqEvt.playerHealDelta > 0 && this.health < 100) {
          this.health = Math.min(100, this.health + sqEvt.playerHealDelta);
        }
        if (sqEvt.hostileNeutralizedCount > 0) {
          this.stats.hostilesNeutralized += sqEvt.hostileNeutralizedCount;
        }

        const pStatus = this.police.update(dt, fx, fz, fy, false, this.physics);
        this.audio.updatePoliceSiren(dt, this.police.wantedLevel > 0, pStatus.nearestDist);
        if (pStatus.justCleared) {
          this.stats.wantedEscapes += 1;
          this.addMafiaRep(40);
          this.showToast(
            this.settings.language === 'bn' ? 'পুলিশ ধাওয়া থেকে মুক্ত!' : 'Escaped Dhaka Police!'
          );
        }
        // Fair GTA 5 BUSTED check: only triggers if completely stopped (<1.0 m/s) right beside a cruiser for 7.5s while spotted!
        const playerSpd = activeVeh ? Math.abs(activeVeh.speed) : this.player.speedRatio * 6;
        const canBeBusted =
          this.police.wantedLevel > 0 &&
          !this.police.evading &&
          (!activeVeh || activeVeh.domain === 'ground') &&
          pStatus.nearestDist < 4.6 &&
          playerSpd < 1.0;
        if (canBeBusted) {
          this.policeCornerTimer += dt;
          if (this.policeCornerTimer >= 7.5) {
            this.policeCornerTimer = 0;
            this.triggerBusted();
          }
        } else {
          this.policeCornerTimer = Math.max(0, this.policeCornerTimer - dt * 2.5);
        }

        const mUpd = this.missions.update(
          dt,
          fx,
          fz,
          Boolean(activeVeh),
          null,
          this.police.wantedLevel,
          this.encounters.getStatus()
        );
        this.handleMissionEvents(mUpd);

        const wEvt = this.weather.update(dt, fx, fz, false);
        if (wEvt.thunderTriggered) {
          this.audio.playThunder();
        }
        this.dayNight.update(dt, fx, fz, this.weather.rainIntensity, this.weather.lightningFlash);
        this.audio.updateAtmosphereAndRadio(
          dt,
          this.weather.rainIntensity,
          false,
          Boolean(activeVeh?.boosting)
        );
      }

      this.gpsRecalcAccum += dt;
      this.refreshGpsAndBeacon(false);

      this.hudEmitAccum += dt;
      if (this.hudEmitAccum >= 0.125) {
        this.hudEmitAccum = 0;
        this.emitHud();
      }
      }
    }

    this.sceneManager.render();

    if (this.sceneManager.isSoftwareGl) {
      this.sceneManager.afterDraw(
        () => this.loop(performance.now()),
        (id) => {
          this.frameId = id;
        }
      );
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private handleMissionEvents(upd: ReturnType<MissionManager['update']>): void {
    if (upd.stageAdvanced) {
      this.audio.playChime('buy');
      const nextStage = this.missions.getCurrentStage();
      if (nextStage) {
        const carryCivs =
          nextStage.type === 'escort_civilians' || nextStage.type === 'protect_zone';
        this.encounters.spawnForStage(nextStage, this.physics, carryCivs);
        this.police.setSupportZone(
          Boolean(nextStage.encounter?.policeSupport),
          nextStage.targetX,
          nextStage.targetZ
        );
        // Trigger 3-star heist getaway pursuit when entering an escape_police stage (e.g. Bank Heist!)
        if (nextStage.type === 'escape_police' && this.police.wantedLevel < 3) {
          const px = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.x : this.player.x;
          const pz = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.z : this.player.z;
          this.police.setWantedLevel(3, px, pz);
        }
        // Live DhakaOS radio call when advancing to a new story/mission stage
        const activeM = this.missions.activeMission;
        if (activeM && nextStage.stageCallEn) {
          this.showDialogue({
            npcId: `radio_${activeM.id}_${this.missions.stageIndex}`,
            nameEn: activeM.giverEn,
            nameBn: activeM.giverBn,
            roleEn: activeM.callerRoleEn ?? 'Live Radio Call',
            roleBn: activeM.callerRoleBn ?? 'লাইভ রেডিও কল',
            lineEn: nextStage.stageCallEn,
            lineBn: nextStage.stageCallBn ?? nextStage.stageCallEn,
            mood: 'alert',
          });
        }
      }
      this.refreshGpsAndBeacon(true);
      this.emitHud();
    }
    if (upd.completedMission) {
      const { mission, reward, civiliansSafe } = upd.completedMission;
      this.money += reward;
      this.stats.missionsCompleted += 1;
      this.stats.totalEarnedTaka += reward;
      this.stats.civiliansProtected += civiliansSafe;
      const repBonus =
        mission.id === 'gta_05_kingpin_grand_showdown'
          ? 650
          : mission.category === 'gta_classic'
            ? 180
            : mission.category === 'spec_ops'
              ? 120
              : 75;
      this.addMafiaRep(repBonus);
      if (mission.category === 'spec_ops') {
        this.stats.specOpsCompleted += 1;
      } else if (mission.category === 'activity') {
        this.stats.sideActivitiesCompleted += 1;
      }
      if (mission.chapterNumber && mission.chapterNumber < 6) {
        const nextChap = mission.chapterNumber + 1;
        this.showToast(
          this.settings.language === 'bn'
            ? `অধ্যায় ${nextChap} আনলক হয়েছে! মিশন মেনু খুলুন।`
            : `Chapter ${nextChap} Unlocked! Open Missions to continue.`
        );
      }

      // Grant Special Operations Finale Unlockables (Platinum Commander Uniform + Tactical Interceptor SUV)
      if (
        mission.id === 'specops_05_final_resolve' &&
        !this.unlockedSpecOpsRewards.has('specops_commander_uniform')
      ) {
        this.unlockedSpecOpsRewards.add('specops_commander_uniform');
        if (!this.ownedVehicles.some((v) => v.id === 'specops_interceptor_suv')) {
          this.ownedVehicles.push({
            id: 'specops_interceptor_suv',
            kind: 'suv',
            nameEn: 'Tactical Interceptor SUV',
            nameBn: 'ট্যাকটিক্যাল ইন্টারসেপ্টর এসইউভি',
            paintHex: 0x0f172a,
            engineLevel: 3,
            armorLevel: 3,
          });
        }
      }

      this.encounters.clearEncounter();
      this.police.setSupportZone(false);
      this.audio.playChime('mission_win');
      this.refreshGpsAndBeacon(true);
      this.autoSaveSilent();
      this.emitPlayerData();
      this.emitHud();
    }
    if (upd.failedMission) {
      this.encounters.clearEncounter();
      this.police.setSupportZone(false);
      this.audio.playChime('mission_fail');
      this.refreshGpsAndBeacon(true);
      this.emitHud();
    }
  }

  private emitPlayerData(): void {
    const gv = this.resolveGarageVehicle();
    const cooldownsSec: Record<string, number> = {};
    for (const [mId, until] of Object.entries(this.missions.activityCooldownUntil)) {
      const rem = Math.ceil((until - Date.now()) / 1000);
      if (rem > 0) cooldownsSec[mId] = rem;
    }

    const ownsGarage = this.ownedPropertyIds.has('prop_banani_garage');
    const shopRobCooldownSec: Record<string, number> = {};
    for (const [bId, rem] of this.shopRobCooldowns) {
      if (rem > 0) shopRobCooldownSec[bId] = Math.ceil(rem);
    }
    const ownedPropArr = Array.from(this.ownedPropertyIds);

    this.callbacks.onPlayerDataUpdate({
      money: this.money,
      health: Math.round(this.health),
      appearance: { ...this.appearance },
      inventory: this.inventory.map((it) => ({ ...it })),
      ownedVehicles: this.ownedVehicles.map((v) => ({ ...v })),
      completedMissionIds: this.missions.getCompletedArray(),
      missionHistory: { ...this.missions.missionHistory },
      unlockedSpecOpsRewards: Array.from(this.unlockedSpecOpsRewards),
      completionPercentage: this.missions.getCompletionPercentage(),
      stats: { ...this.stats },
      cooldownsSec,
      garageTargetVehicle: gv
        ? {
            id: gv.id,
            kind: gv.kind,
            nameEn: gv.nameEn,
            nameBn: gv.nameBn,
            health: Math.round(gv.health),
            paintHex: gv.paintHex,
            engineLevel: gv.engineLevel,
            chopShopPrice: getChopShopSellPrice(gv.kind, gv.health, ownsGarage),
          }
        : null,
      mafiaRep: this.mafiaRep,
      mafiaRankIndex: getMafiaRankForRep(this.mafiaRep).index,
      ownedPropertyIds: ownedPropArr,
      empireVaultCash: this.empireVaultCash,
      empireIncomePerMin: computeEmpireIncomePerMin(ownedPropArr, this.mafiaRep),
      shopRobCooldownSec,
      favoriteMapIds: Array.from(this.favoriteMapIds),
      discoveredPlaceIds: this.chunkManager.getDiscoveredIds(),
    });
  }

  private emitHud(): void {
    const inside = this.interior.activeInterior;
    const activeVeh = this.vehicles.activeVehicle;
    const fx = inside ? this.savedExteriorPos.x : activeVeh ? activeVeh.x : this.player.x;
    const fz = inside ? this.savedExteriorPos.z : activeVeh ? activeVeh.z : this.player.z;
    const district = this.world.getDistrictAt(fx, fz);
    const encStatus = this.encounters.getStatus();
    const canSubdueHostile =
      !inside && Boolean(this.encounters.findNearestHostile(fx, fz, 12.0));

    this.callbacks.onHudUpdate({
      started: this.started,
      paused: this.paused,
      transitioning: this.transitioning,
      photoMode: this.photoMode,
      weather: this.weather.currentWeather,
      radioStation: this.settings.radioStation,
      insideBuildingId: inside ? inside.building.id : null,
      insideBuildingNameEn: inside ? inside.building.nameEn : '',
      insideBuildingNameBn: inside ? inside.building.nameBn : '',
      districtEn: district.en,
      districtBn: district.bn,
      money: this.money,
      health: Math.round(this.health),
      stamina: Math.round(this.player.stamina),
      wantedLevel: this.police.wantedLevel,
      wantedEvading: this.police.evading,
      wantedEvadeProgress: this.police.evadeProgress,
      timeOfDay: this.dayNight.timeOfDay,
      fps: this.currentFps,
      inVehicle: Boolean(activeVeh),
      vehicleId: activeVeh ? activeVeh.id : null,
      vehicleKind: activeVeh ? activeVeh.kind : null,
      vehicleNameEn: activeVeh ? activeVeh.nameEn : '',
      vehicleNameBn: activeVeh ? activeVeh.nameBn : '',
      vehicleHealth: activeVeh ? Math.round(activeVeh.health) : 100,
      vehiclePaintHex: activeVeh ? activeVeh.paintHex : 0,
      vehicleBoost: activeVeh ? Math.round(activeVeh.boostCharge) : 100,
      boosting: Boolean(activeVeh?.boosting),
      speedKmh: activeVeh ? Math.round(Math.abs(activeVeh.speed) * 3.6) : 0,
      unlockProgress: this.pendingUnlock
        ? Math.min(1, this.pendingUnlock.elapsed / this.pendingUnlock.duration)
        : null,
      cameraMode: this.playerCamera.mode,
      interaction: this.computeNearestInteraction(),
      activeMission: this.missions.getSnapshot(fx, fz, encStatus),
      missionResult: this.missions.lastResult,
      squadActive: this.squad.active,
      squadCommand: this.squad.command,
      squadMembers: this.squad.getSnapshots(),
      canSubdueHostile,
      emergencyAlerts: this.emergency.getAlerts(),
      tutorial: { ...this.tutorial },
      equippedWeapon: this.combat.equippedWeapon,
      weaponAmmoMag: this.combat.ammo[this.combat.equippedWeapon].mag,
      weaponAmmoReserve: this.combat.ammo[this.combat.equippedWeapon].reserve,
      isAiming: this.combat.isAiming,
      aimTargetLocked: this.aimTargetLocked,
      isReloading: this.combat.isReloading,
      hitMarker: this.combat.hitMarker,
      gps: { ...this.cachedGps },
      dialogue: this.activeDialogue,
      toastMessage: this.toastMessage,
      mafiaRep: this.mafiaRep,
      mafiaRankIndex: getMafiaRankForRep(this.mafiaRep).index,
      empireVaultCash: this.empireVaultCash,
      ownedPropertyIds: Array.from(this.ownedPropertyIds),
      heistProgress: this.activeHeist
        ? Math.min(1, this.activeHeist.elapsed / this.activeHeist.duration)
        : null,
      heistLabelEn: this.activeHeist?.labelEn ?? '',
      heistLabelBn: this.activeHeist?.labelBn ?? '',
      bustedWastedBanner: this.wastedBustedState
        ? { type: this.wastedBustedState.type, fee: this.wastedBustedState.fee }
        : null,
      vehicleDomain: activeVeh ? activeVeh.domain : 'ground',
      altitudeMeters: activeVeh ? Math.max(0, Math.round(activeVeh.y)) : 0,
      policeSearchMode: this.police.wantedLevel > 0 && this.police.evading,
      stuntBanner: this.stuntBanner,
    });
  }

  private collectShootTargets(excludeVehId: string | null): ShootableTarget[] {
    const out = this.shootTargetsBuf;
    out.length = 0;
    const enc = this.encounters.getShootableTargets();
    for (let i = 0; i < enc.length; i++) out.push(enc[i]);
    const npc = this.npcs.getShootableTargets();
    for (let i = 0; i < npc.length; i++) out.push(npc[i]);
    const veh = this.vehicles.getShootableTargets(excludeVehId);
    for (let i = 0; i < veh.length; i++) out.push(veh[i]);
    const trf = this.traffic.getShootableTargets();
    for (let i = 0; i < trf.length; i++) out.push(trf[i]);
    const pol = this.police.getShootableTargets();
    for (let i = 0; i < pol.length; i++) out.push(pol[i]);
    return out;
  }

  public dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.clearTimeout(this.transitionTimeoutId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.container.removeEventListener('contextmenu', this.handleContextMenu);
    this.combat.dispose();
    this.encounters.clearEncounter();
    this.squad.recall();
    this.interior.unloadRoom();
    this.audio.dispose();
    this.textures.dispose();
    this.sceneManager.dispose();
  }
}
