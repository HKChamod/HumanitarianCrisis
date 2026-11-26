import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, Loader2, MapPin } from 'lucide-react';
import { SRI_LANKA_CENTER, SRI_LANKA_DEFAULT_ZOOM } from '../constants/mapConstants.js';
import { useMap } from '../hooks/useMap.js';
import { useMapLayers } from '../hooks/useMapLayers.js';
import { getMapConfiguration } from '../services/mapConfig.js';
import { filterMapItems } from '../utils/geoJsonUtils.js';
import { MapControls } from './MapControls.jsx';
import { MapLayerControl } from './MapLayerControl.jsx';
import { MapLegend } from './MapLegend.jsx';
import { MapPopup } from './MapPopup.jsx';
import { MapSearch } from './MapSearch.jsx';

export function MapView({
  items = [],
  polygonsGeoJson = null,
  routeResult = null,
  selectedItem = undefined,
  onSelectItem,
  onSelectPolygon,
  onMapClick,
  missingCoordinatesCount = 0,
  loading = false,
  emptyMessage = 'No geo-located records match the current filters.',
  heightClass = 'h-[420px]',
  className = '',
  showSearch = true,
  showLayerControl = true,
  showLegend = true,
  showControls = true,
  cluster = true,
  initialCenter = SRI_LANKA_CENTER,
  initialZoom = SRI_LANKA_DEFAULT_ZOOM,
  fitBoundsOnDataChange = true,
}) {
  const config = useMemo(() => getMapConfiguration(), []);
  const containerRef = useRef(null);
  const [styleUrl, setStyleUrl] = useState(config.defaultStyleUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedItem, setInternalSelectedItem] = useState(null);

  const availableTypes = useMemo(
    () => Array.from(new Set((items || []).map((item) => item?.type).filter(Boolean))),
    [items],
  );

  const [visibleTypes, setVisibleTypes] = useState(() => new Set(availableTypes));

  useEffect(() => {
    setVisibleTypes((prev) => {
      if (availableTypes.length === 0) return new Set();
      if (prev.size === 0) return new Set(availableTypes);
      const next = new Set(prev);
      for (const type of availableTypes) {
        if (!prev.has(type)) {
          next.add(type);
        }
      }
      return next;
    });
  }, [availableTypes]);

  const filteredItems = useMemo(
    () =>
      filterMapItems(items, {
        visibleTypes: visibleTypes.size > 0 ? visibleTypes : null,
        searchQuery,
      }),
    [items, visibleTypes, searchQuery],
  );

  const activeSelectedItem = selectedItem !== undefined ? selectedItem : internalSelectedItem;

  const handleSelectItem = (item) => {
    if (selectedItem === undefined) {
      setInternalSelectedItem(item);
    }
    onSelectItem?.(item);
  };

  const handleToggleType = (type) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const { mapRef, mapReady, mapError } = useMap({
    containerRef,
    styleUrl: config.isConfigured ? styleUrl : '',
    initialCenter,
    initialZoom,
    onMapClick,
  });

  const { fitToItems } = useMapLayers({
    mapRef,
    mapReady,
    items: filteredItems,
    polygonsGeoJson,
    routeResult,
    cluster,
    onSelectItem: handleSelectItem,
    onSelectPolygon,
  });

  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    if (!mapReady || !fitBoundsOnDataChange || filteredItems.length === 0) return;
    if (!hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true;
      fitToItems(filteredItems);
    }
  }, [mapReady, fitBoundsOnDataChange, filteredItems, fitToItems]);

  const hasPolygons = Boolean(polygonsGeoJson?.features?.length);
  const showEmptyOverlay = !loading && filteredItems.length === 0 && !hasPolygons;

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {(showSearch || showLayerControl || showControls) && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-[#E2E8F0] rounded-xl p-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {showSearch && (
              <MapSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search map locations..."
              />
            )}
            {showLayerControl && (
              <MapLayerControl
                availableTypes={availableTypes}
                visibleTypes={visibleTypes}
                onToggleType={handleToggleType}
              />
            )}
          </div>
          {showControls && (
            <MapControls
              onFitBounds={() => fitToItems(filteredItems)}
              hasValidPoints={filteredItems.length > 0}
              stylePresets={config.stylePresets}
              activeStyleUrl={styleUrl}
              onChangeStyle={setStyleUrl}
            />
          )}
        </div>
      )}

      {missingCoordinatesCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            {missingCoordinatesCount} record{missingCoordinatesCount === 1 ? '' : 's'} without valid
            latitude/longitude coordinates {missingCoordinatesCount === 1 ? 'is' : 'are'} excluded from map markers.
          </span>
        </div>
      )}

      {!config.isConfigured ? (
        <div
          className={`w-full ${heightClass} rounded-xl border border-rose-200 bg-rose-50/70 flex flex-col items-center justify-center p-6 text-center`}
          role="alert"
        >
          <MapPin className="w-8 h-8 text-rose-500 mb-2" />
          <h3 className="text-sm font-semibold text-rose-900">Map Provider Not Configured</h3>
          <p className="text-xs text-rose-700 max-w-md mt-1">{config.configurationError}</p>
        </div>
      ) : (
        <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-100`}>
          <div ref={containerRef} className="w-full h-full" />

          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] shadow-xs text-xs font-medium text-[#0F172A]">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
                Loading map data...
              </div>
            </div>
          )}

          {mapError && (
            <div
              role="alert"
              className="absolute top-3 left-3 right-14 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{mapError}</span>
            </div>
          )}

          {showEmptyOverlay && !mapError && (
            <div className="absolute inset-x-4 bottom-12 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:mx-auto sm:max-w-sm z-10 bg-white/95 backdrop-blur-xs border border-[#E2E8F0] rounded-xl p-4 text-center shadow-sm pointer-events-none">
              <p className="text-xs font-medium text-[#475569]">{emptyMessage}</p>
            </div>
          )}

          {activeSelectedItem && (
            <div className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)]">
              <MapPopup item={activeSelectedItem} onClose={() => handleSelectItem(null)} />
            </div>
          )}

          {showLegend && availableTypes.length > 0 && (
            <div className="absolute bottom-3 right-3 z-10 hidden sm:block">
              <MapLegend types={Array.from(visibleTypes)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
