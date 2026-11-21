import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  RotateCcw,
  Shield,
  Shirt,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { PlayerProgressionSnapshot } from '../core/Game';
import { DIFFICULTY_MODIFIERS } from '../data/missions';
import { SPEC_OPS_OUTFITS, SPECIAL_OPS_MISSIONS } from '../data/specialOps';
import { TRANSLATIONS } from '../i18n/translations';
import {
  ActiveMissionSnapshot,
  Language,
  MissionDifficulty,
  MissionRank,
} from '../types/game';

interface SpecialOpsModalProps {
  initialTab?: 'ops' | 'armory' | 'results';
  language: Language;
  activeMission: ActiveMissionSnapshot | null;
  playerData: PlayerProgressionSnapshot;
  squadActive: boolean;
  onStartMission: (missionId: string, difficulty: MissionDifficulty) => void;
  onCancelMission: () => void;
  onToggleSquad: () => void;
  onEquipSpecOpsOutfit: (outfitId: string) => void;
  onPreviewOutfit: (outfitId: string) => void;
  onClose: () => void;
}

const RANK_STYLE: Record<MissionRank, string> = {
  PLATINUM: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/60',
  GOLD: 'bg-amber-400/20 text-amber-200 border-amber-400/60',
  SILVER: 'bg-slate-300/20 text-slate-200 border-slate-300/50',
  BRONZE: 'bg-orange-500/20 text-orange-200 border-orange-400/50',
};

const DIFFICULTIES: MissionDifficulty[] = ['EASY', 'NORMAL', 'HARD'];

export function SpecialOpsModal({
  initialTab = 'ops',
  language,
  activeMission,
  playerData,
  squadActive,
  onStartMission,
  onCancelMission,
  onToggleSquad,
  onEquipSpecOpsOutfit,
  onPreviewOutfit,
  onClose,
}: SpecialOpsModalProps) {
  const t = TRANSLATIONS[language];
  const [tab, setTab] = useState<'ops' | 'armory' | 'results'>(initialTab);
  const [difficulty, setDifficulty] = useState<MissionDifficulty>('NORMAL');
  const diffMod = DIFFICULTY_MODIFIERS[difficulty];

  const completedSpecOpsCount = SPECIAL_OPS_MISSIONS.filter((m) =>
    playerData.completedMissionIds.includes(m.id)
  ).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/86 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-3xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0c1322] border border-sky-400/35 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-[#080e1a] border-b border-sky-400/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                {t.specOpsHq}
              </h2>
              <p className="text-[11px] text-sky-300/90 truncate">
                {completedSpecOpsCount}/{SPECIAL_OPS_MISSIONS.length} {t.completed} ·{' '}
                {playerData.completionPercentage}% {t.completionProgress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSquad}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 cursor-pointer border ${
                squadActive
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-sky-500/20 border-sky-400/50 text-sky-200 hover:bg-sky-500/30'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {squadActive
                  ? language === 'bn'
                    ? 'স্কোয়াড সক্রিয়'
                    : 'Squad Active'
                  : language === 'bn'
                    ? 'স্কোয়াড মোতায়েন'
                    : 'Deploy Squad'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 sm:px-4 py-2 bg-[#0a101d] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ops' as const, icon: Shield, label: t.specOpsTitle },
              { id: 'armory' as const, icon: Shirt, label: t.openArmory },
              { id: 'results' as const, icon: Trophy, label: t.hqResultsBoard },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {tab === 'ops' && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121c2f] border border-white/10">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-2.5 py-1 rounded text-[11px] font-display font-bold cursor-pointer ${
                    difficulty === d
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {language === 'bn'
                    ? DIFFICULTY_MODIFIERS[d].labelBn
                    : DIFFICULTY_MODIFIERS[d].labelEn}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-3.5 sm:p-4 overflow-y-auto modal-scroll space-y-3">
          {tab === 'ops' &&
            SPECIAL_OPS_MISSIONS.map((m, idx) => {
              const isActive = activeMission?.missionId === m.id;
              const history = playerData.missionHistory[m.id];
              const isCompleted = playerData.completedMissionIds.includes(m.id);
              const missingPrereqs = (m.prerequisites ?? []).filter(
                (req) => !playerData.completedMissionIds.includes(req)
              );
              const isLocked = missingPrereqs.length > 0;
              const scaledReward = Math.round(m.baseReward * diffMod.rewardMult);
              const scaledTime =
                m.baseTimeLimitSec > 0 ? Math.round(m.baseTimeLimitSec * diffMod.timeMult) : 0;

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-400/60'
                      : isLocked
                        ? 'bg-[#0f1626] border-white/10 opacity-75'
                        : 'bg-[#121b2e] border-white/12'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-[10px] font-display font-bold text-sky-300">
                          OP 0{idx + 1}
                        </span>
                        <h3 className="font-display text-sm sm:text-base font-bold text-white">
                          {language === 'bn' ? m.titleBn : m.titleEn}
                        </h3>
                        {history && (
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-display font-bold ${RANK_STYLE[history.bestRank]}`}
                          >
                            {history.bestRank}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {language === 'bn'
                          ? (m.briefingBn ?? m.descriptionBn)
                          : (m.briefingEn ?? m.descriptionEn)}
                      </p>
                      {m.optionalBonusEn && (
                        <div className="mt-1.5 text-[11px] text-amber-300/90 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {t.optionalBonus}:{' '}
                            {language === 'bn' ? m.optionalBonusBn : m.optionalBonusEn}
                          </span>
                        </div>
                      )}
                      {m.unlockRewardLabelEn && (
                        <div className="mt-1 text-[11px] text-cyan-300 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {language === 'bn' ? m.unlockRewardLabelBn : m.unlockRewardLabelEn}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-display text-sm font-bold text-emerald-400">
                        ৳ {scaledReward.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1 text-[11px] text-slate-400">
                        {scaledTime > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {scaledTime}s
                          </span>
                        )}
                        <span className="text-sky-300">{m.stages.length} Stages</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {isLocked
                        ? t.prerequisiteLocked
                        : language === 'bn'
                          ? m.giverBn
                          : m.giverEn}
                    </span>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={onCancelMission}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-display font-bold cursor-pointer"
                      >
                        {t.cancelMission}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          onStartMission(m.id, difficulty);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-display font-bold cursor-pointer"
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t.lockedReward}</span>
                          </>
                        ) : isCompleted ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t.replayMission}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{t.deployOperation}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab === 'armory' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(SPEC_OPS_OUTFITS).map((outfit) => {
                const locked =
                  Boolean(outfit.requiresUnlockId) &&
                  !playerData.unlockedSpecOpsRewards.includes(outfit.requiresUnlockId!);
                const equipped = playerData.appearance.outfitId === outfit.id;

                return (
                  <div
                    key={outfit.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      equipped
                        ? 'bg-sky-500/15 border-sky-400/60'
                        : 'bg-[#121b2e] border-white/12'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded border border-white/30"
                            style={{
                              backgroundColor: `#${outfit.appearance.jacketColor
                                .toString(16)
                                .padStart(6, '0')}`,
                            }}
                          />
                          <span
                            className="w-4 h-4 rounded border border-white/30"
                            style={{
                              backgroundColor: `#${outfit.appearance.shirtColor
                                .toString(16)
                                .padStart(6, '0')}`,
                            }}
                          />
                        </div>
                        {locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-amber-300">
                            <Lock className="w-3 h-3" />
                            {t.lockedReward}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-bold text-white mt-2">
                        {language === 'bn' ? outfit.nameBn : outfit.nameEn}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {language === 'bn' ? outfit.descBn : outfit.descEn}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => onPreviewOutfit(outfit.id)}
                          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                        >
                          {t.tryOn}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={locked || equipped}
                        onClick={() => onEquipSpecOpsOutfit(outfit.id)}
                        className="flex-1 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-300 text-slate-950 text-xs font-display font-bold cursor-pointer"
                      >
                        {equipped ? t.equipped : locked ? t.lockedReward : t.equip}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'results' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#121b2e] border border-white/10">
                  <div className="text-[11px] text-slate-400">{t.specOpsTitle}</div>
                  <div className="font-display text-lg font-bold text-sky-300">
                    {playerData.stats.specOpsCompleted}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#121b2e] border border-white/10">
                  <div className="text-[11px] text-slate-400">{t.civiliansSafe}</div>
                  <div className="font-display text-lg font-bold text-emerald-400">
                    {playerData.stats.civiliansProtected}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#121b2e] border border-white/10">
                  <div className="text-[11px] text-slate-400">{t.hostilesLeft}</div>
                  <div className="font-display text-lg font-bold text-rose-400">
                    {playerData.stats.hostilesNeutralized}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#121b2e] border border-white/10">
                  <div className="text-[11px] text-slate-400">{t.completionProgress}</div>
                  <div className="font-display text-lg font-bold text-amber-400">
                    {playerData.completionPercentage}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {SPECIAL_OPS_MISSIONS.map((m) => {
                  const h = playerData.missionHistory[m.id];
                  return (
                    <div
                      key={m.id}
                      className="px-3.5 py-2.5 rounded-xl bg-[#121b2e] border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-display font-bold text-white truncate">
                          {language === 'bn' ? m.titleBn : m.titleEn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {h
                            ? `${t.bestTime}: ${h.bestTimeSec}s · ${h.completions}x`
                            : language === 'bn'
                              ? 'এখনো সম্পন্ন হয়নি'
                              : 'Not completed yet'}
                        </div>
                      </div>
                      {h ? (
                        <span
                          className={`px-2.5 py-1 rounded-md border text-xs font-display font-bold inline-flex items-center gap-1 ${RANK_STYLE[h.bestRank]}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {h.bestRank}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
