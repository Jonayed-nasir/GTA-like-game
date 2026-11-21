import { useState } from 'react';
import { Backpack, Car, Check, Heart, Shirt, X } from 'lucide-react';
import { PlayerProgressionSnapshot } from '../core/Game';
import { TRANSLATIONS } from '../i18n/translations';
import { Language } from '../types/game';

interface InventoryModalProps {
  playerData: PlayerProgressionSnapshot;
  language: Language;
  onUseItem: (itemId: string) => void;
  onEquipOutfit: (outfitId: string) => void;
  onSummonVehicle: (ownedId: string) => void;
  onClose: () => void;
}

export function InventoryModal({
  playerData,
  language,
  onUseItem,
  onEquipOutfit,
  onSummonVehicle,
  onClose,
}: InventoryModalProps) {
  const t = TRANSLATIONS[language];
  const [tab, setTab] = useState<'items' | 'outfits' | 'vehicles'>('items');

  const consumables = playerData.inventory.filter((it) => it.category !== 'clothing');
  const outfits = playerData.inventory.filter((it) => it.category === 'clothing' && it.outfitId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/86 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0e1420] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-3 sm:py-4 bg-[#090d16] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Backpack className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">{t.inventory}</h2>
              <div className="text-xs text-slate-400">
                ৳ {playerData.money.toLocaleString()} · HP {playerData.health}%
              </div>
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

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-2.5 sm:p-3 bg-[#0b101b] border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setTab('items')}
            className={`py-2 rounded-lg text-xs font-display font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'items'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{t.items}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('outfits')}
            className={`py-2 rounded-lg text-xs font-display font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'outfits'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>{t.outfits}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('vehicles')}
            className={`py-2 rounded-lg text-xs font-display font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'vehicles'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>{t.myVehicles}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-3.5 sm:p-4 overflow-y-auto modal-scroll space-y-2.5">
          {tab === 'items' && (
            <>
              {consumables.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">{t.emptyInventory}</p>
              ) : (
                consumables.map((it) => (
                  <div
                    key={it.id}
                    className="p-3.5 rounded-xl bg-[#131b2b] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-white truncate">
                          {language === 'bn' ? it.nameBn : it.nameEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-display text-amber-300">
                          ×{it.quantity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'bn' ? it.descriptionBn : it.descriptionEn}
                      </p>
                    </div>
                    {it.healAmount && (
                      <button
                        type="button"
                        onClick={() => onUseItem(it.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs shrink-0 cursor-pointer"
                      >
                        {t.useItem}
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'outfits' && (
            <div className="space-y-2.5">
              {outfits.map((o) => {
                const isEquipped = playerData.appearance.outfitId === o.outfitId;
                return (
                  <div
                    key={o.id}
                    className="p-3.5 rounded-xl bg-[#131b2b] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-white">
                        {language === 'bn' ? o.nameBn : o.nameEn}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'bn' ? o.descriptionBn : o.descriptionEn}
                      </p>
                    </div>
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-display font-bold shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        {t.equipped}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => o.outfitId && onEquipOutfit(o.outfitId)}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs shrink-0 cursor-pointer"
                      >
                        {t.equip}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'vehicles' && (
            <div className="space-y-2.5">
              {playerData.ownedVehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl bg-[#131b2b] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-8 h-8 rounded-lg border border-white/25 shrink-0"
                      style={{
                        backgroundColor: `#${v.paintHex.toString(16).padStart(6, '0')}`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-white truncate">
                        {language === 'bn' ? v.nameBn : v.nameEn}
                      </div>
                      <div className="text-xs text-slate-400">
                        {v.kind.toUpperCase()} · Engine Lv.{v.engineLevel}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSummonVehicle(v.id);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-xs shrink-0 cursor-pointer"
                  >
                    {t.deliverVehicle}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
