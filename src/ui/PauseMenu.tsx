import { useState } from 'react';
import {
  CloudLightning,
  CloudRain,
  Eye,
  Play,
  Radio,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { MOBILE_CONTROL_PRESETS } from '../save/SaveManager';
import {
  ControlPreset,
  GameSettings,
  GraphicsQuality,
  RadioStationId,
  VehicleCameraPreset,
  WeatherType,
} from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface PauseMenuProps {
  settings: GameSettings;
  timeOfDay: number;
  onResume: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onSetTimeOfDay: (hours: number) => void;
  onOpenControlEditor: () => void;
  onSave: () => void;
  onRespawn: () => void;
}

const QUALITIES: GraphicsQuality[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

export function PauseMenu({
  settings,
  timeOfDay,
  onResume,
  onUpdateSettings,
  onSetTimeOfDay,
  onOpenControlEditor,
  onSave,
  onRespawn,
}: PauseMenuProps) {
  const [tab, setTab] = useState<'settings' | 'controls'>('settings');
  const t = TRANSLATIONS[settings.language];
  const lang = settings.language;

  const applyControlPreset = (preset: ControlPreset) => {
    const base = MOBILE_CONTROL_PRESETS[preset];
    onUpdateSettings({
      mobileControls: {
        ...base,
        steerOffset: { ...base.steerOffset },
        actionOffset: { ...base.actionOffset },
        fireOffset: { ...base.fireOffset },
      },
      drivingMode: preset === 'advanced' ? 'buttons' : preset === 'classic' ? 'joystick' : settings.drivingMode,
    });
  };

  const radioStations: Array<{ id: RadioStationId; label: string }> = [
    { id: 'off', label: t.radioOff },
    { id: 'lofi', label: t.radioLofi },
    { id: 'synth', label: t.radioSynth },
    { id: 'street', label: t.radioStreet },
  ];

  const weatherOptions: Array<{ id: WeatherType; label: string; icon: typeof Sun }> = [
    { id: 'clear', label: t.weatherClear, icon: Sun },
    { id: 'rain', label: t.weatherRain, icon: CloudRain },
    { id: 'storm', label: t.weatherStorm, icon: CloudLightning },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/88 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0e1420] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
              {t.pauseTitle}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {t.gameTitle} · {t.gameSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090d16] border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'settings'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.settings}
            </button>
            <button
              type="button"
              onClick={() => setTab('controls')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'controls'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.controls}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto modal-scroll space-y-5 text-sm">
          {tab === 'settings' ? (
            <>
              {/* Language */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-200 font-medium">{t.language}</span>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090d16] border border-white/10">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ language: 'en' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      settings.language === 'en'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ language: 'bn' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold font-bangla cursor-pointer ${
                      settings.language === 'bn'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              {/* Super-Easy Mobile Driving Control Mode (Mode A vs Mode B) */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-[#090d16] border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    {t.drivingMode}
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#131b2b] border border-white/10">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ drivingMode: 'joystick' })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold cursor-pointer ${
                        settings.drivingMode === 'joystick'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.modeJoystick}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ drivingMode: 'buttons' })}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold cursor-pointer ${
                        settings.drivingMode === 'buttons'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.modeButtons}
                    </button>
                  </div>
                </div>

                {/* Driving Assist & Speed Limiter toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ drivingAssist: !settings.drivingAssist })}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#131b2b] border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <span>{t.drivingAssist}</span>
                    <span className={settings.drivingAssist ? 'text-emerald-400' : 'text-slate-500'}>
                      {settings.drivingAssist ? t.on : t.off}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ speedLimiter: !settings.speedLimiter })}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#131b2b] border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <span>{t.speedLimiter}</span>
                    <span className={settings.speedLimiter ? 'text-amber-400' : 'text-slate-500'}>
                      {settings.speedLimiter ? t.on : t.off}
                    </span>
                  </button>
                </div>

                {/* Sensitivity Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{t.steeringSens}</span>
                      <span className="font-display text-amber-400">
                        {Math.round(settings.steeringSensitivity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.8}
                      step={0.05}
                      value={settings.steeringSensitivity}
                      onChange={(e) =>
                        onUpdateSettings({ steeringSensitivity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{t.accelScale}</span>
                      <span className="font-display text-amber-400">
                        {Math.round(settings.accelerationScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.4}
                      step={0.05}
                      value={settings.accelerationScale}
                      onChange={(e) =>
                        onUpdateSettings({ accelerationScale: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{t.brakeScale}</span>
                      <span className="font-display text-amber-400">
                        {Math.round(settings.brakingScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.5}
                      step={0.05}
                      value={settings.brakingScale}
                      onChange={(e) =>
                        onUpdateSettings({ brakingScale: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{t.cameraSens}</span>
                      <span className="font-display text-amber-400">
                        {Math.round(settings.cameraSensitivity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.0}
                      step={0.05}
                      value={settings.cameraSensitivity}
                      onChange={(e) =>
                        onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Mobile Control Presets (Classic / Advanced / Custom) & Interactive Layout Editor */}
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {lang === 'bn' ? 'মোবাইল কন্ট্রোল প্রিসেট' : 'Mobile Control Preset'}
                    </span>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#131b2b] border border-white/10">
                      {(['classic', 'advanced', 'custom'] as ControlPreset[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => applyControlPreset(p)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-display font-bold uppercase cursor-pointer ${
                            settings.mobileControls.preset === p
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenControlEditor}
                    className="w-full py-2.5 px-3 rounded-lg bg-amber-500/18 hover:bg-amber-500/28 border border-amber-400/50 text-amber-200 font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>
                      {lang === 'bn'
                        ? 'কন্ট্রোল সাইজ ও পজিশন কাস্টমাইজ করুন (Drag & Resize)'
                        : 'Customize Button Size, Position & Opacity'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Vehicle Camera Mode (Close / Normal / Far) & Manual Zoom */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-[#090d16] border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'bn' ? 'গাড়ির ক্যামেরা ভিউ' : 'Vehicle Camera Mode'}</span>
                  </span>
                  <span className="font-display text-xs font-bold text-amber-400 uppercase">
                    {settings.vehicleCameraPreset}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'close', en: 'Close Camera', bn: 'কাছে (Close)' },
                      { id: 'normal', en: 'Normal Camera', bn: 'সাধারণ (Normal)' },
                      { id: 'far', en: 'Far Camera', bn: 'দূরে (Far)' },
                    ] as Array<{ id: VehicleCameraPreset; en: string; bn: string }>
                  ).map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => onUpdateSettings({ vehicleCameraPreset: cam.id })}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-display font-bold cursor-pointer ${
                        settings.vehicleCameraPreset === cam.id
                          ? 'bg-amber-500 text-slate-950 border-amber-200'
                          : 'bg-[#131b2b] text-slate-200 border-white/10 hover:bg-[#1a253a]'
                      }`}
                    >
                      {lang === 'bn' ? cam.bn : cam.en}
                    </button>
                  ))}
                </div>
                <label className="block space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{lang === 'bn' ? 'ম্যানুয়াল ক্যামেরা জুম' : 'Manual Vehicle Camera Zoom'}</span>
                    <span className="font-display text-amber-400 tabular-nums">
                      {Math.round(settings.vehicleCameraZoom * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.72}
                    max={1.45}
                    step={0.04}
                    value={settings.vehicleCameraZoom}
                    onChange={(e) =>
                      onUpdateSettings({ vehicleCameraZoom: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Graphics Quality */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-medium">{t.graphicsQuality}</span>
                  <span className="text-xs font-display font-semibold text-amber-400">
                    {settings.quality}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-[#090d16] border border-white/10">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ quality: q })}
                      className={`py-2 rounded-md text-xs font-display font-semibold transition-colors cursor-pointer ${
                        settings.quality === q
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day & Quick Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-medium">{t.timeOfDay}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xs font-semibold text-amber-400 tabular-nums">
                      {String(Math.floor(timeOfDay) % 24).padStart(2, '0')}:
                      {String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ timeScale: settings.timeScale > 0 ? 0 : 1 })
                      }
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-slate-200 cursor-pointer"
                    >
                      {t.timeFlow}: {settings.timeScale > 0 ? t.normalFlow : t.pausedFlow}
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23.9}
                  step={0.1}
                  value={timeOfDay}
                  onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: t.dawn, h: 6.2 },
                    { label: t.noon, h: 12.5 },
                    { label: t.sunset, h: 17.5 },
                    { label: t.night, h: 21.5 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => onSetTimeOfDay(p.h)}
                      className="py-1.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Dhaka Weather & Dhaka FM Radio */}
              <div className="space-y-3 p-3.5 rounded-xl bg-[#090d16] border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    {t.weather}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ weatherAuto: !settings.weatherAuto })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                      settings.weatherAuto
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-white/5 border-white/15 text-slate-400'
                    }`}
                  >
                    {t.weatherAuto}: {settings.weatherAuto ? t.on : t.off}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {weatherOptions.map((w) => {
                    const Icon = w.icon;
                    const active = settings.weather === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onUpdateSettings({ weather: w.id, weatherAuto: false })}
                        className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                            : 'bg-[#131b2b] text-slate-200 border-white/10 hover:bg-[#1a253a]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{w.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.radioFm}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {radioStations.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateSettings({ radioStation: st.id })}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-semibold text-left truncate cursor-pointer ${
                          settings.radioStation === st.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-[#131b2b] border-white/10 text-slate-300 hover:bg-[#1a253a]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traffic Density & Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-medium text-xs">{t.trafficDensity}</span>
                    <span className="font-display text-xs text-slate-300 tabular-nums">
                      {Math.round(settings.trafficDensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={1}
                    step={0.05}
                    value={settings.trafficDensity}
                    onChange={(e) =>
                      onUpdateSettings({ trafficDensity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-medium text-xs">{t.audioVolume}</span>
                    <span className="font-display text-xs text-slate-300 tabular-nums">
                      {Math.round(settings.audioVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.audioVolume}
                    onChange={(e) =>
                      onUpdateSettings({ audioVolume: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Audio & FPS Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-xs font-semibold text-slate-200 hover:border-white/25 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    {settings.audioEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    {t.audio}
                  </span>
                  <span className={settings.audioEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                    {settings.audioEnabled ? t.on : t.off}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ showFps: !settings.showFps })}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-xs font-semibold text-slate-200 hover:border-white/25 cursor-pointer"
                >
                  <span>{t.showFps}</span>
                  <span className={settings.showFps ? 'text-amber-400' : 'text-slate-500'}>
                    {settings.showFps ? t.on : t.off}
                  </span>
                </button>
              </div>

              {/* Offline Mobile App Install */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <span className="text-xs text-slate-300 font-medium">
                  {settings.language === 'bn'
                    ? 'অ্যান্ড্রয়েড / মোবাইল অফলাইন অ্যাপ'
                    : 'Android / Mobile Offline App'}
                </span>
                <PWAInstallButton language={settings.language} compact />
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-display text-sm font-bold text-amber-400">
                  {t.controlsMobileTitle}
                </h3>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                  <li>{t.controlsMobileMove}</li>
                  <li>{t.controlsMobileLook}</li>
                  <li>{t.controlsMobileDrive}</li>
                </ul>
                <button
                  type="button"
                  onClick={onOpenControlEditor}
                  className="mt-2 w-full py-2.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>
                    {lang === 'bn'
                      ? 'কাস্টম কন্ট্রোল লেআউট এডিটর খুলুন'
                      : 'Open Custom Control Layout Editor'}
                  </span>
                </button>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2">
                <h3 className="font-display text-sm font-bold text-amber-400">
                  {t.controlsDesktopTitle}
                </h3>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                  <li>{t.controlsMove}</li>
                  <li>{t.controlsSprintJump}</li>
                  <li>{t.controlsVehicle}</li>
                  <li>{t.controlsCamera}</li>
                  <li>{t.controlsHornPause}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-[#090d16] border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.saveGame}</span>
            </button>
            <button
              type="button"
              onClick={onRespawn}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetPosition}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{t.resumeGame}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
