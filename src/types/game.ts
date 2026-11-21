export type Language = 'en' | 'bn';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export type DrivingControlMode = 'joystick' | 'buttons';

export type ControlPreset = 'classic' | 'advanced' | 'custom';

export type VehicleCameraPreset = 'close' | 'normal' | 'far';

export type CameraMode =
  | 'third_person'
  | 'vehicle_close'
  | 'vehicle_normal'
  | 'vehicle_far'
  | 'vehicle_first_person';

export interface ControlClusterOffset {
  x: number;
  y: number;
}

export interface MobileControlLayout {
  preset: ControlPreset;
  buttonScale: number; // 0.85..1.35
  fireScale: number; // 0.90..1.45
  opacity: number; // 0.45..1.0
  steerOffset: ControlClusterOffset;
  actionOffset: ControlClusterOffset;
  fireOffset: ControlClusterOffset;
}

export type WeatherType = 'clear' | 'rain' | 'storm';

export type RadioStationId = 'off' | 'lofi' | 'synth' | 'street';

export type MissionRank = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type SquadCommand = 'follow' | 'hold' | 'objective' | 'regroup' | 'protect';

export type WeaponId = 'fist' | 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper';

export type HitMarkerType = 'none' | 'hit' | 'headshot' | 'kill';

export type NpcRole =
  | 'civilian'
  | 'shopkeeper'
  | 'security'
  | 'medical'
  | 'police_officer'
  | 'spec_ops_officer'
  | 'hostile'
  | 'mission_vip';

export type VehicleKind =
  | 'cng'
  | 'sedan'
  | 'suv'
  | 'sports'
  | 'pickup'
  | 'motorcycle'
  | 'bus'
  | 'truck'
  | 'police'
  | 'helicopter'
  | 'speedboat';

export type VehicleDomain = 'ground' | 'air' | 'water';

export interface StuntBonusBanner {
  distanceMeters: number;
  hangSec: number;
  reward: number;
  labelEn: string;
  labelBn: string;
}

export type BuildingCategory =
  | 'clothing'
  | 'supermarket'
  | 'restaurant'
  | 'electronics'
  | 'dealership'
  | 'garage'
  | 'hospital'
  | 'office'
  | 'hotel'
  | 'apartment'
  | 'bank'
  | 'convenience'
  | 'spec_ops_hq';

export type MissionCategory =
  | 'story'
  | 'side'
  | 'driving'
  | 'business'
  | 'exploration'
  | 'police'
  | 'special'
  | 'spec_ops'
  | 'activity'
  | 'gta_classic';

export type MissionDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export type InteractionType =
  | 'enter_vehicle'
  | 'enter_building'
  | 'exit_building'
  | 'open_shop'
  | 'open_garage'
  | 'open_dealership'
  | 'open_spec_ops_terminal'
  | 'open_spec_ops_armory'
  | 'inspect_clue'
  | 'subdue_hostile'
  | 'talk_npc'
  | 'start_mission'
  | 'heal_hospital'
  | 'save_safehouse'
  | 'rob_bank'
  | 'rob_shop';

export interface GameSettings {
  quality: GraphicsQuality;
  language: Language;
  trafficDensity: number; // 0.25 to 1.0
  audioEnabled: boolean;
  audioVolume: number; // 0.0 to 1.0
  timeScale: number; // 0 = frozen, 1 = normal
  cameraSensitivity: number; // 0.4 to 2.0
  showFps: boolean;
  drivingMode: DrivingControlMode;
  drivingAssist: boolean;
  speedLimiter: boolean;
  steeringSensitivity: number; // 0.5 to 1.8
  accelerationScale: number; // 0.6 to 1.4
  brakingScale: number; // 0.6 to 1.5
  weather: WeatherType;
  weatherAuto: boolean;
  radioStation: RadioStationId;
  vehicleCameraPreset: VehicleCameraPreset;
  vehicleCameraZoom: number; // 0.72..1.45 (lower = closer, larger vehicle)
  mobileControls: MobileControlLayout;
}

export interface PlayerAppearance {
  outfitId: string;
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  shoeColor: number;
  hairColor: number;
  hasSunglasses: boolean;
  hasBackpack: boolean;
}

export interface InventoryItem {
  id: string;
  nameEn: string;
  nameBn: string;
  category: 'food' | 'drink' | 'clothing' | 'electronics' | 'collectible' | 'medkit';
  quantity: number;
  healAmount?: number;
  outfitId?: string;
  descriptionEn: string;
  descriptionBn: string;
}

export interface OwnedVehicleRecord {
  id: string;
  kind: VehicleKind;
  nameEn: string;
  nameBn: string;
  paintHex: number;
  engineLevel: number; // 1..3
  armorLevel: number; // 1..3
}

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  tag?: 'building' | 'prop' | 'water' | 'boundary' | 'interior';
}

export interface MapMarker {
  id: string;
  x: number;
  z: number;
  labelEn: string;
  labelBn: string;
  type:
    | 'landmark'
    | 'vehicle'
    | 'shop'
    | 'bridge'
    | 'garage'
    | 'dealership'
    | 'mission'
    | 'safehouse'
    | 'hospital'
    | 'hq'
    | 'activity'
    | 'helipad'
    | 'pier'
    | 'ramp';
  buildingId?: string;
}

export interface BuildingFootprint {
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
}

export interface EnterableBuildingDef {
  id: string;
  category: BuildingCategory;
  nameEn: string;
  nameBn: string;
  doorX: number;
  doorZ: number;
  exitYaw: number;
  accentColor: string;
  shopKeeperNameEn: string;
  shopKeeperNameBn: string;
  greetingEn: string;
  greetingBn: string;
  hasShop: boolean;
  isGarage?: boolean;
  isDealership?: boolean;
  isSafeHouse?: boolean;
  isHospital?: boolean;
  isSpecOpsHq?: boolean;
}

export interface ShopCatalogItem {
  id: string;
  nameEn: string;
  nameBn: string;
  price: number;
  category: InventoryItem['category'] | 'vehicle' | 'service';
  descriptionEn: string;
  descriptionBn: string;
  healAmount?: number;
  outfit?: PlayerAppearance;
  vehicleKind?: VehicleKind;
  vehiclePaintHex?: number;
  topSpeedKmh?: number;
}

export interface InteractionPrompt {
  id: string;
  type: InteractionType;
  labelEn: string;
  labelBn: string;
  sublabelEn?: string;
  sublabelBn?: string;
  targetId: string;
  distance: number;
  locked?: boolean;
}

export interface GpsPoint {
  x: number;
  z: number;
}

export interface GpsState {
  active: boolean;
  labelEn: string;
  labelBn: string;
  targetX: number;
  targetZ: number;
  distanceMeters: number;
  path: GpsPoint[];
}

export type MissionStageType =
  | 'reach_point'
  | 'enter_vehicle'
  | 'drive_point'
  | 'escape_police'
  | 'visit_building'
  | 'investigate_clue'
  | 'neutralize_hostiles'
  | 'escort_civilians'
  | 'protect_zone';

export interface MissionEncounterConfig {
  civiliansCount?: number;
  hostilesCount?: number;
  hasBoss?: boolean;
  bossNameEn?: string;
  bossNameBn?: string;
  vipMode?: boolean;
  clues?: Array<{ id: string; x: number; z: number; labelEn: string; labelBn: string }>;
  extractX?: number;
  extractZ?: number;
  policeSupport?: boolean;
}

export interface MissionStage {
  type: MissionStageType;
  titleEn: string;
  titleBn: string;
  stageCallEn?: string;
  stageCallBn?: string;
  targetX: number;
  targetZ: number;
  radius: number;
  buildingId?: string;
  requiredVehicleKind?: VehicleKind;
  encounter?: MissionEncounterConfig;
}

export interface MissionDef {
  id: string;
  category: MissionCategory;
  chapterNumber?: number;
  titleEn: string;
  titleBn: string;
  briefingEn?: string;
  briefingBn?: string;
  descriptionEn: string;
  descriptionBn: string;
  giverEn: string;
  giverBn: string;
  callerRoleEn?: string;
  callerRoleBn?: string;
  startX: number;
  startZ: number;
  baseReward: number;
  baseTimeLimitSec: number; // 0 = untimed
  optionalBonusEn?: string;
  optionalBonusBn?: string;
  initialWantedStars?: number;
  deploySquad?: boolean;
  prerequisites?: string[];
  cooldownSec?: number;
  unlockRewardLabelEn?: string;
  unlockRewardLabelBn?: string;
  stages: MissionStage[];
}

export interface MissionHistoryEntry {
  missionId: string;
  bestRank: MissionRank;
  bestTimeSec: number;
  completions: number;
  firstClearClaimed: boolean;
  lastPlayedAt: number;
}

export interface PlayerStats {
  missionsCompleted: number;
  specOpsCompleted: number;
  sideActivitiesCompleted: number;
  civiliansProtected: number;
  hostilesNeutralized: number;
  cluesInvestigated: number;
  distanceDrivenKm: number;
  totalEarnedTaka: number;
  wantedEscapes: number;
  banksRobbed: number;
  shopsRobbed: number;
  shopsSmashed: number;
  vehiclesSmashed: number;
  vehiclesSoldChopShop: number;
}

export interface SquadMemberSnapshot {
  id: string;
  callsignEn: string;
  callsignBn: string;
  roleEn: string;
  roleBn: string;
  health: number;
  maxHealth: number;
  statusEn: string;
  statusBn: string;
  inVehicle: boolean;
}

export interface EmergencyAlert {
  id: string;
  titleEn: string;
  titleBn: string;
  districtEn: string;
  districtBn: string;
  severity: 'info' | 'warning' | 'critical';
  x: number;
  z: number;
  timestamp: number;
  linkedMissionId?: string;
}

export interface TutorialProgress {
  completed: boolean;
  skipped: boolean;
  stepIndex: number; // 0..7
}

export interface ActiveMissionSnapshot {
  missionId: string;
  titleEn: string;
  titleBn: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  stageIndex: number;
  stageCount: number;
  objectiveEn: string;
  objectiveBn: string;
  secondaryObjectiveEn?: string;
  secondaryObjectiveBn?: string;
  secondaryAchieved: boolean;
  timeRemainingSec: number | null;
  targetX: number;
  targetZ: number;
  distanceMeters: number;
  civiliansSafe: number;
  civiliansTotal: number;
  hostilesRemaining: number;
  hostilesTotal: number;
  cluesFound: number;
  cluesTotal: number;
  deploySquad: boolean;
}

export interface MissionResultBanner {
  missionId: string;
  titleEn: string;
  titleBn: string;
  success: boolean;
  rewardEarned: number;
  rank?: MissionRank;
  completionTimeSec?: number;
  civiliansSafe?: number;
  civiliansTotal?: number;
  optionalCompleted?: boolean;
  unlockNoticeEn?: string;
  unlockNoticeBn?: string;
  reasonEn: string;
  reasonBn: string;
}

export interface NpcDialogueSnapshot {
  npcId: string;
  nameEn: string;
  nameBn: string;
  roleEn: string;
  roleBn: string;
  lineEn: string;
  lineBn: string;
  mood: 'friendly' | 'alert' | 'shopkeeper';
}

export interface MiniMapSnapshot {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  cameraYaw: number;
  inVehicle: boolean;
  insideBuildingId: string | null;
  traffic: Array<{ x: number; z: number; kind: VehicleKind }>;
  parkedVehicles: Array<{ x: number; z: number; kind: VehicleKind }>;
  police: Array<{
    x: number;
    z: number;
    yaw: number;
    chasing: boolean;
    searching: boolean;
    visionRange: number;
    visionHalfAngle: number;
  }>;
  squad: Array<{ x: number; z: number }>;
  hostiles: Array<{ x: number; z: number; isBoss: boolean }>;
  civilians: Array<{ x: number; z: number; escorted: boolean }>;
  gps: GpsState;
  missionTarget: { x: number; z: number } | null;
  playerVehicle: {
    x: number;
    z: number;
    kind: VehicleKind;
    nameEn: string;
    nameBn: string;
  } | null;
  discoveredPlaceIds: string[];
}

export interface HudState {
  started: boolean;
  paused: boolean;
  transitioning: boolean;
  photoMode: boolean;
  insideBuildingId: string | null;
  insideBuildingNameEn: string;
  insideBuildingNameBn: string;
  districtEn: string;
  districtBn: string;
  weather: WeatherType;
  radioStation: RadioStationId;
  money: number;
  health: number;
  stamina: number; // 0..100
  wantedLevel: number;
  wantedEvading: boolean;
  wantedEvadeProgress: number; // 0..1
  timeOfDay: number; // 0..24 hours
  fps: number;
  inVehicle: boolean;
  vehicleId: string | null;
  vehicleKind: VehicleKind | null;
  vehicleNameEn: string;
  vehicleNameBn: string;
  vehicleHealth: number; // 0..100
  vehicleBoost: number; // 0..100
  boosting: boolean;
  vehiclePaintHex: number;
  speedKmh: number;
  unlockProgress: number | null; // 0..1 when hotwiring/unlocking
  cameraMode: CameraMode;
  interaction: InteractionPrompt | null;
  activeMission: ActiveMissionSnapshot | null;
  missionResult: MissionResultBanner | null;
  squadActive: boolean;
  squadCommand: SquadCommand;
  squadMembers: SquadMemberSnapshot[];
  canSubdueHostile: boolean;
  equippedWeapon: WeaponId;
  weaponAmmoMag: number;
  weaponAmmoReserve: number;
  isAiming: boolean;
  isReloading: boolean;
  aimTargetLocked: boolean;
  hitMarker: HitMarkerType;
  emergencyAlerts: EmergencyAlert[];
  tutorial: TutorialProgress;
  gps: GpsState;
  dialogue: NpcDialogueSnapshot | null;
  toastMessage: string | null;
  mafiaRep: number;
  mafiaRankIndex: number;
  empireVaultCash: number;
  ownedPropertyIds: string[];
  heistProgress: number | null; // 0..1 while cracking vault or register
  heistLabelEn: string;
  heistLabelBn: string;
  bustedWastedBanner: { type: 'wasted' | 'busted'; fee: number } | null;
  vehicleDomain: VehicleDomain;
  altitudeMeters: number;
  policeSearchMode: boolean;
  stuntBanner: StuntBonusBanner | null;
}

export interface SaveData {
  version: number;
  savedAt: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  money: number;
  health: number;
  timeOfDay: number;
  appearance: PlayerAppearance;
  inventory: InventoryItem[];
  ownedVehicles: OwnedVehicleRecord[];
  completedMissionIds: string[];
  missionHistory: Record<string, MissionHistoryEntry>;
  claimedRewardIds: string[];
  unlockedSpecOpsRewards: string[];
  squadCommandDefault: SquadCommand;
  tutorialCompleted: boolean;
  stats: PlayerStats;
  settings: GameSettings;
  mafiaRep?: number;
  ownedPropertyIds?: string[];
  empireVaultCash?: number;
  favoriteMapIds?: string[];
  discoveredPlaceIds?: string[];
}

export interface InputState {
  moveX: number; // -1..1
  moveY: number; // -1..1
  sprint: boolean;
  jump: boolean;
  steer: number; // -1..1
  throttle: number; // 0..1
  brake: number; // 0..1
  reverse: boolean;
  handbrake: boolean;
  boost: boolean;
  horn: boolean;
  fire: boolean;
  aim: boolean;
  ascend?: boolean;
  descend?: boolean;
}
