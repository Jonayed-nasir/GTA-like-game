import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, PlayerProgressionSnapshot } from './core/Game';
import { TRANSLATIONS } from './i18n/translations';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_INVENTORY,
  DEFAULT_OWNED_VEHICLES,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
} from './save/SaveManager';
import { createInitialAmmoState } from './data/weapons';
import {
  BuildingFootprint,
  EnterableBuildingDef,
  GameSettings,
  HudState,
  MapMarker,
  MiniMapSnapshot,
  MissionDifficulty,
  RadioStationId,
  SquadCommand,
  WeaponId,
  WeatherType,
} from './types/game';
import { ControlLayoutEditor } from './ui/ControlLayoutEditor';
import { DialogueBanner } from './ui/DialogueBanner';
import { HUD } from './ui/HUD';
import { InventoryModal } from './ui/InventoryModal';
import { MissionModal } from './ui/MissionModal';
import { MobileControls, TouchControlButton } from './ui/MobileControls';
import { PauseMenu } from './ui/PauseMenu';
import { OfflineIndicator } from './ui/PWAInstallButton';
import { RotateLandscapeGuard } from './ui/RotateLandscapeGuard';
import { ShopModal } from './ui/ShopModal';
import { PhoneAppTab, SmartphoneModal } from './ui/SmartphoneModal';
import { SpecialOpsModal } from './ui/SpecialOpsModal';
import { SquadCommandBar } from './ui/SquadCommandBar';
import { StartScreen } from './ui/StartScreen';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { WeaponWheelModal } from './ui/WeaponWheelModal';

const INITIAL_HUD: HudState = {
  started: false,
  paused: false,
  transitioning: false,
  photoMode: false,
  weather: 'clear',
  radioStation: 'off',
  insideBuildingId: null,
  insideBuildingNameEn: '',
  insideBuildingNameBn: '',
  districtEn: 'Gulshan Avenue',
  districtBn: 'গুলশান এভিনিউ',
  money: 25000,
  health: 100,
  stamina: 100,
  wantedLevel: 0,
  wantedEvading: false,
  wantedEvadeProgress: 0,
  timeOfDay: 16.4,
  fps: 60,
  inVehicle: false,
  vehicleId: null,
  vehicleKind: null,
  vehicleNameEn: '',
  vehicleNameBn: '',
  vehicleHealth: 100,
  vehiclePaintHex: 0,
  vehicleBoost: 100,
  boosting: false,
  speedKmh: 0,
  unlockProgress: null,
  cameraMode: 'third_person',
  interaction: null,
  activeMission: null,
  missionResult: null,
  squadActive: false,
  squadCommand: 'follow',
  squadMembers: [],
  canSubdueHostile: false,
  emergencyAlerts: [],
  tutorial: { completed: false, skipped: false, stepIndex: 0 },
  equippedWeapon: 'pistol',
  weaponAmmoMag: 15,
  weaponAmmoReserve: 150,
  isAiming: false,
  aimTargetLocked: false,
  isReloading: false,
  hitMarker: 'none',
  gps: {
    active: false,
    labelEn: '',
    labelBn: '',
    targetX: 0,
    targetZ: 0,
    distanceMeters: 0,
    path: [],
  },
  dialogue: null,
  toastMessage: null,
  mafiaRep: 0,
  mafiaRankIndex: 0,
  empireVaultCash: 0,
  ownedPropertyIds: [],
  heistProgress: null,
  heistLabelEn: '',
  heistLabelBn: '',
  bustedWastedBanner: null,
  vehicleDomain: 'ground',
  altitudeMeters: 0,
  policeSearchMode: false,
  stuntBanner: null,
};

const INITIAL_PLAYER_DATA: PlayerProgressionSnapshot = {
  money: 25000,
  health: 100,
  appearance: DEFAULT_APPEARANCE,
  inventory: DEFAULT_INVENTORY,
  ownedVehicles: DEFAULT_OWNED_VEHICLES,
  completedMissionIds: [],
  missionHistory: {},
  unlockedSpecOpsRewards: [],
  completionPercentage: 0,
  stats: DEFAULT_STATS,
  cooldownsSec: {},
  garageTargetVehicle: null,
  mafiaRep: 0,
  mafiaRankIndex: 0,
  ownedPropertyIds: [],
  empireVaultCash: 0,
  empireIncomePerMin: 0,
  shopRobCooldownSec: {},
  favoriteMapIds: [],
  discoveredPlaceIds: ['gulshan_circle'],
};

const EMPTY_SNAPSHOT: MiniMapSnapshot = {
  playerX: 0,
  playerZ: 0,
  playerYaw: 0,
  cameraYaw: 0,
  inVehicle: false,
  insideBuildingId: null,
  playerVehicle: null,
  discoveredPlaceIds: ['gulshan_circle'],
  traffic: [],
  parkedVehicles: [],
  police: [],
  squad: [],
  hostiles: [],
  civilians: [],
  gps: INITIAL_HUD.gps,
  missionTarget: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerData, setPlayerData] = useState<PlayerProgressionSnapshot>(INITIAL_PLAYER_DATA);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneInitialTab, setPhoneInitialTab] = useState<PhoneAppTab>('empire');
  const [weaponWheelOpen, setWeaponWheelOpen] = useState(false);
  const [controlEditorOpen, setControlEditorOpen] = useState(false);
  const [specOpsTab, setSpecOpsTab] = useState<'ops' | 'armory' | 'results' | null>(null);
  const [activeShop, setActiveShop] = useState<EnterableBuildingDef | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [worldMapData, setWorldMapData] = useState<{
    buildings: BuildingFootprint[];
    markers: MapMarker[];
    roadCoords: number[];
  }>({ buildings: [], markers: [], roadCoords: [-60, 0, 60] });

  const anyModalOpen =
    mapExpanded ||
    inventoryOpen ||
    missionsOpen ||
    phoneOpen ||
    weaponWheelOpen ||
    controlEditorOpen ||
    specOpsTab !== null ||
    activeShop !== null;

  useEffect(() => {
    gameRef.current?.setModalOpen(anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const closeAllModals = useCallback(() => {
    setMapExpanded(false);
    setInventoryOpen(false);
    setMissionsOpen(false);
    setPhoneOpen(false);
    setWeaponWheelOpen(false);
    setControlEditorOpen(false);
    setSpecOpsTab(null);
    setActiveShop(null);
  }, []);

  useEffect(() => {
    if (!anyModalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        closeAllModals();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [anyModalOpen, closeAllModals]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const game = new Game(container, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onSettingsUpdate: (nextSettings) => setSettings(nextSettings),
      onPlayerDataUpdate: (nextData) => setPlayerData(nextData),
      onOpenShop: (bldg) => {
        closeAllModals();
        setActiveShop(bldg);
      },
      onOpenSpecOpsTerminal: (tab = 'ops') => {
        closeAllModals();
        setSpecOpsTab(tab);
      },
      onToggleMap: () => {
        setInventoryOpen(false);
        setMissionsOpen(false);
        setPhoneOpen(false);
        setWeaponWheelOpen(false);
        setSpecOpsTab(null);
        setActiveShop(null);
        setMapExpanded((prev) => !prev);
      },
      onToggleInventory: () => {
        setMapExpanded(false);
        setMissionsOpen(false);
        setPhoneOpen(false);
        setWeaponWheelOpen(false);
        setSpecOpsTab(null);
        setActiveShop(null);
        setInventoryOpen((prev) => !prev);
      },
      onToggleMissions: () => {
        setMapExpanded(false);
        setInventoryOpen(false);
        setPhoneOpen(false);
        setWeaponWheelOpen(false);
        setSpecOpsTab(null);
        setActiveShop(null);
        setMissionsOpen((prev) => !prev);
      },
      onTogglePhone: () => {
        setMapExpanded(false);
        setInventoryOpen(false);
        setMissionsOpen(false);
        setWeaponWheelOpen(false);
        setSpecOpsTab(null);
        setActiveShop(null);
        setPhoneOpen((prev) => !prev);
      },
      onToggleWeaponWheel: () => {
        setMapExpanded(false);
        setInventoryOpen(false);
        setMissionsOpen(false);
        setPhoneOpen(false);
        setSpecOpsTab(null);
        setActiveShop(null);
        setWeaponWheelOpen((prev) => !prev);
      },
      onContextLost: (lost) => setContextLost(lost),
    });

    gameRef.current = game;
    setWorldMapData(game.getWorldMapData());

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [closeAllModals]);

  const getMiniMapSnapshot = useCallback((): MiniMapSnapshot => {
    return gameRef.current ? gameRef.current.getMiniMapSnapshot() : EMPTY_SNAPSHOT;
  }, []);

  const requestLandscapeFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen()
          .then(() => {
            const orient = screen.orientation as unknown as {
              lock?: (mode: string) => Promise<void>;
            };
            orient?.lock?.('landscape').catch(() => {});
          })
          .catch(() => {});
      } else {
        const orient = screen.orientation as unknown as {
          lock?: (mode: string) => Promise<void>;
        };
        orient?.lock?.('landscape').catch(() => {});
      }
    } catch {
      // Gracefully ignore on browsers without Orientation Lock API
    }
  }, []);

  const handleStart = useCallback(() => {
    gameRef.current?.startGame();
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) {
      requestLandscapeFullscreen();
    }
  }, [requestLandscapeFullscreen]);

  const handlePause = useCallback(() => {
    closeAllModals();
    gameRef.current?.setPaused(true);
  }, [closeAllModals]);

  const handleResume = useCallback(() => {
    gameRef.current?.setPaused(false);
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    gameRef.current?.updateSettings(patch);
  }, []);

  const handleSetTimeOfDay = useCallback((hours: number) => {
    gameRef.current?.setTimeOfDay(hours);
  }, []);

  const handleSetWeather = useCallback((weather: WeatherType, auto: boolean) => {
    gameRef.current?.setWeather(weather, auto);
  }, []);

  const handleSetRadio = useCallback((station: RadioStationId) => {
    gameRef.current?.setRadioStation(station);
  }, []);

  const handleEmergencyService = useCallback((service: 'clear_wanted' | 'med_drop') => {
    gameRef.current?.useEmergencyService(service);
  }, []);

  const handleTogglePhotoMode = useCallback((enabled: boolean) => {
    gameRef.current?.setPhotoMode(enabled);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSave = useCallback(() => {
    const lang = gameRef.current?.getLanguage() ?? 'en';
    gameRef.current?.saveProgress(TRANSLATIONS[lang].savedNotice);
  }, []);

  const handleRespawn = useCallback(() => {
    const lang = gameRef.current?.getLanguage() ?? 'en';
    gameRef.current?.respawnPlayer(TRANSLATIONS[lang].resetNotice);
    gameRef.current?.setPaused(false);
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    gameRef.current?.setJoystick(x, y);
  }, []);

  const handleSteerButton = useCallback((dir: 'left' | 'right', active: boolean) => {
    gameRef.current?.setSteerButton(dir, active);
  }, []);

  const handleCameraDrag = useCallback((dx: number, dy: number) => {
    gameRef.current?.rotateCamera(dx, dy);
  }, []);

  const handleButtonChange = useCallback((btn: TouchControlButton, active: boolean) => {
    gameRef.current?.setTouchButton(btn, active);
  }, []);

  const handlePrimaryInteract = useCallback(() => {
    gameRef.current?.triggerPrimaryInteraction();
  }, []);

  const handleCycleCamera = useCallback(() => {
    gameRef.current?.cycleCameraMode();
  }, []);

  const handleAdjustVehicleZoom = useCallback((delta: number) => {
    gameRef.current?.adjustVehicleCameraZoom(delta);
  }, []);

  const handleSetGps = useCallback((x: number, z: number, labelEn: string, labelBn: string) => {
    gameRef.current?.setGpsDestination(x, z, labelEn, labelBn);
  }, []);

  const handleClearGps = useCallback(() => {
    gameRef.current?.clearGps();
  }, []);

  const handleToggleFavoriteMap = useCallback((markerId: string) => {
    gameRef.current?.toggleFavoriteMapId(markerId);
  }, []);

  const handleBuyItem = useCallback((buildingId: string, itemId: string) => {
    return gameRef.current ? gameRef.current.buyShopItem(buildingId, itemId) : false;
  }, []);

  const handlePreviewOutfit = useCallback((outfitId: string) => {
    gameRef.current?.previewOutfit(outfitId);
  }, []);

  const handleEquipOutfit = useCallback((outfitId: string) => {
    gameRef.current?.equipOutfit(outfitId);
  }, []);

  const handleEquipSpecOpsOutfit = useCallback((outfitId: string) => {
    gameRef.current?.equipSpecOpsOutfit(outfitId);
  }, []);

  const handleGarageAction = useCallback(
    (action: 'repair' | 'paint' | 'upgrade' | 'save', paintHex?: number) => {
      return gameRef.current ? gameRef.current.garageAction(action, paintHex) : false;
    },
    []
  );

  const handleUseItem = useCallback((itemId: string) => {
    gameRef.current?.useInventoryItem(itemId);
  }, []);

  const handleSummonVehicle = useCallback((ownedId: string) => {
    gameRef.current?.summonOwnedVehicle(ownedId);
  }, []);

  const handleStartMission = useCallback((missionId: string, difficulty: MissionDifficulty) => {
    gameRef.current?.startMission(missionId, difficulty);
  }, []);

  const handleCancelMission = useCallback(() => {
    gameRef.current?.cancelMission();
  }, []);

  const handleRetryMission = useCallback(() => {
    gameRef.current?.retryLastMission();
  }, []);

  const handleDismissMissionResult = useCallback(() => {
    gameRef.current?.dismissMissionResult();
  }, []);

  const handleDismissDialogue = useCallback(() => {
    gameRef.current?.dismissDialogue();
  }, []);

  const handleSetSquadCommand = useCallback((cmd: SquadCommand) => {
    gameRef.current?.setSquadCommand(cmd);
  }, []);

  const handleToggleSquad = useCallback(() => {
    gameRef.current?.toggleSquadDeploy();
  }, []);

  const handleSubdueHostile = useCallback(() => {
    gameRef.current?.subdueNearestHostile();
  }, []);

  const handleSkipTutorial = useCallback(() => {
    gameRef.current?.skipTutorial();
  }, []);

  const handleSelectWeapon = useCallback((weaponId: WeaponId) => {
    gameRef.current?.equipWeapon(weaponId);
  }, []);

  const handleRefillAmmo = useCallback(() => {
    gameRef.current?.refillAllAmmo();
  }, []);

  const handleToggleAim = useCallback(() => {
    gameRef.current?.toggleAim();
  }, []);

  const handleReloadWeapon = useCallback(() => {
    gameRef.current?.reloadWeapon();
  }, []);

  const handleSellVehicle = useCallback(() => {
    return gameRef.current ? gameRef.current.sellGarageVehicle() : false;
  }, []);

  const handleRobShop = useCallback((buildingId: string) => {
    return gameRef.current ? gameRef.current.robShop(buildingId) : false;
  }, []);

  const handleBuyProperty = useCallback((propId: string) => {
    return gameRef.current ? gameRef.current.buyProperty(propId) : false;
  }, []);

  const handleCollectEmpireCash = useCallback(() => {
    return gameRef.current ? gameRef.current.collectEmpireCash() : false;
  }, []);

  const handleUsePenthousePerk = useCallback((perk: 'clear_heat' | 'refill_ammo') => {
    return gameRef.current ? gameRef.current.usePenthousePerk(perk) : false;
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0f17]">
      {/* Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f17]/95 p-6 text-center">
          <div className="max-w-sm space-y-2">
            <h2 className="font-display text-lg font-bold text-amber-400">
              Graphics Context Paused
            </h2>
            <p className="text-sm text-slate-300">
              Restoring WebGL rendering for Dhaka 3D scene...
            </p>
          </div>
        </div>
      )}

      {/* Title Screen Overlay over Live 3D Dhaka City */}
      {!hud.started && (
        <StartScreen
          language={settings.language}
          onLanguageChange={(language) => handleUpdateSettings({ language })}
          onStart={handleStart}
        />
      )}

      {/* Active Gameplay HUD, Mobile Controls & Interactive Modals */}
      {hud.started && (
        <>
          {!hud.paused && !anyModalOpen && !hud.photoMode && (
            <MobileControls
              hud={hud}
              language={settings.language}
              drivingMode={settings.drivingMode}
              settings={settings}
              onJoystickMove={handleJoystickMove}
              onSteerButton={handleSteerButton}
              onCameraDrag={handleCameraDrag}
              onButtonChange={handleButtonChange}
              onPrimaryInteract={handlePrimaryInteract}
              onCycleCamera={handleCycleCamera}
              onAdjustVehicleZoom={handleAdjustVehicleZoom}
              onToggleAim={handleToggleAim}
              onReload={handleReloadWeapon}
              onOpenWeaponWheel={() => {
                closeAllModals();
                setWeaponWheelOpen(true);
              }}
            />
          )}

          <HUD
            hud={hud}
            settings={settings}
            isFullscreen={isFullscreen}
            getMiniMapSnapshot={getMiniMapSnapshot}
            buildings={worldMapData.buildings}
            markers={worldMapData.markers}
            roadCoords={worldMapData.roadCoords}
            mapExpanded={mapExpanded}
            favoriteMapIds={playerData.favoriteMapIds}
            discoveredPlaceIds={playerData.discoveredPlaceIds}
            onToggleMap={() => {
              gameRef.current?.advanceTutorial('map');
              setMapExpanded((prev) => !prev);
            }}
            onSetGps={handleSetGps}
            onClearGps={handleClearGps}
            onToggleFavoriteMap={handleToggleFavoriteMap}
            onOpenInventory={() => {
              closeAllModals();
              setInventoryOpen(true);
            }}
            onOpenMissions={() => {
              closeAllModals();
              setMissionsOpen(true);
            }}
            onOpenEmpire={() => {
              closeAllModals();
              setPhoneInitialTab('empire');
              setPhoneOpen(true);
            }}
            onOpenPhone={() => {
              gameRef.current?.advanceTutorial('phone');
              closeAllModals();
              setPhoneInitialTab('ops');
              setPhoneOpen(true);
            }}
            onOpenWeaponWheel={() => {
              closeAllModals();
              setWeaponWheelOpen(true);
            }}
            onExitPhotoMode={() => handleTogglePhotoMode(false)}
            onToggleFullscreen={handleToggleFullscreen}
            onRetryMission={handleRetryMission}
            onDismissMissionResult={handleDismissMissionResult}
            onPause={handlePause}
          />

          {!hud.paused && !anyModalOpen && !hud.photoMode && !hud.activeMission && (
            <TutorialOverlay
              language={settings.language}
              tutorial={hud.tutorial}
              onSkip={handleSkipTutorial}
            />
          )}

          {!hud.paused && !anyModalOpen && !hud.photoMode && (
            <SquadCommandBar
              language={settings.language}
              squadActive={hud.squadActive}
              command={hud.squadCommand}
              members={hud.squadMembers}
              canSubdueHostile={hud.canSubdueHostile}
              inVehicle={hud.inVehicle}
              onSetCommand={handleSetSquadCommand}
              onSubdueHostile={handleSubdueHostile}
            />
          )}

          {hud.dialogue && !hud.paused && !anyModalOpen && !hud.photoMode && (
            <DialogueBanner
              dialogue={hud.dialogue}
              language={settings.language}
              onDismiss={handleDismissDialogue}
            />
          )}

          {specOpsTab && (
            <SpecialOpsModal
              initialTab={specOpsTab}
              language={settings.language}
              activeMission={hud.activeMission}
              playerData={playerData}
              squadActive={hud.squadActive}
              onStartMission={handleStartMission}
              onCancelMission={handleCancelMission}
              onToggleSquad={handleToggleSquad}
              onEquipSpecOpsOutfit={handleEquipSpecOpsOutfit}
              onPreviewOutfit={handlePreviewOutfit}
              onClose={() => setSpecOpsTab(null)}
            />
          )}

          {phoneOpen && (
            <SmartphoneModal
              initialTab={phoneInitialTab}
              settings={settings}
              playerData={playerData}
              currentWeather={hud.weather}
              wantedLevel={hud.wantedLevel}
              markers={worldMapData.markers}
              squadActive={hud.squadActive}
              squadCommand={hud.squadCommand}
              squadMembers={hud.squadMembers}
              emergencyAlerts={hud.emergencyAlerts}
              onSetRadio={handleSetRadio}
              onSetWeather={handleSetWeather}
              onSetGps={handleSetGps}
              onSummonVehicle={handleSummonVehicle}
              onEmergencyService={handleEmergencyService}
              onEnterPhotoMode={() => handleTogglePhotoMode(true)}
              onOpenSpecOps={() => setSpecOpsTab('ops')}
              onToggleSquad={handleToggleSquad}
              onSetSquadCommand={handleSetSquadCommand}
              onStartMission={handleStartMission}
              onBuyProperty={handleBuyProperty}
              onCollectEmpireCash={handleCollectEmpireCash}
              onUsePenthousePerk={handleUsePenthousePerk}
              onClose={() => setPhoneOpen(false)}
            />
          )}

          {activeShop && (
            <ShopModal
              building={activeShop}
              playerData={playerData}
              language={settings.language}
              onBuyItem={handleBuyItem}
              onPreviewOutfit={handlePreviewOutfit}
              onEquipOutfit={handleEquipOutfit}
              onGarageAction={handleGarageAction}
              onSellVehicle={handleSellVehicle}
              onRobShop={handleRobShop}
              onClose={() => setActiveShop(null)}
            />
          )}

          {inventoryOpen && (
            <InventoryModal
              playerData={playerData}
              language={settings.language}
              onUseItem={handleUseItem}
              onEquipOutfit={handleEquipOutfit}
              onSummonVehicle={handleSummonVehicle}
              onClose={() => setInventoryOpen(false)}
            />
          )}

          {missionsOpen && (
            <MissionModal
              activeMission={hud.activeMission}
              completedMissionIds={playerData.completedMissionIds}
              missionHistory={playerData.missionHistory}
              cooldownsSec={playerData.cooldownsSec}
              completionPercentage={playerData.completionPercentage}
              language={settings.language}
              onStartMission={handleStartMission}
              onCancelMission={handleCancelMission}
              onClose={() => setMissionsOpen(false)}
            />
          )}

          {weaponWheelOpen && (
            <WeaponWheelModal
              equippedWeapon={hud.equippedWeapon}
              ammo={gameRef.current?.getWeaponAmmoSnapshot() ?? createInitialAmmoState()}
              money={hud.money}
              language={settings.language}
              onSelectWeapon={handleSelectWeapon}
              onRefillAmmo={handleRefillAmmo}
              onClose={() => setWeaponWheelOpen(false)}
            />
          )}

          {hud.paused && !controlEditorOpen && (
            <PauseMenu
              settings={settings}
              timeOfDay={hud.timeOfDay}
              onResume={handleResume}
              onUpdateSettings={handleUpdateSettings}
              onSetTimeOfDay={handleSetTimeOfDay}
              onOpenControlEditor={() => {
                gameRef.current?.setPaused(false);
                setControlEditorOpen(true);
              }}
              onSave={handleSave}
              onRespawn={handleRespawn}
            />
          )}

          {controlEditorOpen && (
            <ControlLayoutEditor
              settings={settings}
              onSave={handleUpdateSettings}
              onClose={() => setControlEditorOpen(false)}
            />
          )}
        </>
      )}

      {/* Portrait Mobile Landscape Guard + Offline Status Indicator */}
      <RotateLandscapeGuard
        language={settings.language}
        active={hud.started}
        onRequestLandscape={requestLandscapeFullscreen}
      />
      <OfflineIndicator language={settings.language} />
    </div>
  );
}
