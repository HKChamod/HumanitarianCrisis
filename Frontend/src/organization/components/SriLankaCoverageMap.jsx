import { useMemo } from 'react';
import {
  MapView,
  MAP_ENTITY_TYPES,
  parseCoordinates,
} from '../../shared/maps';
import { SRI_LANKA_DISTRICTS_GEOJSON } from '../data/sriLankaDistrictsGeoJSON';

function getRiskFill(risk, isFiltered) {
  switch (risk?.toLowerCase()) {
    case 'critical':
      return { fillColor: '#EF4444', fillOpacity: isFiltered ? 0.45 : 0.28 };
    case 'high':
      return { fillColor: '#F97316', fillOpacity: isFiltered ? 0.45 : 0.25 };
    case 'medium':
      return { fillColor: '#F59E0B', fillOpacity: isFiltered ? 0.45 : 0.22 };
    case 'low':
      return { fillColor: '#10B981', fillOpacity: isFiltered ? 0.45 : 0.18 };
    default:
      return { fillColor: '#94A3B8', fillOpacity: isFiltered ? 0.25 : 0.08 };
  }
}

export const SriLankaCoverageMap = ({
  areas = [],
  selectedAreaId = null,
  onSelectArea = () => {},
  districtFilter = 'all',
}) => {
  const districtRiskMap = useMemo(() => {
    const map = {};
    areas.forEach((area) => {
      const d = area.district?.toLowerCase();
      if (!d) return;
      const risk = area.riskLevel?.toLowerCase();
      if (risk === 'critical') map[d] = 'critical';
      else if (risk === 'high' && map[d] !== 'critical') map[d] = 'high';
      else if (risk === 'medium' && !['critical', 'high'].includes(map[d])) map[d] = 'medium';
      else if (!map[d]) map[d] = risk || 'low';
    });
    return map;
  }, [areas]);

  const styledDistrictPolygons = useMemo(() => {
    if (!SRI_LANKA_DISTRICTS_GEOJSON?.features) return null;
    return {
      ...SRI_LANKA_DISTRICTS_GEOJSON,
      features: SRI_LANKA_DISTRICTS_GEOJSON.features.map((feature) => {
        const dName = feature.properties?.name?.toLowerCase() || '';
        const risk = districtRiskMap[dName];
        const isFiltered = districtFilter !== 'all' && dName === districtFilter.toLowerCase();
        const { fillColor, fillOpacity } = getRiskFill(risk, isFiltered);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            fillColor,
            fillOpacity,
            riskLevel: risk || 'baseline',
          },
        };
      }),
    };
  }, [districtRiskMap, districtFilter]);

  const { items, missingCoordinatesCount } = useMemo(() => {
    const valid = [];
    let missing = 0;

    areas.forEach((area) => {
      if (districtFilter !== 'all' && area.district?.toLowerCase() !== districtFilter.toLowerCase()) {
        return;
      }
      const coords = parseCoordinates(area.coordinates?.[0], area.coordinates?.[1]);
      if (!coords) {
        missing += 1;
        return;
      }
      valid.push({
        id: area.areaId,
        type: MAP_ENTITY_TYPES.AREA,
        title: `${area.district || 'Area'} — ${area.areaName || area.areaId}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        status: area.riskLevel || 'Assigned',
        properties: {
          districtName: area.district,
          areaName: area.areaName || area.areaId,
          severityLevel: area.riskLevel,
          raw: area,
        },
      });
    });

    return { items: valid, missingCoordinatesCount: missing };
  }, [areas, districtFilter]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedAreaId) || null,
    [items, selectedAreaId],
  );

  return (
    <div className="org-map-card">
      <div className="org-map-header">
        <div className="org-map-header-left">
          <h2 className="org-map-title">
            <span>Sri Lanka Geographic Coverage Map</span>
          </h2>
          <p className="org-map-subtitle">
            Interactive MapLibre GIS view displaying Sri Lanka districts, disaster risk severity zones, and assigned response areas.
          </p>
        </div>
      </div>

      <div className="p-3">
        <MapView
          items={items}
          polygonsGeoJson={styledDistrictPolygons}
          selectedItem={selectedItem}
          onSelectItem={(item) => onSelectArea(item?.id || null)}
          missingCoordinatesCount={missingCoordinatesCount}
          heightClass="h-[460px]"
          showSearch={true}
          showLayerControl={false}
          emptyMessage="No assigned areas with valid coordinates match the selected district."
        />
      </div>
    </div>
  );
};
