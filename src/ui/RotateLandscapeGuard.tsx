import { useEffect, useState } from 'react';
import { Maximize2, RotateCw } from 'lucide-react';
import { Language } from '../types/game';

interface RotateLandscapeGuardProps {
  language: Language;
  active: boolean;
  onRequestLandscape: () => void;
}

function isPortraitTouchPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse =
    window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  return coarse && window.innerHeight > window.innerWidth && window.innerWidth < 740;
}

export function RotateLandscapeGuard({
  language,
  active,
  onRequestLandscape,
}: RotateLandscapeGuardProps) {
  const [portraitMobile, setPortraitMobile] = useState(isPortraitTouchPhone);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => {
      const next = isPortraitTouchPhone();
      setPortraitMobile(next);
      if (!next) {
        setDismissed(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!active || !portraitMobile || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06090f]/95 p-6 safe-inset pointer-events-auto">
      <div className="w-full max-w-sm rounded-2xl bg-[#0e1420] border border-amber-400/45 p-6 text-center shadow-2xl space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-400">
          <RotateCw className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-white">
            {language === 'bn'
              ? 'ফোন কাত করে খেলুন (Landscape)'
              : 'Rotate Phone to Landscape'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {language === 'bn'
              ? 'GTA ঢাকা ফুলস্ক্রিন ল্যান্ডস্কেপ মোডে খেলার জন্য তৈরি। ফোনটি আড়াআড়ি ঘোরান বা নিচের বাটনে ট্যাপ করুন।'
              : 'GTA Dhaka is built for fullscreen horizontal gameplay. Turn your phone sideways or tap below to lock landscape.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onRequestLandscape}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-sm cursor-pointer shadow-lg"
          >
            <Maximize2 className="w-4 h-4" />
            <span>
              {language === 'bn' ? 'ল্যান্ডস্কেপ ফুলস্ক্রিন চালু করুন' : 'Lock Landscape Fullscreen'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-slate-300 font-display font-semibold text-xs cursor-pointer"
          >
            {language === 'bn' ? 'এভাবেই চালিয়ে যান' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
