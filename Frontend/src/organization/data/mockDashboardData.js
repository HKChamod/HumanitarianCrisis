/**
 * Temporary Mock Data for Organization Management Portal Dashboard
 * 
 * NOTE: This mock data is strictly separated from future API integration.
 * In production, these objects will be fetched from the backend API endpoints:
 *  - GET /api/organizations/current
 *  - GET /api/crisis-events
 *  - GET /api/assistance-requests
 *  - GET /api/areas
 */

export const mockOrganizationProfile = {
  id: "org-001",
  name: "Sri Lanka Red Cross Society",
  chapter: "Western Province Operations Center",
  registrationNumber: "NGO-LK-1951-002",
  type: "Humanitarian Aid / Disaster Response",
  status: "Operational",
  verified: true,
  currentCoordinator: {
    name: "Dr. K. Jayasuriya",
    role: "Provincial Response Director",
    email: "k.jayasuriya@redcross.lk",
    avatar: "KJ"
  },
  emergencyHotline: "117 / +94 11 269 4487",
  activeSince: "2024-01-10"
};

export const mockDashboardMetrics = [
  {
    id: "active-incidents",
    title: "Active Incidents",
    value: 14,
    change: "+3 in last 24h",
    changeType: "increase", // increase | decrease | neutral
    accentColor: "#10756F",
    icon: "alertTriangle",
    badge: "5 High Severity"
  },
  {
    id: "aid-requests",
    title: "Aid Requests Received",
    value: 186,
    change: "38 pending review",
    changeType: "urgent",
    accentColor: "#FFBE00",
    icon: "handHeart",
    badge: "128 Fulfilled"
  },
  {
    id: "dispatched-teams",
    title: "Dispatched Teams",
    value: 12,
    change: "4 on standby in hub",
    changeType: "neutral",
    accentColor: "#10756F",
    icon: "users",
    badge: "88 Responders Active"
  },
  {
    id: "supplies-distributed",
    title: "Relief Packs Dispatched",
    value: "2,450",
    change: "+420 today",
    changeType: "positive",
    accentColor: "#10756F",
    icon: "package",
    badge: "Food, Water & Medical"
  }
];

export const mockRecentActivities = [
  {
    id: "ACT-1082",
    incidentCode: "CR-COL-042",
    type: "Emergency Evacuation",
    location: "Kolonnawa, Colombo",
    reportedTime: "12 mins ago",
    priority: "High",
    status: "In Progress",
    assignedTeam: "Alpha Search & Rescue",
    beneficiaries: 85
  },
  {
    id: "ACT-1081",
    incidentCode: "CR-GAMP-019",
    type: "Clean Drinking Water Delivery",
    location: "Biyagama South, Gampaha",
    reportedTime: "45 mins ago",
    priority: "Medium",
    status: "En Route",
    assignedTeam: "Logistics Team Beta",
    beneficiaries: 340
  },
  {
    id: "ACT-1080",
    incidentCode: "CR-KAL-008",
    type: "Medical Camp & First Aid",
    location: "Bulathsinhala, Kalutara",
    reportedTime: "2 hours ago",
    priority: "High",
    status: "Operational",
    assignedTeam: "Rapid Medical Unit 2",
    beneficiaries: 120
  },
  {
    id: "ACT-1079",
    incidentCode: "CR-RAT-031",
    type: "Ration Pack Distribution",
    location: "Elapatha, Ratnapura",
    reportedTime: "3 hours ago",
    priority: "Low",
    status: "Completed",
    assignedTeam: "Volunteer Group Delta",
    beneficiaries: 210
  },
  {
    id: "ACT-1078",
    incidentCode: "CR-COL-039",
    type: "Temporary Shelter Allocation",
    location: "Wellampitiya, Colombo",
    reportedTime: "5 hours ago",
    priority: "Medium",
    status: "Completed",
    assignedTeam: "Shelter Response Unit",
    beneficiaries: 95
  }
];

export const mockUrgentAlerts = [
  {
    id: "ALT-01",
    severity: "Critical",
    title: "Kelani River Flood Level Notice",
    message: "Water level at Nagalagam Street gauge has reached Major Flood alert threshold. Evacuation shelters in Kolonnawa and Wellampitiya activated.",
    time: "25 minutes ago",
    actionRequired: "Coordinate rescue boats"
  },
  {
    id: "ALT-02",
    severity: "Warning",
    title: "Medical Supplies Low - Kalutara Hub",
    message: "Sterile gauze, water purification tablets, and ORS sachets inventory below 20% reserve threshold.",
    time: "1 hour ago",
    actionRequired: "Approve supply requisition"
  }
];

export const mockNotifications = [
  {
    id: "notif-1",
    title: "New Crisis Event Assigned",
    description: "Disaster Management Centre assigned Incident CR-COL-044 to your operations hub.",
    time: "10 mins ago",
    unread: true
  },
  {
    id: "notif-2",
    title: "Assistance Request Verified",
    description: "Citizen request #AR-9418 verified by district field officer.",
    time: "32 mins ago",
    unread: true
  },
  {
    id: "notif-3",
    title: "Team Alpha Check-In",
    description: "Team Leader confirmed arrival at Kolonnawa evacuation shelter.",
    time: "1 hour ago",
    unread: false
  }
];
