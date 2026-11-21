import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  Camera,
  Car,
  Check,
  CloudLightning,
  CloudRain,
  Crosshair,
  Crown,
  HeartPulse,
  History,
  Home,
  Lock,
  Navigation,
  Radio,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  Vault,
  X,
} from 'lucide-react';
import { PlayerProgressionSnapshot } from '../core/Game';
import { DHAKA_PROPERTIES, getNextMafiaRank, MAFIA_RANKS } from '../data/empire';
import { TRANSLATIONS } from '../i18n/translations';
import { getAllMissionsCatalog } from '../missions/MissionManager';
import {
  EmergencyAlert,
  GameSettings,
  MapMarker,
  MissionDifficulty,
  RadioStationId,
  SquadCommand,
  SquadMemberSnapshot,
  WeatherType,
} from '../types/game';

export type PhoneAppTab =
  | 'empire'
  | 'ops'
  | 'alerts'
  | 'squad'
  | 'history'
  | 'stats'
  | 'media'
  | 'gps'
  | 'ride'
  | 'services';

interface SmartphoneModalProps {
  initialTab?: PhoneAppTab;
  settings: GameSettings;
  playerData: PlayerProgressionSnapshot;
  currentWeather: WeatherType;
  wantedLevel: number;
  markers: MapMarker[];
  squadActive: boolean;
  squadCommand: SquadCommand;
  squadMembers: SquadMemberSnapshot[];
  emergencyAlerts: EmergencyAlert[];
  onSetRadio: (station: RadioStationId) => void;
  onSetWeather: (weather: WeatherType, auto: boolean) => void;
  onSetGps: (x: number, z: number, labelEn: string, labelBn: string) => void;
  onSummonVehicle: (ownedId: string) => void;
  onEmergencyService: (service: 'clear_wanted' | 'med_drop') => void;
  onEnterPhotoMode: () => void;
  onOpenSpecOps: () => void;
  onToggleSquad: () => void;
  onSetSquadCommand: (cmd: SquadCommand) => void;
  onStartMission: (missionId: string, difficulty: MissionDifficulty) => void;
  onBuyProperty: (propId: string) => boolean;
  onCollectEmpireCash: () => boolean;
  onUsePenthousePerk: (perk: 'clear_heat' | 'refill_ammo') => boolean;
  onClose: () => void;
}

export function SmartphoneModal({
  initialTab = 'empire',
  settings,
  playerData,
  currentWeather,
  wantedLevel,
  markers,
  squadActive,
  squadCommand,
  squadMembers,
  emergencyAlerts,
  onSetRadio,
  onSetWeather,
  onSetGps,
  onSummonVehicle,
  onEmergencyService,
  onEnterPhotoMode,
  onOpenSpecOps,
  onToggleSquad,
  onSetSquadCommand,
  onStartMission,
  onBuyProperty,
  onCollectEmpireCash,
  onUsePenthousePerk,
  onClose,
}: SmartphoneModalProps) {
  const lang = settings.language;
  const t = TRANSLATIONS[lang];
  const [tab, setTab] = useState<PhoneAppTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const catalog = getAllMissionsCatalog();
  const mafiaRank = MAFIA_RANKS[playerData.mafiaRankIndex] ?? MAFIA_RANKS[0];
  const nextRank = getNextMafiaRank(playerData.mafiaRep);
  const rankProgressPct = nextRank
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((playerData.mafiaRep - mafiaRank.minRep) /
              Math.max(1, nextRank.minRep - mafiaRank.minRep)) *
              100
          )
        )
      )
    : 100;
  const ownsPenthouse = playerData.ownedPropertyIds.includes('prop_gulshan_penthouse');

  const stations: Array<{ id: RadioStationId; label: string; tag: string }> = [
    { id: 'off', label: t.radioOff, tag: 'MUTE' },
    { id: 'lofi', label: t.radioLofi, tag: 'CHILL' },
    { id: 'synth', label: t.radioSynth, tag: 'NIGHT' },
    { id: 'street', label: t.radioStreet, tag: 'BEATS' },
  ];

  const weatherOptions: Array<{ id: WeatherType; label: string; icon: typeof Sun }> = [
    { id: 'clear', label: t.weatherClear, icon: Sun },
    { id: 'rain', label: t.weatherRain, icon: CloudRain },
    { id: 'storm', label: t.weatherStorm, icon: CloudLightning },
  ];

  const navApps: Array<{ id: PhoneAppTab; icon: typeof Radio; label: string }> = [
    { id: 'empire', icon: Crown, label: lang === 'bn' ? 'মাফিয়া' : 'Empire' },
    { id: 'ops', icon: Shield, label: lang === 'bn' ? 'অপস' : 'Ops' },
    { id: 'alerts', icon: AlertTriangle, label: lang === 'bn' ? 'অ্যালার্ট' : 'Alerts' },
    { id: 'squad', icon: Users, label: lang === 'bn' ? 'ক্রু' : 'Crew' },
    { id: 'ride', icon: Car, label: lang === 'bn' ? 'গাড়ি' : 'Ride' },
    { id: 'gps', icon: Navigation, label: 'GPS' },
    { id: 'stats', icon: BarChart3, label: lang === 'bn' ? 'তথ্য' : 'Stats' },
    { id: 'history', icon: History, label: lang === 'bn' ? 'লগ' : 'Log' },
    { id: 'media', icon: Radio, label: 'FM' },
    { id: 'services', icon: ShieldCheck, label: lang === 'bn' ? 'সেবা' : 'City' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/82 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-md max-h-[94dvh] flex flex-col rounded-2xl bg-[#0c121e] border-2 border-white/15 shadow-2xl overflow-hidden">
        {/* DhakaOS Top Status Bar */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#080c14] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-bold text-white truncate">
                {t.phoneTitle}
              </h2>
              <div className="text-[11px] font-display text-emerald-400 tabular-nums">
                ৳ {playerData.money.toLocaleString()} · HP {playerData.health}% ·{' '}
                <span style={{ color: mafiaRank.badgeColor }}>
                  {lang === 'bn' ? mafiaRank.titleBn : mafiaRank.titleEn}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable App Launcher Strip */}
        <div className="flex items-center gap-1 p-2 bg-[#0a0f19] border-b border-white/10 overflow-x-auto strip-scroll shrink-0">
          {navApps.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`min-w-[52px] py-1.5 px-2 rounded-lg text-[10px] font-display font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 ${
                  active
                    ? item.id === 'empire'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-cyan-500 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active App Content */}
        <div className="flex-1 min-h-0 p-3 sm:p-3.5 overflow-y-auto modal-scroll space-y-3">
          {tab === 'empire' && (
            <div className="space-y-3">
              {/* Mafia Rank & Progression Card */}
              <div className="p-3.5 rounded-xl bg-[#121a2a] border border-amber-400/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crown className="w-5 h-5 shrink-0" style={{ color: mafiaRank.badgeColor }} />
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-white truncate">
                        {lang === 'bn' ? mafiaRank.titleBn : mafiaRank.titleEn}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {playerData.mafiaRep} RP · {mafiaRank.incomeMult.toFixed(2)}x Income
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSetGps(-12.0, -34.0, 'Dhaka Central Bank Vault', 'ঢাকা সেন্ট্রাল ব্যাংক ভল্ট');
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-[10px] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Vault className="w-3.5 h-3.5" />
                    <span>{t.robBank}</span>
                  </button>
                </div>

                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${rankProgressPct}%` }}
                  />
                </div>
                {nextRank && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Next: {lang === 'bn' ? nextRank.titleBn : nextRank.titleEn}
                    </span>
                    <span className="tabular-nums">
                      {playerData.mafiaRep}/{nextRank.minRep} RP
                    </span>
                  </div>
                )}
              </div>

              {/* Empire Safe & Passive Cash Flow */}
              <div className="p-3.5 rounded-xl bg-emerald-950/45 border border-emerald-400/45 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-display font-bold text-emerald-300 uppercase">
                    {t.empireSafe}
                  </div>
                  <div className="font-display text-xl font-bold text-emerald-400 tabular-nums">
                    ৳ {playerData.empireVaultCash.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-200/80 tabular-nums">
                    +৳ {playerData.empireIncomePerMin.toLocaleString()}/min
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={playerData.empireVaultCash <= 0}
                    onClick={() => onCollectEmpireCash()}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-display font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>{t.collectCash}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleSquad}
                    className={`px-3 py-1.5 rounded-lg font-display font-bold text-[10px] inline-flex items-center justify-center gap-1 cursor-pointer ${
                      squadActive
                        ? 'bg-rose-600/85 hover:bg-rose-500 text-white'
                        : 'bg-sky-500/90 hover:bg-sky-400 text-slate-950'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{squadActive ? 'Recall Crew' : t.summonMafiaCrew}</span>
                  </button>
                </div>
              </div>

              {/* Penthouse VIP Perks (Unlocked when owning prop_gulshan_penthouse) */}
              {ownsPenthouse && (
                <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-400/45 space-y-2">
                  <div className="text-[11px] font-display font-bold text-amber-300 uppercase">
                    {t.penthousePerks}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={wantedLevel <= 0}
                      onClick={() => {
                        onUsePenthousePerk('clear_heat');
                        onClose();
                      }}
                      className="py-2 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-display font-bold text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.freePerk} Heat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUsePenthousePerk('refill_ammo');
                        onClose();
                      }}
                      className="py-2 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{t.freePerk} Ammo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dhaka Homes, Safehouses & Syndicate Properties */}
              <div className="space-y-2">
                <div className="text-xs font-display font-bold text-amber-300 uppercase">
                  {t.properties} ({playerData.ownedPropertyIds.length}/{DHAKA_PROPERTIES.length})
                </div>
                {DHAKA_PROPERTIES.map((prop) => {
                  const owned = playerData.ownedPropertyIds.includes(prop.id);
                  const rankLocked = playerData.mafiaRankIndex < prop.minMafiaRank;
                  const canAfford = playerData.money >= prop.price;
                  const reqRank = MAFIA_RANKS[prop.minMafiaRank];

                  return (
                    <div
                      key={prop.id}
                      className={`p-3 rounded-xl border space-y-2 ${
                        owned
                          ? 'bg-emerald-950/35 border-emerald-400/40'
                          : 'bg-[#121a2a] border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {prop.type === 'home' ? (
                            <Home className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-display text-xs font-bold text-white truncate">
                              {lang === 'bn' ? prop.nameBn : prop.nameEn}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                              {lang === 'bn' ? prop.perksBn : prop.perksEn}
                            </div>
                          </div>
                        </div>
                        <span className="font-display text-[11px] font-bold text-emerald-400 whitespace-nowrap tabular-nums">
                          +৳{prop.incomePerMin}/m
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSetGps(prop.x, prop.z, prop.nameEn, prop.nameBn);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/16 text-slate-200 text-[11px] font-display font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span>GPS</span>
                        </button>

                        {owned ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-display font-bold text-[11px] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.owned}</span>
                          </span>
                        ) : rankLocked ? (
                          <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-display font-bold text-[11px] inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{lang === 'bn' ? reqRank?.titleBn : reqRank?.titleEn}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onBuyProperty(prop.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-display font-bold text-[11px] cursor-pointer tabular-nums"
                          >
                            {t.buy} · ৳{prop.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'ops' && (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-sky-500/12 border border-sky-400/40">
                <div className="text-xs font-display font-bold text-sky-300 uppercase">
                  {t.specOpsHq}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {lang === 'bn'
                    ? 'স্পেশাল অপারেশনস কমান্ড টার্মিনাল খুলুন, ক্রু মোতায়েন করুন অথবা হেডকোয়ার্টারে GPS সেট করুন।'
                    : 'Open the Special Operations Command Terminal, deploy your 3-member tactical crew, or route GPS directly to HQ.'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSpecOps();
                    }}
                    className="py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
                  >
                    {t.openOpsTerminal}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetGps(38.0, 46.8, 'Dhaka Special Ops HQ', 'ঢাকা স্পেশাল অপস হেডকোয়ার্টার্স');
                      onClose();
                    }}
                    className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-xs cursor-pointer"
                  >
                    {lang === 'bn' ? 'HQ জিপিএস' : 'GPS to HQ'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#121a2a] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">{t.specOpsTitle}</div>
                  <div className="font-display text-lg font-bold text-sky-300 mt-0.5">
                    {playerData.stats.specOpsCompleted}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#121a2a] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">{t.sideActivities}</div>
                  <div className="font-display text-lg font-bold text-emerald-400 mt-0.5">
                    {playerData.stats.sideActivitiesCompleted}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="space-y-2">
              <div className="text-xs font-display font-bold text-amber-300 uppercase tracking-wider">
                {t.emergencyAlertsApp}
              </div>
              {emergencyAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border ${
                    a.severity === 'critical'
                      ? 'bg-rose-500/12 border-rose-400/45'
                      : a.severity === 'warning'
                        ? 'bg-amber-500/12 border-amber-400/45'
                        : 'bg-[#121a2a] border-white/10'
                  }`}
                >
                  <div className="text-xs font-display font-bold text-white">
                    {lang === 'bn' ? a.titleBn : a.titleEn}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'bn' ? a.districtBn : a.districtEn}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSetGps(a.x, a.z, a.titleEn, a.titleBn);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white cursor-pointer"
                    >
                      GPS
                    </button>
                    {a.linkedMissionId && (
                      <button
                        type="button"
                        onClick={() => {
                          onStartMission(a.linkedMissionId!, 'NORMAL');
                          onClose();
                        }}
                        className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-display font-bold cursor-pointer"
                      >
                        {t.respondAlert}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'squad' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-sky-300 uppercase">
                  {t.squadApp}
                </span>
                <button
                  type="button"
                  onClick={onToggleSquad}
                  className={`px-3 py-1 rounded-lg text-xs font-display font-bold cursor-pointer ${
                    squadActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                  }`}
                >
                  {squadActive
                    ? lang === 'bn'
                      ? 'স্কোয়াড ফিরিয়ে নিন'
                      : 'Recall Crew'
                    : lang === 'bn'
                      ? 'ক্রু ডাকুন'
                      : 'Deploy Crew'}
                </button>
              </div>

              <div className="space-y-1.5">
                {squadMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-[#121a2a] border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-display font-bold text-white">
                        {lang === 'bn' ? m.callsignBn : m.callsignEn}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lang === 'bn' ? m.roleBn : m.roleEn} ·{' '}
                        <span className="text-sky-300">
                          {lang === 'bn' ? m.statusBn : m.statusEn}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-display font-bold text-emerald-400 tabular-nums">
                      {m.health}%
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['follow', t.squadFollow],
                    ['hold', t.squadHold],
                    ['objective', t.squadObjective],
                    ['regroup', t.squadRegroup],
                    ['protect', t.squadProtect],
                  ] as Array<[SquadCommand, string]>
                ).map(([cmd, label]) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => onSetSquadCommand(cmd)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-display font-bold cursor-pointer ${
                      squadCommand === cmd
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-[#121a2a] text-slate-200 border border-white/10 hover:bg-[#1a263e]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              <div className="text-xs font-display font-bold text-amber-300 uppercase">
                {t.missionHistoryApp} ({playerData.completionPercentage}%)
              </div>
              {Object.keys(playerData.missionHistory).length === 0 ? (
                <div className="p-4 rounded-xl bg-[#121a2a] border border-white/10 text-xs text-slate-400 text-center">
                  {lang === 'bn'
                    ? 'এখনো কোনো মিশন ইতিহাস নেই। একটি মিশন সম্পন্ন করুন!'
                    : 'No completed missions recorded yet. Complete a mission to earn a Rank!'}
                </div>
              ) : (
                Object.values(playerData.missionHistory).map((entry) => {
                  const def = catalog.find((m) => m.id === entry.missionId);
                  return (
                    <div
                      key={entry.missionId}
                      className="p-3 rounded-xl bg-[#121a2a] border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-display font-bold text-white truncate">
                          {def ? (lang === 'bn' ? def.titleBn : def.titleEn) : entry.missionId}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {t.bestTime}: {entry.bestTimeSec}s · {entry.completions}x
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-200 font-display font-bold text-[10px]">
                        {entry.bestRank}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'stats' && (
            <div className="space-y-2">
              <div className="text-xs font-display font-bold text-cyan-300 uppercase">
                {t.playerStatsApp}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  [lang === 'bn' ? 'ব্যাংক লুট' : 'Banks Robbed', String(playerData.stats.banksRobbed ?? 0)],
                  [
                    lang === 'bn' ? 'দোকান লুট/ভাঙচুর' : 'Shops Hit',
                    String((playerData.stats.shopsRobbed ?? 0) + (playerData.stats.shopsSmashed ?? 0)),
                  ],
                  [lang === 'bn' ? 'গাড়ি ভাঙচুর' : 'Cars Smashed', String(playerData.stats.vehiclesSmashed ?? 0)],
                  [lang === 'bn' ? 'চপ-শপ বিক্রি' : 'Chop-Shop Sales', String(playerData.stats.vehiclesSoldChopShop ?? 0)],
                  [t.missions, String(playerData.stats.missionsCompleted)],
                  [lang === 'bn' ? 'নিয়ন্ত্রিত শত্রু' : 'Hostiles Down', String(playerData.stats.hostilesNeutralized)],
                  [lang === 'bn' ? 'মোট ড্রাইভিং' : 'Driven', `${playerData.stats.distanceDrivenKm.toFixed(1)} km`],
                  [lang === 'bn' ? 'মোট আয়' : 'Total Earned', `৳ ${playerData.stats.totalEarnedTaka.toLocaleString()}`],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="p-2.5 rounded-xl bg-[#121a2a] border border-white/10"
                  >
                    <div className="text-[10px] text-slate-400 truncate">{label}</div>
                    <div className="font-display text-sm font-bold text-white mt-0.5 tabular-nums">
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'media' && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-display font-bold text-cyan-300 uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  {t.radioFm}
                </div>
                <div className="space-y-1.5">
                  {stations.map((st) => {
                    const active = settings.radioStation === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSetRadio(st.id)}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
                          active
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-[#121a2a] border-white/10 text-slate-300 hover:bg-[#182338]'
                        }`}
                      >
                        <span className="text-xs font-semibold truncate">{st.label}</span>
                        <span
                          className={`text-[10px] font-display font-bold px-2 py-0.5 rounded ${
                            active ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {st.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-bold text-amber-300 uppercase">
                    {t.weather}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetWeather(currentWeather, !settings.weatherAuto)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-display font-bold border cursor-pointer ${
                      settings.weatherAuto
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-white/5 border-white/15 text-slate-400'
                    }`}
                  >
                    {t.weatherAuto}: {settings.weatherAuto ? t.on : t.off}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {weatherOptions.map((w) => {
                    const Icon = w.icon;
                    const active = currentWeather === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onSetWeather(w.id, false)}
                        className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                            : 'bg-[#121a2a] text-slate-200 border-white/10 hover:bg-[#1a253b]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate max-w-full">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'gps' && (
            <div className="space-y-2">
              <div className="text-xs font-display font-bold text-cyan-300 uppercase">
                {t.quickGps}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {markers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSetGps(m.x, m.z, m.labelEn, m.labelBn);
                      onClose();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#121a2a] hover:bg-[#1b2740] border border-white/10 flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-white truncate">
                      {lang === 'bn' ? m.labelBn : m.labelEn}
                    </span>
                    <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'ride' && (
            <div className="space-y-2">
              <div className="text-xs font-display font-bold text-amber-300 uppercase">
                {t.quickRide}
              </div>
              {playerData.ownedVehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-[#121a2a] border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg border border-white/25 shrink-0"
                      style={{
                        backgroundColor: `#${v.paintHex.toString(16).padStart(6, '0')}`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-display font-bold text-white truncate">
                        {lang === 'bn' ? v.nameBn : v.nameEn}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {v.kind.toUpperCase()} · Lv.{v.engineLevel}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSummonVehicle(v.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    {t.deliverVehicle}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'services' && (
            <div className="space-y-2.5">
              <div className="text-xs font-display font-bold text-rose-300 uppercase">
                {t.emergencyServices}
              </div>

              <button
                type="button"
                disabled={wantedLevel <= 0 || playerData.money < 1500}
                onClick={() => {
                  onEmergencyService('clear_wanted');
                  onClose();
                }}
                className="w-full p-3 rounded-xl bg-[#121a2a] hover:bg-[#1a2740] disabled:opacity-45 border border-sky-400/35 flex items-center gap-3 text-left cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-display font-bold text-white">
                    {t.clearWantedService}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {wantedLevel > 0
                      ? `${wantedLevel}★ Active Pursuit`
                      : lang === 'bn'
                        ? 'বর্তমানে কোনো পুলিশ ধাওয়া নেই'
                        : 'No active police heat'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={playerData.money < 400}
                onClick={() => {
                  onEmergencyService('med_drop');
                  onClose();
                }}
                className="w-full p-3 rounded-xl bg-[#121a2a] hover:bg-[#1a2740] disabled:opacity-45 border border-emerald-400/35 flex items-center gap-3 text-left cursor-pointer"
              >
                <HeartPulse className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-display font-bold text-white">
                    {t.medDropService}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? 'তাৎক্ষণিক স্বাস্থ্য ও ১০০% স্ট্যামিনা'
                      : 'Instant +50 HP & full Stamina'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterPhotoMode();
                }}
                className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 font-display font-bold text-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{t.photoMode}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
