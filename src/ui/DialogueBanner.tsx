import { MessageSquare, X } from 'lucide-react';
import { Language, NpcDialogueSnapshot } from '../types/game';

interface DialogueBannerProps {
  dialogue: NpcDialogueSnapshot;
  language: Language;
  onDismiss: () => void;
}

export function DialogueBanner({ dialogue, language, onDismiss }: DialogueBannerProps) {
  const name = language === 'bn' ? dialogue.nameBn : dialogue.nameEn;
  const role = language === 'bn' ? dialogue.roleBn : dialogue.roleEn;
  const line = language === 'bn' ? dialogue.lineBn : dialogue.lineEn;

  const accentBorder =
    dialogue.mood === 'alert'
      ? 'border-rose-500/60'
      : dialogue.mood === 'shopkeeper'
        ? 'border-emerald-400/50'
        : 'border-amber-400/50';

  return (
    <div className="fixed bottom-24 landscape:bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[90vw] landscape:w-[min(440px,54vw)] max-w-lg pointer-events-auto">
      <div
        className={`rounded-xl bg-[#0b101a]/95 border ${accentBorder} px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-2xl flex items-start gap-2.5 sm:gap-3`}
      >
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare
            className={`w-4 h-4 ${
              dialogue.mood === 'alert' ? 'text-rose-400' : 'text-amber-400'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs sm:text-sm font-bold text-white">{name}</span>
            <span className="text-[11px] text-slate-400">· {role}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-snug">{line}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close dialogue"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
