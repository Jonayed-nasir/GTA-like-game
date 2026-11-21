import { Compass, SkipForward } from 'lucide-react';
import { TUTORIAL_STEPS } from '../data/specialOps';
import { TRANSLATIONS } from '../i18n/translations';
import { Language, TutorialProgress } from '../types/game';

interface TutorialOverlayProps {
  language: Language;
  tutorial: TutorialProgress;
  onSkip: () => void;
}

export function TutorialOverlay({ language, tutorial, onSkip }: TutorialOverlayProps) {
  if (tutorial.completed || tutorial.skipped) return null;
  const step = TUTORIAL_STEPS[tutorial.stepIndex];
  if (!step) return null;

  const t = TRANSLATIONS[language];
  const progressPct = Math.round(((tutorial.stepIndex + 1) / TUTORIAL_STEPS.length) * 100);

  return (
    <div className="fixed bottom-3 sm:bottom-5 md:bottom-auto md:top-[82px] left-1/2 -translate-x-1/2 z-20 w-[min(320px,52vw)] sm:w-[88vw] max-w-sm pointer-events-none">
      <div className="pointer-events-auto rounded-xl bg-[#0b1322]/94 border border-cyan-400/45 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-display font-bold text-cyan-300 uppercase">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t.tutorialTitle} ({tutorial.stepIndex + 1}/{TUTORIAL_STEPS.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-slate-200 cursor-pointer"
          >
            <SkipForward className="w-3 h-3" />
            <span>{t.skipTutorial}</span>
          </button>
        </div>

        <div className="text-xs font-display font-bold text-white mt-1">
          {language === 'bn' ? step.titleBn : step.titleEn}
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
          {language === 'bn' ? step.descBn : step.descEn}
        </p>

        <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
