import { useState } from 'react';
import {
  Banknote,
  Car,
  Check,
  Heart,
  Palette,
  Save,
  Shirt,
  ShoppingBag,
  Skull,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { PlayerProgressionSnapshot } from '../core/Game';
import { GARAGE_PAINT_SWATCHES, SHOP_CATALOGS } from '../data/shops';
import { TRANSLATIONS } from '../i18n/translations';
import { EnterableBuildingDef, Language } from '../types/game';

interface ShopModalProps {
  building: EnterableBuildingDef;
  playerData: PlayerProgressionSnapshot;
  language: Language;
  onBuyItem: (buildingId: string, itemId: string) => boolean;
  onPreviewOutfit: (outfitId: string) => void;
  onEquipOutfit: (outfitId: string) => void;
  onGarageAction: (action: 'repair' | 'paint' | 'upgrade' | 'save', paintHex?: number) => boolean;
  onSellVehicle: () => boolean;
  onRobShop: (buildingId: string) => boolean;
  onClose: () => void;
}

export function ShopModal({
  building,
  playerData,
  language,
  onBuyItem,
  onPreviewOutfit,
  onEquipOutfit,
  onGarageAction,
  onSellVehicle,
  onRobShop,
  onClose,
}: ShopModalProps) {
  const t = TRANSLATIONS[language];
  const [busy, setBusy] = useState(false);
  const [previewedOutfitId, setPreviewedOutfitId] = useState<string | null>(null);

  const runGuarded = (fn: () => void) => {
    if (busy) return;
    setBusy(true);
    fn();
    window.setTimeout(() => setBusy(false), 300);
  };

  const catalog = SHOP_CATALOGS[building.category] ?? [];
  const bldgName = language === 'bn' ? building.nameBn : building.nameEn;
  const hostName = language === 'bn' ? building.shopKeeperNameBn : building.shopKeeperNameEn;
  const greeting = language === 'bn' ? building.greetingBn : building.greetingEn;

  const ownsGarage = playerData.ownedPropertyIds.includes('prop_banani_garage');
  const canRobRegister =
    !building.isGarage &&
    !building.isDealership &&
    !building.isHospital &&
    !building.isSafeHouse &&
    !building.isSpecOpsHq;
  const robCooldown = Math.ceil(playerData.shopRobCooldownSec[building.id] ?? 0);

  const isOwnedUnique = (itemId: string) =>
    playerData.inventory.some((inv) => inv.id === itemId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/86 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0e1420] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-3 sm:py-4 border-b border-white/10 bg-[#090d16] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {building.isGarage ? (
                <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
              ) : building.isDealership ? (
                <Car className="w-5 h-5 text-rose-400 shrink-0" />
              ) : building.category === 'clothing' ? (
                <Shirt className="w-5 h-5 text-purple-400 shrink-0" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                {bldgName}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {hostName}: “{greeting}”
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 font-display text-sm font-bold text-emerald-400 tabular-nums">
              ৳ {playerData.money.toLocaleString()}
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
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto modal-scroll space-y-4">
          {/* GTA Stick-Up: Rob Shop Cash Register Bar */}
          {canRobRegister && (
            <div className="p-3 rounded-xl bg-rose-950/55 border border-rose-500/45 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Skull className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-display text-xs sm:text-sm font-bold text-rose-200">
                    {t.robRegister}
                  </div>
                  <div className="text-[11px] text-rose-200/80">
                    ৳ 3,200–5,700 · +70 RP · 2★
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={busy || robCooldown > 0}
                onClick={() =>
                  runGuarded(() => {
                    const ok = onRobShop(building.id);
                    if (ok) onClose();
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-display font-bold text-xs cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>{robCooldown > 0 ? `${robCooldown}s` : t.robRegister}</span>
              </button>
            </div>
          )}

          {building.isGarage ? (
            <div className="space-y-4">
              {playerData.garageTargetVehicle ? (
                <>
                  {/* Active Garage Vehicle Card */}
                  <div className="p-4 rounded-xl bg-[#090d16] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-base font-bold text-white">
                        {language === 'bn'
                          ? playerData.garageTargetVehicle.nameBn
                          : playerData.garageTargetVehicle.nameEn}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-emerald-400" />
                          {playerData.garageTargetVehicle.health}%
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Lv.{playerData.garageTargetVehicle.engineLevel}/3
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runGuarded(() => onGarageAction('save'))}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{t.saveVehicle}</span>
                    </button>
                  </div>

                  {/* GTA Chop-Shop Stolen Car Resale Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/45 border border-emerald-400/45 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-display text-sm font-bold text-emerald-200">
                          {t.sellStolenCar}
                        </div>
                        <div className="text-[11px] text-emerald-300/80">
                          +85 RP {ownsGarage ? '· +25% Owner Bonus' : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runGuarded(() => {
                          const sold = onSellVehicle();
                          if (sold) onClose();
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-display font-bold text-xs cursor-pointer tabular-nums"
                    >
                      +৳ {playerData.garageTargetVehicle.chopShopPrice.toLocaleString()}
                    </button>
                  </div>

                  {/* Repair & Engine Upgrade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={busy || playerData.garageTargetVehicle.health >= 100}
                      onClick={() => runGuarded(() => onGarageAction('repair'))}
                      className="p-4 rounded-xl bg-[#131b2b] hover:bg-[#1a253a] disabled:opacity-50 border border-white/10 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-display text-sm font-bold text-white flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-emerald-400" />
                          {t.repairVehicle}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">100% HP</div>
                      </div>
                      <span
                        className={`font-display text-sm font-bold whitespace-nowrap ${
                          ownsGarage ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {ownsGarage ? t.freePerk : '৳ 500'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={busy || playerData.garageTargetVehicle.engineLevel >= 3}
                      onClick={() => runGuarded(() => onGarageAction('upgrade'))}
                      className="p-4 rounded-xl bg-[#131b2b] hover:bg-[#1a253a] disabled:opacity-50 border border-white/10 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-display text-sm font-bold text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          {t.upgradeEngine}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {playerData.garageTargetVehicle.engineLevel >= 3
                            ? 'MAX'
                            : `Stage ${playerData.garageTargetVehicle.engineLevel + 1}`}
                        </div>
                      </div>
                      <span className="font-display text-sm font-bold text-amber-400 whitespace-nowrap">
                        {playerData.garageTargetVehicle.engineLevel >= 3
                          ? 'MAX'
                          : `৳ ${(playerData.garageTargetVehicle.engineLevel === 1 ? 2500 : 4500).toLocaleString()}`}
                      </span>
                    </button>
                  </div>

                  {/* Custom Paint Swatches */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <Palette className="w-4 h-4 text-amber-400" />
                      {t.paintVehicle}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {GARAGE_PAINT_SWATCHES.map((sw) => {
                        const isCurrent = playerData.garageTargetVehicle?.paintHex === sw.hex;
                        return (
                          <button
                            key={sw.hex}
                            type="button"
                            disabled={busy || isCurrent}
                            onClick={() => runGuarded(() => onGarageAction('paint', sw.hex))}
                            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-500/15 border-amber-400'
                                : 'bg-[#131b2b] hover:bg-[#1b273d] border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded border border-white/30 shrink-0"
                                style={{
                                  backgroundColor: `#${sw.hex.toString(16).padStart(6, '0')}`,
                                }}
                              />
                              <span className="text-xs font-semibold text-white truncate">
                                {language === 'bn' ? sw.nameBn : sw.nameEn}
                              </span>
                            </div>
                            <div
                              className={`text-[11px] font-display mt-1.5 ${
                                ownsGarage && !isCurrent ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {isCurrent
                                ? t.equipped
                                : ownsGarage
                                  ? t.freePerk
                                  : `৳ ${sw.price.toLocaleString()}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-sm text-slate-300">{t.noVehicleNearby}</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.map((item) => {
                const name = language === 'bn' ? item.nameBn : item.nameEn;
                const desc = language === 'bn' ? item.descriptionBn : item.descriptionEn;
                const isClothing = item.category === 'clothing' && item.outfit;
                const owned = (isClothing || item.category === 'electronics') && isOwnedUnique(item.id);
                const equipped =
                  isClothing && playerData.appearance.outfitId === item.outfit?.outfitId;
                const canAfford = playerData.money >= item.price;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#131b2b] border border-white/10 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-bold text-white leading-snug">
                          {name}
                        </h3>
                        <span className="font-display text-sm font-bold text-amber-400 whitespace-nowrap">
                          ৳ {item.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>

                      {item.topSpeedKmh && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 text-[11px] font-display text-sky-300">
                          {item.topSpeedKmh} {t.kmh}
                        </div>
                      )}
                      {item.healAmount && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 text-[11px] font-semibold text-emerald-300">
                          <Heart className="w-3 h-3" />+{item.healAmount} HP
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isClothing && item.outfit && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewedOutfitId(item.outfit!.outfitId);
                            onPreviewOutfit(item.outfit!.outfitId);
                          }}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                            previewedOutfitId === item.outfit.outfitId
                              ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                              : 'bg-white/5 hover:bg-white/15 border-white/15 text-slate-200'
                          }`}
                        >
                          {t.tryOn}
                        </button>
                      )}

                      {equipped ? (
                        <div className="flex-1 py-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-display font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {t.equipped}
                        </div>
                      ) : owned && isClothing && item.outfit ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => runGuarded(() => onEquipOutfit(item.outfit!.outfitId))}
                          className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-bold cursor-pointer"
                        >
                          {t.equip}
                        </button>
                      ) : owned ? (
                        <div className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-display font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {t.owned}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !canAfford}
                          onClick={() => runGuarded(() => onBuyItem(building.id, item.id))}
                          className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-display font-bold cursor-pointer"
                        >
                          {t.buy}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
