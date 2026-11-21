import { Play } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Language } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';
import dhakaSkylineImg from '../assets/images/dhaka_skyline_backdrop_1795254861209.jpg';

interface StartScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onStart: () => void;
}

export function StartScreen({ language, onLanguageChange, onStart }: StartScreenProps) {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-3.5 sm:p-8 md:p-10 safe-inset bg-gradient-to-t from-[#070a10]/92 via-[#070a10]/38 to-[#070a10]/58 pointer-events-auto overflow-y-auto modal-scroll">
      {/* Top bar: Sector caption + Language switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="text-[11px] sm:text-xs font-medium tracking-wide text-slate-300 truncate max-w-[58vw]">
          {t.phaseBadge}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0d131f]/90 border border-white/15 shrink-0">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              language === 'en'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('bn')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap font-bangla cursor-pointer ${
              language === 'bn'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {/* Bottom focal lockup + bundled HD Dhaka Skyline showcase card (fits short landscape phones with zero scroll) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-5 mt-auto pt-2 sm:pt-4">
        <div className="max-w-xl min-w-0">
          <h1 className="font-display text-[clamp(1.75rem,6.8vw,3.75rem)] font-bold tracking-tight text-white leading-none">
            {t.gameTitle}
          </h1>
          <p className="mt-1 sm:mt-2 font-display text-[clamp(0.9rem,3.2vw,1.45rem)] font-semibold text-amber-400 tracking-wide">
            {t.gameSubtitle}
          </p>
          <p className="mt-1.5 sm:mt-3 text-[11px] sm:text-sm text-slate-200 max-w-md leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
            {t.objectiveText}
          </p>

          <div className="mt-3 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-xs sm:text-base tracking-wide transition-all cursor-pointer shadow-lg"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              <span>{t.playNow}</span>
            </button>
            <PWAInstallButton language={language} />
          </div>
        </div>

        {/* Bundled HD Dhaka 3.1 Edition Cover Art Card (guaranteed offline in APK & prod) */}
        <div className="hidden sm:block w-44 md:w-64 rounded-xl overflow-hidden border border-amber-400/35 bg-[#0b101a]/90 shadow-2xl shrink-0">
          <div className="relative aspect-video w-full overflow-hidden">
            <img
              src={dhakaSkylineImg}
              alt="GTA Dhaka 3.1 Skyline"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b101a] via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
              <span className="font-display text-[10px] md:text-[11px] font-bold text-amber-300 tracking-wider uppercase">
                EDITION 3.1
              </span>
              <span className="text-[9px] md:text-[10px] font-semibold text-cyan-300 truncate">
                HELI · BOAT · STUNTS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
