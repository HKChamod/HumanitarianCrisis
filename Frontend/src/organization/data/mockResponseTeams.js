/**
 * Mock Data for Response Teams Management
 * 
 * Team Types:
 *  - Search and Rescue
 *  - Medical Response
 *  - Logistics
 *  - Volunteer Support
 *  - Relief Distribution
 * 
 * Availability Statuses:
 *  - Available
 *  - Deployed
 *  - On Standby
 *  - Unavailable
 * 
 * Districts: Colombo | Gampaha | Kalutara | Ratnapura | Kandy | Galle
 */

export const TEAM_TYPES = [
  "Search and Rescue",
  "Medical Response",
  "Logistics",
  "Volunteer Support",
  "Relief Distribution"
];

export const TEAM_STATUSES = [
  "Available",
  "Deployed",
  "On Standby",
  "Unavailable"
];

export const SRI_LANKA_DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Ratnapura",
  "Kandy",
  "Galle",
  "Matara",
  "Badulla"
];

export const initialResponseTeams = [
  {
    teamId: "TM-101",
    teamName: "Alpha Search & Rescue",
    teamType: "Search and Rescue",
    teamLeader: "Capt. S. Ranatunga",
    leaderPhone: "+94 77 112 3344",
    leaderEmail: "s.ranatunga@redcross.lk",
    membersCount: 16,
    assignedArea: "Kolonnawa & Wellampitiya",
    district: "Colombo",
    status: "Deployed",
    deployedIncident: "Kelani River Flash Floods 2026 (#CR-101)",
    specializedEquipment: ["Inflatable Rescue Boats", "Sonar Life Detectors", "Lifejackets (30)", "Emergency Torches"],
    baseStation: "Western Province Operations Center, Colombo 07",
    lastDeploymentDate: "2026-11-16T08:00:00Z"
  },
  {
    teamId: "TM-102",
    teamName: "Rapid Medical Unit 2",
    teamType: "Medical Response",
    teamLeader: "Dr. Nilmini Senanayake",
    leaderPhone: "+94 71 445 6677",
    leaderEmail: "n.senanayake@redcross.lk",
    membersCount: 12,
    assignedArea: "Bulathsinhala Hillside",
    district: "Kalutara",
    status: "Deployed",
    deployedIncident: "Bulathsinhala Slope Failure Risk (#CR-103)",
    specializedEquipment: ["Emergency Trauma Bags", "Portable ECG & Oxygen", "Anti-Venom / ORS Kits", "Stretcher Sets"],
    baseStation: "Horana Base Hospital Relief Staging Area",
    lastDeploymentDate: "2026-11-17T09:30:00Z"
  },
  {
    teamId: "TM-103",
    teamName: "Logistics Team Beta",
    teamType: "Logistics",
    teamLeader: "M. A. Priyadarshana",
    leaderPhone: "+94 77 889 0011",
    leaderEmail: "m.priyadarshana@redcross.lk",
    membersCount: 10,
    assignedArea: "Biyagama South Hub",
    district: "Gampaha",
    status: "Available",
    deployedIncident: null,
    specializedEquipment: ["Heavy 4x4 Supply Trucks", "Water Bowser (2000L)", "Hydraulic Winches", "Forklift Unit"],
    baseStation: "Kelaniya Central Warehousing Depot",
    lastDeploymentDate: "2026-11-15T16:00:00Z"
  },
  {
    teamId: "TM-104",
    teamName: "Volunteer Group Delta",
    teamType: "Volunteer Support",
    teamLeader: "Chaminda Bandara",
    leaderPhone: "+94 76 334 5566",
    leaderEmail: "c.bandara@redcross.lk",
    membersCount: 28,
    assignedArea: "Pelmadulla & Kiriella",
    district: "Ratnapura",
    status: "On Standby",
    deployedIncident: null,
    specializedEquipment: ["Megaphones & PA Sets", "First Aid Backpacks", "Community Triage Tents", "Rainwear Kits"],
    baseStation: "Ratnapura Municipal Relief Camp",
    lastDeploymentDate: "2026-11-14T11:00:00Z"
  },
  {
    teamId: "TM-105",
    teamName: "Shelter Response Unit",
    teamType: "Relief Distribution",
    teamLeader: "K. H. Wimalasiri",
    leaderPhone: "+94 75 778 9900",
    leaderEmail: "k.wimalasiri@redcross.lk",
    membersCount: 14,
    assignedArea: "Sedawatta & Kotikawatta",
    district: "Colombo",
    status: "Available",
    deployedIncident: null,
    specializedEquipment: ["Heavy Duty Tarpaulins (200)", "Camp Bedding Sets", "Mosquito Nets", "Emergency Generators"],
    baseStation: "Colombo Port Relief Staging Warehouse",
    lastDeploymentDate: "2026-11-15T14:00:00Z"
  },
  {
    teamId: "TM-106",
    teamName: "Navy Boat Squadron 2",
    teamType: "Search and Rescue",
    teamLeader: "Lt. Commander D. Perera",
    leaderPhone: "+94 77 990 1122",
    leaderEmail: "d.perera@navy.lk",
    membersCount: 18,
    assignedArea: "Kelani River Embankments",
    district: "Colombo",
    status: "Deployed",
    deployedIncident: "Kelani River Flash Floods 2026 (#CR-101)",
    specializedEquipment: ["Gemini Rescue Craft (4)", "Outboard Motors", "Diving Scuba Sets", "Thermal Night Scopes"],
    baseStation: "Rangala Naval Post, Colombo",
    lastDeploymentDate: "2026-11-16T06:00:00Z"
  },
  {
    teamId: "TM-107",
    teamName: "Central Province Relief Unit",
    teamType: "Relief Distribution",
    teamLeader: "Asela Jayawardena",
    leaderPhone: "+94 71 223 3445",
    leaderEmail: "a.jayawardena@redcross.lk",
    membersCount: 15,
    assignedArea: "Nawalapitiya & Gampola",
    district: "Kandy",
    status: "Available",
    deployedIncident: null,
    specializedEquipment: ["Dry Food Rations Kits", "Purification Tablets", "Sanitation Disinfection Sprayers"],
    baseStation: "Kandy District Secretariat Command Center",
    lastDeploymentDate: "2026-11-16T17:00:00Z"
  },
  {
    teamId: "TM-108",
    teamName: "Southern Medical Outpost",
    teamType: "Medical Response",
    teamLeader: "Dr. Rohana Alwis",
    leaderPhone: "+94 77 445 5667",
    leaderEmail: "r.alwis@redcross.lk",
    membersCount: 8,
    assignedArea: "Galle Fort & Habaraduwa",
    district: "Galle",
    status: "On Standby",
    deployedIncident: null,
    specializedEquipment: ["Mobile Clinic Van", "First Responder Kits", "Diagnostic Blood Monitors", "Wound Dressings"],
    baseStation: "Karapitiya Emergency Auxiliary Center",
    lastDeploymentDate: "2026-11-15T12:00:00Z"
  },
  {
    teamId: "TM-109",
    teamName: "Heavy Clearance Engineers",
    teamType: "Logistics",
    teamLeader: "Eng. Nihal Gunasekara",
    leaderPhone: "+94 78 667 7889",
    leaderEmail: "n.gunasekara@redcross.lk",
    membersCount: 12,
    assignedArea: "A4 Pelmadulla Pass",
    district: "Ratnapura",
    status: "Unavailable",
    deployedIncident: null,
    specializedEquipment: ["Caterpillar Earth Excavators", "Chainsaws", "Hydraulic Jacks", "Safety Shoring Timbers"],
    baseStation: "RDA Mechanical Yard, Ratnapura",
    lastDeploymentDate: "2026-11-14T09:00:00Z"
  }
];
