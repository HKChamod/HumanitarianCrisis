export const SRI_LANKA_CENTER = [80.7718, 7.8731]; // [longitude, latitude]
export const SRI_LANKA_DEFAULT_ZOOM = 7;
export const SRI_LANKA_BOUNDS = [
  [79.4, 5.8],
  [82.0, 9.95],
];

export const MAP_ENTITY_TYPES = {
  CRISIS: 'crisis',
  SHELTER: 'shelter',
  ORGANIZATION: 'organization',
  CITIZEN_REQUEST: 'citizen_request',
  WAREHOUSE: 'warehouse',
  VOLUNTEER: 'volunteer',
  ALLOCATION: 'allocation',
  AI_RECOMMENDATION: 'ai_recommendation',
};

export const MAP_TYPE_META = {
  [MAP_ENTITY_TYPES.CRISIS]: {
    label: 'Crisis Events',
    color: '#DC2626',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.SHELTER]: {
    label: 'Shelters',
    color: '#0F766E',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.ORGANIZATION]: {
    label: 'Organizations',
    color: '#2563EB',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.CITIZEN_REQUEST]: {
    label: 'Citizen Requests',
    color: '#D97706',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.WAREHOUSE]: {
    label: 'Warehouses',
    color: '#7C3AED',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.VOLUNTEER]: {
    label: 'Volunteers',
    color: '#059669',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.ALLOCATION]: {
    label: 'Allocations',
    color: '#0284C7',
    defaultVisible: true,
  },
  [MAP_ENTITY_TYPES.AI_RECOMMENDATION]: {
    label: 'AI Advisory Locations',
    color: '#DB2777',
    defaultVisible: true,
  },
};

export const SEVERITY_COLOR_MAP = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#16A34A',
};
