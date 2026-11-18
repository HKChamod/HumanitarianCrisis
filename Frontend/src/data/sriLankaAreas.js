/**
 * Sri Lanka Administrative Hierarchy
 * Province -> District -> Divisional Secretariat (DS) -> Grama Niladhari (GN)
 */

export const PROVINCES = [
  { id: 'WP', name: 'Western Province', nameSi: 'බස්නාහිර පළාත', nameTa: 'மேல் மாகாணம்' },
  { id: 'CP', name: 'Central Province', nameSi: 'මධ්‍යම පළාත', nameTa: 'மத்திய மாகாணம்' },
  { id: 'SP', name: 'Southern Province', nameSi: 'දකුණු පළාත', nameTa: 'தென் மாகாணம்' },
  { id: 'NP', name: 'Northern Province', nameSi: 'උතුරු පළාත', nameTa: 'வட மாகாணம்' },
  { id: 'EP', name: 'Eastern Province', nameSi: 'නැගෙනහිර පළාත', nameTa: 'கிழக்கு மாகாணம்' },
  { id: 'NWP', name: 'North Western Province', nameSi: 'වයඹ පළාත', nameTa: 'வடமேல் மாகாணம்' },
  { id: 'NCP', name: 'North Central Province', nameSi: 'උතුරු මැද පළාත', nameTa: 'வடமத்திய மாகாணம்' },
  { id: 'UP', name: 'Uva Province', nameSi: 'ඌව පළාත', nameTa: 'ஊவா மாகாணம்' },
  { id: 'SGP', name: 'Sabaragamuwa Province', nameSi: 'සබරගමුව පළාත', nameTa: 'சப்ரகமுவ மாகாணம்' },
];

export const DISTRICTS = [
  // Western
  { id: 'COL', provinceId: 'WP', name: 'Colombo', nameSi: 'කොළඹ', nameTa: 'கொழும்பு' },
  { id: 'GAM', provinceId: 'WP', name: 'Gampaha', nameSi: 'ගම්පහ', nameTa: 'கம்பஹா' },
  { id: 'KAL', provinceId: 'WP', name: 'Kalutara', nameSi: 'කළුතර', nameTa: 'களுத்துறை' },

  // Central
  { id: 'KAN', provinceId: 'CP', name: 'Kandy', nameSi: 'මහනුවර', nameTa: 'கண்டி' },
  { id: 'MAT', provinceId: 'CP', name: 'Matale', nameSi: 'මාතලේ', nameTa: 'மாத்தளை' },
  { id: 'NUW', provinceId: 'CP', name: 'Nuwara Eliya', nameSi: 'නුවරඑළිය', nameTa: 'நுவரெலியா' },

  // Southern
  { id: 'GAL', provinceId: 'SP', name: 'Galle', nameSi: 'ගාල්ල', nameTa: 'காலி' },
  { id: 'MTR', provinceId: 'SP', name: 'Matara', nameSi: 'මාතර', nameTa: 'மாத்தறை' },
  { id: 'HAM', provinceId: 'SP', name: 'Hambantota', nameSi: 'හම්බන්තොට', nameTa: 'அம்பாந்தோட்டை' },

  // Sabaragamuwa
  { id: 'RAT', provinceId: 'SGP', name: 'Ratnapura', nameSi: 'රත්නපුර', nameTa: 'இரத்தினபுரி' },
  { id: 'KEG', provinceId: 'SGP', name: 'Kegalle', nameSi: 'කෑගල්ල', nameTa: 'கேகாலை' },

  // Uva
  { id: 'BAD', provinceId: 'UP', name: 'Badulla', nameSi: 'බදුල්ල', nameTa: 'பதுளை' },
  { id: 'MON', provinceId: 'UP', name: 'Monaragala', nameSi: 'මොනරාගල', nameTa: 'மொணராகலை' },

  // North Western
  { id: 'KUR', provinceId: 'NWP', name: 'Kurunegala', nameSi: 'කුරුණෑගල', nameTa: 'குருநாகல்' },
  { id: 'PUT', provinceId: 'NWP', name: 'Puttalam', nameSi: 'පුත්තලම', nameTa: 'புத்தளம்' },

  // North Central
  { id: 'ANU', provinceId: 'NCP', name: 'Anuradhapura', nameSi: 'අනුරාධපුර', nameTa: 'அனுராதபுரம்' },
  { id: 'POL', provinceId: 'NCP', name: 'Polonnaruwa', nameSi: 'පොළොන්නරුව', nameTa: 'பொலன்னறுவை' },

  // Eastern
  { id: 'AMP', provinceId: 'EP', name: 'Ampara', nameSi: 'අම්පාර', nameTa: 'அம்பாறை' },
  { id: 'BAT', provinceId: 'EP', name: 'Batticaloa', nameSi: 'මඩකලපුව', nameTa: 'மட்டக்களப்பு' },
  { id: 'TRI', provinceId: 'EP', name: 'Trincomalee', nameSi: 'ත්‍රිකුණාමලය', nameTa: 'திருகோணமலை' },

  // Northern
  { id: 'JAF', provinceId: 'NP', name: 'Jaffna', nameSi: 'යාපනය', nameTa: 'யாழ்ப்பாணம்' },
  { id: 'KIL', provinceId: 'NP', name: 'Kilinochchi', nameSi: 'කිලිනොච්චිය', nameTa: 'கிளிநொச்சி' },
  { id: 'MAN', provinceId: 'NP', name: 'Mannar', nameSi: 'මන්නාරම', nameTa: 'மன்னார்' },
  { id: 'VAV', provinceId: 'NP', name: 'Vavuniya', nameSi: 'වවුනියාව', nameTa: 'வவுனியா' },
  { id: 'MUL', provinceId: 'NP', name: 'Mullaitivu', nameSi: 'මුලතිව්', nameTa: 'முல்லைத்தீவு' },
];

export const DS_DIVISIONS = {
  KAL: [
    { id: 'KAL-01', name: 'Kalutara', nameSi: 'කළුතර' },
    { id: 'KAL-02', name: 'Bandaragama', nameSi: 'බණ්ඩාරගම' },
    { id: 'KAL-03', name: 'Horana', nameSi: 'හොරණ' },
    { id: 'KAL-04', name: 'Beruwala', nameSi: 'බේරුවල' },
    { id: 'KAL-05', name: 'Panadura', nameSi: 'පානදුර' },
    { id: 'KAL-06', name: 'Mathugama', nameSi: 'මතුගම' },
    { id: 'KAL-07', name: 'Bulathsinhala', nameSi: 'බුලත්සිංහල' },
    { id: 'KAL-08', name: 'Millaniya', nameSi: 'මිල්ලනිය' },
  ],
  RAT: [
    { id: 'RAT-01', name: 'Ratnapura', nameSi: 'රත්නපුර' },
    { id: 'RAT-02', name: 'Elapatha', nameSi: 'ඇලපාත' },
    { id: 'RAT-03', name: 'Pelmadulla', nameSi: 'පැල්මඩුල්ල' },
    { id: 'RAT-04', name: 'Kuruwita', nameSi: 'කුරුවිට' },
    { id: 'RAT-05', name: 'Nivithigala', nameSi: 'නිවිතිගල' },
    { id: 'RAT-06', name: 'Kalawana', nameSi: 'කලවාන' },
    { id: 'RAT-07', name: 'Ayagama', nameSi: 'අයගම' },
  ],
  COL: [
    { id: 'COL-01', name: 'Colombo', nameSi: 'කොළඹ' },
    { id: 'COL-02', name: 'Kaduwela', nameSi: 'කඩුවෙල' },
    { id: 'COL-03', name: 'Kolonnawa', nameSi: 'කොලොන්නාව' },
    { id: 'COL-04', name: 'Maharagama', nameSi: 'මහරගම' },
    { id: 'COL-05', name: 'Moratuwa', nameSi: 'මොරටුව' },
    { id: 'COL-06', name: 'Dehiwala', nameSi: 'දෙහිවල' },
    { id: 'COL-07', name: 'Homagama', nameSi: 'හෝමාගම' },
  ],
  GAM: [
    { id: 'GAM-01', name: 'Gampaha', nameSi: 'ගම්පහ' },
    { id: 'GAM-02', name: 'Negombo', nameSi: 'මීගමුව' },
    { id: 'GAM-03', name: 'Ja-Ela', nameSi: 'ජා-ඇල' },
    { id: 'GAM-04', name: 'Kelaniya', nameSi: 'කැලණිය' },
    { id: 'GAM-05', name: 'Biyagama', nameSi: 'බියගම' },
  ],
  KAN: [
    { id: 'KAN-01', name: 'Kandy Four Gravets', nameSi: 'මහනුවර' },
    { id: 'KAN-02', name: 'Ganga Ihala Korale', nameSi: 'ගඟ ඉහළ කෝරළේ' },
    { id: 'KAN-03', name: 'Pasbage Korale', nameSi: 'පස්බාගේ කෝරළේ' },
    { id: 'KAN-04', name: 'Udapalatha', nameSi: 'උඩපළාත' },
    { id: 'KAN-05', name: 'Kundasale', nameSi: 'කුණ්ඩසාලේ' },
  ],
  GAL: [
    { id: 'GAL-01', name: 'Galle Four Gravets', nameSi: 'ගාල්ල' },
    { id: 'GAL-02', name: 'Baddegama', nameSi: 'බද්දේගම' },
    { id: 'GAL-03', name: 'Bentota', nameSi: 'බෙන්තොට' },
    { id: 'GAL-04', name: 'Hikkaduwa', nameSi: 'හික්කඩුව' },
    { id: 'GAL-05', name: 'Nagoda', nameSi: 'නාගොඩ' },
    { id: 'GAL-06', name: 'Neluwa', nameSi: 'නෙළුව' },
  ],
  MTR: [
    { id: 'MTR-01', name: 'Matara Four Gravets', nameSi: 'මාතර' },
    { id: 'MTR-02', name: 'Akuressa', nameSi: 'අකුරැස්ස' },
    { id: 'MTR-03', name: 'Athuraliya', nameSi: 'අතුරලිය' },
    { id: 'MTR-04', name: 'Hakmana', nameSi: 'හක්මණ' },
    { id: 'MTR-05', name: 'Welipitiya', nameSi: 'වැලිපිටිය' },
  ],
  KEG: [
    { id: 'KEG-01', name: 'Kegalle', nameSi: 'කෑගල්ල' },
    { id: 'KEG-02', name: 'Mawanella', nameSi: 'මාවනැල්ල' },
    { id: 'KEG-03', name: 'Aranayaka', nameSi: 'අරණායක' },
    { id: 'KEG-04', name: 'Deraniyagala', nameSi: 'දෙරණියගල' },
    { id: 'KEG-05', name: 'Ruwanwella', nameSi: 'රුවන්වැල්ල' },
  ],
};

// Default fallback generator for districts without explicit DS breakdown
export function getDsDivisionsForDistrict(districtId) {
  if (DS_DIVISIONS[districtId]) {
    return DS_DIVISIONS[districtId];
  }
  const district = DISTRICTS.find((d) => d.id === districtId);
  if (!district) return [];
  return [
    { id: `${districtId}-NORTH`, name: `${district.name} North`, nameSi: `${district.nameSi} උතුර` },
    { id: `${districtId}-SOUTH`, name: `${district.name} South`, nameSi: `${district.nameSi} දකුණ` },
    { id: `${districtId}-EAST`, name: `${district.name} East`, nameSi: `${district.nameSi} නැගෙනහිර` },
    { id: `${districtId}-WEST`, name: `${district.name} West`, nameSi: `${district.nameSi} බස්නාහිර` },
    { id: `${districtId}-CENTRAL`, name: `${district.name} Central`, nameSi: `${district.nameSi} මධ්‍යම` },
  ];
}

export const GN_DIVISIONS = {
  'KAL-01': [
    { id: 'GN-K01', name: 'Kalutara North', code: '720' },
    { id: 'GN-K02', name: 'Kalutara South', code: '721' },
    { id: 'GN-K03', name: 'Deshastra Kalutara', code: '722' },
    { id: 'GN-K04', name: 'Welikada', code: '723' },
  ],
  'KAL-02': [
    { id: 'GN-B01', name: 'Bandaragama East', code: '710' },
    { id: 'GN-B02', name: 'Bandaragama West', code: '711' },
    { id: 'GN-B03', name: 'Wevita', code: '712' },
    { id: 'GN-B04', name: 'Raigama', code: '713' },
  ],
  'RAT-01': [
    { id: 'GN-R01', name: 'Ratnapura Town', code: '150' },
    { id: 'GN-R02', name: 'Wewelwatta', code: '151' },
    { id: 'GN-R03', name: 'Muwa Gama', code: '152' },
    { id: 'GN-R04', name: 'Batugedara', code: '153' },
  ],
};

export function getGnDivisionsForDs(dsId) {
  if (GN_DIVISIONS[dsId]) {
    return GN_DIVISIONS[dsId];
  }
  return [
    { id: `${dsId}-01`, name: 'Division 01', code: '101' },
    { id: `${dsId}-02`, name: 'Division 02', code: '102' },
    { id: `${dsId}-03`, name: 'Division 03', code: '103' },
    { id: `${dsId}-04`, name: 'Division 04', code: '104' },
  ];
}
