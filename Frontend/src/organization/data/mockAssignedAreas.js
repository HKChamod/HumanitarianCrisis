/**
 * Mock Data for Assigned Areas Management
 * 
 * Future Backend Alignment:
 *  - Area Entity (AreaId, AreaName, AreaType, ParentAreaId, Code, IsActive)
 *  - GET /api/areas
 *  - POST /api/areas/assign
 *  - PUT /api/areas/{id}
 * 
 * Response Statuses:
 *  - Active Response
 *  - Monitoring
 *  - Awaiting Assignment
 *  - Stabilized
 * 
 * Risk Levels:
 *  - Critical (Red)
 *  - High (Orange)
 *  - Medium (Yellow)
 *  - Low (Green)
 */

export const AREA_RESPONSE_STATUSES = [
  "Active Response",
  "Monitoring",
  "Awaiting Assignment",
  "Stabilized"
];

export const AREA_RISK_LEVELS = [
  "Critical",
  "High",
  "Medium",
  "Low"
];

export const CRISIS_TYPES = [
  "Flood",
  "Landslide",
  "Cyclone",
  "Drought",
  "Tsunami Alert",
  "Urban Fire"
];

export const initialAssignedAreas = [
  {
    areaId: "AREA-101",
    areaName: "Kolonnawa & Wellampitiya Flood Zone",
    district: "Colombo",
    province: "Western",
    coordinates: [6.9388, 79.8964],
    crisisType: "Flood",
    riskLevel: "Critical",
    affectedCitizens: 3850,
    assignedTeams: ["Alpha Search & Rescue", "Navy Boat Squadron 2", "Shelter Response Unit"],
    responseStatus: "Active Response",
    primaryContact: "DMC Colombo District Officer (+94 11 269 4487)",
    shelterCount: 4,
    shelterCapacity: 4500,
    linkedIncident: "Kelani River Basin Flash Flooding (#CR-101)",
    notes: "River gauge at Nagalagam Street exceeded 8.2ft. Mandatory evacuation in low-lying riverside compounds.",
    lastAssessmentDate: "2026-11-18T08:00:00Z"
  },
  {
    areaId: "AREA-102",
    areaName: "Bulathsinhala Slope Hazard Sector",
    district: "Kalutara",
    province: "Western",
    coordinates: [6.6494, 80.1706],
    crisisType: "Landslide",
    riskLevel: "Critical",
    affectedCitizens: 940,
    assignedTeams: ["Rapid Medical Unit 2"],
    responseStatus: "Active Response",
    primaryContact: "NBRO Field Coordinator (+94 11 258 8946)",
    shelterCount: 2,
    shelterCapacity: 1200,
    linkedIncident: "Bulathsinhala Slope Failure Risk (#CR-103)",
    notes: "Level 3 Red Alert in GN Division 42A. Deep ground fissures detected along hillside tea plantations.",
    lastAssessmentDate: "2026-11-18T07:15:00Z"
  },
  {
    areaId: "AREA-103",
    areaName: "Millaniya & Madurawala Basin",
    district: "Kalutara",
    province: "Western",
    coordinates: [6.7022, 80.0522],
    crisisType: "Flood",
    riskLevel: "High",
    affectedCitizens: 1620,
    assignedTeams: ["Logistics Team Beta"],
    responseStatus: "Active Response",
    primaryContact: "Kalutara District Secretariat (+94 34 222 2223)",
    shelterCount: 3,
    shelterCapacity: 2000,
    linkedIncident: "Kalu Ganga Inundation & Overflow (#CR-102)",
    notes: "Kalu Ganga overflow submerged access roads. Clean drinking water and ration packs being distributed.",
    lastAssessmentDate: "2026-11-17T18:30:00Z"
  },
  {
    areaId: "AREA-104",
    areaName: "Biyagama South Industrial Belt",
    district: "Gampaha",
    province: "Western",
    coordinates: [6.9536, 79.9839],
    crisisType: "Flood",
    riskLevel: "Medium",
    affectedCitizens: 750,
    assignedTeams: ["Logistics Team Beta"],
    responseStatus: "Monitoring",
    primaryContact: "Irrigation Department Hydrology (+94 33 222 3456)",
    shelterCount: 1,
    shelterCapacity: 1000,
    linkedIncident: "Attanagalu Oya Overflow Alert (#CR-104)",
    notes: "Water levels stabilizing along industrial drainage culverts. Water pumps active.",
    lastAssessmentDate: "2026-11-17T20:00:00Z"
  },
  {
    areaId: "AREA-105",
    areaName: "Pelmadulla Pass A4 Highway Sector",
    district: "Ratnapura",
    province: "Sabaragamuwa",
    coordinates: [6.6219, 80.5486],
    crisisType: "Landslide",
    riskLevel: "High",
    affectedCitizens: 420,
    assignedTeams: ["Volunteer Group Delta"],
    responseStatus: "Active Response",
    primaryContact: "RDA Highway Emergency Desk (+94 45 222 2222)",
    shelterCount: 1,
    shelterCapacity: 500,
    linkedIncident: "Pelmadulla Earth Slip & Road Obstruction (#CR-105)",
    notes: "Single-lane clearance achieved by heavy excavators. Stranded vehicle passengers sheltered.",
    lastAssessmentDate: "2026-11-18T05:30:00Z"
  },
  {
    areaId: "AREA-106",
    areaName: "Nawalapitiya Central Valley Basin",
    district: "Kandy",
    province: "Central",
    coordinates: [7.0500, 80.5333],
    crisisType: "Flood",
    riskLevel: "Low",
    affectedCitizens: 310,
    assignedTeams: ["Central Province Relief Unit"],
    responseStatus: "Stabilized",
    primaryContact: "Kandy Divisional Secretariat (+94 81 222 4500)",
    shelterCount: 1,
    shelterCapacity: 400,
    linkedIncident: "Nawalapitiya Stream Flooding (#CR-106)",
    notes: "Waters fully receded. Disinfection kits and dry rations distributed to estate line rooms.",
    lastAssessmentDate: "2026-11-16T16:00:00Z"
  },
  {
    areaId: "AREA-107",
    areaName: "Galle Fort & Marine Coastline",
    district: "Galle",
    province: "Southern",
    coordinates: [6.0535, 80.2210],
    crisisType: "Cyclone",
    riskLevel: "Medium",
    affectedCitizens: 180,
    assignedTeams: ["Southern Medical Outpost"],
    responseStatus: "Monitoring",
    primaryContact: "Coast Guard Station Galle (+94 11 269 4801)",
    shelterCount: 1,
    shelterCapacity: 300,
    linkedIncident: "Galle Fort Coastal Surge Advisory (#CR-107)",
    notes: "High ocean swell warning in effect. Small fishing boats anchored; coastal seawall manned.",
    lastAssessmentDate: "2026-11-17T14:00:00Z"
  },
  {
    areaId: "AREA-108",
    areaName: "Kiriella Lowland Catchment",
    district: "Ratnapura",
    province: "Sabaragamuwa",
    coordinates: [6.7167, 80.3333],
    crisisType: "Flood",
    riskLevel: "Low",
    affectedCitizens: 250,
    assignedTeams: [],
    responseStatus: "Awaiting Assignment",
    primaryContact: "Kiriella Grama Niladhari Desk (+94 45 224 1100)",
    shelterCount: 0,
    shelterCapacity: 0,
    linkedIncident: "Pending Incident Log",
    notes: "Minor flooding reported near rubber estates. Awaiting field responder inspection.",
    lastAssessmentDate: "2026-11-17T11:00:00Z"
  }
];
