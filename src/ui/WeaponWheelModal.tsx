import { Crosshair, RefreshCw, ShieldCheck, X, Zap } from 'lucide-react';
import { WEAPON_CATALOG, WeaponAmmoState, WEAPON_ORDER } from '../data/weapons';
import { TRANSLATIONS } from '../i18n/translations';
import { Language, WeaponId } from '../types/game';

interface WeaponWheelModalProps {
  equippedWeapon: WeaponId;
  ammo: Record<WeaponId, WeaponAmmoState>;
  money: number;
  language: Language;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onRefillAmmo: () => void;
  onClose: () => void;
}

export function WeaponWheelModal({
  equippedWeapon,
  ammo,
  money,
  language,
  onSelectWeapon,
  onRefillAmmo,
  onClose,
}: WeaponWheelModalProps) {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/86 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0e1420] border border-amber-400/35 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-[#090d16] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                {t.weaponWheel}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'অস্ত্র বাছাই করুন · মাউস হুইল বা Q দিয়ে দ্রুত বদলান'
                  : 'Select weapon · Press Q or Scroll Wheel to quick-switch'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-Slot GTA Weapon Grid */}
        <div className="flex-1 min-h-0 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 overflow-y-auto modal-scroll">
          {WEAPON_ORDER.map((wId) => {
            const def = WEAPON_CATALOG[wId];
            const st = ammo[wId];
            const isActive = equippedWeapon === wId;
            const dmgPct = Math.min(100, Math.round((def.damage * def.pellets) / 1.55));
            const rangePct = Math.min(100, Math.round((def.range / 150) * 100));

            return (
              <button
                key={wId}
                type="button"
                onClick={() => {
                  onSelectWeapon(wId);
                  onClose();
                }}
                className={`text-left p-3 sm:p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'bg-amber-500/18 border-amber-400 shadow-lg'
                    : 'bg-[#131b2b] hover:bg-[#1a253a] border-white/12'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-display font-bold uppercase ${
                        isActive
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {language === 'bn' ? def.shortBn : def.shortEn}
                    </span>
                    {def.driveByAllowed && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-display font-bold uppercase">
                        {t.driveBy}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 font-display text-sm font-bold text-white leading-tight">
                    {language === 'bn' ? def.nameBn : def.nameEn}
                  </div>

                  <div className="mt-1 font-display text-xs font-bold tabular-nums text-amber-300">
                    {def.magSize > 0 ? `${st.mag} / ${st.reserve}` : '∞ MELEE'}
                  </div>
                </div>

                {/* Compact Power & Range Bars */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{t.damageLabel}</span>
                      <span className="tabular-nums text-slate-200">
                        {def.damage}
                        {def.pellets > 1 ? `×${def.pellets}` : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: `${dmgPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{t.rangeLabel}</span>
                      <span className="tabular-nums text-slate-200">{def.range}m</span>
                    </div>
                    <div className="mt-0.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-400" style={{ width: `${rangePct}%` }} />
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-amber-300 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t.equipped}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer: Refill Ammo Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#090d16] border-t border-white/10 shrink-0">
          <div className="font-display text-sm font-bold text-emerald-400 tabular-nums">
            ৳ {money.toLocaleString()}
          </div>

          <button
            type="button"
            onClick={onRefillAmmo}
            disabled={money < 1200}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refillAmmo}</span>
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
