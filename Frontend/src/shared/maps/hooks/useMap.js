import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  SRI_LANKA_BOUNDS,
  SRI_LANKA_CENTER,
  SRI_LANKA_DEFAULT_ZOOM,
} from '../constants/mapConstants.js';

if (typeof maplibregl.setWorkerUrl === 'function' && maplibreglWorkerUrl) {
  maplibregl.setWorkerUrl(maplibreglWorkerUrl);
}

export function useMap({
  containerRef,
  styleUrl,
  initialCenter = SRI_LANKA_CENTER,
  initialZoom = SRI_LANKA_DEFAULT_ZOOM,
  onMapClick,
}) {
  const mapRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !styleUrl) {
      setMapReady(false);
      return undefined;
    }

    let disposed = false;
    setMapReady(false);
    setMapError(null);

    const map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: initialCenter,
      zoom: initialZoom,
      maxBounds: SRI_LANKA_BOUNDS,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    );

    const handleLoad = () => {
      if (!disposed) {
        setMapReady(true);
      }
    };

    const handleError = (e) => {
      if (!disposed && e?.error) {
        setMapError(e.error.message || 'Unable to load map tiles or style.');
      }
    };

    const handleClick = (e) => {
      if (onMapClickRef.current && e?.lngLat) {
        onMapClickRef.current({
          latitude: Number(e.lngLat.lat.toFixed(6)),
          longitude: Number(e.lngLat.lng.toFixed(6)),
        });
      }
    };

    map.on('load', handleLoad);
    map.on('error', handleError);
    map.on('click', handleClick);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!disposed) map.resize();
          })
        : null;
    resizeObserver?.observe(container);

    mapRef.current = map;

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map.off('load', handleLoad);
      map.off('error', handleError);
      map.off('click', handleClick);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Intentionally recreate map only when container or styleUrl changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, styleUrl]);

  return { mapRef, mapReady, mapError };
}
