import { WeaponId } from '../types/game';

export interface WeaponDef {
  id: WeaponId;
  nameEn: string;
  nameBn: string;
  shortEn: string;
  shortBn: string;
  category: 'melee' | 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper';
  damage: number;
  headshotMult: number;
  vehicleDamage: number;
  fireRateSec: number; // seconds between shots
  automatic: boolean;
  range: number;
  pellets: number;
  spreadRad: number;
  magSize: number; // 0 = melee/unlimited
  maxReserve: number;
  reloadSec: number;
  recoilKick: number;
  aimFov: number;
  driveByAllowed: boolean;
  tracerColor: number;
  accentColor: string;
}

export const WEAPON_ORDER: WeaponId[] = [
  'fist',
  'pistol',
  'smg',
  'shotgun',
  'rifle',
  'sniper',
];

export const WEAPON_CATALOG: Record<WeaponId, WeaponDef> = {
  fist: {
    id: 'fist',
    nameEn: 'Fists / Melee',
    nameBn: 'খালি হাত / ঘুষি',
    shortEn: 'FIST',
    shortBn: 'ঘুষি',
    category: 'melee',
    damage: 30,
    headshotMult: 1.4,
    vehicleDamage: 8,
    fireRateSec: 0.42,
    automatic: false,
    range: 2.75,
    pellets: 1,
    spreadRad: 0.04,
    magSize: 0,
    maxReserve: 0,
    reloadSec: 0,
    recoilKick: 0.01,
    aimFov: 56,
    driveByAllowed: false,
    tracerColor: 0xffffff,
    accentColor: '#94a3b8',
  },
  pistol: {
    id: 'pistol',
    nameEn: '9mm Dhaka Tactical',
    nameBn: '৯এমএম পিস্তল',
    shortEn: '9MM',
    shortBn: 'পিস্তল',
    category: 'pistol',
    damage: 34,
    headshotMult: 2.0,
    vehicleDamage: 16,
    fireRateSec: 0.28,
    automatic: false,
    range: 72,
    pellets: 1,
    spreadRad: 0.015,
    magSize: 15,
    maxReserve: 150,
    reloadSec: 1.25,
    recoilKick: 0.022,
    aimFov: 48,
    driveByAllowed: true,
    tracerColor: 0xfde047,
    accentColor: '#f59e0b',
  },
  smg: {
    id: 'smg',
    nameEn: 'Vice Micro SMG',
    nameBn: 'ভাইস মাইক্রো এসএমজি',
    shortEn: 'SMG',
    shortBn: 'এসএমজি',
    category: 'smg',
    damage: 22,
    headshotMult: 1.85,
    vehicleDamage: 12,
    fireRateSec: 0.1,
    automatic: true,
    range: 64,
    pellets: 1,
    spreadRad: 0.036,
    magSize: 32,
    maxReserve: 320,
    reloadSec: 1.5,
    recoilKick: 0.015,
    aimFov: 47,
    driveByAllowed: true,
    tracerColor: 0xfbbf24,
    accentColor: '#06b6d4',
  },
  shotgun: {
    id: 'shotgun',
    nameEn: 'Pump Combat Shotgun',
    nameBn: 'পাম্প কমব্যাট শটগান',
    shortEn: 'SHOTGUN',
    shortBn: 'শটগান',
    category: 'shotgun',
    damage: 19, // x6 pellets = 114 close-range!
    headshotMult: 1.6,
    vehicleDamage: 11, // x6 = 66 dmg!
    fireRateSec: 0.72,
    automatic: false,
    range: 34,
    pellets: 6,
    spreadRad: 0.085,
    magSize: 8,
    maxReserve: 64,
    reloadSec: 1.85,
    recoilKick: 0.055,
    aimFov: 50,
    driveByAllowed: false,
    tracerColor: 0xfb923c,
    accentColor: '#f97316',
  },
  rifle: {
    id: 'rifle',
    nameEn: 'AK-47 Assault Rifle',
    nameBn: 'একে-৪৭ অ্যাসল্ট রাইফেল',
    shortEn: 'AK-47',
    shortBn: 'একে-৪৭',
    category: 'rifle',
    damage: 32,
    headshotMult: 2.0,
    vehicleDamage: 20,
    fireRateSec: 0.125,
    automatic: true,
    range: 95,
    pellets: 1,
    spreadRad: 0.022,
    magSize: 30,
    maxReserve: 270,
    reloadSec: 1.75,
    recoilKick: 0.024,
    aimFov: 44,
    driveByAllowed: false,
    tracerColor: 0xfef08a,
    accentColor: '#ef4444',
  },
  sniper: {
    id: 'sniper',
    nameEn: 'Heavy Marksman Sniper',
    nameBn: 'হেভি স্নাইপার রাইফেল',
    shortEn: 'SNIPER',
    shortBn: 'স্নাইপার',
    category: 'sniper',
    damage: 115,
    headshotMult: 2.4,
    vehicleDamage: 55,
    fireRateSec: 1.05,
    automatic: false,
    range: 165,
    pellets: 1,
    spreadRad: 0.003,
    magSize: 6,
    maxReserve: 48,
    reloadSec: 2.1,
    recoilKick: 0.068,
    aimFov: 26,
    driveByAllowed: false,
    tracerColor: 0x38bdf8,
    accentColor: '#a855f7',
  },
};

export interface WeaponAmmoState {
  mag: number;
  reserve: number;
}

export function createInitialAmmoState(): Record<WeaponId, WeaponAmmoState> {
  const state = {} as Record<WeaponId, WeaponAmmoState>;
  for (const id of WEAPON_ORDER) {
    const def = WEAPON_CATALOG[id];
    state[id] = {
      mag: def.magSize,
      reserve: def.maxReserve,
    };
  }
  return state;
}
