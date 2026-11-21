import { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  PhoneCall,
  Play,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { DIFFICULTY_MODIFIERS } from '../data/missions';
import { TRANSLATIONS } from '../i18n/translations';
import { getAllMissionsCatalog } from '../missions/MissionManager';
import {
  ActiveMissionSnapshot,
  Language,
  MissionCategory,
  MissionDef,
  MissionDifficulty,
  MissionHistoryEntry,
  MissionRank,
} from '../types/game';

interface MissionModalProps {
  activeMission: ActiveMissionSnapshot | null;
  completedMissionIds: string[];
  missionHistory: Record<string, MissionHistoryEntry>;
  cooldownsSec: Record<string, number>;
  completionPercentage: number;
  language: Language;
  onStartMission: (missionId: string, difficulty: MissionDifficulty) => void;
  onCancelMission: () => void;
  onClose: () => void;
}

const SIDE_CATEGORIES: Array<{ id: 'all' | MissionCategory; labelEn: string; labelBn: string }> = [
  { id: 'all', labelEn: 'All Side Jobs', labelBn: 'সব সাইড জব' },
  { id: 'spec_ops', labelEn: 'Spec Ops', labelBn: 'স্পেশাল অপস' },
  { id: 'activity', labelEn: 'Activities', labelBn: 'সাইড কাজ' },
  { id: 'driving', labelEn: 'Driving', labelBn: 'ড্রাইভিং' },
  { id: 'business', labelEn: 'Business', labelBn: 'ব্যবসা' },
  { id: 'story', labelEn: 'City Jobs', labelBn: 'সিটি জব' },
  { id: 'side', labelEn: 'Street', labelBn: 'স্ট্রিট' },
  { id: 'exploration', labelEn: 'Explore', labelBn: 'ভ্রমণ' },
  { id: 'police', labelEn: 'Chase', labelBn: 'পুলিশ' },
  { id: 'special', labelEn: 'Special', labelBn: 'স্পেশাল' },
];

const DIFFICULTIES: MissionDifficulty[] = ['EASY', 'NORMAL', 'HARD'];

const RANK_BADGE: Record<MissionRank, string> = {
  PLATINUM: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/60',
  GOLD: 'bg-amber-400/20 text-amber-200 border-amber-400/60',
  SILVER: 'bg-slate-300/20 text-slate-200 border-slate-300/50',
  BRONZE: 'bg-orange-500/20 text-orange-200 border-orange-400/50',
};

export function MissionModal({
  activeMission,
  completedMissionIds,
  missionHistory,
  cooldownsSec,
  completionPercentage,
  language,
  onStartMission,
  onCancelMission,
  onClose,
}: MissionModalProps) {
  const t = TRANSLATIONS[language];
  const [section, setSection] = useState<'campaign' | 'side'>('campaign');
  const [sideFilter, setSideFilter] = useState<'all' | MissionCategory>('all');
  const [difficulty, setDifficulty] = useState<MissionDifficulty>('NORMAL');

  const allMissions = getAllMissionsCatalog();
  const campaignMissions = allMissions
    .filter((m) => typeof m.chapterNumber === 'number')
    .sort((a, b) => (a.chapterNumber ?? 99) - (b.chapterNumber ?? 99));
  const sideMissions = allMissions.filter((m) => typeof m.chapterNumber !== 'number');

  const campaignClearedCount = campaignMissions.filter((m) =>
    completedMissionIds.includes(m.id)
  ).length;

  const diffMod = DIFFICULTY_MODIFIERS[difficulty];
  const list: MissionDef[] =
    section === 'campaign'
      ? campaignMissions
      : sideFilter === 'all'
        ? sideMissions
        : sideMissions.filter((m) => m.category === sideFilter);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090f]/86 p-2 sm:p-4 safe-inset pointer-events-auto">
      <div className="w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-xl bg-[#0e1420] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#090d16] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-tight">
                {t.missions}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {language === 'bn'
                  ? `স্টোরি ${campaignClearedCount}/${campaignMissions.length} · মোট ${completedMissionIds.length}/${allMissions.length} (${completionPercentage}%)`
                  : `Story ${campaignClearedCount}/${campaignMissions.length} · Total ${completedMissionIds.length}/${allMissions.length} (${completionPercentage}%)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Difficulty Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131b2b] border border-white/10">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-display font-bold cursor-pointer ${
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

            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Segmented Tabs: Story Campaign vs Free-Roam Side Jobs */}
        <div className="grid grid-cols-2 gap-2 px-3.5 sm:px-4 py-2 bg-[#0b101b] border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setSection('campaign')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-display font-bold transition-colors cursor-pointer ${
              section === 'campaign'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {language === 'bn' ? 'স্টোরি ক্যাম্পেইন (১-৬)' : 'Story Campaign (Ch 1-6)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSection('side')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-display font-bold transition-colors cursor-pointer ${
              section === 'side'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {language === 'bn' ? 'সাইড জব ও ফ্রি-রোম' : 'Side Jobs & Free-Roam'}
            </span>
          </button>
        </div>

        {/* Campaign Progress Banner OR Side-Job Filter Strip */}
        {section === 'campaign' ? (
          <div className="px-4 py-2.5 bg-[#120d17] border-b border-rose-500/20 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-xs font-bold text-rose-300 uppercase tracking-wider">
                {language === 'bn'
                  ? 'ঢাকা সিন্ডিকেটের উত্থান · ধারাবাহিক স্টোরি'
                  : 'Rise of the Dhaka Syndicate · Sequential Story'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {language === 'bn'
                  ? 'প্রতিটি অধ্যায় শেষ করলে পরের চ্যাপ্টার ও লাইভ রেডিও কল আনলক হবে।'
                  : 'Clear each chapter to unlock the next heist with live DhakaOS caller briefings.'}
              </div>
            </div>
            <div className="w-24 sm:w-32 shrink-0">
              <div className="flex justify-between text-[10px] font-display font-bold text-amber-300 mb-1">
                <span>CH</span>
                <span>
                  {campaignClearedCount}/{campaignMissions.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-200"
                  style={{
                    width: `${
                      campaignMissions.length > 0
                        ? Math.round((campaignClearedCount / campaignMissions.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#0b101b] border-b border-white/10 overflow-x-auto strip-scroll shrink-0">
            {SIDE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSideFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  sideFilter === c.id
                    ? c.id === 'spec_ops'
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {language === 'bn' ? c.labelBn : c.labelEn}
              </button>
            ))}
          </div>
        )}

        {/* Mission Cards */}
        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto modal-scroll space-y-2.5 sm:space-y-3">
          {list.map((m) => {
            const isActive = activeMission?.missionId === m.id;
            const isCompleted = completedMissionIds.includes(m.id);
            const history = missionHistory[m.id];
            const cooldown = cooldownsSec[m.id] ?? 0;
            const isLocked = (m.prerequisites ?? []).some(
              (req) => !completedMissionIds.includes(req)
            );
            const scaledReward = Math.round(m.baseReward * diffMod.rewardMult);
            const scaledTime =
              m.baseTimeLimitSec > 0 ? Math.round(m.baseTimeLimitSec * diffMod.timeMult) : 0;

            return (
              <div
                key={m.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-amber-500/12 border-amber-400/60'
                    : m.chapterNumber
                      ? isLocked
                        ? 'bg-[#121622] border-white/10 opacity-75'
                        : 'bg-[#1a111a] border-rose-500/35'
                      : m.category === 'spec_ops'
                        ? 'bg-[#101c2f] border-sky-400/25'
                        : 'bg-[#131b2b] border-white/10'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.chapterNumber ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[10px] font-display font-bold uppercase">
                          {language === 'bn' ? `অধ্যায় ${m.chapterNumber}` : `CHAPTER ${m.chapterNumber}`}
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase ${
                            m.category === 'spec_ops'
                              ? 'bg-sky-500/20 text-sky-300'
                              : m.category === 'activity'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-sky-300'
                          }`}
                        >
                          {m.category.replace('_', ' ')}
                        </span>
                      )}
                      <h3 className="font-display text-sm sm:text-base font-bold text-white">
                        {language === 'bn' ? m.titleBn : m.titleEn}
                      </h3>
                      {history ? (
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-display font-bold ${RANK_BADGE[history.bestRank]}`}
                        >
                          {history.bestRank}
                        </span>
                      ) : (
                        isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.completed}
                          </span>
                        )
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {language === 'bn' ? m.descriptionBn : m.descriptionEn}
                    </p>

                    {m.chapterNumber && m.briefingEn && !isLocked && (
                      <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/8 text-[11px] text-amber-100/90">
                        <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          <strong className="text-amber-300">
                            {language === 'bn' ? m.giverBn : m.giverEn}:
                          </strong>{' '}
                          “{language === 'bn' ? m.briefingBn : m.briefingEn}”
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-sm font-bold text-emerald-400 tabular-nums">
                      ৳ {scaledReward.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1 text-[11px] text-slate-400">
                      {scaledTime > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {scaledTime}s
                        </span>
                      )}
                      {m.initialWantedStars && (
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <ShieldAlert className="w-3 h-3" />
                          {m.initialWantedStars}★
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">
                    {isLocked
                      ? m.chapterNumber
                        ? language === 'bn'
                          ? `অধ্যায় ${m.chapterNumber - 1} শেষ করলে আনলক হবে`
                          : `Complete Chapter ${m.chapterNumber - 1} to unlock`
                        : t.prerequisiteLocked
                      : cooldown > 0
                        ? `${t.cooldownLabel}: ${cooldown}s`
                        : `${language === 'bn' ? m.giverBn : m.giverEn}${
                            m.callerRoleEn
                              ? ` · ${language === 'bn' ? m.callerRoleBn : m.callerRoleEn}`
                              : ''
                          } · ${m.stages.length} ${language === 'bn' ? 'ধাপ' : 'Stages'}`}
                  </span>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={onCancelMission}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-display font-bold cursor-pointer shrink-0"
                    >
                      {t.cancelMission}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLocked || cooldown > 0}
                      onClick={() => {
                        onStartMission(m.id, difficulty);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-display font-bold cursor-pointer shrink-0"
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t.lockedReward}</span>
                        </>
                      ) : cooldown > 0 ? (
                        <span>{cooldown}s</span>
                      ) : isCompleted ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.replayMission}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>{t.startMission}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
