import React, { useRef, useState } from 'react';
import { Check, Crosshair, Move, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { MOBILE_CONTROL_PRESETS } from '../save/SaveManager';
import {
  ControlClusterOffset,
  ControlPreset,
  GameSettings,
  MobileControlLayout,
} from '../types/game';

interface ControlLayoutEditorProps {
  settings: GameSettings;
  onSave: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

type DragTarget = 'steer' | 'action' | 'fire';

function clampOffset(x: number, y: number): ControlClusterOffset {
  return {
    x: Math.round(Math.max(-95, Math.min(95, x))),
    y: Math.round(Math.max(-95, Math.min(45, y))),
  };
}

export function ControlLayoutEditor({ settings, onSave, onClose }: ControlLayoutEditorProps) {
  const lang = settings.language;
  const [draft, setDraft] = useState<MobileControlLayout>(() => ({
    ...settings.mobileControls,
    steerOffset: { ...settings.mobileControls.steerOffset },
    actionOffset: { ...settings.mobileControls.actionOffset },
    fireOffset: { ...settings.mobileControls.fireOffset },
  }));
  const [steerSens, setSteerSens] = useState(settings.steeringSensitivity);
  const [drivingMode, setDrivingMode] = useState(settings.drivingMode);

  const dragState = useRef<{
    target: DragTarget;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const applyPreset = (preset: ControlPreset) => {
    const base = MOBILE_CONTROL_PRESETS[preset];
    setDraft({
      ...base,
      steerOffset: { ...base.steerOffset },
      actionOffset: { ...base.actionOffset },
      fireOffset: { ...base.fireOffset },
    });
    if (preset === 'advanced') {
      setDrivingMode('buttons');
    } else if (preset === 'classic') {
      setDrivingMode('joystick');
    }
  };

  const handleReset = () => {
    applyPreset('classic');
    setSteerSens(1.0);
  };

  const startDrag = (target: DragTarget, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const current =
      target === 'steer'
        ? draft.steerOffset
        : target === 'action'
          ? draft.actionOffset
          : draft.fireOffset;
    dragState.current = {
      target,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
    };
  };

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d) return;
    e.stopPropagation();
    const next = clampOffset(d.origX + (e.clientX - d.startX), d.origY + (e.clientY - d.startY));
    setDraft((prev) => ({
      ...prev,
      preset: 'custom',
      steerOffset: d.target === 'steer' ? next : prev.steerOffset,
      actionOffset: d.target === 'action' ? next : prev.actionOffset,
      fireOffset: d.target === 'fire' ? next : prev.fireOffset,
    }));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragState.current = null;
  };

  const handleCommit = () => {
    onSave({
      mobileControls: draft,
      steeringSensitivity: steerSens,
      drivingMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050810]/92 safe-inset pointer-events-auto select-none overflow-hidden">
      {/* Top Interactive Customization Toolbar */}
      <div className="relative z-20 mx-auto max-w-3xl rounded-xl bg-[#0d1422]/96 border border-white/15 shadow-2xl p-2.5 sm:p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                {lang === 'bn' ? 'মোবাইল কন্ট্রোল কাস্টমাইজ করুন' : 'Customize Mobile Controls'}
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                {lang === 'bn'
                  ? 'নিচের কন্ট্রোল বক্স টেনে পছন্দের জায়গায় বসান'
                  : 'Drag control clusters below to reposition · Resize & save'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-[11px] font-semibold text-slate-200 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সেভ করুন' : 'Save Layout'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets Row: Classic / Advanced / Custom + Steering Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(['classic', 'advanced', 'custom'] as ControlPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-display font-bold uppercase cursor-pointer ${
                  draft.preset === p
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/8 text-slate-300 hover:bg-white/15'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#070b13] border border-white/10">
            <button
              type="button"
              onClick={() => setDrivingMode('joystick')}
              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                drivingMode === 'joystick' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              {lang === 'bn' ? 'জয়স্টিক' : 'Joystick'}
            </button>
            <button
              type="button"
              onClick={() => setDrivingMode('buttons')}
              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                drivingMode === 'buttons' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              {lang === 'bn' ? 'লেফট/রাইট বাটন' : 'Left/Right Buttons'}
            </button>
          </div>
        </div>

        {/* Sliders: Button Size, Fire Trigger Size, Opacity, Steering Sensitivity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10.5px]">
          <label className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>{lang === 'bn' ? 'বাটন সাইজ' : 'Button Size'}</span>
              <span className="font-mono text-amber-300">{Math.round(draft.buttonScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.85}
              max={1.35}
              step={0.05}
              value={draft.buttonScale}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  preset: 'custom',
                  buttonScale: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>{lang === 'bn' ? 'ফায়ার সাইজ' : 'Fire Size'}</span>
              <span className="font-mono text-rose-300">{Math.round(draft.fireScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.9}
              max={1.45}
              step={0.05}
              value={draft.fireScale}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  preset: 'custom',
                  fireScale: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-rose-500 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>{lang === 'bn' ? 'স্বচ্ছতা' : 'Opacity'}</span>
              <span className="font-mono text-sky-300">{Math.round(draft.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.45}
              max={1.0}
              step={0.05}
              value={draft.opacity}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  preset: 'custom',
                  opacity: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-sky-400 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>{lang === 'bn' ? 'স্টিয়ারিং সেন্স' : 'Steering Sens'}</span>
              <span className="font-mono text-emerald-300">{Math.round(steerSens * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.8}
              step={0.05}
              value={steerSens}
              onChange={(e) => setSteerSens(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Live Draggable Preview: Steering Cluster (Bottom-Left) */}
      <div
        onPointerDown={(e) => startDrag('steer', e)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute safe-bottom-left origin-bottom-left cursor-move touch-none"
        style={{
          opacity: draft.opacity,
          transform: `translate3d(${draft.steerOffset.x}px, ${draft.steerOffset.y}px, 0) scale(${draft.buttonScale})`,
        }}
      >
        <div className="p-3 rounded-2xl border-2 border-dashed border-amber-400 bg-[#0b1220]/85 flex flex-col items-center gap-1.5 shadow-xl">
          <div className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-amber-300">
            <Move className="w-3 h-3" />
            <span>{drivingMode === 'buttons' ? 'STEER L/R' : 'JOYSTICK'}</span>
          </div>
          {drivingMode === 'buttons' ? (
            <div className="flex items-center gap-2.5">
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-white/25 flex items-center justify-center font-bold text-white">
                ◀
              </div>
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-white/25 flex items-center justify-center font-bold text-white">
                ▶
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-800/90 border-2 border-white/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-amber-500 border border-amber-100" />
            </div>
          )}
        </div>
      </div>

      {/* Live Draggable Preview: Pedals / Actions Cluster + Independent Fire Trigger (Bottom-Right) */}
      <div
        onPointerDown={(e) => startDrag('action', e)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute safe-bottom-right origin-bottom-right cursor-move touch-none"
        style={{
          opacity: draft.opacity,
          transform: `translate3d(${draft.actionOffset.x}px, ${draft.actionOffset.y}px, 0) scale(${draft.buttonScale})`,
        }}
      >
        <div className="p-3 rounded-2xl border-2 border-dashed border-emerald-400 bg-[#0b1220]/85 flex flex-col items-end gap-2 shadow-xl">
          <div className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-emerald-300">
            <Move className="w-3 h-3" />
            <span>GAS / BRAKE / ACTIONS</span>
          </div>
          <div className="flex items-end gap-2.5">
            <div className="w-14 h-16 rounded-xl bg-rose-950 border-2 border-rose-400/70 flex items-center justify-center text-[10px] font-display font-bold text-rose-200">
              BRAKE
            </div>
            <div className="w-16 h-20 rounded-xl bg-emerald-950 border-2 border-emerald-400/80 flex items-center justify-center text-[10px] font-display font-bold text-emerald-200">
              GAS
            </div>
            {/* Independent Draggable Fire Trigger Preview */}
            <div
              onPointerDown={(e) => startDrag('fire', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                transform: `translate3d(${draft.fireOffset.x}px, ${draft.fireOffset.y}px, 0) scale(${draft.fireScale / draft.buttonScale})`,
                transformOrigin: 'bottom right',
              }}
              className="w-16 h-16 rounded-full bg-rose-600 border-2 border-dashed border-amber-200 flex flex-col items-center justify-center text-white shadow-2xl cursor-move touch-none"
            >
              <Crosshair className="w-6 h-6" />
              <span className="text-[8.5px] font-display font-black">FIRE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
