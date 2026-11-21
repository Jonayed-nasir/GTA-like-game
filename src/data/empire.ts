import { VehicleKind } from '../types/game';

export interface MafiaRankDef {
  index: number;
  titleEn: string;
  titleBn: string;
  minRep: number;
  incomeMult: number;
  maxCrew: number;
  badgeColor: string;
}

export const MAFIA_RANKS: MafiaRankDef[] = [
  {
    index: 0,
    titleEn: 'Street Hustler',
    titleBn: 'স্ট্রিট হাসলার',
    minRep: 0,
    incomeMult: 1.0,
    maxCrew: 1,
    badgeColor: '#94a3b8',
  },
  {
    index: 1,
    titleEn: 'Enforcer',
    titleBn: 'এনফোর্সার',
    minRep: 180,
    incomeMult: 1.2,
    maxCrew: 2,
    badgeColor: '#38bdf8',
  },
  {
    index: 2,
    titleEn: 'Crew Capo',
    titleBn: 'ক্রু ক্যাপো',
    minRep: 480,
    incomeMult: 1.45,
    maxCrew: 2,
    badgeColor: '#a855f7',
  },
  {
    index: 3,
    titleEn: 'Underboss',
    titleBn: 'আন্ডারবস',
    minRep: 950,
    incomeMult: 1.75,
    maxCrew: 3,
    badgeColor: '#f59e0b',
  },
  {
    index: 4,
    titleEn: 'Syndicate Don',
    titleBn: 'সিন্ডিকেট ডন',
    minRep: 1700,
    incomeMult: 2.15,
    maxCrew: 3,
    badgeColor: '#f43f5e',
  },
  {
    index: 5,
    titleEn: 'Kingpin of Dhaka',
    titleBn: 'ঢাকার কিংপিন',
    minRep: 2800,
    incomeMult: 2.75,
    maxCrew: 3,
    badgeColor: '#eab308',
  },
];

export function getMafiaRankForRep(rep: number): MafiaRankDef {
  let rank = MAFIA_RANKS[0];
  for (let i = 0; i < MAFIA_RANKS.length; i++) {
    if (rep >= MAFIA_RANKS[i].minRep) {
      rank = MAFIA_RANKS[i];
    }
  }
  return rank;
}

export function getNextMafiaRank(rep: number): MafiaRankDef | null {
  const current = getMafiaRankForRep(rep);
  if (current.index + 1 >= MAFIA_RANKS.length) return null;
  return MAFIA_RANKS[current.index + 1];
}

export interface PropertyDef {
  id: string;
  nameEn: string;
  nameBn: string;
  type: 'home' | 'business' | 'hq';
  price: number;
  incomePerMin: number;
  minMafiaRank: number;
  perksEn: string;
  perksBn: string;
  x: number;
  z: number;
  buildingId?: string;
}

export const DHAKA_PROPERTIES: PropertyDef[] = [
  {
    id: 'prop_hatirjheel_studio',
    nameEn: 'Hatirjheel Studio Safehouse',
    nameBn: 'হাতিরঝিল স্টুডিও সেফ হাউস',
    type: 'home',
    price: 12000,
    incomePerMin: 900,
    minMafiaRank: 0,
    perksEn: 'Safehouse rental income + quick hideout',
    perksBn: 'ভাড়া আয় ও গোপন আস্তানা',
    x: -20.0,
    z: 46.8,
    buildingId: 'bldg_hatirjheel_safehouse',
  },
  {
    id: 'prop_biryani_front',
    nameEn: 'Royal Biryani Syndicate Front',
    nameBn: 'রয়েল বিরিয়ানি সিন্ডিকেট ফ্রন্ট',
    type: 'business',
    price: 22000,
    incomePerMin: 2100,
    minMafiaRank: 0,
    perksEn: 'Steady street cash laundering front',
    perksBn: 'নিয়মিত স্ট্রিট ক্যাশ ব্যবসা',
    x: -12.0,
    z: 20.0,
    buildingId: 'bldg_royal_biryani',
  },
  {
    id: 'prop_banani_garage',
    nameEn: 'Gulshan Chop-Shop Garage',
    nameBn: 'গুলশান চপ-শপ গ্যারেজ',
    type: 'business',
    price: 35000,
    incomePerMin: 3600,
    minMafiaRank: 1,
    perksEn: 'FREE vehicle repairs & custom paint + 25% higher chop-shop payouts',
    perksBn: 'ফ্রি গাড়ি মেরামত ও রঙ + চপ-শপে ২৫% বেশি দাম',
    x: 38.0,
    z: 11.4,
    buildingId: 'bldg_gulshan_garage',
  },
  {
    id: 'prop_gulshan_penthouse',
    nameEn: 'Gulshan Grand Penthouse',
    nameBn: 'গুলশান গ্র্যান্ড পেন্টহাউস',
    type: 'home',
    price: 60000,
    incomePerMin: 6200,
    minMafiaRank: 2,
    perksEn: 'FREE Wanted Heat Clear & Full Ammo Stash from Empire Phone',
    perksBn: 'ফোন থেকে ফ্রি পুলিশ ক্লিয়ার ও ফুল অ্যামো স্ট্যাশ',
    x: 38.0,
    z: -10.5,
    buildingId: 'bldg_sonargaon_hotel',
  },
  {
    id: 'prop_syndicate_tower',
    nameEn: 'Dhaka Syndicate Tower HQ',
    nameBn: 'ঢাকা সিন্ডিকেট টাওয়ার হেডকোয়ার্টার',
    type: 'hq',
    price: 110000,
    incomePerMin: 11500,
    minMafiaRank: 3,
    perksEn: 'Kingpin HQ · Huge empire vault flow & elite syndicate status',
    perksBn: 'কিংপিন হেডকোয়ার্টার · সর্বোচ্চ প্যাসিভ আয় ও মাফিয়া ক্ষমতা',
    x: -20.0,
    z: -11.0,
    buildingId: 'bldg_skyline_office',
  },
];

export const CHOP_SHOP_BASE_PRICES: Record<VehicleKind, number> = {
  cng: 3500,
  motorcycle: 5500,
  sedan: 7500,
  pickup: 8500,
  truck: 9500,
  bus: 10500,
  suv: 12500,
  police: 14500,
  sports: 18500,
  speedboat: 24000,
  helicopter: 45000,
};

export function getChopShopSellPrice(
  kind: VehicleKind,
  health: number,
  ownsGarage: boolean
): number {
  const base = CHOP_SHOP_BASE_PRICES[kind] ?? 6500;
  const conditionMult = 0.45 + Math.max(0, Math.min(100, health)) / 100 * 0.55;
  const ownerBonus = ownsGarage ? 1.25 : 1.0;
  return Math.round((base * conditionMult * ownerBonus) / 50) * 50;
}

export function computeEmpireIncomePerMin(
  ownedPropertyIds: ReadonlyArray<string>,
  mafiaRep: number
): number {
  const rank = getMafiaRankForRep(mafiaRep);
  let base = 0;
  for (let i = 0; i < ownedPropertyIds.length; i++) {
    const p = DHAKA_PROPERTIES.find((d) => d.id === ownedPropertyIds[i]);
    if (p) base += p.incomePerMin;
  }
  return Math.round(base * rank.incomeMult);
}
