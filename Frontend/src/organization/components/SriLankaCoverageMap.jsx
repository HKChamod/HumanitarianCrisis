import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SRI_LANKA_MAP_CONFIG,
  SRI_LANKA_DISTRICTS_GEOJSON
} from '../data/sriLankaDistrictsGeoJSON';

// Fix standard Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const SriLankaCoverageMap = ({
  areas = [],
  selectedAreaId = null,
  onSelectArea = () => {},
  districtFilter = 'all'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  // Helper to get color by risk level
  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return '#DC2626'; // Red
      case 'high':
        return '#EA580C'; // Orange
      case 'medium':
        return '#D97706'; // Yellow/Amber
      case 'low':
        return '#059669'; // Green
      default:
        return '#64748B'; // Slate
    }
  };

  // Map of highest risk level per district
  const districtRiskMap = React.useMemo(() => {
    const map = {};
    areas.forEach((area) => {
      const d = area.district?.toLowerCase();
      if (!d) return;
      const current = map[d];
      const risk = area.riskLevel?.toLowerCase();
      if (!current || risk === 'critical' || (risk === 'high' && current !== 'critical')) {
        map[d] = risk;
      }
    });
    return map;
  }, [areas]);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Constrain Leaflet strictly to Sri Lanka
    const maxBounds = L.latLngBounds(
      L.latLng(SRI_LANKA_MAP_CONFIG.maxBounds[0]),
      L.latLng(SRI_LANKA_MAP_CONFIG.maxBounds[1])
    );

    const map = L.map(mapContainerRef.current, {
      center: SRI_LANKA_MAP_CONFIG.center,
      zoom: SRI_LANKA_MAP_CONFIG.zoom,
      minZoom: SRI_LANKA_MAP_CONFIG.minZoom,
      maxZoom: SRI_LANKA_MAP_CONFIG.maxZoom,
      maxBounds: maxBounds,
      maxBoundsViscosity: 0.9,
      attributionControl: true,
      zoomControl: true
    });

    // Fit view to Sri Lanka island bounds
    map.fitBounds(SRI_LANKA_MAP_CONFIG.bounds, { padding: [15, 15] });

    // OpenStreetMap tile layer (no paid API key required)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ReliefLink Disaster Ops',
      maxZoom: 18,
      minZoom: 6
    });

    osmLayer.on('tileerror', () => {
      setTileError(true);
    });

    osmLayer.addTo(map);

    // Create layer groups
    geojsonLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update GeoJSON Districts Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const geoLayerGroup = geojsonLayerRef.current;
    if (!map || !geoLayerGroup) return;

    geoLayerGroup.clearLayers();

    const geoLayer = L.geoJSON(SRI_LANKA_DISTRICTS_GEOJSON, {
      style: (feature) => {
        const dName = feature.properties.name?.toLowerCase();
        const risk = districtRiskMap[dName];
        const isFiltered = districtFilter !== 'all' && dName === districtFilter.toLowerCase();

        let fillColor = '#94A3B8';
        let fillOpacity = 0.08;
        let borderColor = '#CBD5E1';
        let weight = 1.2;

        if (risk === 'critical') {
          fillColor = '#EF4444';
          fillOpacity = isFiltered ? 0.45 : 0.28;
          borderColor = '#DC2626';
          weight = 2;
        } else if (risk === 'high') {
          fillColor = '#F97316';
          fillOpacity = isFiltered ? 0.45 : 0.25;
          borderColor = '#EA580C';
          weight = 1.8;
        } else if (risk === 'medium') {
          fillColor = '#F59E0B';
          fillOpacity = isFiltered ? 0.45 : 0.22;
          borderColor = '#D97706';
          weight = 1.5;
        } else if (risk === 'low') {
          fillColor = '#10B981';
          fillOpacity = isFiltered ? 0.45 : 0.18;
          borderColor = '#059669';
          weight = 1.5;
        }

        if (isFiltered) {
          borderColor = '#10756F';
          weight = 3;
        }

        return {
          fillColor: fillColor,
          weight: weight,
          opacity: 1,
          color: borderColor,
          fillOpacity: fillOpacity
        };
      },
      onEachFeature: (feature, layer) => {
        const dName = feature.properties.name;
        const dRisk = districtRiskMap[dName.toLowerCase()];
        const count = areas.filter(a => a.district?.toLowerCase() === dName.toLowerCase()).length;

        layer.bindTooltip(
          `<strong>${dName} District</strong><br/>${count > 0 ? `${count} Active Response Areas (${dRisk || 'Assigned'})` : 'Monitored Baseline Area'}`,
          { sticky: true, className: 'org-map-district-tooltip' }
        );

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3, color: '#10756F', fillOpacity: 0.4 });
          },
          mouseout: (e) => {
            geoLayer.resetStyle(e.target);
          }
        });
      }
    });

    geoLayerGroup.addLayer(geoLayer);
  }, [districtRiskMap, districtFilter, areas]);

  // Update Markers Layer for Assigned Areas
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    areas.forEach((area) => {
      // Filter check
      if (districtFilter !== 'all' && area.district?.toLowerCase() !== districtFilter.toLowerCase()) {
        return;
      }

      if (!area.coordinates || area.coordinates.length !== 2) return;

      const riskColor = getRiskColor(area.riskLevel);
      const isSelected = selectedAreaId === area.areaId;

      // Custom HTML Pin DivIcon
      const pinHtml = `
        <div class="org-map-pin-container" style="${isSelected ? 'transform: translate(-50%, -100%) scale(1.15); z-index: 1000;' : ''}">
          <div class="org-map-pin-bubble" style="background-color: ${riskColor};">
            <span>●</span>
            <span>${area.areaId}</span>
          </div>
          <div class="org-map-pin-point" style="border-top: 8px solid ${riskColor};"></div>
          <div class="org-map-pin-pulse" style="background-color: ${riskColor};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'org-custom-leaflet-pin',
        iconSize: [80, 40],
        iconAnchor: [40, 40],
        popupAnchor: [0, -38]
      });

      const marker = L.marker(area.coordinates, { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div class="org-map-popup-card">
          <div class="org-popup-header">
            <div>
              <span style="font-size: 11px; font-weight: 700; color: #10756F; background: #ECFBF8; padding: 2px 6px; border-radius: 4px;">#${area.areaId}</span>
              <h4 class="org-popup-title" style="margin-top: 4px;">${area.areaName}</h4>
            </div>
          </div>
          <div class="org-popup-grid">
            <div>
              <span class="org-popup-field-label">District:</span>
              <div class="org-popup-field-val">📍 ${area.district}</div>
            </div>
            <div>
              <span class="org-popup-field-label">Risk Level:</span>
              <div class="org-popup-field-val" style="color: ${riskColor};">● ${area.riskLevel}</div>
            </div>
            <div>
              <span class="org-popup-field-label">Crisis Type:</span>
              <div class="org-popup-field-val">${area.crisisType}</div>
            </div>
            <div>
              <span class="org-popup-field-label">Status:</span>
              <div class="org-popup-field-val">${area.responseStatus}</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569;">
            <strong>Assigned Teams:</strong> ${area.assignedTeams?.length ? area.assignedTeams.join(', ') : 'None assigned'}
          </div>
          <button id="btn-popup-${area.areaId}" class="org-popup-btn" type="button">
            View Area Details &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${area.areaId}`);
        if (btn) {
          btn.onclick = () => {
            onSelectArea(area);
            map.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectArea(area);
      });

      markersGroup.addLayer(marker);
    });
  }, [areas, districtFilter, selectedAreaId, onSelectArea]);

  // Reset Map View
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(SRI_LANKA_MAP_CONFIG.bounds, { padding: [15, 15], animate: true });
    }
  };

  return (
    <div className="org-map-card">
      {/* Map Header */}
      <div className="org-map-header">
        <div className="org-map-header-left">
          <h2 className="org-map-title">
            <span>🗺️ Sri Lanka Geographic Coverage Map</span>
          </h2>
          <p className="org-map-subtitle">
            Interactive GIS view displaying all 25 districts, disaster risk severity zones, and active response deployments.
          </p>
        </div>

        <div className="org-map-controls-group">
          <span className="org-map-demo-pill">
            <span>🛡️ Simulated Demo Data</span>
          </span>
          <button
            className="org-btn-reset-map"
            onClick={handleResetView}
            type="button"
            title="Reset map view to whole island"
          >
            <span>Reset Island View</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Element */}
      <div className="org-leaflet-wrapper">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Fallback Notice if Tiles Are Offline */}
        {tileError && (
          <div className="org-map-tile-fallback">
            <span>Offline tile mode: Showing vector district boundaries</span>
          </div>
        )}

        {/* Floating Risk Legend */}
        <div className="org-map-floating-legend">
          <span className="org-legend-title">District Risk Level</span>
          <div className="org-legend-items">
            <div className="org-legend-item">
              <span className="org-legend-swatch" style={{ backgroundColor: '#DC2626' }}></span>
              <span>Critical Risk</span>
            </div>
            <div className="org-legend-item">
              <span className="org-legend-swatch" style={{ backgroundColor: '#EA580C' }}></span>
              <span>High Risk</span>
            </div>
            <div className="org-legend-item">
              <span className="org-legend-swatch" style={{ backgroundColor: '#D97706' }}></span>
              <span>Medium Risk</span>
            </div>
            <div className="org-legend-item">
              <span className="org-legend-swatch" style={{ backgroundColor: '#059669' }}></span>
              <span>Low Risk</span>
            </div>
            <div className="org-legend-item">
              <span className="org-legend-swatch" style={{ backgroundColor: '#CBD5E1' }}></span>
              <span>Monitored Baseline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
