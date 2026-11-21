import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Car,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Disc,
  DoorOpen,
  Eye,
  Flame,
  Footprints,
  Gauge,
  Hand,
  Heart,
  Home,
  Lock,
  LogOut,
  MessageSquare,
  OctagonAlert,
  Rewind,
  RotateCw,
  ShoppingBag,
  Swords,
  Target,
  Vault,
  Volume2,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { WEAPON_CATALOG } from '../data/weapons';
import { TRANSLATIONS } from '../i18n/translations';
import {
  CameraMode,
  DrivingControlMode,
  GameSettings,
  HudState,
  InteractionPrompt,
  Language,
} from '../types/game';

export type TouchControlButton =
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
  | 'descend';

interface MobileControlsProps {
  hud: HudState;
  language: Language;
  drivingMode: DrivingControlMode;
  settings: GameSettings;
  onJoystickMove: (x: number, y: number) => void;
  onSteerButton: (dir: 'left' | 'right', active: boolean) => void;
  onCameraDrag: (dx: number, dy: number) => void;
  onButtonChange: (btn: TouchControlButton, active: boolean) => void;
  onPrimaryInteract: () => void;
  onCycleCamera: () => void;
  onAdjustVehicleZoom: (delta: number) => void;
  onToggleAim: () => void;
  onReload: () => void;
  onOpenWeaponWheel: () => void;
}

function getInteractionIcon(prompt: InteractionPrompt) {
  switch (prompt.type) {
    case 'enter_vehicle':
      return prompt.locked ? (
        <Lock className="w-4 h-4 shrink-0" />
      ) : (
        <Car className="w-4 h-4 shrink-0" />
      );
    case 'enter_building':
    case 'exit_building':
      return <DoorOpen className="w-4 h-4 shrink-0" />;
    case 'open_garage':
      return <Wrench className="w-4 h-4 shrink-0" />;
    case 'open_dealership':
      return <Car className="w-4 h-4 shrink-0" />;
    case 'heal_hospital':
      return <Heart className="w-4 h-4 shrink-0" />;
    case 'save_safehouse':
      return <Home className="w-4 h-4 shrink-0" />;
    case 'talk_npc':
      return <MessageSquare className="w-4 h-4 shrink-0" />;
    case 'rob_bank':
      return <Vault className="w-4 h-4 shrink-0" />;
    case 'rob_shop':
      return <Banknote className="w-4 h-4 shrink-0" />;
    default:
      return <ShoppingBag className="w-4 h-4 shrink-0" />;
  }
}

function shortCameraLabel(mode: CameraMode, lang: Language): string {
  switch (mode) {
    case 'vehicle_close':
      return lang === 'bn' ? 'কাছে' : 'CLOSE';
    case 'vehicle_far':
      return lang === 'bn' ? 'দূরে' : 'FAR';
    case 'vehicle_first_person':
      return lang === 'bn' ? 'কেবিন' : 'CABIN';
    default:
      return lang === 'bn' ? 'সাধারণ' : 'NORM';
  }
}

export function MobileControls({
  hud,
  language,
  drivingMode,
  settings,
  onJoystickMove,
  onSteerButton,
  onCameraDrag,
  onButtonChange,
  onPrimaryInteract,
  onCycleCamera,
  onAdjustVehicleZoom,
  onToggleAim,
  onReload,
  onOpenWeaponWheel,
}: MobileControlsProps) {
  const t = TRANSLATIONS[language];
  const weaponDef = WEAPON_CATALOG[hud.equippedWeapon];
  const layout = settings.mobileControls;

  // Virtual joystick tracking with responsive enlarged radius
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [sprintLocked, setSprintLocked] = useState(false);

  // Explicit active press feedback for primary pedals, steering & fire triggers
  const [pressedBtns, setPressedBtns] = useState<Record<string, boolean>>({});

  // Camera drag tracking
  const camPointerId = useRef<number | null>(null);
  const lastCamPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setSprintLocked(false);
    setKnobOffset({ x: 0, y: 0 });
    setPressedBtns({});
    joyPointerId.current = null;
    camPointerId.current = null;
    onJoystickMove(0, 0);
    onButtonChange('sprint', false);
  }, [hud.inVehicle, hud.paused, hud.insideBuildingId, onJoystickMove, onButtonChange]);

  useEffect(() => {
    const resetTouch = () => {
      setSprintLocked(false);
      setKnobOffset({ x: 0, y: 0 });
      setPressedBtns({});
      joyPointerId.current = null;
      camPointerId.current = null;
    };
    window.addEventListener('blur', resetTouch);
    return () => window.removeEventListener('blur', resetTouch);
  }, []);

  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxRadius = Math.max(26, rect.width * 0.36);
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;

    setKnobOffset({ x: nx, y: ny });
    // Subtle smooth response curve for finer low-angle steering precision
    const rawX = nx / maxRadius;
    const rawY = -ny / maxRadius;
    const curvedX = Math.sign(rawX) * Math.pow(Math.abs(rawX), 1.15);
    const curvedY = Math.sign(rawY) * Math.pow(Math.abs(rawY), 1.1);
    onJoystickMove(curvedX, curvedY);
  };

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoyPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const handleCamDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (camPointerId.current !== null) return;
    camPointerId.current = e.pointerId;
    lastCamPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCamMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (camPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lastCamPos.current.x;
    const dy = e.clientY - lastCamPos.current.y;
    lastCamPos.current = { x: e.clientX, y: e.clientY };
    onCameraDrag(dx, dy);
  };

  const handleCamEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (camPointerId.current !== e.pointerId) return;
    camPointerId.current = null;
  };

  const setBtnPressed = (key: string, active: boolean) => {
    setPressedBtns((prev) => (prev[key] === active ? prev : { ...prev, [key]: active }));
  };

  const holdProps = (btn: TouchControlButton) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setBtnPressed(btn, true);
      onButtonChange(btn, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.stopPropagation();
      setBtnPressed(btn, false);
      onButtonChange(btn, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      setBtnPressed(btn, false);
      onButtonChange(btn, false);
    },
  });

  const steerHoldProps = (dir: 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setBtnPressed(`steer_${dir}`, true);
      onSteerButton(dir, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.stopPropagation();
      setBtnPressed(`steer_${dir}`, false);
      onSteerButton(dir, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      setBtnPressed(`steer_${dir}`, false);
      onSteerButton(dir, false);
    },
  });

  const showArrowSteering = hud.inVehicle && drivingMode === 'buttons';
  const prompt = hud.interaction;
  const isHeistPrompt = prompt?.type === 'rob_bank' || prompt?.type === 'rob_shop';

  // User customizable cluster scale, transparency, and drag offsets
  const btnScale = Math.max(0.85, Math.min(1.35, layout?.buttonScale ?? 1.08));
  const fireScale = Math.max(0.9, Math.min(1.45, layout?.fireScale ?? 1.15));
  const clusterOpacity = Math.max(0.45, Math.min(1.0, layout?.opacity ?? 0.92));
  const steerOff = layout?.steerOffset ?? { x: 0, y: 0 };
  const actionOff = layout?.actionOffset ?? { x: 0, y: 0 };
  const fireOff = layout?.fireOffset ?? { x: 0, y: 0 };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Full-viewport camera drag pad behind controls */}
      <div
        data-viewport-pad="true"
        className="absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handleCamDown}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamEnd}
        onPointerCancel={handleCamEnd}
      />

      {/* Bottom-Left: Enlarged Thumb-Friendly Steering Joystick OR Left/Right Steering Pads */}
      <div
        className="absolute safe-bottom-left origin-bottom-left pointer-events-auto"
        style={{
          opacity: clusterOpacity,
          transform: `translate3d(${steerOff.x}px, ${steerOff.y}px, 0) scale(${btnScale})`,
        }}
      >
        {showArrowSteering ? (
          <div className="flex items-center gap-3 touch-none">
            <button
              type="button"
              {...steerHoldProps('left')}
              aria-label={t.leftSteer}
              title={t.leftSteer}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                pressedBtns.steer_left
                  ? 'bg-amber-400 text-slate-950 border-amber-100 scale-95 ring-4 ring-amber-400/35'
                  : 'bg-[#0b101a]/90 border-white/30 text-white'
              }`}
            >
              <ChevronLeft className="w-9 h-9 sm:w-11 sm:h-11" />
            </button>
            <button
              type="button"
              {...steerHoldProps('right')}
              aria-label={t.rightSteer}
              title={t.rightSteer}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                pressedBtns.steer_right
                  ? 'bg-amber-400 text-slate-950 border-amber-100 scale-95 ring-4 ring-amber-400/35'
                  : 'bg-[#0b101a]/90 border-white/30 text-white'
              }`}
            >
              <ChevronRight className="w-9 h-9 sm:w-11 sm:h-11" />
            </button>
          </div>
        ) : (
          <div
            ref={joyRef}
            onPointerDown={handleJoyPointerDown}
            onPointerMove={handleJoyPointerMove}
            onPointerUp={handleJoyPointerEnd}
            onPointerCancel={handleJoyPointerEnd}
            className="relative w-28 h-28 sm:w-34 sm:h-34 md:w-36 md:h-36 rounded-full bg-[#0b101a]/82 border-2 border-white/30 flex items-center justify-center touch-none shadow-2xl"
            aria-label={hud.inVehicle ? 'Steering Joystick' : 'Movement Joystick'}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/15 pointer-events-none" />
            {hud.inVehicle && (
              <div className="absolute inset-x-2.5 sm:inset-x-3 flex items-center justify-between text-amber-300/55 pointer-events-none">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <div
              className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/95 border-2 border-amber-100/90 shadow-lg pointer-events-none"
              style={{
                transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom-Right: Enlarged On-Foot OR Driving Action Controls (Thumb-ergonomic, Zero Overlap) */}
      <div
        className="absolute safe-bottom-right origin-bottom-right pointer-events-auto flex flex-col items-end gap-2.5"
        style={{
          opacity: clusterOpacity,
          transform: `translate3d(${actionOff.x}px, ${actionOff.y}px, 0) scale(${btnScale})`,
        }}
      >
        {!hud.inVehicle ? (
          <>
            {/* Universal Contextual Interaction Chip */}
            {prompt && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onPrimaryInteract}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm shadow-xl cursor-pointer touch-none border max-w-[54vw] sm:max-w-xs active:scale-95 transition-transform ${
                  prompt.locked || isHeistPrompt
                    ? 'bg-rose-600 active:bg-rose-500 border-rose-300/55 text-white'
                    : 'bg-amber-500 active:bg-amber-400 border-amber-200/60 text-slate-950'
                }`}
              >
                {getInteractionIcon(prompt)}
                <div className="text-left leading-tight min-w-0">
                  <div className="truncate">
                    {language === 'bn' ? prompt.labelBn : prompt.labelEn}
                  </div>
                  {(prompt.sublabelEn || prompt.sublabelBn) && (
                    <div
                      className={`text-[10px] font-sans font-medium truncate ${
                        prompt.locked || isHeistPrompt ? 'text-rose-100' : 'text-slate-900/80'
                      }`}
                    >
                      {language === 'bn' ? prompt.sublabelBn : prompt.sublabelEn}
                    </div>
                  )}
                </div>
              </button>
            )}

            {!hud.insideBuildingId && (
              <>
                {/* Combat Utility Row: Weapon Wheel, Reload, Aim */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onOpenWeaponWheel}
                    aria-label={t.weaponWheel}
                    title={t.weaponWheel}
                    className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b101a]/92 active:bg-amber-500 active:text-slate-950 border border-amber-400/55 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer touch-none"
                  >
                    <Swords className="w-5 h-5" />
                    {weaponDef.magSize > 0 && (
                      <span className="absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-amber-400/60 text-[9px] font-display font-bold text-amber-200 tabular-nums leading-tight">
                        {hud.weaponAmmoMag}
                      </span>
                    )}
                  </button>

                  {weaponDef.magSize > 0 && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onReload}
                      aria-label={t.reload}
                      title={t.reload}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b101a]/92 active:bg-white/25 border border-white/25 text-slate-200 flex items-center justify-center shadow-lg cursor-pointer touch-none"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                  )}

                  {weaponDef.category !== 'melee' && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onToggleAim}
                      aria-label={t.aim}
                      title={t.aim}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-lg cursor-pointer touch-none ${
                        hud.isAiming
                          ? 'bg-amber-400 border-amber-100 text-slate-950 ring-2 ring-amber-300/40'
                          : 'bg-[#0b101a]/92 border-white/30 text-white'
                      }`}
                    >
                      <Target className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Primary On-Foot Cluster: Sprint, Jump + Enlarged Custom-Scaled Fire/Punch Trigger */}
                <div className="flex items-end gap-2.5">
                  <button
                    type="button"
                    aria-label={t.sprint}
                    title={t.sprint}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const next = !sprintLocked;
                      setSprintLocked(next);
                      onButtonChange('sprint', next);
                    }}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-colors shadow-lg cursor-pointer touch-none ${
                      sprintLocked
                        ? 'bg-amber-500 border-amber-200 text-slate-950'
                        : 'bg-[#0b101a]/90 border-white/28 text-white active:bg-white/20'
                    }`}
                  >
                    <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button
                    type="button"
                    {...holdProps('jump')}
                    aria-label={t.jump}
                    title={t.jump}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-transform duration-75 shadow-lg cursor-pointer touch-none ${
                      pressedBtns.jump
                        ? 'bg-amber-400 border-amber-100 text-slate-950 scale-95'
                        : 'bg-[#0b101a]/90 border-white/28 text-white'
                    }`}
                  >
                    <ArrowUp className="w-6 h-6" />
                  </button>

                  {/* Enlarged Ergonomic Shooting / Fire Trigger with Independent Fire Scale & Offset */}
                  <div
                    style={{
                      transform: `translate3d(${fireOff.x}px, ${fireOff.y}px, 0) scale(${fireScale / btnScale})`,
                      transformOrigin: 'bottom right',
                    }}
                  >
                    <button
                      type="button"
                      {...holdProps('fire')}
                      aria-label={weaponDef.category === 'melee' ? t.punch : t.fire}
                      title={weaponDef.category === 'melee' ? t.punch : t.fire}
                      className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 shadow-2xl flex flex-col items-center justify-center cursor-pointer touch-none transition-transform duration-75 ${
                        pressedBtns.fire
                          ? 'bg-amber-400 text-slate-950 border-white scale-95 ring-4 ring-amber-400/45'
                          : 'bg-rose-600/95 border-amber-200/85 text-white'
                      }`}
                    >
                      {weaponDef.category === 'melee' ? (
                        <Hand className="w-8 h-8 sm:w-9 sm:h-9" />
                      ) : (
                        <Crosshair className="w-8 h-8 sm:w-9 sm:h-9" />
                      )}
                      <span className="text-[9px] font-display font-black tracking-wider uppercase leading-none mt-0.5">
                        {weaponDef.category === 'melee'
                          ? language === 'bn'
                            ? 'পান্চ'
                            : 'HIT'
                          : language === 'bn'
                            ? 'ফায়ার'
                            : 'FIRE'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Live Driving Camera Mode + Manual Zoom Strip (Zoom Closer / Farther while Driving) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAdjustVehicleZoom(-0.08)}
                aria-label="Zoom Vehicle Camera Closer"
                title={language === 'bn' ? 'ক্যামেরা কাছে আনুন' : 'Zoom Closer'}
                className="w-9 h-9 rounded-lg bg-[#0b101a]/92 active:bg-amber-500 active:text-slate-950 border border-white/25 text-slate-100 flex items-center justify-center shadow cursor-pointer touch-none"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onCycleCamera}
                aria-label={t.camera}
                title={t.camera}
                className="h-9 px-2.5 rounded-lg bg-[#0b101a]/92 active:bg-amber-500 active:text-slate-950 border border-amber-400/45 text-amber-200 flex items-center gap-1 shadow cursor-pointer touch-none font-display text-[10px] font-bold"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{shortCameraLabel(hud.cameraMode, language)}</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAdjustVehicleZoom(0.08)}
                aria-label="Zoom Vehicle Camera Farther"
                title={language === 'bn' ? 'ক্যামেরা দূরে নিন' : 'Zoom Farther'}
                className="w-9 h-9 rounded-lg bg-[#0b101a]/92 active:bg-amber-500 active:text-slate-950 border border-white/25 text-slate-100 flex items-center justify-center shadow cursor-pointer touch-none"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Driving Utility Row: Enlarged Drive-By Shoot, Horn, NOS, Exit */}
            <div className="flex items-center gap-2">
              {weaponDef.driveByAllowed && (
                <button
                  type="button"
                  {...holdProps('fire')}
                  aria-label={t.driveBy}
                  title={t.driveBy}
                  className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 flex items-center justify-center shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.fire
                      ? 'bg-amber-400 text-slate-950 border-white scale-95 ring-4 ring-amber-400/40'
                      : 'bg-rose-600/95 border-amber-200/80 text-white'
                  }`}
                >
                  <Crosshair className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              <button
                type="button"
                {...holdProps('horn')}
                aria-label={t.horn}
                title={t.horn}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center shadow-lg cursor-pointer touch-none ${
                  pressedBtns.horn
                    ? 'bg-amber-500 border-amber-100 text-slate-950 scale-95'
                    : 'bg-[#0b101a]/92 border-white/25 text-white'
                }`}
              >
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                {...holdProps('boost')}
                aria-label={t.nitro}
                title={t.nitro}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center shadow-lg cursor-pointer touch-none transition-colors ${
                  hud.boosting || pressedBtns.boost
                    ? 'bg-cyan-400 border-cyan-100 text-slate-950 scale-95'
                    : hud.vehicleBoost > 10
                      ? 'bg-cyan-950/92 border-cyan-400/70 text-cyan-200'
                      : 'bg-[#0b101a]/80 border-white/15 text-slate-500'
                }`}
              >
                <Flame className="w-5 h-5" />
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onPrimaryInteract}
                aria-label={t.exitVehicle}
                title={t.exitVehicle}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-600/95 active:bg-rose-500 active:scale-95 border border-rose-300/50 text-white flex items-center justify-center shadow-lg cursor-pointer touch-none"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Enlarged Helicopter Flight Controls OR Ground/Boat Pedals with Clear Press Feedback */}
            {hud.vehicleDomain === 'air' ? (
              <div className="flex items-end gap-2.5">
                <button
                  type="button"
                  {...holdProps('descend')}
                  aria-label="Descend Helicopter"
                  title="Descend"
                  className={`w-15 h-16 sm:w-17 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.descend
                      ? 'bg-rose-500 text-white border-white scale-95'
                      : 'bg-rose-950/92 border-rose-400/70 text-rose-200'
                  }`}
                >
                  <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span className="text-[9px] font-display font-bold">DOWN</span>
                </button>

                <button
                  type="button"
                  {...holdProps('ascend')}
                  aria-label="Ascend Helicopter"
                  title="Ascend"
                  className={`w-15 h-18 sm:w-18 sm:h-21 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.ascend
                      ? 'bg-amber-400 text-slate-950 border-white scale-95'
                      : 'bg-amber-950/92 border-amber-400/80 text-amber-200'
                  }`}
                >
                  <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  <span className="text-[9px] font-display font-bold">LIFT</span>
                </button>

                <button
                  type="button"
                  {...holdProps('throttle')}
                  aria-label="Fly Forward"
                  title="Forward"
                  className={`w-17 h-20 sm:w-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.throttle
                      ? 'bg-emerald-400 text-slate-950 border-white scale-95 ring-4 ring-emerald-400/35'
                      : 'bg-emerald-950/92 border-emerald-400/75 text-emerald-200'
                  }`}
                >
                  <Gauge className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="text-[9px] font-display font-bold">FLY</span>
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2.5">
                <button
                  type="button"
                  {...holdProps('handbrake')}
                  aria-label={t.drift}
                  title={t.drift}
                  className={`w-12 h-13 sm:w-14 sm:h-15 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.handbrake
                      ? 'bg-amber-400 text-slate-950 border-white scale-95'
                      : 'bg-[#0b101a]/92 border-amber-400/50 text-amber-300'
                  }`}
                >
                  <Disc className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {drivingMode === 'buttons' && (
                  <button
                    type="button"
                    {...holdProps('reverse')}
                    aria-label={t.reverse}
                    title={t.reverse}
                    className={`w-13 h-15 sm:w-15 sm:h-17 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer touch-none transition-transform duration-75 ${
                      pressedBtns.reverse
                        ? 'bg-amber-400 text-slate-950 border-white scale-95'
                        : 'bg-amber-950/92 border-amber-400/60 text-amber-200'
                    }`}
                  >
                    <Rewind className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[8.5px] font-display font-bold">REV</span>
                  </button>
                )}

                <button
                  type="button"
                  {...holdProps('brake')}
                  aria-label={drivingMode === 'joystick' ? `${t.brake}/${t.reverse}` : t.brake}
                  title={drivingMode === 'joystick' ? `${t.brake}/${t.reverse}` : t.brake}
                  className={`w-15 h-17 sm:w-18 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 shadow-xl cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.brake
                      ? 'bg-rose-500 text-white border-white scale-95 ring-4 ring-rose-500/40'
                      : 'bg-rose-950/94 border-rose-400/70 text-rose-200'
                  }`}
                >
                  {drivingMode === 'joystick' ? (
                    <ArrowDown className="w-6 h-6 sm:w-7 sm:h-7" />
                  ) : (
                    <OctagonAlert className="w-6 h-6 sm:w-7 sm:h-7" />
                  )}
                  <span className="text-[9px] font-display font-black uppercase leading-none">
                    {language === 'bn' ? 'ব্রেক' : 'BRAKE'}
                  </span>
                </button>

                <button
                  type="button"
                  {...holdProps('throttle')}
                  aria-label={t.gas}
                  title={t.gas}
                  className={`w-17 h-21 sm:w-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 shadow-2xl cursor-pointer touch-none transition-transform duration-75 ${
                    pressedBtns.throttle
                      ? 'bg-emerald-400 text-slate-950 border-white scale-95 ring-4 ring-emerald-400/40'
                      : 'bg-emerald-950/94 border-emerald-400/80 text-emerald-200'
                  }`}
                >
                  <ArrowUp className="w-7 h-7 sm:w-8 sm:h-8" />
                  <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-85" />
                  <span className="text-[9.5px] font-display font-black uppercase leading-none">
                    {language === 'bn' ? 'গ্যাস' : 'GAS'}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
