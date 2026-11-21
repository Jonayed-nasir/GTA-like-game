import {
  ControlPreset,
  DrivingControlMode,
  GameSettings,
  GraphicsQuality,
  InventoryItem,
  Language,
  MissionHistoryEntry,
  MissionRank,
  MobileControlLayout,
  OwnedVehicleRecord,
  PlayerAppearance,
  PlayerStats,
  SaveData,
  SquadCommand,
  VehicleCameraPreset,
} from '../types/game';

const STORAGE_KEY_V3 = 'gta_dhaka_save_v3';
const STORAGE_KEY_V2 = 'gta_dhaka_save_v2';
const STORAGE_KEY_V1 = 'gta_dhaka_save_v1';
const SAVE_VERSION = 3;

export const DEFAULT_APPEARANCE: PlayerAppearance = {
  outfitId: 'outfit_default',
  jacketColor: 0x1e293b,
  shirtColor: 0xe2e8f0,
  pantsColor: 0x3b443b,
  shoeColor: 0xf8fafc,
  hairColor: 0x16181d,
  hasSunglasses: true,
  hasBackpack: true,
};

export const MOBILE_CONTROL_PRESETS: Record<ControlPreset, MobileControlLayout> = {
  classic: {
    preset: 'classic',
    buttonScale: 1.08,
    fireScale: 1.15,
    opacity: 0.94,
    steerOffset: { x: 0, y: 0 },
    actionOffset: { x: 0, y: 0 },
    fireOffset: { x: 0, y: 0 },
  },
  advanced: {
    preset: 'advanced',
    buttonScale: 1.18,
    fireScale: 1.28,
    opacity: 0.9,
    steerOffset: { x: 8, y: -4 },
    actionOffset: { x: -6, y: -4 },
    fireOffset: { x: -10, y: -8 },
  },
  custom: {
    preset: 'custom',
    buttonScale: 1.12,
    fireScale: 1.2,
    opacity: 0.92,
    steerOffset: { x: 0, y: 0 },
    actionOffset: { x: 0, y: 0 },
    fireOffset: { x: 0, y: 0 },
  },
};

export const DEFAULT_MOBILE_CONTROLS: MobileControlLayout = {
  ...MOBILE_CONTROL_PRESETS.classic,
  steerOffset: { ...MOBILE_CONTROL_PRESETS.classic.steerOffset },
  actionOffset: { ...MOBILE_CONTROL_PRESETS.classic.actionOffset },
  fireOffset: { ...MOBILE_CONTROL_PRESETS.classic.fireOffset },
};

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'HIGH',
  language: 'en',
  trafficDensity: 0.75,
  audioEnabled: true,
  audioVolume: 0.55,
  timeScale: 1,
  cameraSensitivity: 1.0,
  showFps: false,
  drivingMode: 'joystick',
  drivingAssist: true,
  speedLimiter: false,
  steeringSensitivity: 1.0,
  accelerationScale: 1.0,
  brakingScale: 1.0,
  weather: 'clear',
  weatherAuto: true,
  radioStation: 'off',
  vehicleCameraPreset: 'normal',
  vehicleCameraZoom: 0.96,
  mobileControls: DEFAULT_MOBILE_CONTROLS,
};

export const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'food_cha',
    nameEn: 'Dhaka Masala Cha',
    nameBn: 'ঢাকা মসলা চা',
    category: 'drink',
    quantity: 2,
    healAmount: 15,
    descriptionEn: 'Hot roadside street tea that restores +15 Health.',
    descriptionBn: 'গরম চা যা +১৫ স্বাস্থ্য ফেরায়।',
  },
  {
    id: 'outfit_default',
    nameEn: 'Gulshan Street Bomber',
    nameBn: 'গুলশান স্ট্রিট বম্বার',
    category: 'clothing',
    quantity: 1,
    outfitId: 'outfit_default',
    descriptionEn: 'Tariq’s signature charcoal jacket, olive cargos, and shades.',
    descriptionBn: 'তারিকের সিগনেচার জ্যাকেট ও সানগ্লাস।',
  },
];

export const DEFAULT_OWNED_VEHICLES: OwnedVehicleRecord[] = [
  {
    id: 'owned_starter_cng',
    kind: 'cng',
    nameEn: 'Starter Dhaka CNG',
    nameBn: 'স্টার্টার ঢাকা সিএনজি',
    paintHex: 0x15803d,
    engineLevel: 1,
    armorLevel: 1,
  },
];

export const DEFAULT_STATS: PlayerStats = {
  missionsCompleted: 0,
  specOpsCompleted: 0,
  sideActivitiesCompleted: 0,
  civiliansProtected: 0,
  hostilesNeutralized: 0,
  cluesInvestigated: 0,
  distanceDrivenKm: 0,
  totalEarnedTaka: 0,
  wantedEscapes: 0,
  banksRobbed: 0,
  shopsRobbed: 0,
  shopsSmashed: 0,
  vehiclesSmashed: 0,
  vehiclesSoldChopShop: 0,
};

const VALID_QUALITIES: GraphicsQuality[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
const VALID_LANGUAGES: Language[] = ['en', 'bn'];
const VALID_DRIVING_MODES: DrivingControlMode[] = ['joystick', 'buttons'];
const VALID_WEATHERS = ['clear', 'rain', 'storm'] as const;
const VALID_RADIOS = ['off', 'lofi', 'synth', 'street'] as const;
const VALID_RANKS: MissionRank[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
const VALID_SQUAD_CMDS: SquadCommand[] = ['follow', 'hold', 'objective', 'regroup', 'protect'];

const VALID_CONTROL_PRESETS: ControlPreset[] = ['classic', 'advanced', 'custom'];
const VALID_VEH_CAM_PRESETS: VehicleCameraPreset[] = ['close', 'normal', 'far'];

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function sanitizeOffset(
  raw: { x?: unknown; y?: unknown } | undefined,
  fallback: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: clampNum(raw?.x, -140, 140, fallback.x),
    y: clampNum(raw?.y, -120, 120, fallback.y),
  };
}

function sanitizeMobileControls(raw: Partial<MobileControlLayout> | undefined): MobileControlLayout {
  const m = raw || {};
  const preset = VALID_CONTROL_PRESETS.includes(m.preset as ControlPreset)
    ? (m.preset as ControlPreset)
    : DEFAULT_MOBILE_CONTROLS.preset;
  const base = MOBILE_CONTROL_PRESETS[preset];
  return {
    preset,
    buttonScale: clampNum(m.buttonScale, 0.85, 1.35, base.buttonScale),
    fireScale: clampNum(m.fireScale, 0.9, 1.45, base.fireScale),
    opacity: clampNum(m.opacity, 0.45, 1.0, base.opacity),
    steerOffset: sanitizeOffset(m.steerOffset, base.steerOffset),
    actionOffset: sanitizeOffset(m.actionOffset, base.actionOffset),
    fireOffset: sanitizeOffset(m.fireOffset, base.fireOffset),
  };
}

function sanitizeSettings(raw: Partial<GameSettings> | undefined): GameSettings {
  const s = raw || {};
  return {
    quality: VALID_QUALITIES.includes(s.quality as GraphicsQuality)
      ? (s.quality as GraphicsQuality)
      : DEFAULT_SETTINGS.quality,
    language: VALID_LANGUAGES.includes(s.language as Language)
      ? (s.language as Language)
      : DEFAULT_SETTINGS.language,
    trafficDensity: clampNum(s.trafficDensity, 0.25, 1.0, DEFAULT_SETTINGS.trafficDensity),
    audioEnabled:
      typeof s.audioEnabled === 'boolean' ? s.audioEnabled : DEFAULT_SETTINGS.audioEnabled,
    audioVolume: clampNum(s.audioVolume, 0.0, 1.0, DEFAULT_SETTINGS.audioVolume),
    timeScale: clampNum(s.timeScale, 0, 2, DEFAULT_SETTINGS.timeScale),
    cameraSensitivity: clampNum(s.cameraSensitivity, 0.4, 2.0, DEFAULT_SETTINGS.cameraSensitivity),
    showFps: typeof s.showFps === 'boolean' ? s.showFps : DEFAULT_SETTINGS.showFps,
    drivingMode: VALID_DRIVING_MODES.includes(s.drivingMode as DrivingControlMode)
      ? (s.drivingMode as DrivingControlMode)
      : DEFAULT_SETTINGS.drivingMode,
    drivingAssist:
      typeof s.drivingAssist === 'boolean' ? s.drivingAssist : DEFAULT_SETTINGS.drivingAssist,
    speedLimiter:
      typeof s.speedLimiter === 'boolean' ? s.speedLimiter : DEFAULT_SETTINGS.speedLimiter,
    steeringSensitivity: clampNum(
      s.steeringSensitivity,
      0.5,
      1.8,
      DEFAULT_SETTINGS.steeringSensitivity
    ),
    accelerationScale: clampNum(
      s.accelerationScale,
      0.6,
      1.4,
      DEFAULT_SETTINGS.accelerationScale
    ),
    brakingScale: clampNum(s.brakingScale, 0.6, 1.5, DEFAULT_SETTINGS.brakingScale),
    weather: VALID_WEATHERS.includes(s.weather as (typeof VALID_WEATHERS)[number])
      ? (s.weather as GameSettings['weather'])
      : DEFAULT_SETTINGS.weather,
    weatherAuto:
      typeof s.weatherAuto === 'boolean' ? s.weatherAuto : DEFAULT_SETTINGS.weatherAuto,
    radioStation: VALID_RADIOS.includes(s.radioStation as (typeof VALID_RADIOS)[number])
      ? (s.radioStation as GameSettings['radioStation'])
      : DEFAULT_SETTINGS.radioStation,
    vehicleCameraPreset: VALID_VEH_CAM_PRESETS.includes(
      s.vehicleCameraPreset as VehicleCameraPreset
    )
      ? (s.vehicleCameraPreset as VehicleCameraPreset)
      : DEFAULT_SETTINGS.vehicleCameraPreset,
    vehicleCameraZoom: clampNum(s.vehicleCameraZoom, 0.72, 1.45, DEFAULT_SETTINGS.vehicleCameraZoom),
    mobileControls: sanitizeMobileControls(s.mobileControls),
  };
}

function sanitizeAppearance(raw: Partial<PlayerAppearance> | undefined): PlayerAppearance {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APPEARANCE };
  return {
    outfitId: typeof raw.outfitId === 'string' ? raw.outfitId : DEFAULT_APPEARANCE.outfitId,
    jacketColor:
      typeof raw.jacketColor === 'number' ? raw.jacketColor : DEFAULT_APPEARANCE.jacketColor,
    shirtColor:
      typeof raw.shirtColor === 'number' ? raw.shirtColor : DEFAULT_APPEARANCE.shirtColor,
    pantsColor:
      typeof raw.pantsColor === 'number' ? raw.pantsColor : DEFAULT_APPEARANCE.pantsColor,
    shoeColor: typeof raw.shoeColor === 'number' ? raw.shoeColor : DEFAULT_APPEARANCE.shoeColor,
    hairColor: typeof raw.hairColor === 'number' ? raw.hairColor : DEFAULT_APPEARANCE.hairColor,
    hasSunglasses:
      typeof raw.hasSunglasses === 'boolean'
        ? raw.hasSunglasses
        : DEFAULT_APPEARANCE.hasSunglasses,
    hasBackpack:
      typeof raw.hasBackpack === 'boolean' ? raw.hasBackpack : DEFAULT_APPEARANCE.hasBackpack,
  };
}

function sanitizeStats(raw: Partial<PlayerStats> | undefined): PlayerStats {
  const s = raw || {};
  return {
    missionsCompleted: clampNum(s.missionsCompleted, 0, 99999, 0),
    specOpsCompleted: clampNum(s.specOpsCompleted, 0, 99999, 0),
    sideActivitiesCompleted: clampNum(s.sideActivitiesCompleted, 0, 99999, 0),
    civiliansProtected: clampNum(s.civiliansProtected, 0, 99999, 0),
    hostilesNeutralized: clampNum(s.hostilesNeutralized, 0, 99999, 0),
    cluesInvestigated: clampNum(s.cluesInvestigated, 0, 99999, 0),
    distanceDrivenKm: clampNum(s.distanceDrivenKm, 0, 999999, 0),
    totalEarnedTaka: clampNum(s.totalEarnedTaka, 0, 999999999, 0),
    wantedEscapes: clampNum(s.wantedEscapes, 0, 99999, 0),
    banksRobbed: clampNum(s.banksRobbed, 0, 99999, 0),
    shopsRobbed: clampNum(s.shopsRobbed, 0, 99999, 0),
    shopsSmashed: clampNum(s.shopsSmashed, 0, 99999, 0),
    vehiclesSmashed: clampNum(s.vehiclesSmashed, 0, 99999, 0),
    vehiclesSoldChopShop: clampNum(s.vehiclesSoldChopShop, 0, 99999, 0),
  };
}

function sanitizeMissionHistory(
  raw: Record<string, Partial<MissionHistoryEntry>> | undefined,
  completedIds: string[]
): Record<string, MissionHistoryEntry> {
  const result: Record<string, MissionHistoryEntry> = {};
  if (raw && typeof raw === 'object') {
    for (const [key, entry] of Object.entries(raw)) {
      if (!entry || typeof entry !== 'object') continue;
      result[key] = {
        missionId: typeof entry.missionId === 'string' ? entry.missionId : key,
        bestRank: VALID_RANKS.includes(entry.bestRank as MissionRank)
          ? (entry.bestRank as MissionRank)
          : 'BRONZE',
        bestTimeSec: clampNum(entry.bestTimeSec, 1, 99999, 60),
        completions: clampNum(entry.completions, 1, 9999, 1),
        firstClearClaimed: Boolean(entry.firstClearClaimed),
        lastPlayedAt:
          typeof entry.lastPlayedAt === 'number' ? entry.lastPlayedAt : Date.now(),
      };
    }
  }
  for (const id of completedIds) {
    if (!result[id]) {
      result[id] = {
        missionId: id,
        bestRank: 'SILVER',
        bestTimeSec: 90,
        completions: 1,
        firstClearClaimed: true,
        lastPlayedAt: Date.now(),
      };
    }
  }
  return result;
}

export class SaveManager {
  /**
   * Recommends graphics preset based on device hardware concurrency & viewport.
   */
  public static detectRecommendedQuality(): GraphicsQuality {
    try {
      const cores = navigator.hardwareConcurrency || 4;
      const isNarrowMobile = window.innerWidth <= 480;
      if (cores <= 2) return 'LOW';
      if (cores <= 4 && isNarrowMobile) return 'MEDIUM';
      if (cores >= 8 && !isNarrowMobile) return 'HIGH';
      return 'MEDIUM';
    } catch {
      return 'MEDIUM';
    }
  }

  /**
   * Loads Save v3, or safely migrates existing Save v2 or Save v1 without deleting legacy keys.
   * Existing players migrating from v1/v2 automatically have tutorialCompleted = true so they
   * are never forced to replay the onboarding tutorial.
   */
  public static load(): SaveData | null {
    try {
      const rawV3 = window.localStorage.getItem(STORAGE_KEY_V3);
      if (rawV3) {
        const parsed = JSON.parse(rawV3) as Partial<SaveData>;
        if (parsed && typeof parsed === 'object' && parsed.version === SAVE_VERSION) {
          const completedIds = Array.isArray(parsed.completedMissionIds)
            ? parsed.completedMissionIds.filter((id): id is string => typeof id === 'string')
            : [];
          return {
            version: SAVE_VERSION,
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
            playerX: clampNum(parsed.playerX, -135, 135, -12.5),
            playerZ: clampNum(parsed.playerZ, -135, 135, 17.5),
            playerYaw: clampNum(parsed.playerYaw, -Math.PI * 4, Math.PI * 4, 0.35),
            money: clampNum(parsed.money, 0, 99999999, 25000),
            health: clampNum(parsed.health, 10, 100, 100),
            timeOfDay: clampNum(parsed.timeOfDay, 0, 24, 16.4),
            appearance: sanitizeAppearance(parsed.appearance),
            inventory: Array.isArray(parsed.inventory)
              ? parsed.inventory.filter((it) => it && typeof it.id === 'string' && it.quantity > 0)
              : DEFAULT_INVENTORY.map((i) => ({ ...i })),
            ownedVehicles: Array.isArray(parsed.ownedVehicles)
              ? parsed.ownedVehicles.filter((v) => v && typeof v.id === 'string')
              : DEFAULT_OWNED_VEHICLES.map((v) => ({ ...v })),
            completedMissionIds: completedIds,
            missionHistory: sanitizeMissionHistory(parsed.missionHistory, completedIds),
            claimedRewardIds: Array.isArray(parsed.claimedRewardIds)
              ? parsed.claimedRewardIds.filter((id): id is string => typeof id === 'string')
              : [...completedIds],
            unlockedSpecOpsRewards: Array.isArray(parsed.unlockedSpecOpsRewards)
              ? parsed.unlockedSpecOpsRewards.filter((id): id is string => typeof id === 'string')
              : [],
            squadCommandDefault: VALID_SQUAD_CMDS.includes(
              parsed.squadCommandDefault as SquadCommand
            )
              ? (parsed.squadCommandDefault as SquadCommand)
              : 'follow',
            tutorialCompleted:
              typeof parsed.tutorialCompleted === 'boolean' ? parsed.tutorialCompleted : false,
            stats: sanitizeStats(parsed.stats),
            settings: sanitizeSettings(parsed.settings),
            mafiaRep: clampNum(parsed.mafiaRep, 0, 9999999, 0),
            ownedPropertyIds: Array.isArray(parsed.ownedPropertyIds)
              ? parsed.ownedPropertyIds.filter((id): id is string => typeof id === 'string')
              : [],
            empireVaultCash: clampNum(parsed.empireVaultCash, 0, 99999999, 0),
            favoriteMapIds: Array.isArray(parsed.favoriteMapIds)
              ? parsed.favoriteMapIds.filter((id): id is string => typeof id === 'string')
              : [],
            discoveredPlaceIds: Array.isArray(parsed.discoveredPlaceIds)
              ? parsed.discoveredPlaceIds.filter((id): id is string => typeof id === 'string')
              : ['gulshan_circle'],
          };
        }
      }

      // Safe backward-compatible migration from Save v2 (keeps v2 key intact as backup!)
      const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2) as Partial<SaveData>;
        if (parsed && typeof parsed === 'object' && parsed.version === 2) {
          const completedIds = Array.isArray(parsed.completedMissionIds)
            ? parsed.completedMissionIds.filter((id): id is string => typeof id === 'string')
            : [];
          const migrated: SaveData = {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            playerX: clampNum(parsed.playerX, -135, 135, -12.5),
            playerZ: clampNum(parsed.playerZ, -135, 135, 17.5),
            playerYaw: clampNum(parsed.playerYaw, -Math.PI * 4, Math.PI * 4, 0.35),
            money: clampNum(parsed.money, 0, 99999999, 25000),
            health: clampNum(parsed.health, 10, 100, 100),
            timeOfDay: clampNum(parsed.timeOfDay, 0, 24, 16.4),
            appearance: sanitizeAppearance(parsed.appearance),
            inventory: Array.isArray(parsed.inventory)
              ? parsed.inventory.filter((it) => it && typeof it.id === 'string' && it.quantity > 0)
              : DEFAULT_INVENTORY.map((i) => ({ ...i })),
            ownedVehicles: Array.isArray(parsed.ownedVehicles)
              ? parsed.ownedVehicles.filter((v) => v && typeof v.id === 'string')
              : DEFAULT_OWNED_VEHICLES.map((v) => ({ ...v })),
            completedMissionIds: completedIds,
            missionHistory: sanitizeMissionHistory(undefined, completedIds),
            claimedRewardIds: [...completedIds],
            unlockedSpecOpsRewards: [],
            squadCommandDefault: 'follow',
            tutorialCompleted: true, // Existing players skip tutorial automatically
            stats: {
              ...DEFAULT_STATS,
              missionsCompleted: completedIds.length,
            },
            settings: sanitizeSettings(parsed.settings),
          };
          window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated));
          return migrated;
        }
      }

      // Safe backward-compatible migration from Save v1
      const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
      if (rawV1) {
        const parsed = JSON.parse(rawV1) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object' && parsed.version === 1) {
          const migrated: SaveData = {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            playerX: clampNum(parsed.playerX, -135, 135, -12.5),
            playerZ: clampNum(parsed.playerZ, -135, 135, 17.5),
            playerYaw: clampNum(parsed.playerYaw, -Math.PI * 4, Math.PI * 4, 0.35),
            money: clampNum(parsed.money, 0, 99999999, 25000),
            health: 100,
            timeOfDay: clampNum(parsed.timeOfDay, 0, 24, 16.4),
            appearance: { ...DEFAULT_APPEARANCE },
            inventory: DEFAULT_INVENTORY.map((i) => ({ ...i })),
            ownedVehicles: DEFAULT_OWNED_VEHICLES.map((v) => ({ ...v })),
            completedMissionIds: [],
            missionHistory: {},
            claimedRewardIds: [],
            unlockedSpecOpsRewards: [],
            squadCommandDefault: 'follow',
            tutorialCompleted: true,
            stats: { ...DEFAULT_STATS },
            settings: sanitizeSettings(parsed.settings as Partial<GameSettings> | undefined),
          };
          window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated));
          return migrated;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  public static save(data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
    try {
      const payload: SaveData = {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        ...data,
      };
      window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }
}
