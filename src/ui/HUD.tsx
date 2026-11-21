import {
  Backpack,
  Camera,
  Clock,
  CloudLightning,
  CloudRain,
  Crosshair,
  Crown,
  Flag,
  Flame,
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Radio,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Star,
  Sun,
  Vault,
  X,
} from 'lucide-react';
import { MAFIA_RANKS } from '../data/empire';
import { WEAPON_CATALOG } from '../data/weapons';
import { TRANSLATIONS } from '../i18n/translations';
import {
  BuildingFootprint,
  GameSettings,
  HudState,
  MapMarker,
  MiniMapSnapshot,
} from '../types/game';
import { MiniMap } from './MiniMap';

interface HUDProps {
  hud: HudState;
  settings: GameSettings;
  isFullscreen: boolean;
  getMiniMapSnapshot: () => MiniMapSnapshot;
  buildings: BuildingFootprint[];
  markers: MapMarker[];
  roadCoords: number[];
  mapExpanded: boolean;
  favoriteMapIds: string[];
  discoveredPlaceIds: string[];
  onToggleMap: () => void;
  onSetGps: (x: number, z: number, labelEn: string, labelBn: string) => void;
  onClearGps: () => void;
  onToggleFavoriteMap: (markerId: string) => void;
  onOpenInventory: () => void;
  onOpenMissions: () => void;
  onOpenEmpire: () => void;
  onOpenPhone: () => void;
  onOpenWeaponWheel: () => void;
  onExitPhotoMode: () => void;
  onToggleFullscreen: () => void;
  onRetryMission: () => void;
  onDismissMissionResult: () => void;
  onPause: () => void;
}

function formatClock(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function HUD({
  hud,
  settings,
  isFullscreen,
  getMiniMapSnapshot,
  buildings,
  markers,
  roadCoords,
  mapExpanded,
  favoriteMapIds,
  discoveredPlaceIds,
  onToggleMap,
  onSetGps,
  onClearGps,
  onToggleFavoriteMap,
  onOpenInventory,
  onOpenMissions,
  onOpenEmpire,
  onOpenPhone,
  onOpenWeaponWheel,
  onExitPhotoMode,
  onToggleFullscreen,
  onRetryMission,
  onDismissMissionResult,
  onPause,
}: HUDProps) {
  const t = TRANSLATIONS[settings.language];
  const lang = settings.language;
  const weaponDef = WEAPON_CATALOG[hud.equippedWeapon];
  const mafiaRank = MAFIA_RANKS[hud.mafiaRankIndex] ?? MAFIA_RANKS[0];

  const showCrosshair =
    !hud.insideBuildingId &&
    !hud.paused &&
    (!hud.inVehicle ? weaponDef.category !== 'melee' || hud.isAiming : weaponDef.driveByAllowed);
  const showSniperScope =
    showCrosshair && hud.isAiming && !hud.inVehicle && hud.equippedWeapon === 'sniper';
  const districtLabel = hud.insideBuildingId
    ? lang === 'bn'
      ? hud.insideBuildingNameBn
      : hud.insideBuildingNameEn
    : lang === 'bn'
      ? hud.districtBn
      : hud.districtEn;
  const activeVehicleLabel = lang === 'bn' ? hud.vehicleNameBn : hud.vehicleNameEn;

  // Clean Photo Mode: hide HUD & controls, leave only minimal exit icon button
  if (hud.photoMode) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none">
        <div className="flex justify-end safe-inset">
          <button
            type="button"
            onClick={onExitPhotoMode}
            aria-label={t.exitPhotoMode}
            title={t.exitPhotoMode}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b101a]/90 hover:bg-[#152033] border border-amber-400/50 text-xs font-display font-bold text-amber-300 shadow-lg cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Smooth Interior Fade Curtain */}
      <div
        className={`fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-200 ${
          hud.transitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* GTA 5/6 Fullscreen WASTED / BUSTED Cinematic Banner */}
      {hud.bustedWastedBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06090f]/82 pointer-events-none">
          <div className="w-full py-7 sm:py-9 bg-[#0a0f18]/95 border-y-2 border-white/15 text-center shadow-2xl px-4">
            <div
              className={`font-display text-4xl sm:text-6xl font-black tracking-[0.2em] uppercase ${
                hud.bustedWastedBanner.type === 'wasted' ? 'text-rose-500' : 'text-sky-400'
              }`}
            >
              {hud.bustedWastedBanner.type === 'wasted' ? t.wasted : t.busted}
            </div>
            {hud.bustedWastedBanner.fee > 0 && (
              <div className="mt-2 font-display text-sm sm:text-base font-bold text-amber-300 tabular-nums">
                -৳ {hud.bustedWastedBanner.fee.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sniper Scope Overlay when aiming Sniper Rifle */}
      {showSniperScope && (
        <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-amber-300/80 shadow-[0_0_0_9999px_rgba(4,7,14,0.72)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-amber-300/65" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-amber-300/65" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500" />
          </div>
        </div>
      )}

      {/* GTA Center Crosshair Reticle + Target-Lock + Hit/Headshot/Kill Marker */}
      {showCrosshair && !showSniperScope && (
        <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute w-0.5 h-2.5 shadow transition-all duration-75 ${
                hud.aimTargetLocked ? 'bg-rose-500' : 'bg-white/90'
              } ${hud.isAiming ? '-translate-y-2.5' : '-translate-y-3.5'}`}
            />
            <div
              className={`absolute w-0.5 h-2.5 shadow transition-all duration-75 ${
                hud.aimTargetLocked ? 'bg-rose-500' : 'bg-white/90'
              } ${hud.isAiming ? 'translate-y-2.5' : 'translate-y-3.5'}`}
            />
            <div
              className={`absolute h-0.5 w-2.5 shadow transition-all duration-75 ${
                hud.aimTargetLocked ? 'bg-rose-500' : 'bg-white/90'
              } ${hud.isAiming ? '-translate-x-2.5' : '-translate-x-3.5'}`}
            />
            <div
              className={`absolute h-0.5 w-2.5 shadow transition-all duration-75 ${
                hud.aimTargetLocked ? 'bg-rose-500' : 'bg-white/90'
              } ${hud.isAiming ? 'translate-x-2.5' : 'translate-x-3.5'}`}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full shadow transition-colors duration-75 ${
                hud.aimTargetLocked
                  ? 'bg-rose-500 scale-125'
                  : hud.isAiming
                    ? 'bg-amber-400'
                    : 'bg-white'
              }`}
            />

            {hud.hitMarker !== 'none' && (
              <div
                className={`absolute w-6 h-6 flex items-center justify-center ${
                  hud.hitMarker === 'kill'
                    ? 'text-rose-500'
                    : hud.hitMarker === 'headshot'
                      ? 'text-amber-300'
                      : 'text-white'
                }`}
              >
                <span className="absolute w-5 h-0.5 bg-current rotate-45" />
                <span className="absolute w-5 h-0.5 bg-current -rotate-45" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Row: Safe-area padded Left Mini-Map + Icon Dock, Center Objective, Right Status */}
      <div className="flex items-start justify-between gap-2 safe-inset">
        {/* Left: Responsive Mini-Map + 4 Icon-Only Quick Launchers */}
        <div className="flex flex-col gap-1.5 compact-landscape-scale origin-top-left pointer-events-auto">
          <MiniMap
            getSnapshot={getMiniMapSnapshot}
            buildings={buildings}
            markers={markers}
            roadCoords={roadCoords}
            districtLabel={districtLabel}
            language={lang}
            expanded={mapExpanded}
            gpsActive={hud.gps.active}
            favoriteMapIds={favoriteMapIds}
            discoveredPlaceIds={discoveredPlaceIds}
            onToggleExpand={onToggleMap}
            onSetGps={onSetGps}
            onClearGps={onClearGps}
            onToggleFavoriteMap={onToggleFavoriteMap}
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenMissions}
              aria-label={t.missions}
              title={t.missions}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0b101a]/92 hover:bg-[#162033] border border-white/15 text-amber-300 flex items-center justify-center shadow cursor-pointer"
            >
              <Flag className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenEmpire}
              aria-label={t.mafiaEmpire}
              title={`${t.mafiaEmpire} · ${lang === 'bn' ? mafiaRank.titleBn : mafiaRank.titleEn}`}
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0b101a]/92 hover:bg-[#162033] border flex items-center justify-center shadow cursor-pointer ${
                hud.empireVaultCash > 0
                  ? 'border-emerald-400/75 text-emerald-300'
                  : 'border-amber-400/45 text-amber-300'
              }`}
            >
              <Crown className="w-4 h-4" />
              {hud.empireVaultCash > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1 rounded bg-emerald-500 text-[9px] font-display font-black text-slate-950 leading-tight shadow">
                  ৳
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenInventory}
              aria-label={t.inventory}
              title={t.inventory}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0b101a]/92 hover:bg-[#162033] border border-white/15 text-slate-200 flex items-center justify-center shadow cursor-pointer"
            >
              <Backpack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenPhone}
              aria-label={t.phone}
              title={t.phone}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center shadow cursor-pointer ${
                hud.radioStation !== 'off'
                  ? 'bg-cyan-950/92 hover:bg-cyan-900 border-cyan-400/55 text-cyan-200'
                  : 'bg-[#0b101a]/92 hover:bg-[#162033] border-white/15 text-cyan-300'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top-Center: Responsive Mission Tracker OR GPS Strip (Never covers center crosshair!) */}
        <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1 max-w-md mx-auto pointer-events-auto">
          {hud.activeMission && (
            <div className="w-full max-w-[340px] md:max-w-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0b101a]/92 border border-amber-400/45 shadow-lg text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-display font-bold text-amber-400 uppercase tracking-wider">
                <span className="truncate max-w-[120px] sm:max-w-[200px]">
                  {lang === 'bn' ? hud.activeMission.titleBn : hud.activeMission.titleEn}
                </span>
                <span className="text-slate-500">·</span>
                <span className="shrink-0">
                  {hud.activeMission.stageIndex + 1}/{hud.activeMission.stageCount}
                </span>
                {hud.activeMission.timeRemainingSec !== null && (
                  <>
                    <span className="text-slate-500">·</span>
                    <span className="inline-flex items-center gap-0.5 text-rose-300 tabular-nums shrink-0">
                      <Clock className="w-3 h-3" />
                      {Math.ceil(hud.activeMission.timeRemainingSec)}s
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-white mt-0.5 truncate">
                {lang === 'bn' ? hud.activeMission.objectiveBn : hud.activeMission.objectiveEn}
                {hud.activeMission.distanceMeters > 0 && (
                  <span className="ml-1.5 font-display text-amber-300 tabular-nums">
                    ({hud.activeMission.distanceMeters}m)
                  </span>
                )}
              </div>
              {(hud.activeMission.civiliansTotal > 0 ||
                hud.activeMission.hostilesTotal > 0 ||
                hud.activeMission.cluesTotal > 0) && (
                <div className="hidden sm:flex mt-1 items-center justify-center gap-2.5 text-[10px] font-display font-bold">
                  {hud.activeMission.civiliansTotal > 0 && (
                    <span className="text-emerald-400">
                      {hud.activeMission.civiliansSafe}/{hud.activeMission.civiliansTotal}
                    </span>
                  )}
                  {hud.activeMission.hostilesTotal > 0 && (
                    <span className="text-rose-400">
                      ✕ {hud.activeMission.hostilesRemaining}
                    </span>
                  )}
                  {hud.activeMission.cluesTotal > 0 && (
                    <span className="text-cyan-300">
                      {hud.activeMission.cluesFound}/{hud.activeMission.cluesTotal}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {!hud.activeMission && hud.gps.active && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#0b101a]/92 border border-cyan-400/45 text-[10px] sm:text-xs text-cyan-200 max-w-full">
              <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold truncate max-w-[100px] sm:max-w-[170px]">
                {lang === 'bn' ? hud.gps.labelBn : hud.gps.labelEn}
              </span>
              <span className="font-display font-bold text-white tabular-nums shrink-0">
                {hud.gps.distanceMeters}m
              </span>
              <button
                type="button"
                onClick={onClearGps}
                aria-label={t.clearGps}
                className="p-0.5 rounded hover:bg-white/15 text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Top-Right Compact Icon+Number GTA Status Strip */}
        <div className="flex flex-col items-end gap-1.5 compact-landscape-scale origin-top-right pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#0b101a]/92 border border-white/15">
            <div className="font-display text-xs sm:text-base font-bold text-emerald-400 tabular-nums whitespace-nowrap">
              ৳{hud.money.toLocaleString()}
            </div>

            <button
              type="button"
              onClick={onOpenEmpire}
              aria-label={t.mafiaEmpire}
              title={lang === 'bn' ? mafiaRank.titleBn : mafiaRank.titleEn}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/8 hover:bg-white/16 font-display text-[10px] sm:text-xs font-bold tabular-nums cursor-pointer"
              style={{ color: mafiaRank.badgeColor }}
            >
              <Crown className="w-3 h-3 shrink-0" />
              <span>{hud.mafiaRankIndex + 1}</span>
            </button>

            <div className="font-display text-[11px] sm:text-xs font-semibold text-slate-200 tabular-nums whitespace-nowrap flex items-center gap-1">
              {hud.weather === 'storm' ? (
                <CloudLightning className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              ) : hud.weather === 'rain' ? (
                <CloudRain className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="hidden xs:inline sm:inline">{formatClock(hud.timeOfDay)}</span>
            </div>

            {hud.radioStation !== 'off' && (
              <button
                type="button"
                onClick={onOpenPhone}
                aria-label={t.radioFm}
                title={t.radioFm}
                className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded bg-cyan-500/20 text-cyan-300 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
            )}

            {settings.showFps && (
              <div className="hidden sm:block font-display text-[11px] font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                {hud.fps}
              </div>
            )}

            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={t.fullscreen}
              title={t.fullscreen}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-white/10 hover:bg-white/20 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onPause}
              aria-label={t.pauseTitle}
              title={t.pauseTitle}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-white/12 hover:bg-white/22 active:bg-white/28 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Health + Stamina bars & 5-star Wanted row */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0b101a]/88 border border-white/10">
            <div className="flex flex-col gap-1 w-14 sm:w-20">
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    hud.health < 35 ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, hud.health))}%` }}
                />
              </div>
              {!hud.inVehicle && (
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, hud.stamina))}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5" aria-label={`Wanted level ${hud.wantedLevel}`}>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <Star
                  key={lvl}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                    lvl <= hud.wantedLevel
                      ? hud.wantedEvading
                        ? 'text-sky-400 fill-sky-400'
                        : 'text-rose-500 fill-rose-500'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon + Ammo Counter Weapon Widget */}
          {!hud.insideBuildingId && (
            <button
              type="button"
              onClick={onOpenWeaponWheel}
              aria-label={t.weaponWheel}
              title={lang === 'bn' ? weaponDef.nameBn : weaponDef.nameEn}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b101a]/90 hover:bg-[#162033] border border-amber-400/35 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span
                className={`font-display text-[11px] sm:text-xs font-bold tabular-nums ${
                  hud.isReloading ? 'text-amber-300' : 'text-white'
                }`}
              >
                {hud.isReloading
                  ? '...'
                  : weaponDef.magSize > 0
                    ? `${hud.weaponAmmoMag}/${hud.weaponAmmoReserve}`
                    : '∞'}
              </span>
            </button>
          )}

          {/* Police Pursuit / GTA 5 Search Mode Compact Progress Bar */}
          {hud.wantedLevel > 0 && (
            <div
              className={`px-2.5 py-1 rounded-lg bg-[#0b101a]/92 border w-[136px] sm:w-[168px] ${
                hud.policeSearchMode ? 'border-sky-400/65' : 'border-rose-500/55'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-display font-bold">
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert
                    className={`w-3.5 h-3.5 shrink-0 ${
                      hud.policeSearchMode ? 'text-sky-300' : 'text-rose-400'
                    }`}
                  />
                  <span className={hud.policeSearchMode ? 'text-sky-300' : 'text-rose-400'}>
                    {hud.policeSearchMode
                      ? lang === 'bn'
                        ? 'খুঁজছে'
                        : 'ESCAPING'
                      : `${hud.wantedLevel}★`}
                  </span>
                </span>
                <span
                  className={`tabular-nums ${
                    hud.policeSearchMode ? 'text-sky-300' : 'text-rose-400'
                  }`}
                >
                  {hud.policeSearchMode ? `${Math.round(hud.wantedEvadeProgress * 100)}%` : 'DMP'}
                </span>
              </div>
              {hud.wantedEvading && (
                <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-100"
                    style={{ width: `${Math.round(hud.wantedEvadeProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Compact Digital Speedometer + Altitude (Helicopter) + Vehicle Health + NOS Bar */}
          {hud.inVehicle && (
            <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-[#0b101a]/90 border border-white/15 text-right min-w-[96px] sm:min-w-[126px]">
              <div className="hidden sm:block text-[10px] font-medium text-slate-300 truncate max-w-[125px]">
                {activeVehicleLabel}
              </div>
              <div className="flex items-baseline justify-end gap-1">
                <span
                  className={`font-display text-lg sm:text-2xl font-bold tabular-nums leading-none ${
                    hud.boosting ? 'text-cyan-300' : 'text-amber-400'
                  }`}
                >
                  {hud.speedKmh}
                </span>
                <span className="font-display text-[9px] sm:text-[10px] font-semibold text-slate-400">
                  {t.kmh}
                </span>
              </div>
              {hud.vehicleDomain === 'air' && (
                <div className="mt-0.5 font-display text-[10px] font-bold text-sky-300 tabular-nums">
                  ALT {hud.altitudeMeters}m
                </div>
              )}
              <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${hud.vehicleHealth < 40 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.max(0, Math.min(100, hud.vehicleHealth))}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Flame
                  className={`w-3 h-3 shrink-0 ${
                    hud.boosting ? 'text-cyan-300' : 'text-cyan-500/80'
                  }`}
                />
                <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-75"
                    style={{ width: `${Math.max(0, Math.min(100, hud.vehicleBoost))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mission Completed / Failed Result Banner */}
      {hud.missionResult && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 w-[90vw] max-w-md pointer-events-auto">
          <div
            className={`rounded-xl bg-[#0b101a]/96 border p-4 shadow-2xl text-center ${
              hud.missionResult.success ? 'border-emerald-400/60' : 'border-rose-500/60'
            }`}
          >
            <div
              className={`font-display text-base sm:text-lg font-bold ${
                hud.missionResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {hud.missionResult.success ? t.missionComplete : t.missionFailed}
            </div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {lang === 'bn' ? hud.missionResult.titleBn : hud.missionResult.titleEn}
            </div>
            {hud.missionResult.success && hud.missionResult.rank && (
              <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/50 text-amber-200 font-display font-bold text-xs">
                <span>
                  {t.rankLabel}: {hud.missionResult.rank}
                </span>
                {typeof hud.missionResult.completionTimeSec === 'number' && (
                  <span className="text-slate-300">· {hud.missionResult.completionTimeSec}s</span>
                )}
              </div>
            )}
            <p className="text-xs text-slate-300 mt-1">
              {lang === 'bn' ? hud.missionResult.reasonBn : hud.missionResult.reasonEn}
            </p>
            {hud.missionResult.unlockNoticeEn && (
              <div className="mt-1.5 text-xs font-display font-bold text-cyan-300">
                ★ {lang === 'bn' ? hud.missionResult.unlockNoticeBn : hud.missionResult.unlockNoticeEn}
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-2">
              {!hud.missionResult.success && (
                <button
                  type="button"
                  onClick={onRetryMission}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.retryMission}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDismissMissionResult}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-xs cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Bank Vault / Safe Cracking Progress Bar */}
      {hud.heistProgress !== null && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[min(240px,52vw)] sm:w-64 px-3.5 py-2 rounded-xl bg-[#0b101a]/95 border border-rose-500/70 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-display font-bold text-rose-300">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Vault className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                {lang === 'bn' ? hud.heistLabelBn : hud.heistLabelEn}
              </span>
            </span>
            <span className="tabular-nums text-amber-300 ml-2">
              {Math.round(hud.heistProgress * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-75"
              style={{ width: `${Math.round(hud.heistProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Locked Vehicle Unlocking Progress Bar */}
      {hud.unlockProgress !== null && hud.heistProgress === null && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[min(220px,50vw)] sm:w-56 px-3.5 py-2 rounded-xl bg-[#0b101a]/94 border border-rose-400/55 shadow-xl">
          <div className="text-xs font-display font-bold text-rose-300 text-center">
            {t.unlockingVehicle}
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.round(hud.unlockProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* GTA 5 Insane Stunt Jump Bonus Banner */}
      {hud.stuntBanner && (
        <div className="fixed top-[72px] sm:top-[84px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-4 sm:px-5 py-2 rounded-xl bg-[#0b101a]/95 border-2 border-amber-400/75 shadow-2xl text-center">
            <div className="font-display text-xs sm:text-base font-black text-amber-400 tracking-wider uppercase">
              {lang === 'bn' ? hud.stuntBanner.labelBn : hud.stuntBanner.labelEn}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-2.5 sm:gap-3 font-display text-[11px] sm:text-sm font-bold tabular-nums">
              <span className="text-white">{hud.stuntBanner.distanceMeters}m</span>
              <span className="text-sky-300">{hud.stuntBanner.hangSec}s AIR</span>
              <span className="text-emerald-400">+৳ {hud.stuntBanner.reward.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Transient Toast Notice */}
      {hud.toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 max-w-[88vw] px-3.5 py-1.5 rounded-lg bg-[#0b101a]/94 border border-amber-400/45 text-xs sm:text-sm font-medium text-amber-200 shadow-lg truncate">
          {hud.toastMessage}
        </div>
      )}

      {/* Desktop Keyboard Prompt Hint for Single Nearest Interaction */}
      {!hud.inVehicle && hud.interaction && !hud.dialogue && (
        <div className="hidden md:flex fixed bottom-10 left-1/2 -translate-x-1/2 items-center gap-2 px-4 py-2 rounded-lg bg-[#0b101a]/92 border border-amber-400/45 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shadow-lg">
          <span className="text-amber-400 font-display">[F]</span>
          <span>
            {lang === 'bn' ? hud.interaction.labelBn : hud.interaction.labelEn}
          </span>
        </div>
      )}
    </div>
  );
}
