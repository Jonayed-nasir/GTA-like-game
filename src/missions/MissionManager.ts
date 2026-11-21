import { GTA_CLASSIC_MISSIONS } from '../data/gtaMissions';
import { DIFFICULTY_MODIFIERS, MISSION_DATABASE } from '../data/missions';
import { SIDE_ACTIVITY_MISSIONS, SPECIAL_OPS_MISSIONS } from '../data/specialOps';
import {
  ActiveMissionSnapshot,
  MissionDef,
  MissionDifficulty,
  MissionHistoryEntry,
  MissionRank,
  MissionResultBanner,
} from '../types/game';

export interface EncounterRuntimeStatus {
  civiliansSafe: number;
  civiliansTotal: number;
  civiliansHarmed: number;
  civiliansAtExtract: boolean;
  hostilesRemaining: number;
  hostilesTotal: number;
  cluesFound: number;
  cluesTotal: number;
}

export interface MissionRuntimeUpdate {
  stageAdvanced: boolean;
  newStageIndex: number;
  completedMission: {
    mission: MissionDef;
    reward: number;
    rank: MissionRank;
    firstClear: boolean;
    completionTimeSec: number;
    civiliansSafe: number;
    optionalCompleted: boolean;
  } | null;
  failedMission: { mission: MissionDef; reasonEn: string; reasonBn: string } | null;
}

const RANK_SCORE: Record<MissionRank, number> = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
};

export function getAllMissionsCatalog(): MissionDef[] {
  return [
    ...GTA_CLASSIC_MISSIONS,
    ...MISSION_DATABASE,
    ...SPECIAL_OPS_MISSIONS,
    ...SIDE_ACTIVITY_MISSIONS,
  ];
}

export class MissionManager {
  public completedIds = new Set<string>();
  public missionHistory: Record<string, MissionHistoryEntry> = {};
  public claimedRewardIds = new Set<string>();
  public activityCooldownUntil: Record<string, number> = {};

  public activeMission: MissionDef | null = null;
  public activeDifficulty: MissionDifficulty = 'NORMAL';
  public stageIndex = 0;
  public timeRemainingSec: number | null = null;
  public elapsedSec = 0;
  public playerDamageTaken = 0;
  public civiliansHarmedTotal = 0;
  public lastResult: MissionResultBanner | null = null;
  public lastMissionId: string | null = null;
  public lastDifficulty: MissionDifficulty = 'NORMAL';

  public loadProgression(
    ids: string[],
    history: Record<string, MissionHistoryEntry>,
    claimedIds: string[]
  ): void {
    this.completedIds = new Set(ids);
    this.missionHistory = { ...history };
    this.claimedRewardIds = new Set(claimedIds);
  }

  public loadCompleted(ids: string[]): void {
    this.completedIds = new Set(ids);
  }

  public getCompletedArray(): string[] {
    return Array.from(this.completedIds);
  }

  public getClaimedRewardsArray(): string[] {
    return Array.from(this.claimedRewardIds);
  }

  public getMissionById(id: string): MissionDef | undefined {
    return getAllMissionsCatalog().find((m) => m.id === id);
  }

  public isMissionUnlocked(missionId: string): boolean {
    const def = this.getMissionById(missionId);
    if (!def || !def.prerequisites || def.prerequisites.length === 0) return true;
    return def.prerequisites.every((reqId) => this.completedIds.has(reqId));
  }

  public getCooldownRemainingSec(missionId: string): number {
    const until = this.activityCooldownUntil[missionId] ?? 0;
    const rem = Math.ceil((until - Date.now()) / 1000);
    return rem > 0 ? rem : 0;
  }

  public getCompletionPercentage(): number {
    const total = getAllMissionsCatalog().length;
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.completedIds.size / total) * 100));
  }

  public recordPlayerDamage(amount: number): void {
    if (this.activeMission && amount > 0) {
      this.playerDamageTaken += amount;
    }
  }

  public startMission(
    missionId: string,
    difficulty: MissionDifficulty
  ): { mission: MissionDef | null; errorEn?: string; errorBn?: string } {
    const def = this.getMissionById(missionId);
    if (!def) return { mission: null };

    if (!this.isMissionUnlocked(missionId)) {
      return {
        mission: null,
        errorEn: 'Complete prerequisite Special Operations missions first.',
        errorBn: 'আগে পূর্বের স্পেশাল অপারেশনস মিশনগুলো সম্পন্ন করুন।',
      };
    }

    const cd = this.getCooldownRemainingSec(missionId);
    if (cd > 0) {
      return {
        mission: null,
        errorEn: `Activity ready again in ${cd}s.`,
        errorBn: `অ্যাক্টিভিটি ${cd} সেকেন্ড পর আবার পাওয়া যাবে।`,
      };
    }

    const mod = DIFFICULTY_MODIFIERS[difficulty];
    this.activeMission = def;
    this.activeDifficulty = difficulty;
    this.lastMissionId = def.id;
    this.lastDifficulty = difficulty;
    this.stageIndex = 0;
    this.elapsedSec = 0;
    this.playerDamageTaken = 0;
    this.civiliansHarmedTotal = 0;
    this.timeRemainingSec =
      def.baseTimeLimitSec > 0 ? Math.round(def.baseTimeLimitSec * mod.timeMult) : null;
    this.lastResult = null;
    return { mission: def };
  }

  public cancelMission(): void {
    this.activeMission = null;
    this.stageIndex = 0;
    this.timeRemainingSec = null;
    this.elapsedSec = 0;
  }

  public dismissResult(): void {
    this.lastResult = null;
  }

  public getCurrentStage() {
    if (!this.activeMission) return null;
    return this.activeMission.stages[this.stageIndex] ?? null;
  }

  private computeRank(
    def: MissionDef,
    civiliansHarmed: number,
    optionalOk: boolean
  ): MissionRank {
    let score = 2; // Base Silver for clean completion
    if (civiliansHarmed > 0) {
      return 'BRONZE';
    }
    if (this.playerDamageTaken <= 20) score += 1;
    if (optionalOk) score += 1;
    if (
      def.baseTimeLimitSec > 0 &&
      this.timeRemainingSec !== null &&
      this.timeRemainingSec >= def.baseTimeLimitSec * 0.28
    ) {
      score += 0.5;
    }
    if (this.activeDifficulty === 'HARD') score += 0.5;

    if (score >= 4) return 'PLATINUM';
    if (score >= 3) return 'GOLD';
    if (score >= 2) return 'SILVER';
    return 'BRONZE';
  }

  public getSnapshot(
    playerX: number,
    playerZ: number,
    enc: EncounterRuntimeStatus
  ): ActiveMissionSnapshot | null {
    if (!this.activeMission) return null;
    const stage = this.getCurrentStage();
    if (!stage) return null;
    const secondaryAchieved =
      this.civiliansHarmedTotal === 0 &&
      enc.civiliansHarmed === 0 &&
      this.playerDamageTaken <= 25;

    return {
      missionId: this.activeMission.id,
      titleEn: this.activeMission.titleEn,
      titleBn: this.activeMission.titleBn,
      category: this.activeMission.category,
      difficulty: this.activeDifficulty,
      stageIndex: this.stageIndex,
      stageCount: this.activeMission.stages.length,
      objectiveEn: stage.titleEn,
      objectiveBn: stage.titleBn,
      secondaryObjectiveEn: this.activeMission.optionalBonusEn,
      secondaryObjectiveBn: this.activeMission.optionalBonusBn,
      secondaryAchieved,
      timeRemainingSec: this.timeRemainingSec,
      targetX: stage.targetX,
      targetZ: stage.targetZ,
      distanceMeters: Math.round(Math.hypot(stage.targetX - playerX, stage.targetZ - playerZ)),
      civiliansSafe: enc.civiliansSafe,
      civiliansTotal: enc.civiliansTotal,
      hostilesRemaining: enc.hostilesRemaining,
      hostilesTotal: enc.hostilesTotal,
      cluesFound: enc.cluesFound,
      cluesTotal: enc.cluesTotal,
      deploySquad: Boolean(this.activeMission.deploySquad),
    };
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    inVehicle: boolean,
    insideBuildingId: string | null,
    wantedLevel: number,
    enc: EncounterRuntimeStatus
  ): MissionRuntimeUpdate {
    const out: MissionRuntimeUpdate = {
      stageAdvanced: false,
      newStageIndex: this.stageIndex,
      completedMission: null,
      failedMission: null,
    };

    if (!this.activeMission) return out;
    const stage = this.getCurrentStage();
    if (!stage) return out;

    this.elapsedSec += dt;
    if (enc.civiliansHarmed > this.civiliansHarmedTotal) {
      this.civiliansHarmedTotal = enc.civiliansHarmed;
    }

    // Fail immediately if all escorted civilians/VIP were lost
    if (enc.civiliansTotal > 0 && enc.civiliansSafe <= 0) {
      const failed = this.activeMission;
      this.lastResult = {
        missionId: failed.id,
        titleEn: failed.titleEn,
        titleBn: failed.titleBn,
        success: false,
        rewardEarned: 0,
        reasonEn: 'Protected civilians were not kept safe. Mission failed.',
        reasonBn: 'নাগরিকদের নিরাপদ রাখা যায়নি। মিশন ব্যর্থ হয়েছে।',
      };
      this.activeMission = null;
      this.timeRemainingSec = null;
      out.failedMission = {
        mission: failed,
        reasonEn: this.lastResult.reasonEn,
        reasonBn: this.lastResult.reasonBn,
      };
      return out;
    }

    // Countdown timer
    if (this.timeRemainingSec !== null) {
      this.timeRemainingSec -= dt;
      if (this.timeRemainingSec <= 0) {
        const failed = this.activeMission;
        this.lastResult = {
          missionId: failed.id,
          titleEn: failed.titleEn,
          titleBn: failed.titleBn,
          success: false,
          rewardEarned: 0,
          reasonEn: 'Time ran out before completing the objective.',
          reasonBn: 'লক্ষ্য পূরণের আগেই সময় শেষ হয়ে গেছে।',
        };
        this.activeMission = null;
        this.timeRemainingSec = null;
        out.failedMission = {
          mission: failed,
          reasonEn: this.lastResult.reasonEn,
          reasonBn: this.lastResult.reasonBn,
        };
        return out;
      }
    }

    let stageDone = false;
    const dist = Math.hypot(stage.targetX - playerX, stage.targetZ - playerZ);

    switch (stage.type) {
      case 'reach_point':
        stageDone = !insideBuildingId && dist <= stage.radius;
        break;
      case 'enter_vehicle':
        stageDone = inVehicle;
        break;
      case 'drive_point':
        stageDone = inVehicle && !insideBuildingId && dist <= stage.radius;
        break;
      case 'visit_building':
        stageDone =
          (stage.buildingId && insideBuildingId === stage.buildingId) ||
          (!insideBuildingId && dist <= stage.radius * 0.75);
        break;
      case 'escape_police':
        stageDone = wantedLevel === 0;
        break;
      case 'investigate_clue':
        stageDone = enc.cluesTotal > 0 && enc.cluesFound >= enc.cluesTotal;
        break;
      case 'neutralize_hostiles':
      case 'protect_zone':
        stageDone = enc.hostilesTotal > 0 && enc.hostilesRemaining <= 0;
        break;
      case 'escort_civilians':
        stageDone =
          !insideBuildingId &&
          dist <= stage.radius &&
          (enc.civiliansTotal === 0 || enc.civiliansAtExtract);
        break;
    }

    if (stageDone) {
      this.stageIndex += 1;
      out.newStageIndex = this.stageIndex;
      if (this.stageIndex >= this.activeMission.stages.length) {
        const finished = this.activeMission;
        const mod = DIFFICULTY_MODIFIERS[this.activeDifficulty];
        const optionalCompleted =
          this.civiliansHarmedTotal === 0 && this.playerDamageTaken <= 25;
        const rank = this.computeRank(finished, this.civiliansHarmedTotal, optionalCompleted);

        const firstClear = !this.claimedRewardIds.has(finished.id);
        const rankBonusMult =
          rank === 'PLATINUM' ? 1.25 : rank === 'GOLD' ? 1.12 : rank === 'SILVER' ? 1.0 : 0.85;
        // Prevent duplicate first-clear reward abuse: first clear = 100%, replay = 45% (side activities = 85%)
        const replayFactor = firstClear
          ? 1.0
          : finished.category === 'activity'
            ? 0.85
            : 0.45;
        const reward = Math.round(
          finished.baseReward * mod.rewardMult * rankBonusMult * replayFactor
        );

        this.completedIds.add(finished.id);
        this.claimedRewardIds.add(finished.id);

        if (finished.cooldownSec && finished.cooldownSec > 0) {
          this.activityCooldownUntil[finished.id] = Date.now() + finished.cooldownSec * 1000;
        }

        const prev = this.missionHistory[finished.id];
        const elapsedRounded = Math.max(1, Math.round(this.elapsedSec));
        const bestRank =
          prev && RANK_SCORE[prev.bestRank] > RANK_SCORE[rank] ? prev.bestRank : rank;
        this.missionHistory[finished.id] = {
          missionId: finished.id,
          bestRank,
          bestTimeSec: prev ? Math.min(prev.bestTimeSec, elapsedRounded) : elapsedRounded,
          completions: (prev?.completions ?? 0) + 1,
          firstClearClaimed: true,
          lastPlayedAt: Date.now(),
        };

        this.lastResult = {
          missionId: finished.id,
          titleEn: finished.titleEn,
          titleBn: finished.titleBn,
          success: true,
          rewardEarned: reward,
          rank,
          completionTimeSec: elapsedRounded,
          civiliansSafe: enc.civiliansSafe,
          civiliansTotal: enc.civiliansTotal,
          optionalCompleted,
          unlockNoticeEn: firstClear ? finished.unlockRewardLabelEn : undefined,
          unlockNoticeBn: firstClear ? finished.unlockRewardLabelBn : undefined,
          reasonEn: firstClear
            ? `Rank ${rank} · Earned ৳ ${reward.toLocaleString()}!`
            : `Replay Rank ${rank} · Earned ৳ ${reward.toLocaleString()}!`,
          reasonBn: firstClear
            ? `র‍্যাংক ${rank} · ৳ ${reward.toLocaleString()} পুরস্কার অর্জিত!`
            : `রিপ্লে র‍্যাংক ${rank} · ৳ ${reward.toLocaleString()} পুরস্কার!`,
        };
        this.activeMission = null;
        this.timeRemainingSec = null;
        out.completedMission = {
          mission: finished,
          reward,
          rank,
          firstClear,
          completionTimeSec: elapsedRounded,
          civiliansSafe: enc.civiliansSafe,
          optionalCompleted,
        };
      } else {
        out.stageAdvanced = true;
      }
    }

    return out;
  }
}
