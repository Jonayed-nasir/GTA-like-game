import { Language } from '../types/game';

export interface TranslationBundle {
  gameTitle: string;
  gameSubtitle: string;
  phaseBadge: string;
  playNow: string;
  resumeGame: string;
  pauseTitle: string;
  settings: string;
  controls: string;
  worldMap: string;
  language: string;
  graphicsQuality: string;
  trafficDensity: string;
  timeOfDay: string;
  audio: string;
  audioVolume: string;
  on: string;
  off: string;
  showFps: string;
  saveGame: string;
  resetPosition: string;
  savedNotice: string;
  resetNotice: string;
  enterVehicle: string;
  exitVehicle: string;
  sprint: string;
  jump: string;
  horn: string;
  camera: string;
  gas: string;
  brake: string;
  reverse: string;
  drift: string;
  kmh: string;
  dawn: string;
  noon: string;
  sunset: string;
  night: string;
  timeFlow: string;
  pausedFlow: string;
  normalFlow: string;
  tapMapHint: string;
  close: string;
  controlsDesktopTitle: string;
  controlsMobileTitle: string;
  controlsMove: string;
  controlsSprintJump: string;
  controlsVehicle: string;
  controlsCamera: string;
  controlsHornPause: string;
  controlsMobileMove: string;
  controlsMobileLook: string;
  controlsMobileDrive: string;
  objectiveLabel: string;
  objectiveText: string;
  drivingMode: string;
  modeJoystick: string;
  modeButtons: string;
  drivingAssist: string;
  speedLimiter: string;
  steeringSens: string;
  accelScale: string;
  brakeScale: string;
  cameraSens: string;
  inventory: string;
  missions: string;
  shop: string;
  garage: string;
  dealership: string;
  buy: string;
  owned: string;
  equip: string;
  equipped: string;
  useItem: string;
  tryOn: string;
  repairVehicle: string;
  paintVehicle: string;
  upgradeEngine: string;
  saveVehicle: string;
  deliverVehicle: string;
  noVehicleNearby: string;
  notEnoughMoney: string;
  purchasedNotice: string;
  startMission: string;
  cancelMission: string;
  replayMission: string;
  retryMission: string;
  missionComplete: string;
  missionFailed: string;
  difficulty: string;
  reward: string;
  active: string;
  completed: string;
  gpsRoute: string;
  clearGps: string;
  tapToSetGps: string;
  wantedEvading: string;
  wantedPursuit: string;
  unlockingVehicle: string;
  outfits: string;
  items: string;
  myVehicles: string;
  emptyInventory: string;
  eatHealed: string;
  hospitalHealed: string;
  safeHouseSaved: string;
  leftSteer: string;
  rightSteer: string;
  phone: string;
  phoneTitle: string;
  radioFm: string;
  radioOff: string;
  radioLofi: string;
  radioSynth: string;
  radioStreet: string;
  weather: string;
  weatherClear: string;
  weatherRain: string;
  weatherStorm: string;
  weatherAuto: string;
  nitro: string;
  photoMode: string;
  exitPhotoMode: string;
  fullscreen: string;
  emergencyServices: string;
  clearWantedService: string;
  medDropService: string;
  quickGps: string;
  quickRide: string;
  specOpsHq: string;
  specOpsTitle: string;
  sideActivities: string;
  missionHistory: string;
  squadManagement: string;
  emergencyAlerts: string;
  playerStats: string;
  squadFollow: string;
  squadHold: string;
  squadObjective: string;
  squadRegroup: string;
  squadProtect: string;
  subdueHostile: string;
  inspectClue: string;
  lockedPrereq: string;
  completionRate: string;
  tutorialTitle: string;
  skipTutorial: string;
  optionalObj: string;
  civiliansLabel: string;
  hostilesLabel: string;
  cluesLabel: string;
  armoryTitle: string;
  briefingLabel: string;
  deployMission: string;
  rankLabel: string;
  tutorialComplete: string;
  squadCommandTitle: string;
  squadStatus: string;
  lockedReward: string;
  openOpsTerminal: string;
  openArmory: string;
  hqResultsBoard: string;
  completionProgress: string;
  optionalBonus: string;
  prerequisiteLocked: string;
  deployOperation: string;
  cooldownLabel: string;
  civiliansSafe: string;
  hostilesLeft: string;
  cluesFound: string;
  emergencyAlertsApp: string;
  respondAlert: string;
  squadApp: string;
  missionHistoryApp: string;
  playerStatsApp: string;
  bestTime: string;
  weaponWheel: string;
  fire: string;
  punch: string;
  aim: string;
  reload: string;
  reloading: string;
  refillAmmo: string;
  ammoRefilled: string;
  gtaClassicCat: string;
  headshot: string;
  vehicleDestroyed: string;
  driveBy: string;
  weaponSwitch: string;
  damageLabel: string;
  rangeLabel: string;
  mafiaEmpire: string;
  empireSafe: string;
  collectCash: string;
  properties: string;
  robBank: string;
  robRegister: string;
  sellStolenCar: string;
  summonMafiaCrew: string;
  wasted: string;
  busted: string;
  penthousePerks: string;
  freePerk: string;
}

export const TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {
    gameTitle: 'GTA DHAKA',
    gameSubtitle: 'City of Chaos',
    phaseBadge: 'Open World Upgrade · Gulshan & Hatirjheel Sector',
    playNow: 'Enter Dhaka',
    resumeGame: 'Resume',
    pauseTitle: 'Paused',
    settings: 'Settings',
    controls: 'Controls',
    worldMap: 'Dhaka Open World Map & GPS',
    language: 'Language',
    graphicsQuality: 'Graphics Quality',
    trafficDensity: 'Traffic Density',
    timeOfDay: 'Time of Day',
    audio: 'Sound Effects',
    audioVolume: 'Sound Volume',
    on: 'On',
    off: 'Off',
    showFps: 'FPS Counter',
    saveGame: 'Save Progress',
    resetPosition: 'Respawn at Gulshan',
    savedNotice: 'Game progress saved.',
    resetNotice: 'Respawned at Gulshan Avenue.',
    enterVehicle: 'Enter Vehicle',
    exitVehicle: 'Exit',
    sprint: 'Sprint',
    jump: 'Jump',
    horn: 'Horn',
    camera: 'Cam',
    gas: 'Gas',
    brake: 'Brake',
    reverse: 'Rev',
    drift: 'Handbrake',
    kmh: 'KM/H',
    dawn: 'Dawn',
    noon: 'Noon',
    sunset: 'Sunset',
    night: 'Night',
    timeFlow: 'Cycle',
    pausedFlow: 'Static',
    normalFlow: 'Live',
    tapMapHint: 'Tap map for GPS',
    close: 'Close',
    controlsDesktopTitle: 'Keyboard & Mouse',
    controlsMobileTitle: 'Android / Touch',
    controlsMove: 'W A S D / Arrows — Walk or Drive',
    controlsSprintJump: 'Shift — Sprint · Space — Jump / Handbrake',
    controlsVehicle: 'F or E — Interact (Vehicles, Buildings, Shops, NPCs)',
    controlsCamera: 'Drag Screen — Rotate Camera · C — Switch View',
    controlsHornPause: 'H — Horn · I — Inventory · J — Missions · M — GPS Map · Esc — Pause',
    controlsMobileMove: 'Mode A: Steering Joystick · Mode B: Left/Right Arrow Pads',
    controlsMobileLook: 'Drag Open Screen — Orbit Camera 360°',
    controlsMobileDrive: 'Right Cluster — Gas, Brake, Reverse, Handbrake, Interact',
    objectiveLabel: 'Free Roam',
    objectiveText: 'Drive any Dhaka vehicle, enter shops & interiors, and take on Gulshan–Hatirjheel missions',
    drivingMode: 'Driving Controls',
    modeJoystick: 'Mode A: Joystick',
    modeButtons: 'Mode B: Arrows',
    drivingAssist: 'Driving Assist',
    speedLimiter: 'City Speed Limiter',
    steeringSens: 'Steering Sensitivity',
    accelScale: 'Acceleration Feel',
    brakeScale: 'Braking Power',
    cameraSens: 'Camera Sensitivity',
    inventory: 'Inventory',
    missions: 'Missions',
    shop: 'Shop',
    garage: 'Auto Garage',
    dealership: 'Dealership',
    buy: 'Buy',
    owned: 'Owned',
    equip: 'Equip',
    equipped: 'Equipped',
    useItem: 'Use',
    tryOn: 'Try On',
    repairVehicle: 'Repair Vehicle',
    paintVehicle: 'Custom Paint',
    upgradeEngine: 'Engine Tune',
    saveVehicle: 'Save to Garage',
    deliverVehicle: 'Summon Outside',
    noVehicleNearby: 'Bring a vehicle near the garage entrance to customize it.',
    notEnoughMoney: 'Not enough Taka (৳).',
    purchasedNotice: 'Purchased',
    startMission: 'Start Mission',
    cancelMission: 'Abort Mission',
    replayMission: 'Replay',
    retryMission: 'Retry Mission',
    missionComplete: 'Mission Complete',
    missionFailed: 'Mission Failed',
    difficulty: 'Difficulty',
    reward: 'Reward',
    active: 'Active',
    completed: 'Completed',
    gpsRoute: 'GPS Route',
    clearGps: 'Clear GPS',
    tapToSetGps: 'Tap any map location or marker to set GPS route',
    wantedEvading: 'Escaping Police',
    wantedPursuit: 'Dhaka Police Pursuit',
    unlockingVehicle: 'Unlocking Vehicle...',
    outfits: 'Outfits',
    items: 'Items & Food',
    myVehicles: 'Owned Vehicles',
    emptyInventory: 'No consumables yet. Visit Royal Biryani, Gulshan Mart, or shops.',
    eatHealed: 'Restored health',
    hospitalHealed: 'Full medical treatment complete.',
    safeHouseSaved: 'Rested & saved at Gulshan Safe House.',
    leftSteer: 'Left',
    rightSteer: 'Right',
    phone: 'Phone',
    phoneTitle: 'DhakaOS Smartphone',
    radioFm: 'Dhaka FM Radio',
    radioOff: 'Radio Off',
    radioLofi: '94.6 Gulshan Lo-Fi',
    radioSynth: '101.2 Hatirjheel Synth',
    radioStreet: '88.8 Dhaka Street Beats',
    weather: 'Weather',
    weatherClear: 'Clear',
    weatherRain: 'Monsoon Rain',
    weatherStorm: 'Dhaka Storm',
    weatherAuto: 'Auto Weather',
    nitro: 'NOS',
    photoMode: 'Photo Mode',
    exitPhotoMode: 'Exit Photo Mode',
    fullscreen: 'Fullscreen',
    emergencyServices: 'City Services',
    clearWantedService: 'Clear Wanted Stars (৳ 1,500)',
    medDropService: 'Quick Med-Drop +50 HP (৳ 400)',
    quickGps: 'Quick GPS',
    quickRide: 'Summon Ride',
    specOpsHq: 'Special Ops HQ',
    specOpsTitle: 'Special Operations',
    sideActivities: 'Side Activities',
    missionHistory: 'Mission History',
    squadManagement: 'Squad Control',
    emergencyAlerts: 'City Alerts',
    playerStats: 'Player Stats',
    squadFollow: 'Follow',
    squadHold: 'Hold',
    squadObjective: 'Objective',
    squadRegroup: 'Regroup',
    squadProtect: 'Protect',
    subdueHostile: 'Subdue Hostile',
    inspectClue: 'Inspect Clue',
    lockedPrereq: 'Complete required missions first',
    completionRate: 'Completion',
    tutorialTitle: 'Dhaka Quick Guide',
    skipTutorial: 'Skip Tutorial',
    optionalObj: 'Bonus',
    civiliansLabel: 'Civilians',
    hostilesLabel: 'Hostiles',
    cluesLabel: 'Clues',
    armoryTitle: 'Tactical Outfits & Gear',
    briefingLabel: 'Mission Briefing',
    deployMission: 'Deploy Squad & Start',
    rankLabel: 'Rank',
    tutorialComplete: 'Dhaka Quick Guide complete! Explore freely.',
    squadCommandTitle: 'Squad Order',
    squadStatus: 'Squad',
    lockedReward: 'Locked',
    openOpsTerminal: 'Operations Terminal',
    openArmory: 'Tactical Armory',
    hqResultsBoard: 'Results Board',
    completionProgress: 'Complete',
    optionalBonus: 'Bonus Objective',
    prerequisiteLocked: 'Complete Operation 01 & 02 first',
    deployOperation: 'Deploy Squad & Start',
    cooldownLabel: 'Cooldown',
    civiliansSafe: 'Civilians Safe',
    hostilesLeft: 'Hostiles',
    cluesFound: 'Clues',
    emergencyAlertsApp: 'Dhaka Emergency Dispatch',
    respondAlert: 'Respond Now',
    squadApp: 'Special Ops Squad',
    missionHistoryApp: 'Mission History',
    playerStatsApp: 'Career Statistics',
    bestTime: 'Best Time',
    weaponWheel: 'Weapon Wheel',
    fire: 'FIRE',
    punch: 'HIT',
    aim: 'AIM',
    reload: 'RELOAD',
    reloading: 'RELOADING...',
    refillAmmo: 'Refill All Ammo (৳ 1,200)',
    ammoRefilled: 'All weapon ammo refilled!',
    gtaClassicCat: 'GTA Heists',
    headshot: 'HEADSHOT!',
    vehicleDestroyed: 'Vehicle Destroyed!',
    driveBy: 'DRIVE-BY',
    weaponSwitch: 'GUN',
    damageLabel: 'Damage',
    rangeLabel: 'Range',
    mafiaEmpire: 'Mafia Empire',
    empireSafe: 'Empire Safe',
    collectCash: 'Collect',
    properties: 'Homes & Businesses',
    robBank: 'Rob Bank Vault',
    robRegister: 'Rob Register',
    sellStolenCar: 'Chop-Shop Sell',
    summonMafiaCrew: 'Mafia Bodyguards',
    wasted: 'WASTED',
    busted: 'BUSTED',
    penthousePerks: 'Penthouse Syndicate Perks',
    freePerk: 'FREE',
  },
  bn: {
    gameTitle: 'জিটিএ ঢাকা',
    gameSubtitle: 'সিটি অব কেওস',
    phaseBadge: 'ওপেন ওয়ার্ল্ড আপগ্রেড · গুলশান ও হাতিরঝিল সেক্টর',
    playNow: 'ঢাকায় প্রবেশ করুন',
    resumeGame: 'খেলা চালান',
    pauseTitle: 'বিরতি',
    settings: 'সেটিংস',
    controls: 'কন্ট্রোল',
    worldMap: 'ঢাকা ম্যাপ ও জিপিএস',
    language: 'ভাষা',
    graphicsQuality: 'গ্রাফিক্স কোয়ালিটি',
    trafficDensity: 'ট্রাফিক ঘনত্ব',
    timeOfDay: 'দিনের সময়',
    audio: 'সাউন্ড এফেক্ট',
    audioVolume: 'সাউন্ড ভলিউম',
    on: 'চালু',
    off: 'বন্ধ',
    showFps: 'এফপিএস কাউন্টার',
    saveGame: 'সেভ করুন',
    resetPosition: 'গুলশানে ফিরুন',
    savedNotice: 'গেমের অগ্রগতি সেভ হয়েছে।',
    resetNotice: 'গুলশান এভিনিউতে ফিরে এসেছেন।',
    enterVehicle: 'গাড়িতে উঠুন',
    exitVehicle: 'নামুন',
    sprint: 'দৌড়ান',
    jump: 'লাফ',
    horn: 'হর্ন',
    camera: 'ক্যামেরা',
    gas: 'গ্যাস',
    brake: 'ব্রেক',
    reverse: 'রিভার্স',
    drift: 'হ্যান্ডব্রেক',
    kmh: 'কিমি/ঘ',
    dawn: 'ভোর',
    noon: 'দুপুর',
    sunset: 'সন্ধ্যা',
    night: 'রাত',
    timeFlow: 'সময়',
    pausedFlow: 'স্থির',
    normalFlow: 'চলমান',
    tapMapHint: 'জিপিএস দেখতে ট্যাপ করুন',
    close: 'বন্ধ',
    controlsDesktopTitle: 'কিবোর্ড ও মাউস',
    controlsMobileTitle: 'অ্যান্ড্রয়েড / টাচ',
    controlsMove: 'W A S D / অ্যারো — হাঁটা বা গাড়ি চালানো',
    controlsSprintJump: 'Shift — দৌড় · Space — লাফ / হ্যান্ডব্রেক',
    controlsVehicle: 'F বা E — ইন্টার‍্যাক্ট (গাড়ি, ভবন, দোকান, এনপিসি)',
    controlsCamera: 'স্ক্রিন ড্র্যাগ — ক্যামেরা ঘোরান · C — ভিউ বদলান',
    controlsHornPause: 'H — হর্ন · I — ইনভেন্টরি · J — মিশন · M — ম্যাপ · Esc — বিরতি',
    controlsMobileMove: 'মোড A: জয়স্টিক · মোড B: বাম/ডান অ্যারো বাটন',
    controlsMobileLook: 'খালি স্ক্রিন ড্র্যাগ — ৩৬০° ক্যামেরা ঘোরান',
    controlsMobileDrive: 'ডান বাটন — গ্যাস, ব্রেক, রিভার্স, হ্যান্ডব্রেক, ইন্টার‍্যাক্ট',
    objectiveLabel: 'ফ্রি রোম',
    objectiveText: 'যেকোনো গাড়ি চালান, দোকান ও ভবনে প্রবেশ করুন এবং ঢাকার মিশন সম্পন্ন করুন',
    drivingMode: 'ড্রাইভিং কন্ট্রোল',
    modeJoystick: 'মোড A: জয়স্টিক',
    modeButtons: 'মোড B: অ্যারো',
    drivingAssist: 'ড্রাইভিং অ্যাসিস্ট',
    speedLimiter: 'স্পিড লিমিটার',
    steeringSens: 'স্টিয়ারিং সেন্সিটিভিটি',
    accelScale: 'অ্যাক্সিলারেশন',
    brakeScale: 'ব্রেকিং পাওয়ার',
    cameraSens: 'ক্যামেরা সেন্সিটিভিটি',
    inventory: 'ইনভেন্টরি',
    missions: 'মিশন',
    shop: 'দোকান',
    garage: 'অটো গ্যারেজ',
    dealership: 'গাড়ির শোরুম',
    buy: 'কিনুন',
    owned: 'সংগ্রহে আছে',
    equip: 'পরুন',
    equipped: 'পরা আছে',
    useItem: 'ব্যবহার করুন',
    tryOn: 'ট্রাই করুন',
    repairVehicle: 'গাড়ি মেরামত',
    paintVehicle: 'রঙ বদলান',
    upgradeEngine: 'ইঞ্জিন আপগ্রেড',
    saveVehicle: 'গ্যারেজে সেভ করুন',
    deliverVehicle: 'বাইরে আনুন',
    noVehicleNearby: 'কাস্টমাইজ করতে গ্যারেজের সামনে একটি গাড়ি আনুন।',
    notEnoughMoney: 'পর্যাপ্ত টাকা (৳) নেই।',
    purchasedNotice: 'কেনা হয়েছে',
    startMission: 'মিশন শুরু',
    cancelMission: 'বাতিল',
    replayMission: 'আবার খেলুন',
    retryMission: 'পুনরায় চেষ্টা',
    missionComplete: 'মিশন সম্পন্ন',
    missionFailed: 'মিশন ব্যর্থ',
    difficulty: 'কঠিনতা',
    reward: 'পুরস্কার',
    active: 'চলমান',
    completed: 'সম্পন্ন',
    gpsRoute: 'জিপিএস রুট',
    clearGps: 'জিপিএস মুছুন',
    tapToSetGps: 'জিপিএস সেট করতে ম্যাপের যেকোনো জায়গায় ট্যাপ করুন',
    wantedEvading: 'পুলিশ থেকে পালাচ্ছেন',
    wantedPursuit: 'ঢাকা পুলিশ ধাওয়া',
    unlockingVehicle: 'গাড়ি আনলক হচ্ছে...',
    outfits: 'পোশাক',
    items: 'খাবার ও আইটেম',
    myVehicles: 'নিজস্ব গাড়ি',
    emptyInventory: 'কোনো আইটেম নেই। দোকান বা রেস্টুরেন্ট থেকে কিনুন।',
    eatHealed: 'স্বাস্থ্য ফিরেছে',
    hospitalHealed: 'সম্পূর্ণ চিকিৎসা সম্পন্ন হয়েছে।',
    safeHouseSaved: 'সেফ হাউসে বিশ্রাম ও সেভ হয়েছে।',
    leftSteer: 'বাম',
    rightSteer: 'ডান',
    phone: 'ফোন',
    phoneTitle: 'ঢাকাওএস স্মার্টফোন',
    radioFm: 'ঢাকা এফএম রেডিও',
    radioOff: 'রেডিও বন্ধ',
    radioLofi: '৯৪.৬ গুলশান লো-ফাই',
    radioSynth: '১০১.২ হাতিরঝিল সিন্থ',
    radioStreet: '৮৮.৮ ঢাকা স্ট্রিট বিটস',
    weather: 'আবহাওয়া',
    weatherClear: 'পরিষ্কার',
    weatherRain: 'বর্ষা বৃষ্টি',
    weatherStorm: 'ঝড়-বৃষ্টি',
    weatherAuto: 'অটো আবহাওয়া',
    nitro: 'নাইট্রো',
    photoMode: 'ফটো মোড',
    exitPhotoMode: 'ফটো মোড বন্ধ',
    fullscreen: 'ফুলস্ক্রিন',
    emergencyServices: 'জরুরি সেবা',
    clearWantedService: 'পুলিশ ক্লিয়ার (৳ ১,৫০০)',
    medDropService: 'মেড-ড্রপ +৫০ HP (৳ ৪০০)',
    quickGps: 'দ্রুত জিপিএস',
    quickRide: 'গাড়ি আনুন',
    specOpsHq: 'স্পেশাল অপস হেডকোয়ার্টার',
    specOpsTitle: 'স্পেশাল অপারেশনস',
    sideActivities: 'সাইড অ্যাক্টিভিটি',
    missionHistory: 'মিশন হিস্ট্রি',
    squadManagement: 'স্কোয়াড কন্ট্রোল',
    emergencyAlerts: 'জরুরি অ্যালার্ট',
    playerStats: 'প্লেয়ার স্ট্যাটস',
    squadFollow: 'ফলো',
    squadHold: 'হোল্ড',
    squadObjective: 'লক্ষ্য',
    squadRegroup: 'রিগ্রুপ',
    squadProtect: 'সুরক্ষা',
    subdueHostile: 'সন্ত্রাসী দমন',
    inspectClue: 'প্রমাণ দেখুন',
    lockedPrereq: 'আগে পূর্বের মিশন সম্পন্ন করুন',
    completionRate: 'সম্পন্ন',
    tutorialTitle: 'ঢাকা কুইক গাইড',
    skipTutorial: 'টিউটোরিয়াল বাদ দিন',
    optionalObj: 'বোনাস',
    civiliansLabel: 'নাগরিক',
    hostilesLabel: 'হামলাকারী',
    cluesLabel: 'প্রমাণ',
    armoryTitle: 'ট্যাকটিক্যাল পোশাক ও গিয়ার',
    briefingLabel: 'মিশন ব্রিফিং',
    deployMission: 'স্কোয়াড নিয়ে শুরু করুন',
    rankLabel: 'র‍্যাংক',
    tutorialComplete: 'ঢাকা কুইক গাইড সম্পন্ন! এবার মুক্তভাবে ঘুরুন।',
    squadCommandTitle: 'স্কোয়াড নির্দেশ',
    squadStatus: 'স্কোয়াড',
    lockedReward: 'লক করা',
    openOpsTerminal: 'অপারেশনস টার্মিনাল',
    openArmory: 'ট্যাকটিক্যাল আর্মোরি',
    hqResultsBoard: 'ফলাফল বোর্ড',
    completionProgress: 'সম্পন্ন',
    optionalBonus: 'বোনাস লক্ষ্য',
    prerequisiteLocked: 'আগে অপারেশন ০১ ও ০২ সম্পন্ন করুন',
    deployOperation: 'স্কোয়াড নিয়ে শুরু করুন',
    cooldownLabel: 'কুলডাউন',
    civiliansSafe: 'নিরাপদ নাগরিক',
    hostilesLeft: 'হামলাকারী',
    cluesFound: 'তথ্য/প্রমাণ',
    emergencyAlertsApp: 'ঢাকা জরুরি অ্যালার্ট',
    respondAlert: 'অভিযান শুরু',
    squadApp: 'স্পেশাল অপস স্কোয়াড',
    missionHistoryApp: 'মিশন হিস্ট্রি',
    playerStatsApp: 'প্লেয়ার পরিসংখ্যান',
    bestTime: 'সেরা সময়',
    weaponWheel: 'ওয়েপন হুইল (অস্ত্র)',
    fire: 'গুলি',
    punch: 'ঘুষি',
    aim: 'এইম',
    reload: 'রিলোড',
    reloading: 'রিলোড হচ্ছে...',
    refillAmmo: 'সব গুলি রিফিল (৳ ১,২০০)',
    ammoRefilled: 'সব অস্ত্রের গুলি ফুল করা হয়েছে!',
    gtaClassicCat: 'GTA হেইস্ট',
    headshot: 'হেডশট!',
    vehicleDestroyed: 'গাড়ি বিস্ফোরিত হয়েছে!',
    driveBy: 'ড্রাইভ-বাই',
    weaponSwitch: 'অস্ত্র',
    damageLabel: 'ড্যামেজ',
    rangeLabel: 'রেঞ্জ',
    mafiaEmpire: 'মাফিয়া সাম্রাজ্য',
    empireSafe: 'সাম্রাজ্য ভল্ট',
    collectCash: 'সংগ্রহ',
    properties: 'বাড়ি ও ব্যবসা',
    robBank: 'ব্যাংক ভল্ট লুট',
    robRegister: 'ক্যাশ লুট করুন',
    sellStolenCar: 'চুরি গাড়ি বিক্রি',
    summonMafiaCrew: 'মাফিয়া বডিগার্ড',
    wasted: 'ওয়েস্টেড',
    busted: 'আটক হয়েছেন',
    penthousePerks: 'পেন্টহাউস সুবিধা',
    freePerk: 'ফ্রি',
  },
};
