import { useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types/game';

interface PWAInstallButtonProps {
  language: Language;
  compact?: boolean;
}

export function PWAInstallButton({ language, compact = false }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const runningInsideApk =
    typeof window !== 'undefined' &&
    window.location.hostname === '127.0.0.1' &&
    window.location.port !== '3000';

  if (runningInsideApk) {
    return null;
  }

  if (isInstalled) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-display font-bold ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-xs sm:text-sm'
        }`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{language === 'bn' ? 'অ্যাপ ইনস্টল আছে (অফলাইন)' : 'App Installed (Offline Ready)'}</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <div className="inline-flex flex-wrap items-center gap-2">
        <a
          href="/GTA-Dhaka.apk"
          download="GTA-Dhaka.apk"
          className={`inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-display font-bold transition-all cursor-pointer shadow-lg ${
            compact ? 'px-3.5 py-2 text-xs' : 'px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm'
          }`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{language === 'bn' ? 'APK ডাউনলোড (.apk)' : 'Download APK (.apk)'}</span>
        </a>

        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 rounded-lg bg-[#0d1626]/95 hover:bg-[#16233a] active:scale-[0.98] border border-cyan-400/55 text-cyan-200 font-display font-bold transition-all cursor-pointer shadow-lg ${
            compact ? 'px-3.5 py-2 text-xs' : 'px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {language === 'bn'
              ? canInstall
                ? '১-ট্যাপ ইনস্টল'
                : 'ইনস্টল গাইড'
              : canInstall
                ? '1-Tap Install'
                : 'Install Guide'}
          </span>
        </button>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06090f]/90 p-3 sm:p-4 safe-inset pointer-events-auto">
          <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto modal-scroll rounded-xl bg-[#0e1420] border border-cyan-400/40 p-4 sm:p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/45 flex items-center justify-center text-cyan-300">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    {language === 'bn' ? 'GTA ঢাকা মোবাইল অ্যাপ ইনস্টল' : 'Install GTA Dhaka App'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'ফুলস্ক্রিন ল্যান্ডস্কেপ + অফলাইন সাপোর্ট'
                      : 'Fullscreen Landscape + Offline Support'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-200">
              {isIOS ? (
                <>
                  <p className="flex items-center gap-2 p-2.5 rounded-lg bg-[#131b2b] border border-white/10">
                    <Share className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      {language === 'bn'
                        ? '১. Safari ব্রাউজারের নিচে Share আইকনে ট্যাপ করুন।'
                        : '1. Tap the Share button in Safari.'}
                    </span>
                  </p>
                  <p className="p-2.5 rounded-lg bg-[#131b2b] border border-white/10">
                    {language === 'bn'
                      ? '২. "Add to Home Screen" সিলেক্ট করে Add চাপুন — হোম স্ক্রিনে ফুলস্ক্রিন গেম আইকন যুক্ত হয়ে যাবে।'
                      : '2. Select "Add to Home Screen" and tap Add to launch fullscreen like a native game.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="p-2.5 rounded-lg bg-[#131b2b] border border-white/10">
                    {language === 'bn'
                      ? '১. Android Chrome-এ ব্রাউজারের উপরের ⋮ মেনুতে ট্যাপ করুন।'
                      : '1. Open this game in Android Chrome and tap the ⋮ browser menu.'}
                  </p>
                  <p className="p-2.5 rounded-lg bg-[#131b2b] border border-white/10">
                    {language === 'bn'
                      ? '২. "Install app" বা "Add to Home screen" ট্যাপ করুন — একবার ইনস্টল হলে অফলাইনে ল্যান্ডস্কেপ ফুলস্ক্রিনে খেলতে পারবেন!'
                      : '2. Tap "Install app" or "Add to Home screen" — launches fullscreen in landscape with offline caching!'}
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বুঝেছি' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator({ language }: { language: Language }) {
  const isOnline = useOnlineStatus();
  const runningInsideApk =
    typeof window !== 'undefined' &&
    window.location.hostname === '127.0.0.1' &&
    window.location.port !== '3000';
  if (isOnline || runningInsideApk) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-display font-bold text-[11px] shadow-xl border border-amber-200">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {language === 'bn' ? 'অফলাইন মোড চালু · গেম প্লে সচল' : 'Offline Mode · Cached Gameplay Active'}
      </span>
    </div>
  );
}
