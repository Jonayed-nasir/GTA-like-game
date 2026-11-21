import { EmergencyAlert } from '../types/game';

interface AlertTemplate {
  titleEn: string;
  titleBn: string;
  districtEn: string;
  districtBn: string;
  severity: EmergencyAlert['severity'];
  x: number;
  z: number;
  linkedMissionId?: string;
}

const CITY_ALERT_TEMPLATES: AlertTemplate[] = [
  {
    titleEn: 'Civilians Trapped Near Gulshan Alley',
    titleBn: 'গুলশান গলিতে নাগরিক আটকা পড়েছে',
    districtEn: 'Gulshan Avenue',
    districtBn: 'গুলশান এভিনিউ',
    severity: 'critical',
    x: -18,
    z: 22,
    linkedMissionId: 'specops_01_safe_passage',
  },
  {
    titleEn: 'Medical Supply Urgency at Care Hospital',
    titleBn: 'কেয়ার হাসপাতালে জরুরি ওষুধ প্রয়োজন',
    districtEn: 'Gulshan West',
    districtBn: 'গুলশান পশ্চিম',
    severity: 'warning',
    x: -38,
    z: 11.4,
    linkedMissionId: 'act_medical_delivery',
  },
  {
    titleEn: 'DMP Requests Patrol Backup at Circle',
    titleBn: 'গুলশান সার্কেলে পুলিশ সহায়তা প্রয়োজন',
    districtEn: 'Gulshan Circle',
    districtBn: 'গুলশান সার্কেল',
    severity: 'warning',
    x: 0,
    z: 0,
    linkedMissionId: 'act_police_assist',
  },
  {
    titleEn: 'Stranded Commuter Near Hatirjheel Waterfront',
    titleBn: 'হাতিরঝিলে জরুরি উদ্ধার কল',
    districtEn: 'Hatirjheel Waterfront',
    districtBn: 'হাতিরঝিল ওয়াটারফ্রন্ট',
    severity: 'info',
    x: 0,
    z: 88,
    linkedMissionId: 'act_emergency_rescue',
  },
  {
    titleEn: 'Suspicious Syndicate Activity Under Flyover',
    titleBn: 'ফ্লাইওভারের নিচে সন্দেহজনক তৎপরতা',
    districtEn: 'Mohakhali Flyover Link',
    districtBn: 'মহাখালী ফ্লাইওভার লিংক',
    severity: 'critical',
    x: 0,
    z: -60,
    linkedMissionId: 'specops_02_silent_rescue',
  },
];

/**
 * Manages live Dhaka Emergency Dispatch alerts shown in the DhakaOS Smartphone.
 * Every alert links directly to a real world coordinate & playable mission/activity.
 */
export class EmergencyResponseManager {
  public alerts: EmergencyAlert[] = [];
  private nextTimer = 28;
  private templateIdx = 0;

  constructor() {
    // Seed initial 3 actionable city dispatch alerts
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const tpl = CITY_ALERT_TEMPLATES[i];
      this.alerts.push({
        id: `alert_init_${i}`,
        ...tpl,
        timestamp: now - (2 - i) * 60000,
      });
    }
    this.templateIdx = 3;
  }

  public pushCustomAlert(alert: Omit<EmergencyAlert, 'id' | 'timestamp'>): void {
    this.alerts.unshift({
      id: `alert_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      timestamp: Date.now(),
      ...alert,
    });
    if (this.alerts.length > 8) this.alerts.length = 8;
  }

  public update(dt: number): EmergencyAlert | null {
    this.nextTimer -= dt;
    if (this.nextTimer > 0) return null;
    this.nextTimer = 55;
    const tpl = CITY_ALERT_TEMPLATES[this.templateIdx % CITY_ALERT_TEMPLATES.length];
    this.templateIdx++;
    const next: EmergencyAlert = {
      id: `alert_dyn_${Date.now()}`,
      ...tpl,
      timestamp: Date.now(),
    };
    this.alerts.unshift(next);
    if (this.alerts.length > 8) this.alerts.length = 8;
    return next;
  }

  public getAlerts(): EmergencyAlert[] {
    return this.alerts;
  }
}
