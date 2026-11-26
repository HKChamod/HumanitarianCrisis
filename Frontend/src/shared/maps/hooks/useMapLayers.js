import { useEffect, useRef } from 'react';
import { computeBounds } from '../utils/coordinateUtils.js';
import { buildRouteGeoJson, mapItemsToGeoJson } from '../utils/geoJsonUtils.js';

const POINTS_SOURCE = 'hcms-points-source';
const CLUSTERS_LAYER = 'hcms-clusters-layer';
const CLUSTER_COUNT_LAYER = 'hcms-cluster-count-layer';
const UNCLUSTERED_LAYER = 'hcms-unclustered-layer';

const POLYGONS_SOURCE = 'hcms-polygons-source';
const POLYGONS_FILL_LAYER = 'hcms-polygons-fill-layer';
const POLYGONS_LINE_LAYER = 'hcms-polygons-line-layer';

const ROUTE_SOURCE = 'hcms-route-source';
const ROUTE_LINE_LAYER = 'hcms-route-line-layer';

export function useMapLayers({
  mapRef,
  mapReady,
  items = [],
  polygonsGeoJson = null,
  routeResult = null,
  cluster = true,
  onSelectItem,
  onSelectPolygon,
}) {
  const onSelectItemRef = useRef(onSelectItem);
  onSelectItemRef.current = onSelectItem;
  const onSelectPolygonRef = useRef(onSelectPolygon);
  onSelectPolygonRef.current = onSelectPolygon;

  const itemsByIdRef = useRef(new Map());
  itemsByIdRef.current = new Map(items.map((item) => [String(item.id), item]));

  // Register interactive GeoJSON sources/layers once per map load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;

    if (!map.getSource(POLYGONS_SOURCE)) {
      map.addSource(POLYGONS_SOURCE, {
        type: 'geojson',
        data: polygonsGeoJson || { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: POLYGONS_FILL_LAYER,
        type: 'fill',
        source: POLYGONS_SOURCE,
        paint: {
          'fill-color': ['coalesce', ['get', 'fillColor'], '#0F766E'],
          'fill-opacity': 0.16,
        },
      });
      map.addLayer({
        id: POLYGONS_LINE_LAYER,
        type: 'line',
        source: POLYGONS_SOURCE,
        paint: {
          'line-color': ['coalesce', ['get', 'strokeColor'], '#0F766E'],
          'line-width': 1.5,
        },
      });
    }

    if (!map.getSource(ROUTE_SOURCE)) {
      map.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: buildRouteGeoJson(routeResult) || { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: ROUTE_LINE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        paint: {
          'line-color': '#0284C7',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    }

    if (!map.getSource(POINTS_SOURCE)) {
      map.addSource(POINTS_SOURCE, {
        type: 'geojson',
        data: mapItemsToGeoJson(items),
        cluster: Boolean(cluster),
        clusterMaxZoom: 12,
        clusterRadius: 42,
      });

      if (cluster) {
        map.addLayer({
          id: CLUSTERS_LAYER,
          type: 'circle',
          source: POINTS_SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0F766E',
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: POINTS_SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#FFFFFF',
          },
        });
      }

      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: 'circle',
        source: POINTS_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['coalesce', ['get', 'color'], '#0F766E'],
          'circle-radius': 8,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    const handleClusterClick = async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTERS_LAYER] });
      if (!features.length) return;
      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource(POINTS_SOURCE);
      if (source && typeof source.getClusterExpansionZoom === 'function') {
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: features[0].geometry.coordinates, zoom });
        } catch {
          // ignore cluster zoom errors
        }
      }
    };

    const handlePointClick = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = String(feature.properties?.id || '');
      const matched = itemsByIdRef.current.get(id);
      if (matched && onSelectItemRef.current) {
        onSelectItemRef.current(matched);
      }
    };

    const handlePolygonClick = (e) => {
      const feature = e.features?.[0];
      if (feature && onSelectPolygonRef.current) {
        onSelectPolygonRef.current(feature.properties || {});
      }
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = '';
    };

    if (cluster) {
      map.on('click', CLUSTERS_LAYER, handleClusterClick);
      map.on('mouseenter', CLUSTERS_LAYER, setPointer);
      map.on('mouseleave', CLUSTERS_LAYER, clearPointer);
    }
    map.on('click', UNCLUSTERED_LAYER, handlePointClick);
    map.on('mouseenter', UNCLUSTERED_LAYER, setPointer);
    map.on('mouseleave', UNCLUSTERED_LAYER, clearPointer);
    map.on('click', POLYGONS_FILL_LAYER, handlePolygonClick);

    return () => {
      if (!map.getStyle()) return;
      if (cluster) {
        map.off('click', CLUSTERS_LAYER, handleClusterClick);
        map.off('mouseenter', CLUSTERS_LAYER, setPointer);
        map.off('mouseleave', CLUSTERS_LAYER, clearPointer);
      }
      map.off('click', UNCLUSTERED_LAYER, handlePointClick);
      map.off('mouseenter', UNCLUSTERED_LAYER, setPointer);
      map.off('mouseleave', UNCLUSTERED_LAYER, clearPointer);
      map.off('click', POLYGONS_FILL_LAYER, handlePolygonClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, mapReady, cluster]);

  // Update GeoJSON points dynamically without recreating map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(POINTS_SOURCE);
    if (source && typeof source.setData === 'function') {
      source.setData(mapItemsToGeoJson(items));
    }
  }, [mapRef, mapReady, items]);

  // Update polygons GeoJSON dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(POLYGONS_SOURCE);
    if (source && typeof source.setData === 'function') {
      source.setData(polygonsGeoJson || { type: 'FeatureCollection', features: [] });
    }
  }, [mapRef, mapReady, polygonsGeoJson]);

  // Update route GeoJSON dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(ROUTE_SOURCE);
    if (source && typeof source.setData === 'function') {
      source.setData(buildRouteGeoJson(routeResult) || { type: 'FeatureCollection', features: [] });
    }
  }, [mapRef, mapReady, routeResult]);

  const fitToItems = () => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const bounds = computeBounds(items);
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 500 });
    }
  };

  return { fitToItems };
}
