/**
 * Mock Data for Aid Requests Management
 * 
 * Future Backend Alignment:
 *  - GET /api/AssistanceRequests
 *  - GET /api/AssistanceRequests/{id}
 *  - PATCH /api/AssistanceRequests/{id}/status
 *  - POST /api/AssistanceRequests/{id}/assign
 * 
 * Aid Categories:
 *  - Food Rations
 *  - Drinking Water
 *  - Medical Supplies
 *  - Emergency Shelter
 *  - Rescue & Evacuation
 * 
 * Priorities: Critical | High | Medium | Low
 * Statuses: Pending Review | In Progress | Fulfilled | Cancelled
 */

export const availableResponseTeams = [
  "Alpha Search & Rescue",
  "Logistics Team Beta",
  "Rapid Medical Unit 2",
  "Volunteer Group Delta",
  "Shelter Response Unit",
  "Navy Boat Squadron 2",
  "Central Province Relief Unit",
  "Unassigned"
];

export const mockAidRequests = [
  {
    requestId: "AR-1042",
    requester: "Kamal Weerasinghe",
    phone: "+94 77 345 6789",
    nic: "198124501234",
    aidCategory: "Drinking Water",
    priority: "Critical",
    status: "Pending Review",
    district: "Colombo",
    location: "Sedawatta North, Kotikawatta, Wellampitiya",
    affectedPersons: 8,
    requestedDate: "2026-11-18T07:30:00Z",
    description: "Well water heavily contaminated by Kelani River floodwaters. Family includes elderly grandmother and 2-month-old infant in urgent need of clean drinking water and baby electrolyte formula.",
    assignedTeam: "Unassigned",
    notes: "Priority flagged due to infant. Floodwater around compound is approximately 2.5 feet.",
    crisisEventId: 101
  },
  {
    requestId: "AR-1041",
    requester: "Fatima Naheem",
    phone: "+94 71 890 1234",
    nic: "199056708910",
    aidCategory: "Rescue & Evacuation",
    priority: "Critical",
    status: "In Progress",
    district: "Colombo",
    location: "24/B Kittampahuwa Lane, Kolonnawa",
    affectedPersons: 5,
    requestedDate: "2026-11-18T06:15:00Z",
    description: "Trapped on the upper terrace of two-story house. Ground floor completely submerged. Requesting inflatable boat extraction to Kolonnawa Central College relief shelter.",
    assignedTeam: "Alpha Search & Rescue",
    notes: "Rescue boat dispatched at 07:10 AM. Team Leader confirmed en route with 2 life vests.",
    crisisEventId: 101
  },
  {
    requestId: "AR-1040",
    requester: "Sunil Dharmapala",
    phone: "+94 76 234 5678",
    nic: "197412304567",
    aidCategory: "Food Rations",
    priority: "High",
    status: "Pending Review",
    district: "Gampaha",
    location: "Near Mabima Junction, Biyagama South",
    affectedPersons: 14,
    requestedDate: "2026-11-18T05:40:00Z",
    description: "Two families sheltered in a church hall. Cut off from grocery stores for 36 hours. Require dry rations (rice, dhal, canned fish, milk powder) for 3 days.",
    assignedTeam: "Unassigned",
    notes: "Access route via Kelaniya-Biyagama main road requires high-clearance truck.",
    crisisEventId: 104
  },
  {
    requestId: "AR-1039",
    requester: "Dr. Anoma Wijesekera",
    phone: "+94 77 987 6543",
    nic: "198545607890",
    aidCategory: "Medical Supplies",
    priority: "High",
    status: "In Progress",
    district: "Kalutara",
    location: "Bulathsinhala Rural Hospital Grounds",
    affectedPersons: 45,
    requestedDate: "2026-11-17T22:10:00Z",
    description: "Emergency replenishment of oral rehydration salts, tetanus toxoid, sterile dressing packs, and asthma inhalers. 45 patients housed at temporary medical outpost.",
    assignedTeam: "Rapid Medical Unit 2",
    notes: "Medical crate #MC-04 packed and moving under emergency convoy from Kalutara hub.",
    crisisEventId: 103
  },
  {
    requestId: "AR-1038",
    requester: "M. F. Rizwan",
    phone: "+94 75 456 7890",
    nic: "198823405678",
    aidCategory: "Emergency Shelter",
    priority: "Medium",
    status: "Pending Review",
    district: "Ratnapura",
    location: "Kiriella Division 12B, Ratnapura Road",
    affectedPersons: 12,
    requestedDate: "2026-11-17T18:45:00Z",
    description: "Roof tiles displaced by severe gales. Need waterproof tarpaulins (at least 4 large rolls) and rope sets to prevent further rain damage to internal living quarters.",
    assignedTeam: "Unassigned",
    notes: "Grama Niladhari verified damage. No injuries reported.",
    crisisEventId: 105
  },
  {
    requestId: "AR-1037",
    requester: "Chandrani Rajapakse",
    phone: "+94 78 567 8901",
    nic: "196934506789",
    aidCategory: "Food Rations",
    priority: "High",
    status: "Fulfilled",
    district: "Kalutara",
    location: "Millaniya Community Center, Kalutara",
    affectedPersons: 65,
    requestedDate: "2026-11-17T14:20:00Z",
    description: "65 evacuees at community center required pre-cooked hot meal packs and clean mineral water bottles for dinner service.",
    assignedTeam: "Logistics Team Beta",
    notes: "Delivered 70 cooked dinner packs and 150 1.5L water bottles at 17:45. Handover signed by camp officer.",
    crisisEventId: 102
  },
  {
    requestId: "AR-1036",
    requester: "R. Jayashantha",
    phone: "+94 77 678 9012",
    nic: "199212307890",
    aidCategory: "Drinking Water",
    priority: "Medium",
    status: "Fulfilled",
    district: "Gampaha",
    location: "Kotugoda Industrial By-lane, Ja-Ela",
    affectedPersons: 22,
    requestedDate: "2026-11-17T10:00:00Z",
    description: "Municipal piped water supply disrupted due to transformer failure. Water bowser dispatch requested for factory worker housing.",
    assignedTeam: "Logistics Team Beta",
    notes: "Water bowser #WB-08 delivered 2,000L of potable water. Completed.",
    crisisEventId: 104
  },
  {
    requestId: "AR-1035",
    requester: "Soma Menike",
    phone: "+94 72 345 6781",
    nic: "196023408901",
    aidCategory: "Medical Supplies",
    priority: "Low",
    status: "Fulfilled",
    district: "Kandy",
    location: "Estate Line Room 4, Nawalapitiya",
    affectedPersons: 4,
    requestedDate: "2026-11-16T16:30:00Z",
    description: "Routine diabetic insulin vials and dressing gauze needed after local dispensary flooded. Patient is stable.",
    assignedTeam: "Central Province Relief Unit",
    notes: "Prescription medication dispensed by volunteer nurse. Completed.",
    crisisEventId: 106
  },
  {
    requestId: "AR-1034",
    requester: "K. T. Sarathchandra",
    phone: "+94 77 112 2334",
    nic: "197545601234",
    aidCategory: "Emergency Shelter",
    priority: "Low",
    status: "Cancelled",
    district: "Galle",
    location: "Habaraduwa Coastal Fishermen Settlement",
    affectedPersons: 6,
    requestedDate: "2026-11-16T09:15:00Z",
    description: "Temporary shelter requested during high sea swell warning.",
    assignedTeam: "Unassigned",
    notes: "Family evacuated to relative's residence inland. Request cancelled by requester.",
    crisisEventId: 107
  }
];
