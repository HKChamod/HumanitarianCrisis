/**
 * Mock Data and Constants for Organization Management Portal Settings
 * 
 * Consistent with Sri Lanka Red Cross Society operations and existing portal fixtures.
 */

export const SRI_LANKA_PROVINCES = [
  'Western Province',
  'Central Province',
  'Southern Province',
  'Northern Province',
  'Eastern Province',
  'North Western Province',
  'North Central Province',
  'Uva Province',
  'Sabaragamuwa Province'
];

export const PROVINCE_DISTRICT_MAP = {
  'Western Province': ['Colombo', 'Gampaha', 'Kalutara'],
  'Central Province': ['Kandy', 'Matale', 'Nuwara Eliya'],
  'Southern Province': ['Galle', 'Matara', 'Hambantota'],
  'Northern Province': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  'Eastern Province': ['Batticaloa', 'Ampara', 'Trincomalee'],
  'North Western Province': ['Kurunegala', 'Puttalam'],
  'North Central Province': ['Anuradhapura', 'Polonnaruwa'],
  'Uva Province': ['Badulla', 'Monaragala'],
  'Sabaragamuwa Province': ['Ratnapura', 'Kegalle']
};

export const ALL_SRI_LANKA_DISTRICTS = Object.values(PROVINCE_DISTRICT_MAP).flat();

export const ORGANIZATION_TYPES = [
  'Humanitarian Aid / Non-Governmental Organization (NGO)',
  'International NGO (INGO)',
  'Government Emergency Response Agency',
  'Community Disaster Management Committee',
  'Volunteer Relief Network',
  'Medical & Healthcare Relief Foundation'
];

export const AVAILABLE_HUMANITARIAN_SERVICES = [
  { id: 'search_rescue', label: 'Search and Rescue Operations', category: 'Emergency' },
  { id: 'first_aid', label: 'First Aid & Emergency Medical Care', category: 'Health' },
  { id: 'drinking_water', label: 'Clean Drinking Water Supply & Purification', category: 'Relief' },
  { id: 'food_distribution', label: 'Dry Rations & Cooked Food Distribution', category: 'Relief' },
  { id: 'emergency_shelter', label: 'Emergency Shelter & Non-Food Items (NFIs)', category: 'Shelter' },
  { id: 'medical_supplies', label: 'Medical Supplies & Pharmaceuticals', category: 'Health' },
  { id: 'volunteer_mobilization', label: 'Volunteer Mobilization & Community Support', category: 'Operations' },
  { id: 'psychological_support', label: 'Psychosocial First Aid & Counseling', category: 'Health' },
  { id: 'logistics_transport', label: 'Emergency Logistics & Boat/4WD Transport', category: 'Logistics' },
  { id: 'wash_facilities', label: 'Sanitation & Hygiene (WASH) Kits', category: 'Relief' }
];

export const EMERGENCY_AVAILABILITY_MODES = [
  {
    id: '24_7',
    title: '24/7 Continuous Emergency Response',
    description: 'Active deployment round the clock for rapid disaster intervention across assigned areas.'
  },
  {
    id: 'extended',
    title: 'Extended Operational Hours (06:00 - 22:00)',
    description: 'Daytime and evening active field response with overnight on-call escalation protocol.'
  },
  {
    id: 'standard',
    title: 'Standard Working Hours (08:30 - 17:00)',
    description: 'Scheduled aid coordination and logistics during standard humanitarian center hours.'
  }
];

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', native: 'English (Default)' },
  { code: 'si', label: 'Sinhala', native: 'සිංහල (Sinhala)' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ் (Tamil)' }
];

export const defaultOrganizationSettings = {
  organization: {
    name: 'Sri Lanka Red Cross Society',
    registrationNumber: 'NGO-LK-1951-002',
    type: 'Humanitarian Aid / Non-Governmental Organization (NGO)',
    description: 'Sri Lanka Red Cross Society (SLRCS) is the premier auxiliary humanitarian organization in Sri Lanka. Dedicated to alleviating human suffering, coordinating emergency disaster response, providing first aid, medical supplies, clean water, and community rebuilding across all 25 administrative districts.',
    address: '106, Dharmapala Mawatha, Colombo 07',
    province: 'Western Province',
    district: 'Colombo',
    email: 'info@redcross.lk',
    phone: '+94 11 269 1095',
    emergencyPhone: '117 / +94 11 269 4487',
    website: 'https://www.redcross.lk',
    logoUrl: '',
    logoInitials: 'SLRCS',
    verified: true,
    establishedYear: '1951'
  },
  admin: {
    fullName: 'Dr. K. Jayasuriya',
    designation: 'Provincial Response Director',
    email: 'k.jayasuriya@redcross.lk',
    phone: '+94 77 123 4567',
    avatarInitials: 'KJ',
    role: 'Organization Administrator',
    roleAssignedDate: '2024-01-10',
    roleDescription: 'Full administrative authority for emergency response management, team dispatching, disaster area assignment, and organization settings.'
  },
  operational: {
    primaryDistrict: 'Colombo',
    preferredLanguage: 'en',
    timeZone: 'Asia/Colombo (GMT+05:30)',
    humanitarianServices: [
      'search_rescue',
      'first_aid',
      'drinking_water',
      'food_distribution',
      'emergency_shelter',
      'medical_supplies',
      'volunteer_mobilization'
    ],
    emergencyAvailability: '24_7'
  },
  notifications: {
    criticalCrisisAlerts: true,
    newAidRequests: true,
    responseTeamUpdates: true,
    assignedAreaRiskUpdates: true,
    resourceShortageAlerts: true,
    emailNotifications: true
  }
};
