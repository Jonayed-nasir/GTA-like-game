/**
 * Official Administrative Atlas of Bangladesh — Phase 2 Open-World Foundation.
 * Contains all 8 official divisions and all 64 official districts of Bangladesh.
 *
 * STRICT HONESTY RULE:
 * Only regions with real playable 3D terrain, roads, and interactions are marked `playable`.
 * Planned expansion regions (starting with Faridpur District in Phase 3) are explicitly
 * marked `planned_phase3` or `planned` — never presented as fake playable zones.
 */

export type DivisionId =
  | 'dhaka'
  | 'chattogram'
  | 'rajshahi'
  | 'khulna'
  | 'barishal'
  | 'sylhet'
  | 'rangpur'
  | 'mymensingh';

export type RegionalBiome =
  | 'urban_megacity'
  | 'riverine_delta'
  | 'coastal_port'
  | 'tea_hills'
  | 'barind_agri'
  | 'mangrove_coastal'
  | 'northern_plains'
  | 'haor_greenery';

export type RegionPlayabilityStatus = 'playable' | 'planned_phase3' | 'planned';

export interface BangladeshDivisionDef {
  id: DivisionId;
  nameEn: string;
  nameBn: string;
  biome: RegionalBiome;
  climateNoteEn: string;
  climateNoteBn: string;
  accentColor: string;
  highwayCorridors: string[];
  majorRivers: string[];
}

export interface BangladeshDistrictDef {
  id: string;
  divisionId: DivisionId;
  nameEn: string;
  nameBn: string;
  hqEn: string;
  hqBn: string;
  biome: RegionalBiome;
  status: RegionPlayabilityStatus;
  sampleUpazilasEn: string[];
  sampleUpazilasBn: string[];
  hasRailway: boolean;
  hasAirport: boolean;
  hasFerryPort: boolean;
  highwayLinks: string[];
}

export const BANGLADESH_DIVISIONS: BangladeshDivisionDef[] = [
  {
    id: 'dhaka',
    nameEn: 'Dhaka Division',
    nameBn: 'ঢাকা বিভাগ',
    biome: 'urban_megacity',
    climateNoteEn: 'Dense capital metropolis, Padma river bridges & central delta',
    climateNoteBn: 'ঘনবসতিপূর্ণ রাজধানী মহানগরী, পদ্মা ব্রিজ ও মধ্যাঞ্চলীয় বদ্বীপ',
    accentColor: '#f59e0b',
    highwayCorridors: ['N1', 'N2', 'N3', 'N4', 'N5', 'N8'],
    majorRivers: ['Buriganga', 'Turag', 'Shitalakshya', 'Padma', 'Dhaleshwari'],
  },
  {
    id: 'chattogram',
    nameEn: 'Chattogram Division',
    nameBn: 'চট্টগ্রাম বিভাগ',
    biome: 'coastal_port',
    climateNoteEn: 'Maritime port city, hill tracts, Bay of Bengal coastline',
    climateNoteBn: 'সমুদ্র বন্দর, পার্বত্য অঞ্চল ও বঙ্গোপসাগর উপকূল',
    accentColor: '#06b6d4',
    highwayCorridors: ['N1', 'N102', 'N104'],
    majorRivers: ['Karnaphuli', 'Meghna', 'Sangu', 'Feni'],
  },
  {
    id: 'rajshahi',
    nameEn: 'Rajshahi Division',
    nameBn: 'রাজশাহী বিভাগ',
    biome: 'barind_agri',
    climateNoteEn: 'Barind agricultural plains, mango orchards & Jamuna crossing',
    climateNoteBn: 'বরেন্দ্র কৃষিভূমি, আমবাগান ও যমুনা সংযোগ',
    accentColor: '#eab308',
    highwayCorridors: ['N5', 'N6'],
    majorRivers: ['Padma', 'Jamuna', 'Atrai', 'Mahananda'],
  },
  {
    id: 'khulna',
    nameEn: 'Khulna Division',
    nameBn: 'খুলনা বিভাগ',
    biome: 'mangrove_coastal',
    climateNoteEn: 'Sundarbans mangrove waterways, Mongla port & tidal rivers',
    climateNoteBn: 'সুন্দরবন ম্যানগ্রোভ জলপথ, মোংলা বন্দর ও জোয়ার-ভাটার নদী',
    accentColor: '#10b981',
    highwayCorridors: ['N7', 'N704'],
    majorRivers: ['Rupsha', 'Bhairab', 'Pasur', 'Madhumati'],
  },
  {
    id: 'barishal',
    nameEn: 'Barishal Division',
    nameBn: 'বরিশাল বিভাগ',
    biome: 'riverine_delta',
    climateNoteEn: 'Extensive launch & ferry river network, canals & coastal delta',
    climateNoteBn: 'বিস্তৃত লঞ্চ ও ফেরি নদীপথ, খাল ও উপকূলীয় বদ্বীপ',
    accentColor: '#38bdf8',
    highwayCorridors: ['N8'],
    majorRivers: ['Kirtankhola', 'Meghna', 'Tetulia', 'Bishkhali'],
  },
  {
    id: 'sylhet',
    nameEn: 'Sylhet Division',
    nameBn: 'সিলেট বিভাগ',
    biome: 'tea_hills',
    climateNoteEn: 'Green rolling tea gardens, haor wetlands & heavy monsoon rain',
    climateNoteBn: 'সবুজ চা বাগান, হাওর ও প্রবল বর্ষা',
    accentColor: '#22c55e',
    highwayCorridors: ['N2'],
    majorRivers: ['Surma', 'Kushiyara', 'Khowai'],
  },
  {
    id: 'rangpur',
    nameEn: 'Rangpur Division',
    nameBn: 'রংপুর বিভাগ',
    biome: 'northern_plains',
    climateNoteEn: 'Northern agricultural fields, winter fog & Teesta plains',
    climateNoteBn: 'উত্তরাঞ্চলীয় কৃষি মাঠ, শীতের কুয়াশা ও তিস্তা অববাহিকা',
    accentColor: '#a855f7',
    highwayCorridors: ['N5', 'N509'],
    majorRivers: ['Teesta', 'Brahmaputra', 'Dharla', 'Karatoya'],
  },
  {
    id: 'mymensingh',
    nameEn: 'Mymensingh Division',
    nameBn: 'ময়মনসিংহ বিভাগ',
    biome: 'haor_greenery',
    climateNoteEn: 'Old Brahmaputra river, rural greenery & Garo hill foothills',
    climateNoteBn: 'পুরাতন ব্রহ্মপুত্র নদ, গ্রামীণ সবুজ ও গারো পাহাড়ের পাদদেশ',
    accentColor: '#84cc16',
    highwayCorridors: ['N3', 'N4'],
    majorRivers: ['Old Brahmaputra', 'Kangsha', 'Someshwari'],
  },
];

function makeDistrict(
  id: string,
  divisionId: DivisionId,
  nameEn: string,
  nameBn: string,
  biome: RegionalBiome,
  opts?: Partial<BangladeshDistrictDef>
): BangladeshDistrictDef {
  return {
    id,
    divisionId,
    nameEn,
    nameBn,
    hqEn: opts?.hqEn ?? `${nameEn} Sadar`,
    hqBn: opts?.hqBn ?? `${nameBn} সদর`,
    biome,
    status: opts?.status ?? 'planned',
    sampleUpazilasEn: opts?.sampleUpazilasEn ?? [`${nameEn} Sadar`],
    sampleUpazilasBn: opts?.sampleUpazilasBn ?? [`${nameBn} সদর`],
    hasRailway: opts?.hasRailway ?? true,
    hasAirport: opts?.hasAirport ?? false,
    hasFerryPort: opts?.hasFerryPort ?? false,
    highwayLinks: opts?.highwayLinks ?? [],
  };
}

/**
 * Complete, official list of all 64 Districts of Bangladesh across all 8 Divisions.
 * Count check:
 * Dhaka (13) + Chattogram (11) + Rajshahi (8) + Khulna (10)
 * + Barishal (6) + Sylhet (4) + Rangpur (8) + Mymensingh (4) = 64 Districts.
 */
export const BANGLADESH_DISTRICTS: BangladeshDistrictDef[] = [
  // 1. DHAKA DIVISION (13 Districts)
  makeDistrict('dhaka', 'dhaka', 'Dhaka', 'ঢাকা', 'urban_megacity', {
    status: 'playable',
    hqEn: 'Dhaka City',
    hqBn: 'ঢাকা মহানগরী',
    sampleUpazilasEn: ['Gulshan', 'Banani', 'Mohakhali', 'Hatirjheel', 'Dhamrai', 'Savar', 'Keraniganj'],
    sampleUpazilasBn: ['গুলশান', 'বনানী', 'মহাখালী', 'হাতিরঝিল', 'ধামরাই', 'সাভার', 'কেরানীগঞ্জ'],
    hasRailway: true,
    hasAirport: true,
    hasFerryPort: true,
    highwayLinks: ['N1', 'N2', 'N3', 'N5', 'N8'],
  }),
  makeDistrict('faridpur', 'dhaka', 'Faridpur', 'ফরিদপুর', 'riverine_delta', {
    status: 'planned_phase3',
    sampleUpazilasEn: ['Faridpur Sadar', 'Bhanga', 'Boalmari', 'Nagarkanda', 'Sadarpur', 'Charbhadrasan'],
    sampleUpazilasBn: ['ফরিদপুর সদর', 'ভাঙ্গা', 'বোয়ালমারী', 'নগরকান্দা', 'সদরপুর', 'চরভদ্রাসন'],
    hasRailway: true,
    hasFerryPort: true,
    highwayLinks: ['N7', 'N8', 'N804'],
  }),
  makeDistrict('gazipur', 'dhaka', 'Gazipur', 'গাজীপুর', 'urban_megacity', {
    sampleUpazilasEn: ['Gazipur Sadar', 'Kaliakair', 'Sreepur', 'Kapasia', 'Kaliganj'],
    sampleUpazilasBn: ['গাজীপুর সদর', 'কালিয়াকৈর', 'শ্রীপুর', 'কাপাসিয়া', 'কালীগঞ্জ'],
    highwayLinks: ['N3', 'N4'],
  }),
  makeDistrict('gopalganj', 'dhaka', 'Gopalganj', 'গোপালগঞ্জ', 'riverine_delta', {
    sampleUpazilasEn: ['Gopalganj Sadar', 'Tungipara', 'Kotalipara', 'Kashiani', 'Muksudpur'],
    sampleUpazilasBn: ['গোপালগঞ্জ সদর', 'টুঙ্গিপাড়া', 'কোটালীপাড়া', 'কাশিয়ানী', 'মুকসুদপুর'],
    hasFerryPort: true,
    highwayLinks: ['N805'],
  }),
  makeDistrict('kishoreganj', 'dhaka', 'Kishoreganj', 'কিশোরগঞ্জ', 'haor_greenery', {
    sampleUpazilasEn: ['Kishoreganj Sadar', 'Bhairab', 'Itna', 'Mithamain', 'Austagram'],
    sampleUpazilasBn: ['কিশোরগঞ্জ সদর', 'ভৈরব', 'ইটনা', 'মিঠামইন', 'অষ্টগ্রাম'],
    hasFerryPort: true,
    highwayLinks: ['N2'],
  }),
  makeDistrict('madaripur', 'dhaka', 'Madaripur', 'মাদারীপুর', 'riverine_delta', {
    sampleUpazilasEn: ['Madaripur Sadar', 'Shibchar', 'Kalkini', 'Rajoir'],
    sampleUpazilasBn: ['মাদারীপুর সদর', 'শিবচর', 'কালকিনি', 'রাজৈর'],
    hasRailway: false,
    hasFerryPort: true,
    highwayLinks: ['N8'],
  }),
  makeDistrict('manikganj', 'dhaka', 'Manikganj', 'মানিকগঞ্জ', 'riverine_delta', {
    sampleUpazilasEn: ['Manikganj Sadar', 'Shivalaya (Paturia)', 'Singair', 'Ghior'],
    sampleUpazilasBn: ['মানিকগঞ্জ সদর', 'শিবালয় (পাটুরিয়া)', 'সিংগাইর', 'ঘিওর'],
    hasRailway: false,
    hasFerryPort: true,
    highwayLinks: ['N5'],
  }),
  makeDistrict('munshiganj', 'dhaka', 'Munshiganj', 'মুন্সীগঞ্জ', 'riverine_delta', {
    sampleUpazilasEn: ['Munshiganj Sadar', 'Lohajang (Mawa)', 'Sreenagar', 'Sirajdikhan'],
    sampleUpazilasBn: ['মুন্সীগঞ্জ সদর', 'লৌহজং (মাওয়া)', 'শ্রীনগর', 'সিরাজদিখান'],
    hasFerryPort: true,
    highwayLinks: ['N8'],
  }),
  makeDistrict('narayanganj', 'dhaka', 'Narayanganj', 'নারায়ণগঞ্জ', 'urban_megacity', {
    sampleUpazilasEn: ['Narayanganj Sadar', 'Sonargaon', 'Rupganj', 'Bandar', 'Araihazar'],
    sampleUpazilasBn: ['নারায়ণগঞ্জ সদর', 'সোনারগাঁও', 'রূপগঞ্জ', 'বন্দর', 'আড়াইহাজার'],
    hasFerryPort: true,
    highwayLinks: ['N1', 'N2'],
  }),
  makeDistrict('narsingdi', 'dhaka', 'Narsingdi', 'নরসিংদী', 'riverine_delta', {
    sampleUpazilasEn: ['Narsingdi Sadar', 'Belabo', 'Palash', 'Raipura', 'Shibpur'],
    sampleUpazilasBn: ['নরসিংদী সদর', 'বেলাব', 'পলাশ', 'রায়পুরা', 'শিবপুর'],
    highwayLinks: ['N2'],
  }),
  makeDistrict('rajbari', 'dhaka', 'Rajbari', 'রাজবাড়ী', 'riverine_delta', {
    sampleUpazilasEn: ['Rajbari Sadar', 'Goalanda (Daulatdia)', 'Pangsha', 'Baliakandi'],
    sampleUpazilasBn: ['রাজবাড়ী সদর', 'গোয়ালন্দ (দৌলতদিয়া)', 'পাংশা', 'বালিয়াকান্দি'],
    hasFerryPort: true,
    highwayLinks: ['N7'],
  }),
  makeDistrict('shariatpur', 'dhaka', 'Shariatpur', 'শরীয়তপুর', 'riverine_delta', {
    sampleUpazilasEn: ['Shariatpur Sadar', 'Zajira', 'Naria', 'Bhedarganj'],
    sampleUpazilasBn: ['শরীয়তপুর সদর', 'জাজিরা', 'নড়িয়া', 'ভেদরগঞ্জ'],
    hasRailway: false,
    hasFerryPort: true,
    highwayLinks: ['N8'],
  }),
  makeDistrict('tangail', 'dhaka', 'Tangail', 'টাঙ্গাইল', 'haor_greenery', {
    sampleUpazilasEn: ['Tangail Sadar', 'Mirzapur', 'Kalihati', 'Madhupur', 'Bhuapur'],
    sampleUpazilasBn: ['টাঙ্গাইল সদর', 'মির্জাপুর', 'কালিহাতী', 'মধুপুর', 'ভুঞাপুর'],
    highwayLinks: ['N4', 'N405'],
  }),

  // 2. CHATTOGRAM DIVISION (11 Districts)
  makeDistrict('chattogram', 'chattogram', 'Chattogram', 'চট্টগ্রাম', 'coastal_port', {
    sampleUpazilasEn: ['Chattogram City', 'Sitakunda', 'Mirsharai', 'Patiya', 'Anwara'],
    sampleUpazilasBn: ['চট্টগ্রাম মহানগরী', 'সীতাকুণ্ড', 'মীরসরাই', 'পটিয়া', 'আনোয়ারা'],
    hasAirport: true,
    hasFerryPort: true,
    highwayLinks: ['N1'],
  }),
  makeDistrict('coxs_bazar', 'chattogram', "Cox's Bazar", 'কক্সবাজার', 'coastal_port', {
    sampleUpazilasEn: ["Cox's Bazar Sadar", 'Teknaf', 'Ukhiya', 'Chakaria', 'Maheshkhali'],
    sampleUpazilasBn: ['কক্সবাজার সদর', 'টেকনাফ', 'উখিয়া', 'চকরিয়া', 'মহেশখালী'],
    hasAirport: true,
    hasFerryPort: true,
    highwayLinks: ['N1'],
  }),
  makeDistrict('bandarban', 'chattogram', 'Bandarban', 'বান্দরবান', 'tea_hills', {
    hasRailway: false,
    sampleUpazilasEn: ['Bandarban Sadar', 'Thanchi', 'Ruma', 'Lama'],
    sampleUpazilasBn: ['বান্দরবান সদর', 'থানচি', 'রুমা', 'লামা'],
  }),
  makeDistrict('brahmanbaria', 'chattogram', 'Brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'riverine_delta', {
    sampleUpazilasEn: ['Brahmanbaria Sadar', 'Ashuganj', 'Akhaura', 'Kasba'],
    sampleUpazilasBn: ['ব্রাহ্মণবাড়িয়া সদর', 'আশুগঞ্জ', 'আখাউড়া', 'কসবা'],
    hasFerryPort: true,
    highwayLinks: ['N2', 'N102'],
  }),
  makeDistrict('chandpur', 'chattogram', 'Chandpur', 'চাঁদপুর', 'riverine_delta', {
    sampleUpazilasEn: ['Chandpur Sadar', 'Matlab Uttar', 'Hajiganj', 'Faridganj'],
    sampleUpazilasBn: ['চাঁদপুর সদর', 'মতলব উত্তর', 'হাজীগঞ্জ', 'ফরিদগঞ্জ'],
    hasFerryPort: true,
  }),
  makeDistrict('cumilla', 'chattogram', 'Cumilla', 'কুমিল্লা', 'riverine_delta', {
    sampleUpazilasEn: ['Cumilla Sadar', 'Daudkandi', 'Chauddagram', 'Laksam'],
    sampleUpazilasBn: ['কুমিল্লা সদর', 'দাউদকান্দি', 'চৌদ্দগ্রাম', 'লাকসাম'],
    highwayLinks: ['N1', 'N102'],
  }),
  makeDistrict('feni', 'chattogram', 'Feni', 'ফেনী', 'coastal_port', {
    sampleUpazilasEn: ['Feni Sadar', 'Chhagalnaiya', 'Sonagazi', 'Daganbhuiyan'],
    sampleUpazilasBn: ['ফেনী সদর', 'ছাগলনাইয়া', 'সোনাগাজী', 'দাগনভূঞা'],
    highwayLinks: ['N1', 'N104'],
  }),
  makeDistrict('khagrachhari', 'chattogram', 'Khagrachhari', 'খাগড়াছড়ি', 'tea_hills', {
    hasRailway: false,
    sampleUpazilasEn: ['Khagrachhari Sadar', 'Dighinala', 'Ramgarh', 'Matiranga'],
    sampleUpazilasBn: ['খাগড়াছড়ি সদর', 'দীঘিনালা', 'রামগড়', 'মাটিরাঙ্গা'],
  }),
  makeDistrict('lakshmipur', 'chattogram', 'Lakshmipur', 'লক্ষ্মীপুর', 'coastal_port', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati'],
    sampleUpazilasBn: ['লক্ষ্মীপুর সদর', 'রায়পুর', 'রামগঞ্জ', 'রামগতি'],
  }),
  makeDistrict('noakhali', 'chattogram', 'Noakhali', 'নোয়াখালী', 'coastal_port', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Noakhali Sadar', 'Begumganj', 'Hatiya', 'Subarnachar'],
    sampleUpazilasBn: ['নোয়াখালী সদর', 'বেগমগঞ্জ', 'হাতিয়া', 'সুবর্ণচর'],
  }),
  makeDistrict('rangamati', 'chattogram', 'Rangamati', 'রাঙ্গামাটি', 'tea_hills', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Rangamati Sadar', 'Kaptai', 'Baghaichhari', 'Langadu'],
    sampleUpazilasBn: ['রাঙ্গামাটি সদর', 'কাপ্তাই', 'বাঘাইছড়ি', 'লংগদু'],
  }),

  // 3. RAJSHAHI DIVISION (8 Districts)
  makeDistrict('rajshahi', 'rajshahi', 'Rajshahi', 'রাজশাহী', 'barind_agri', {
    hasAirport: true,
    sampleUpazilasEn: ['Rajshahi City', 'Paba', 'Godagari', 'Bagha', 'Puthia'],
    sampleUpazilasBn: ['রাজশাহী মহানগরী', 'পবা', 'গোদাগাড়ী', 'বাঘা', 'পুঠিয়া'],
    highwayLinks: ['N6'],
  }),
  makeDistrict('bogura', 'rajshahi', 'Bogura', 'বগুড়া', 'barind_agri', {
    sampleUpazilasEn: ['Bogura Sadar', 'Sherpur', 'Shibganj (Mahasthangarh)', 'Sariakandi'],
    sampleUpazilasBn: ['বগুড়া সদর', 'শেরপুর', 'শিবগঞ্জ (মহাস্থানগড়)', 'সারিয়াকান্দি'],
    highwayLinks: ['N5'],
  }),
  makeDistrict('chapainawabganj', 'rajshahi', 'Chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'barind_agri', {
    sampleUpazilasEn: ['Chapainawabganj Sadar', 'Shibganj', 'Gomastapur', 'Nachole'],
    sampleUpazilasBn: ['চাঁপাইনবাবগঞ্জ সদর', 'শিবগঞ্জ', 'গোমস্তাপুর', 'নাচোল'],
  }),
  makeDistrict('joypurhat', 'rajshahi', 'Joypurhat', 'জয়পুরহাট', 'barind_agri', {
    sampleUpazilasEn: ['Joypurhat Sadar', 'Panchbibi', 'Akkelpur', 'Kalai'],
    sampleUpazilasBn: ['জয়পুরহাট সদর', 'পাঁচবিবি', 'আক্কেলপুর', 'কালাই'],
  }),
  makeDistrict('naogaon', 'rajshahi', 'Naogaon', 'নওগাঁ', 'barind_agri', {
    sampleUpazilasEn: ['Naogaon Sadar', 'Badalgachhi (Paharpur)', 'Manda', 'Sapahar'],
    sampleUpazilasBn: ['নওগাঁ সদর', 'বদলগাছী (পাহাড়পুর)', 'মান্দা', 'সাপাহার'],
  }),
  makeDistrict('natore', 'rajshahi', 'Natore', 'নাটোর', 'barind_agri', {
    sampleUpazilasEn: ['Natore Sadar', 'Singra', 'Baraigram', 'Lalpur'],
    sampleUpazilasBn: ['নাটোর সদর', 'সিংড়া', 'বড়াইগ্রাম', 'লালপুর'],
    highwayLinks: ['N6'],
  }),
  makeDistrict('pabna', 'rajshahi', 'Pabna', 'পাবনা', 'riverine_delta', {
    hasAirport: true,
    hasFerryPort: true,
    sampleUpazilasEn: ['Pabna Sadar', 'Ishwardi', 'Bera', 'Sujanagar'],
    sampleUpazilasBn: ['পাবনা সদর', 'ঈশ্বরদী', 'বেড়া', 'সুজানগর'],
    highwayLinks: ['N6'],
  }),
  makeDistrict('sirajganj', 'rajshahi', 'Sirajganj', 'সিরাজগঞ্জ', 'riverine_delta', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Sirajganj Sadar', 'Shahjadpur', 'Ullapara', 'Kamarkhanda'],
    sampleUpazilasBn: ['সিরাজগঞ্জ সদর', 'শাহজাদপুর', 'উল্লাপাড়া', 'কামারখন্দ'],
    highwayLinks: ['N5'],
  }),

  // 4. KHULNA DIVISION (10 Districts)
  makeDistrict('khulna', 'khulna', 'Khulna', 'খুলনা', 'mangrove_coastal', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Khulna City', 'Dumuria', 'Dacope', 'Koyra', 'Rupsha'],
    sampleUpazilasBn: ['খুলনা মহানগরী', 'ডুমুরিয়া', 'দাকোপ', 'কয়রা', 'রূপসা'],
    highwayLinks: ['N7'],
  }),
  makeDistrict('bagerhat', 'khulna', 'Bagerhat', 'বাগেরহাট', 'mangrove_coastal', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Bagerhat Sadar', 'Mongla', 'Rampal', 'Sarankhola'],
    sampleUpazilasBn: ['বাগেরহাট সদর', 'মোংলা', 'রামপাল', 'শরণখোলা'],
    highwayLinks: ['N7'],
  }),
  makeDistrict('chuadanga', 'khulna', 'Chuadanga', 'চুয়াডাঙ্গা', 'barind_agri', {
    sampleUpazilasEn: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
    sampleUpazilasBn: ['চুয়াডাঙ্গা সদর', 'আলমডাঙ্গা', 'দামুড়হুদা', 'জীবননগর'],
  }),
  makeDistrict('jashore', 'khulna', 'Jashore', 'যশোর', 'barind_agri', {
    hasAirport: true,
    sampleUpazilasEn: ['Jashore Sadar', 'Benapole (Sharsha)', 'Jhikargachha', 'Abhaynagar'],
    sampleUpazilasBn: ['যশোর সদর', 'বেনাপোল (শার্শা)', 'ঝিকরগাছা', 'অভয়নগর'],
    highwayLinks: ['N7', 'N706'],
  }),
  makeDistrict('jhenaidah', 'khulna', 'Jhenaidah', 'ঝিনাইদহ', 'barind_agri', {
    hasRailway: false,
    sampleUpazilasEn: ['Jhenaidah Sadar', 'Kaliganj', 'Shailkupa', 'Kotchandpur'],
    sampleUpazilasBn: ['ঝিনাইদহ সদর', 'কালীগঞ্জ', 'শৈলকুপা', 'কোটচাঁদপুর'],
    highwayLinks: ['N7'],
  }),
  makeDistrict('kushtia', 'khulna', 'Kushtia', 'কুষ্টিয়া', 'riverine_delta', {
    sampleUpazilasEn: ['Kushtia Sadar', 'Kumarkhali', 'Bheramara', 'Daulatpur'],
    sampleUpazilasBn: ['কুষ্টিয়া সদর', 'কুমারখালী', 'ভেড়ামারা', 'দৌলতপুর'],
    highwayLinks: ['N704'],
  }),
  makeDistrict('magura', 'khulna', 'Magura', 'মাগুরা', 'riverine_delta', {
    hasRailway: false,
    sampleUpazilasEn: ['Magura Sadar', 'Sreepur', 'Mohammadpur', 'Shalikha'],
    sampleUpazilasBn: ['মাগুরা সদর', 'শ্রীপুর', 'মহম্মদপুর', 'শালিখা'],
    highwayLinks: ['N7'],
  }),
  makeDistrict('meherpur', 'khulna', 'Meherpur', 'মেহেরপুর', 'barind_agri', {
    hasRailway: false,
    sampleUpazilasEn: ['Meherpur Sadar', 'Mujibnagar', 'Gangni'],
    sampleUpazilasBn: ['মেহেরপুর সদর', 'মুজিবনগর', 'গাংনী'],
  }),
  makeDistrict('narail', 'khulna', 'Narail', 'নড়াইল', 'riverine_delta', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Narail Sadar', 'Lohagara', 'Kalia'],
    sampleUpazilasBn: ['নড়াইল সদর', 'লোহাগড়া', 'কালিয়া'],
  }),
  makeDistrict('satkhira', 'khulna', 'Satkhira', 'সাতক্ষীরা', 'mangrove_coastal', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Satkhira Sadar', 'Shyamnagar', 'Kaliganj', 'Tala'],
    sampleUpazilasBn: ['সাতক্ষীরা সদর', 'শ্যামনগর', 'কালীগঞ্জ', 'তালা'],
  }),

  // 5. BARISHAL DIVISION (6 Districts)
  makeDistrict('barishal', 'barishal', 'Barishal', 'বরিশাল', 'riverine_delta', {
    hasRailway: false,
    hasAirport: true,
    hasFerryPort: true,
    sampleUpazilasEn: ['Barishal Sadar', 'Bakerganj', 'Banaripara', 'Gournadi'],
    sampleUpazilasBn: ['বরিশাল সদর', 'বাকেরগঞ্জ', 'বানারীপাড়া', 'গৌরনদী'],
    highwayLinks: ['N8'],
  }),
  makeDistrict('barguna', 'barishal', 'Barguna', 'বরগুনা', 'riverine_delta', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Barguna Sadar', 'Amtali', 'Patharghata', 'Taltali'],
    sampleUpazilasBn: ['বরগুনা সদর', 'আমতলী', 'পাথরঘাটা', 'তালতলী'],
  }),
  makeDistrict('bhola', 'barishal', 'Bhola', 'ভোলা', 'riverine_delta', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Bhola Sadar', 'Char Fasson', 'Lalmohan', 'Manpura'],
    sampleUpazilasBn: ['ভোলা সদর', 'চরফ্যাশন', 'লালমোহন', 'মনপুরা'],
  }),
  makeDistrict('jhalokathi', 'barishal', 'Jhalokathi', 'ঝালকাঠি', 'riverine_delta', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Jhalokathi Sadar', 'Nalchity', 'Rajapur', 'Kathalia'],
    sampleUpazilasBn: ['ঝালকাঠি সদর', 'নলছিটি', 'রাজাপুর', 'কাঁঠালিয়া'],
  }),
  makeDistrict('patuakhali', 'barishal', 'Patuakhali', 'পটুয়াখালী', 'coastal_port', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Patuakhali Sadar', 'Kalapara (Kuakata)', 'Galachipa', 'Bauphal'],
    sampleUpazilasBn: ['পটুয়াখালী সদর', 'কলাপাড়া (কুয়াকাটা)', 'গলাচিপা', 'বাউফল'],
    highwayLinks: ['N8'],
  }),
  makeDistrict('pirojpur', 'barishal', 'Pirojpur', 'পিরোজপুর', 'riverine_delta', {
    hasRailway: false,
    hasFerryPort: true,
    sampleUpazilasEn: ['Pirojpur Sadar', 'Nesarabad (Swarupkati)', 'Mathbaria', 'Bhandaria'],
    sampleUpazilasBn: ['পিরোজপুর সদর', 'নেছারাবাদ (স্বরূপকাঠি)', 'মঠবাড়িয়া', 'ভান্ডারিয়া'],
  }),

  // 6. SYLHET DIVISION (4 Districts)
  makeDistrict('sylhet', 'sylhet', 'Sylhet', 'সিলেট', 'tea_hills', {
    hasAirport: true,
    sampleUpazilasEn: ['Sylhet Sadar', 'Gowainghat (Jaflong)', 'Companiganj', 'Beanibazar'],
    sampleUpazilasBn: ['সিলেট সদর', 'গোয়াইনঘাট (জাফলং)', 'কোম্পানীগঞ্জ', 'বিয়ানীবাজার'],
    highwayLinks: ['N2'],
  }),
  makeDistrict('habiganj', 'sylhet', 'Habiganj', 'হবিগঞ্জ', 'tea_hills', {
    sampleUpazilasEn: ['Habiganj Sadar', 'Chunarughat', 'Madhabpur', 'Bahubal'],
    sampleUpazilasBn: ['হবিগঞ্জ সদর', 'চুনারুঘাট', 'মাধবপুর', 'বাহুবল'],
    highwayLinks: ['N2'],
  }),
  makeDistrict('moulvibazar', 'sylhet', 'Moulvibazar', 'মৌলভীবাজার', 'tea_hills', {
    sampleUpazilasEn: ['Moulvibazar Sadar', 'Sreemangal', 'Kamalganj', 'Kulaura'],
    sampleUpazilasBn: ['মৌলভীবাজার সদর', 'শ্রীমঙ্গল', 'কমলগঞ্জ', 'কুলাউড়া'],
  }),
  makeDistrict('sunamganj', 'sylhet', 'Sunamganj', 'সুনামগঞ্জ', 'haor_greenery', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Sunamganj Sadar', 'Tahirpur (Tanguar Haor)', 'Chhatak', 'Jagannathpur'],
    sampleUpazilasBn: ['সুনামগঞ্জ সদর', 'তাহিরপুর (টাঙ্গুয়ার হাওর)', 'ছাতক', 'জগন্নাথপুর'],
  }),

  // 7. RANGPUR DIVISION (8 Districts)
  makeDistrict('rangpur', 'rangpur', 'Rangpur', 'রংপুর', 'northern_plains', {
    sampleUpazilasEn: ['Rangpur Sadar', 'Mithapukur', 'Pirganj', 'Kaunia'],
    sampleUpazilasBn: ['রংপুর সদর', 'মিঠাপুকুর', 'পীরগঞ্জ', 'কাউনিয়া'],
    highwayLinks: ['N5'],
  }),
  makeDistrict('dinajpur', 'rangpur', 'Dinajpur', 'দিনাজপুর', 'northern_plains', {
    sampleUpazilasEn: ['Dinajpur Sadar', 'Parbatipur', 'Birganj', 'Fulbari'],
    sampleUpazilasBn: ['দিনাজপুর সদর', 'পার্বতীপুর', 'বীরগঞ্জ', 'ফুলবাড়ী'],
  }),
  makeDistrict('gaibandha', 'rangpur', 'Gaibandha', 'গাইবান্ধা', 'northern_plains', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Gaibandha Sadar', 'Gobindaganj', 'Sundarganj', 'Fulchhari'],
    sampleUpazilasBn: ['গাইবান্ধা সদর', 'গোবিন্দগঞ্জ', 'সুন্দরগঞ্জ', 'ফুলছড়ি'],
    highwayLinks: ['N5'],
  }),
  makeDistrict('kurigram', 'rangpur', 'Kurigram', 'কুড়িগ্রাম', 'northern_plains', {
    hasFerryPort: true,
    sampleUpazilasEn: ['Kurigram Sadar', 'Chilmari', 'Ulipur', 'Nageshwari'],
    sampleUpazilasBn: ['কুড়িগ্রাম সদর', 'চিলমারী', 'উলিপুর', 'নাগেশ্বরী'],
  }),
  makeDistrict('lalmonirhat', 'rangpur', 'Lalmonirhat', 'লালমনিরহাট', 'northern_plains', {
    sampleUpazilasEn: ['Lalmonirhat Sadar', 'Patgram', 'Hatibandha', 'Kaliganj'],
    sampleUpazilasBn: ['লালমনিরহাট সদর', 'পাটগ্রাম', 'হাতীবান্ধা', 'কালীগঞ্জ'],
  }),
  makeDistrict('nilphamari', 'rangpur', 'Nilphamari', 'নীলফামারী', 'northern_plains', {
    hasAirport: true,
    sampleUpazilasEn: ['Nilphamari Sadar', 'Saidpur', 'Dimla', 'Domar'],
    sampleUpazilasBn: ['নীলফামারী সদর', 'সৈয়দপুর', 'ডিমলা', 'ডোমার'],
  }),
  makeDistrict('panchagarh', 'rangpur', 'Panchagarh', 'পঞ্চগড়', 'northern_plains', {
    sampleUpazilasEn: ['Panchagarh Sadar', 'Tetulia', 'Boda', 'Debiganj'],
    sampleUpazilasBn: ['পঞ্চগড় সদর', 'তেঁতুলিয়া', 'বোদা', 'দেবীগঞ্জ'],
    highwayLinks: ['N5'],
  }),
  makeDistrict('thakurgaon', 'rangpur', 'Thakurgaon', 'ঠাকুরগাঁও', 'northern_plains', {
    sampleUpazilasEn: ['Thakurgaon Sadar', 'Pirganj', 'Ranisankail', 'Baliadangi'],
    sampleUpazilasBn: ['ঠাকুরগাঁও সদর', 'পীরগঞ্জ', 'রানীশংকৈল', 'বালিয়াডাঙ্গী'],
  }),

  // 8. MYMENSINGH DIVISION (4 Districts)
  makeDistrict('mymensingh', 'mymensingh', 'Mymensingh', 'ময়মনসিংহ', 'haor_greenery', {
    sampleUpazilasEn: ['Mymensingh Sadar', 'Trishal', 'Bhaluka', 'Muktagachha'],
    sampleUpazilasBn: ['ময়মনসিংহ সদর', 'ত্রিশাল', 'ভালুকা', 'মুক্তাগাছা'],
    highwayLinks: ['N3'],
  }),
  makeDistrict('jamalpur', 'mymensingh', 'Jamalpur', 'জামালপুর', 'haor_greenery', {
    sampleUpazilasEn: ['Jamalpur Sadar', 'Dewanganj', 'Sarishabari', 'Islampur'],
    sampleUpazilasBn: ['জামালপুর সদর', 'দেওয়ানগঞ্জ', 'সরিষাবাড়ী', 'ইসলামপুর'],
  }),
  makeDistrict('netrokona', 'mymensingh', 'Netrokona', 'নেত্রকোনা', 'haor_greenery', {
    sampleUpazilasEn: ['Netrokona Sadar', 'Durgapur (Birishiri)', 'Kalmakanda', 'Mohanganj'],
    sampleUpazilasBn: ['নেত্রকোনা সদর', 'দুর্গাপুর (বিরিশিরি)', 'কলমাকান্দা', 'মোহনগঞ্জ'],
  }),
  makeDistrict('sherpur', 'mymensingh', 'Sherpur', 'শেরপুর', 'haor_greenery', {
    hasRailway: false,
    sampleUpazilasEn: ['Sherpur Sadar', 'Jhenaigati', 'Nalitabari', 'Sreebardi'],
    sampleUpazilasBn: ['শেরপুর সদর', 'ঝিনাইগাতী', 'নালিতাবাড়ী', 'শ্রীবরদী'],
  }),
];

export const PLAYABLE_DISTRICTS_COUNT = BANGLADESH_DISTRICTS.filter(
  (d) => d.status === 'playable'
).length;

export const PLAYABLE_DIVISIONS_COUNT = new Set(
  BANGLADESH_DISTRICTS.filter((d) => d.status === 'playable').map((d) => d.divisionId)
).size;
