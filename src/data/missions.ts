import { MissionDef, MissionDifficulty } from '../types/game';
import { GTA_CLASSIC_MISSIONS } from './gtaMissions';
import { SIDE_ACTIVITY_MISSIONS, SPECIAL_OPS_MISSIONS } from './specialOps';

export const DIFFICULTY_MODIFIERS: Record<
  MissionDifficulty,
  { timeMult: number; rewardMult: number; labelEn: string; labelBn: string }
> = {
  EASY: { timeMult: 1.4, rewardMult: 0.85, labelEn: 'Easy', labelBn: 'সহজ' },
  NORMAL: { timeMult: 1.0, rewardMult: 1.0, labelEn: 'Normal', labelBn: 'স্বাভাবিক' },
  HARD: { timeMult: 0.72, rewardMult: 1.45, labelEn: 'Hard', labelBn: 'কঠিন' },
};

export { GTA_CLASSIC_MISSIONS, SIDE_ACTIVITY_MISSIONS, SPECIAL_OPS_MISSIONS };

export const MISSION_DATABASE: MissionDef[] = [
  // A. MAIN STORY MISSIONS
  {
    id: 'story_01_arrival',
    category: 'story',
    titleEn: '01. Welcome to Gulshan',
    titleBn: '০১. গুলশানে স্বাগতম',
    descriptionEn:
      'Meet Mama at Gulshan Tea Corner, visit Dhaka Central Bank to activate your account, then check in at your Hatirjheel Safe House.',
    descriptionBn:
      'মামার চা স্টলে দেখা করুন, ঢাকা সেন্ট্রাল ব্যাংকে যান এবং শেষে হাতিরঝিল সেফ হাউসে প্রবেশ করুন।',
    giverEn: 'Tea Master Rahim',
    giverBn: 'রহিম মামা',
    startX: -12,
    startZ: 22,
    baseReward: 3500,
    baseTimeLimitSec: 0,
    optionalBonusEn: 'Drive any vehicle between stops',
    optionalBonusBn: 'যেকোনো গাড়ি চালিয়ে যান',
    stages: [
      {
        type: 'reach_point',
        titleEn: 'Meet Rahim at Gulshan Tea Corner',
        titleBn: 'গুলশান চা স্টলে রহিম মামার সাথে দেখা করুন',
        targetX: -11.5,
        targetZ: 25.0,
        radius: 5.5,
      },
      {
        type: 'visit_building',
        titleEn: 'Enter Dhaka Central Bank',
        titleBn: 'ঢাকা সেন্ট্রাল ব্যাংকে প্রবেশ করুন',
        targetX: -12.0,
        targetZ: -37.0,
        radius: 6.0,
        buildingId: 'bldg_dhaka_bank',
      },
      {
        type: 'visit_building',
        titleEn: 'Check in at Hatirjheel View Safe House',
        titleBn: 'হাতিরঝিল ভিউ সেফ হাউসে প্রবেশ করুন',
        targetX: -20.0,
        targetZ: 46.8,
        radius: 6.0,
        buildingId: 'bldg_hatirjheel_safehouse',
      },
    ],
  },
  {
    id: 'story_02_handover',
    category: 'story',
    titleEn: '02. Hatirjheel Handover',
    titleBn: '০২. হাতিরঝিল হ্যান্ডওভার',
    descriptionEn:
      'Pick up a sealed courier dossier near the Painted Flyover, cross the Hatirjheel Arched Bridge by vehicle, and deliver it to Skyline Tower.',
    descriptionBn:
      'ফ্লাইওভারের নিচ থেকে প্যাকেজ নিয়ে গাড়িতে করে হাতিরঝিল ব্রিজ পার হয়ে স্কাইলাইন টাওয়ারে পৌঁছে দিন।',
    giverEn: 'Fixer Kabir',
    giverBn: 'ফিক্সার কবির',
    startX: 0,
    startZ: -52,
    baseReward: 5500,
    baseTimeLimitSec: 150,
    stages: [
      {
        type: 'reach_point',
        titleEn: 'Collect courier case under Mohakhali Flyover',
        titleBn: 'মহাখালী ফ্লাইওভারের নিচ থেকে কুরিয়ার কেস নিন',
        targetX: 0,
        targetZ: -56,
        radius: 6.5,
      },
      {
        type: 'drive_point',
        titleEn: 'Drive across Hatirjheel Arched Bridge',
        titleBn: 'গাড়ি চালিয়ে হাতিরঝিল ব্রিজ অতিক্রম করুন',
        targetX: 0,
        targetZ: 88,
        radius: 10.0,
      },
      {
        type: 'visit_building',
        titleEn: 'Deliver case inside Skyline Corporate Tower',
        titleBn: 'স্কাইলাইন কর্পোরেট টাওয়ারে প্যাকেজ জমা দিন',
        targetX: -20.0,
        targetZ: -11.0,
        radius: 6.5,
        buildingId: 'bldg_skyline_office',
      },
    ],
  },

  // B. DRIVING, TAXI & RACING MISSIONS
  {
    id: 'driving_cng_taxi',
    category: 'driving',
    titleEn: 'Gulshan CNG Express',
    titleBn: 'গুলশান সিএনজি এক্সপ্রেস',
    descriptionEn:
      'Get in any vehicle, pick up an urgent commuter at Gulshan Circle, drop them at Hotel Gulshan Grand, then finish at Hatirjheel Waterfront.',
    descriptionBn:
      'যেকোনো গাড়িতে উঠে গুলশান সার্কেল থেকে যাত্রী তুলে হোটেল গুলশান গ্র্যান্ড ও হাতিরঝিলে পৌঁছে দিন।',
    giverEn: 'CNG Stand Dispatch',
    giverBn: 'সিএনজি স্ট্যান্ড ডিসপ্যাচ',
    startX: -6,
    startZ: 18,
    baseReward: 3200,
    baseTimeLimitSec: 120,
    stages: [
      {
        type: 'enter_vehicle',
        titleEn: 'Board any CNG, Sedan, or vehicle',
        titleBn: 'যেকোনো সিএনজি বা গাড়িতে উঠুন',
        targetX: -7.2,
        targetZ: 19.5,
        radius: 8,
      },
      {
        type: 'drive_point',
        titleEn: 'Pick up passenger at Gulshan Circle',
        titleBn: 'গুলশান সার্কেল থেকে যাত্রী তুলুন',
        targetX: 0,
        targetZ: 0,
        radius: 9.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Drop off passenger at Hotel Gulshan Grand',
        titleBn: 'হোটেল গুলশান গ্র্যান্ডে যাত্রী নামান',
        targetX: 48,
        targetZ: -5,
        radius: 9.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Drop second fare at Hatirjheel Promenade',
        titleBn: 'দ্বিতীয় যাত্রীকে হাতিরঝিল পাড়ে পৌঁছে দিন',
        targetX: 0,
        targetZ: 60,
        radius: 9.5,
      },
    ],
  },
  {
    id: 'driving_hatirjheel_race',
    category: 'driving',
    titleEn: 'Hatirjheel Midnight Sprint',
    titleBn: 'হাতিরঝিল মিডনাইট স্প্রিন্ট',
    descriptionEn:
      'Blast through 5 high-speed street checkpoints around Gulshan Avenue, Mohakhali Flyover, and the Hatirjheel Arched Bridge before time runs out!',
    descriptionBn:
      'সময় শেষ হওয়ার আগেই গুলশান, ফ্লাইওভার ও হাতিরঝিল ব্রিজের ৫টি চেকপয়েন্ট অতিক্রম করুন!',
    giverEn: 'Dhaka Street Racers',
    giverBn: 'ঢাকা স্ট্রিট রেসার্স',
    startX: 7,
    startZ: 15,
    baseReward: 6000,
    baseTimeLimitSec: 95,
    stages: [
      {
        type: 'drive_point',
        titleEn: 'Checkpoint 1/5 — Gulshan North',
        titleBn: 'চেকপয়েন্ট ১/৫ — গুলশান উত্তর',
        targetX: 0,
        targetZ: -60,
        radius: 10.5,
      },
      {
        type: 'drive_point',
        titleEn: 'Checkpoint 2/5 — East Corridor',
        titleBn: 'চেকপয়েন্ট ২/৫ — পূর্ব করিডর',
        targetX: 60,
        targetZ: -60,
        radius: 10.5,
      },
      {
        type: 'drive_point',
        titleEn: 'Checkpoint 3/5 — Hatirjheel East Ramp',
        titleBn: 'চেকপয়েন্ট ৩/৫ — হাতিরঝিল পূর্ব মোড়',
        targetX: 60,
        targetZ: 60,
        radius: 10.5,
      },
      {
        type: 'drive_point',
        titleEn: 'Checkpoint 4/5 — Hatirjheel Arch Bridge',
        titleBn: 'চেকপয়েন্ট ৪/৫ — হাতিরঝিল ব্রিজ',
        targetX: 0,
        targetZ: 88,
        radius: 11.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Checkpoint 5/5 — Finish at Gulshan Circle',
        titleBn: 'চেকপয়েন্ট ৫/৫ — গুলশান সার্কেল ফিনিশ',
        targetX: 0,
        targetZ: 0,
        radius: 11.0,
      },
    ],
  },

  // C. BUSINESS MISSIONS
  {
    id: 'business_biryani_delivery',
    category: 'business',
    titleEn: 'Royal Biryani Rush Delivery',
    titleBn: 'রয়েল বিরিয়ানি জরুরি ডেলিভারি',
    descriptionEn:
      'Pick up hot catering boxes from Royal Biryani House and deliver them to Gulshan Care Hospital and Digital Market before they cool down.',
    descriptionBn:
      'রয়েল বিরিয়ানি থেকে গরম খাবার নিয়ে গুলশান হাসপাতাল ও ডিজিটাল মার্কেটে পৌঁছে দিন।',
    giverEn: 'Chef Karim',
    giverBn: 'শেফ করিম',
    startX: -12,
    startZ: 20,
    baseReward: 3800,
    baseTimeLimitSec: 110,
    stages: [
      {
        type: 'reach_point',
        titleEn: 'Collect hot Biryani crates at Royal Biryani',
        titleBn: 'রয়েল বিরিয়ানি থেকে খাবারের বক্স নিন',
        targetX: -11.5,
        targetZ: 20.0,
        radius: 6.0,
      },
      {
        type: 'reach_point',
        titleEn: 'Deliver order 1 to Gulshan Care Hospital',
        titleBn: 'গুলশান কেয়ার হাসপাতালে প্রথম ডেলিভারি দিন',
        targetX: -38.0,
        targetZ: 10.0,
        radius: 7.5,
      },
      {
        type: 'reach_point',
        titleEn: 'Deliver order 2 to Digital Market',
        titleBn: 'ডিজিটাল মার্কেটে দ্বিতীয় ডেলিভারি দিন',
        targetX: 11.5,
        targetZ: 20.0,
        radius: 7.5,
      },
    ],
  },
  {
    id: 'business_dealership_valet',
    category: 'business',
    titleEn: 'Padma Motors VIP Delivery',
    titleBn: 'পদ্মা মোটরস ভিআইপি ডেলিভারি',
    descriptionEn:
      'Drive a vehicle from Gulshan Auto Garage to Banani Fashion Studio and then back to Padma Motors showroom.',
    descriptionBn:
      'গুলশান অটো গ্যারেজ থেকে গাড়ি নিয়ে বনানী স্টুডিও হয়ে পদ্মা মোটরস শোরুমে পৌঁছে দিন।',
    giverEn: 'Manager Tanvir',
    giverBn: 'ম্যানেজার তানভীর',
    startX: 20,
    startZ: 47,
    baseReward: 4400,
    baseTimeLimitSec: 120,
    stages: [
      {
        type: 'drive_point',
        titleEn: 'Inspect vehicle outside Gulshan Auto Garage',
        titleBn: 'গুলশান অটো গ্যারেজের সামনে গাড়ি নিন',
        targetX: 38,
        targetZ: 4,
        radius: 9.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Showroom stop at Banani Style Studio',
        titleBn: 'বনানী ফ্যাশন স্টুডিওতে থামুন',
        targetX: 6,
        targetZ: -37,
        radius: 9.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Park at Padma Motors Dealership',
        titleBn: 'পদ্মা মোটরস শোরুমের সামনে পার্ক করুন',
        targetX: 20,
        targetZ: 56,
        radius: 9.5,
      },
    ],
  },

  // D. SIDE MISSION
  {
    id: 'side_emergency_ride',
    category: 'side',
    titleEn: 'Hospital Dash',
    titleBn: 'জরুরি হাসপাতাল রাইড',
    descriptionEn:
      'A cyclist near Hatirjheel Waterfront needs a fast ride to Gulshan Care Hospital. Get there smoothly!',
    descriptionBn:
      'হাতিরঝিল পাড় থেকে একজন পথচারীকে দ্রুত গুলশান কেয়ার হাসপাতালে পৌঁছে দিন।',
    giverEn: 'Dr. Anika',
    giverBn: 'ডা. আনিকা',
    startX: -38,
    startZ: 11,
    baseReward: 2800,
    baseTimeLimitSec: 90,
    stages: [
      {
        type: 'drive_point',
        titleEn: 'Pick up patient near Hatirjheel Promenade',
        titleBn: 'হাতিরঝিল পাড় থেকে যাত্রী তুলুন',
        targetX: 24,
        targetZ: 60,
        radius: 9.5,
      },
      {
        type: 'drive_point',
        titleEn: 'Deliver safely to Gulshan Care Hospital',
        titleBn: 'গুলশান কেয়ার হাসপাতালে নিরাপদে পৌঁছে দিন',
        targetX: -38,
        targetZ: 4,
        radius: 9.5,
      },
    ],
  },

  // E. EXPLORATION MISSION
  {
    id: 'explore_dhaka_landmarks',
    category: 'exploration',
    titleEn: 'Dhaka Landmarks Discovery',
    titleBn: 'ঢাকা ল্যান্ডমার্ক ভ্রমণ',
    descriptionEn:
      'Explore four iconic spots across the Gulshan–Hatirjheel sector: Gulshan Circle, Mohakhali Mural Flyover, Hatirjheel Bridge, and West Boulevard.',
    descriptionBn:
      'গুলশান সার্কেল, মহাখালী ফ্লাইওভার, হাতিরঝিল ব্রিজ এবং পশ্চিম বুলেভার্ড ঘুরে দেখুন।',
    giverEn: 'City Explorer Club',
    giverBn: 'সিটি এক্সপ্লোরার ক্লাব',
    startX: 0,
    startZ: 0,
    baseReward: 4200,
    baseTimeLimitSec: 0,
    stages: [
      {
        type: 'reach_point',
        titleEn: 'Visit Gulshan Circle Center',
        titleBn: 'গুলশান সার্কেল দেখুন',
        targetX: 0,
        targetZ: 0,
        radius: 8.5,
      },
      {
        type: 'reach_point',
        titleEn: 'Inspect Mohakhali Painted Flyover Piers',
        titleBn: 'মহাখালী ফ্লাইওভারের আলপনা পিলার দেখুন',
        targetX: -20,
        targetZ: -54,
        radius: 8.5,
      },
      {
        type: 'reach_point',
        titleEn: 'Walk or drive onto Hatirjheel Arched Bridge',
        titleBn: 'হাতিরঝিল আর্চ ব্রিজে যান',
        targetX: 0,
        targetZ: 88,
        radius: 10.5,
      },
      {
        type: 'reach_point',
        titleEn: 'Explore Gulshan West Avenue',
        titleBn: 'গুলশান পশ্চিম এভিনিউ ঘুরে দেখুন',
        targetX: -60,
        targetZ: 0,
        radius: 9.5,
      },
    ],
  },

  // F. POLICE & CHASE MISSION
  {
    id: 'police_gulshan_heat',
    category: 'police',
    titleEn: 'Heat on Gulshan Avenue',
    titleBn: 'গুলশান এভিনিউয়ে পুলিশ ধাওয়া',
    descriptionEn:
      'Dhaka Police have flagged your license plate with a 2-Star alert! Outrun the patrol cars and lose the heat completely.',
    descriptionBn:
      '২-স্টার পুলিশ অ্যালার্ট জারি হয়েছে! প্যাট্রোল গাড়ি এড়িয়ে নিরাপদে পালিয়ে যান।',
    giverEn: 'Underground Radio',
    giverBn: 'আন্ডারগ্রাউন্ড রেডিও',
    startX: 0,
    startZ: 28,
    baseReward: 6500,
    baseTimeLimitSec: 120,
    initialWantedStars: 2,
    stages: [
      {
        type: 'drive_point',
        titleEn: 'Break through Hatirjheel Waterfront Drive',
        titleBn: 'হাতিরঝিল ড্রাইভ পেরিয়ে এগিয়ে যান',
        targetX: -60,
        targetZ: 60,
        radius: 12.0,
      },
      {
        type: 'escape_police',
        titleEn: 'Evade Dhaka Police until Wanted Stars clear',
        titleBn: 'পুলিশের চোখ এড়িয়ে ওয়ান্টেড স্টার ক্লিয়ার করুন',
        targetX: 60,
        targetZ: -60,
        radius: 15.0,
      },
    ],
  },

  // G. SPECIAL HIGH-STAKES MISSION
  {
    id: 'special_king_of_dhaka',
    category: 'special',
    titleEn: 'King of Dhaka Grand Run',
    titleBn: 'কিং অব ঢাকা গ্র্যান্ড রান',
    descriptionEn:
      'High-stakes multi-stage challenge: hit the Flyover checkpoint, outrun a 3-Star Dhaka Police pursuit, and cross Hatirjheel Bridge to Padma Motors for a massive payout!',
    descriptionBn:
      'চূড়ান্ত চ্যালেঞ্জ: ফ্লাইওভার ছুঁয়ে ৩-স্টার পুলিশ ধাওয়া এড়িয়ে হাতিরঝিল ব্রিজ হয়ে পদ্মা মোটরসে পৌঁছান!',
    giverEn: 'Dhaka Underground Syndicate',
    giverBn: 'ঢাকা আন্ডারগ্রাউন্ড সিন্ডিকেট',
    startX: 0,
    startZ: -20,
    baseReward: 12000,
    baseTimeLimitSec: 155,
    initialWantedStars: 3,
    stages: [
      {
        type: 'drive_point',
        titleEn: 'Stage 1: Blast under Mohakhali Flyover',
        titleBn: 'ধাপ ১: মহাখালী ফ্লাইওভারের নিচ দিয়ে যান',
        targetX: 60,
        targetZ: -60,
        radius: 12.0,
      },
      {
        type: 'escape_police',
        titleEn: 'Stage 2: Shake off the 3-Star Police pursuit',
        titleBn: 'ধাপ ২: ৩-স্টার পুলিশ ধাওয়া থেকে মুক্ত হোন',
        targetX: -60,
        targetZ: 0,
        radius: 14.0,
      },
      {
        type: 'drive_point',
        titleEn: 'Stage 3: Cross Hatirjheel Bridge to Padma Motors',
        titleBn: 'ধাপ ৩: হাতিরঝিল ব্রিজ পেরিয়ে পদ্মা মোটরসে ফিরুন',
        targetX: 20,
        targetZ: 56,
        radius: 11.0,
      },
    ],
  },
];
