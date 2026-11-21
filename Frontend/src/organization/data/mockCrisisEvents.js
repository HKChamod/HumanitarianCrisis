/**
 * Mock Data for Crisis Incidents
 * 
 * Directly aligned with backend entity CrisisEvent and DTO CrisisEventResponse:
 * - CrisisId: int
 * - CrisisName: string
 * - CrisisType: string
 * - Description: string
 * - SeverityLevel: "Critical" | "High" | "Medium" | "Low"
 * - StartDate: ISO DateTime string
 * - Status: "Reported" | "Active" | "Resolved" | "Closed" (validated by backend regex)
 * 
 * Extended frontend display fields:
 * - location: string
 * - district: string
 * - affectedPopulation: number
 * - assignedTeams: string[]
 * - requiredAssistance: string[]
 * - reportedBy: string
 * - contactNumber: string
 */

export const mockCrisisEvents = [
  {
    crisisId: 101,
    crisisName: "Kelani River Basin Flash Flooding",
    crisisType: "Flood",
    description: "Rapid water level increase at Nagalagam Street gauge exceeding critical major flood stage (8.2ft). Severe inundation reported in Sedawatta, Kotikawatta, and low-lying zones.",
    severityLevel: "Critical",
    startDate: "2026-11-16T04:30:00Z",
    status: "Active",
    location: "Kolonnawa & Wellampitiya DS Divisions",
    district: "Colombo",
    affectedPopulation: 3850,
    assignedTeams: ["Alpha Search & Rescue", "Navy Boat Squadron 2", "Red Cross Field Unit 1"],
    requiredAssistance: ["Evacuation Boats", "Drinking Water Bowsers", "Emergency Dry Rations", "Waterproof Tarpaulins"],
    reportedBy: "Disaster Management Centre (DMC) Early Warning",
    contactNumber: "117 / +94 11 269 4487",
    lastUpdated: "2026-11-17T07:45:00Z"
  },
  {
    crisisId: 102,
    crisisName: "Kalu Ganga Inundation & Overflow",
    crisisType: "Flood",
    description: "Kalu Ganga river banks overflowing following intense monsoon precipitation in the upper catchment. Access roads to Millaniya cut off.",
    severityLevel: "High",
    startDate: "2026-11-16T11:15:00Z",
    status: "Active",
    location: "Millaniya & Madurawala Area",
    district: "Kalutara",
    affectedPopulation: 1620,
    assignedTeams: ["Logistics Team Beta", "Kalutara District Disaster Response"],
    requiredAssistance: ["Cooked Meals", "Baby Food & Formula", "First Aid Paramedics"],
    reportedBy: "Kalutara District Secretariat Emergency Desk",
    contactNumber: "+94 34 222 2223",
    lastUpdated: "2026-11-17T06:20:00Z"
  },
  {
    crisisId: 103,
    crisisName: "Bulathsinhala Slope Failure Risk",
    crisisType: "Landslide",
    description: "NBRO Level 3 Red Alert issued due to soil moisture saturation exceeding 150mm/24hr. Slope fissures observed near residential settlements.",
    severityLevel: "Critical",
    startDate: "2026-11-16T18:00:00Z",
    status: "Active",
    location: "Bulathsinhala Hillside GN Division 42A",
    district: "Kalutara",
    affectedPopulation: 940,
    assignedTeams: ["Rapid Medical Unit 2", "Army Volunteer Division 3"],
    requiredAssistance: ["Immediate Relocation Transport", "Temporary Shelter Kits", "Emergency Blankets"],
    reportedBy: "National Building Research Organisation (NBRO)",
    contactNumber: "+94 11 258 8946",
    lastUpdated: "2026-11-17T08:00:00Z"
  },
  {
    crisisId: 104,
    crisisName: "Attanagalu Oya Overflow Alert",
    crisisType: "Flood",
    description: "Minor to medium flood level reached along Ja-Ela, Minuwangoda, and Biyagama access routes. Industrial zones experiencing drainage blockages.",
    severityLevel: "Medium",
    startDate: "2026-11-17T01:20:00Z",
    status: "Reported",
    location: "Biyagama South & Kotugoda",
    district: "Gampaha",
    affectedPopulation: 750,
    assignedTeams: ["Gampaha Volunteer Group Delta"],
    requiredAssistance: ["High-Capacity Water Pumps", "Clean Water Delivery"],
    reportedBy: "Irrigation Department Hydrology Division",
    contactNumber: "+94 33 222 3456",
    lastUpdated: "2026-11-17T05:30:00Z"
  },
  {
    crisisId: 105,
    crisisName: "Pelmadulla Earth Slip & Road Obstruction",
    crisisType: "Landslide",
    description: "Debris slide on A4 Main Highway near Pelmadulla cutoff. Multiple passenger vehicles stranded; clearing machinery deployed.",
    severityLevel: "High",
    startDate: "2026-11-16T22:40:00Z",
    status: "Active",
    location: "Pelmadulla Pass, Ratnapura Highway",
    district: "Ratnapura",
    affectedPopulation: 420,
    assignedTeams: ["Highway Heavy Rescue Unit", "Ratnapura Fire & Rescue"],
    requiredAssistance: ["Heavy Earth Movers", "Trauma Medical Kit", "Emergency Lighting Towers"],
    reportedBy: "Police Emergency Command Ratnapura",
    contactNumber: "119 / +94 45 222 2222",
    lastUpdated: "2026-11-17T07:10:00Z"
  },
  {
    crisisId: 106,
    crisisName: "Nawalapitiya Stream Flooding",
    crisisType: "Flood",
    description: "Flash stream deluge submerged railway tracks and 35 tea estate line rooms. Waters now receding steadily.",
    severityLevel: "Low",
    startDate: "2026-11-15T09:00:00Z",
    status: "Resolved",
    location: "Nawalapitiya Central Valley",
    district: "Kandy",
    affectedPopulation: 310,
    assignedTeams: ["Central Province Relief Unit"],
    requiredAssistance: ["Sanitation Disinfection Kits", "Dry Rations"],
    reportedBy: "Kandy Divisional Secretariat",
    contactNumber: "+94 81 222 4500",
    lastUpdated: "2026-11-16T16:00:00Z"
  },
  {
    crisisId: 107,
    crisisName: "Galle Fort Coastal Surge Advisory",
    crisisType: "Cyclone",
    description: "High ocean swell advisory during deep depression in Southern seas. Small fishing craft warned to stay ashore; coastal barrier inspected.",
    severityLevel: "Medium",
    startDate: "2026-11-15T14:30:00Z",
    status: "Resolved",
    location: "Galle Marine Coast & Habaraduwa",
    district: "Galle",
    affectedPopulation: 180,
    assignedTeams: ["Coast Guard Station Galle"],
    requiredAssistance: ["Harbor Patrol Boats", "Megaphone Public Alerts"],
    reportedBy: "Meteorological Department of Sri Lanka",
    contactNumber: "+94 11 269 4801",
    lastUpdated: "2026-11-16T19:20:00Z"
  },
  {
    crisisId: 108,
    crisisName: "Mahaweli Feeder Canal Breach Containment",
    crisisType: "Flood",
    description: "Embankment erosion patched successfully by irrigation engineers. No downstream agricultural flooding detected.",
    severityLevel: "Low",
    startDate: "2026-11-14T08:00:00Z",
    status: "Closed",
    location: "Hasalaka Mahaweli Block",
    district: "Kandy",
    affectedPopulation: 120,
    assignedTeams: ["Irrigation Engineering Corps"],
    requiredAssistance: ["Geotextile Sandbags", "Monitoring Sensors"],
    reportedBy: "Mahaweli Authority Field Office",
    contactNumber: "+94 81 234 1122",
    lastUpdated: "2026-11-15T18:00:00Z"
  }
];

export const mockIncidentSummary = {
  total: 8,
  active: 4,
  critical: 2,
  reported: 1,
  resolved: 2,
  closed: 1
};
