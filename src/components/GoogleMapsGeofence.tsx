import React, { useEffect, useState, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  School,
  LocateFixed,
} from 'lucide-react';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

// Helper: Haversine distance in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GoogleMapsGeofenceProps {
  schoolLocation: { lat: number; lng: number; name?: string };
  userLocation?: { lat: number; lng: number; address?: string };
  radiusMeters: number;
  isInteractive?: boolean;
  onLocationChange?: (coords: { lat: number; lng: number }) => void;
  height?: string;
  showUserMarker?: boolean;
  onDistanceCalculated?: (distanceMeters: number, isInRadius: boolean) => void;
}

export const GoogleMapsGeofence: React.FC<GoogleMapsGeofenceProps> = ({
  schoolLocation,
  userLocation,
  radiusMeters,
  isInteractive = false,
  onLocationChange,
  height = '320px',
  showUserMarker = true,
  onDistanceCalculated,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const onDistanceCalculatedRef = useRef(onDistanceCalculated);
  
  onLocationChangeRef.current = onLocationChange;
  onDistanceCalculatedRef.current = onDistanceCalculated;

  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  const safeRadius = Math.max(1, Number(radiusMeters) || 80);
  const safeSchoolLat =
    typeof schoolLocation?.lat === 'number' && !isNaN(schoolLocation.lat)
      ? schoolLocation.lat
      : -1.8682;
  const safeSchoolLng =
    typeof schoolLocation?.lng === 'number' && !isNaN(schoolLocation.lng)
      ? schoolLocation.lng
      : 124.4172;

  const distance = useMemo(() => {
    if (!userLocation || typeof userLocation.lat !== 'number' || typeof userLocation.lng !== 'number' || isNaN(userLocation.lat) || isNaN(userLocation.lng)) {
      return 0;
    }
    return calculateDistanceMeters(
      safeSchoolLat,
      safeSchoolLng,
      userLocation.lat,
      userLocation.lng
    );
  }, [safeSchoolLat, safeSchoolLng, userLocation?.lat, userLocation?.lng]);

  const isInRadius = distance <= safeRadius;

  // Notify distance calculation safely
  useEffect(() => {
    if (userLocation && onDistanceCalculatedRef.current) {
      onDistanceCalculatedRef.current(distance, isInRadius);
    }
  }, [distance, isInRadius, userLocation?.lat, userLocation?.lng]);

  // Initialize Map Once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent double initialization if container already has a map
    if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      return;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([safeSchoolLat, safeSchoolLng], 17);

      mapInstanceRef.current = map;

      const tileUrl =
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      tileLayerRef.current = tileLayer;

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onLocationChangeRef.current) {
          onLocationChangeRef.current({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
          });
        }
      });

      resizeTimerRef.current = setTimeout(() => {
        if (mapInstanceRef.current && (mapInstanceRef.current as unknown as { _mapPane?: HTMLElement })._mapPane) {
          try {
            map.invalidateSize();
          } catch {
            // ignore
          }
        }
      }, 200);
    } catch (err) {
      console.warn('Failed to initialize Leaflet map:', err);
    }

    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      layersGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []); // Run once on mount

  // Update Tile Layer when mapType changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl =
      mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    tileLayerRef.current.setUrl(tileUrl);
  }, [mapType]);

  // Update Markers, Circles, and Bounds when locations/radius change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup || !(map as unknown as { _mapPane?: HTMLElement })._mapPane) return;

    try {
      layersGroup.clearLayers();

      // School Icon
      const schoolIcon = L.divIcon({
        className: 'custom-school-pin',
        html: `
          <div style="
            background: #4f46e5;
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5);
            border: 2px solid white;
            font-size: 16px;
          ">🏫</div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const schoolMarker = L.marker([safeSchoolLat, safeSchoolLng], {
        icon: schoolIcon,
      });

      schoolMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 2px; font-size: 12px;">
          <strong style="color: #4338ca; font-size: 13px;">${schoolLocation?.name || 'Pusat Sekolah'}</strong><br/>
          <span style="color: #6b7280; font-size: 11px;">Titik Pusat Geofence Resmi</span><br/>
          <div style="margin-top: 4px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; display: inline-block;">
            Radius: ${safeRadius} Meter
          </div>
        </div>
      `);

      layersGroup.addLayer(schoolMarker);

      // Geofence Circle
      const circleColor = isInRadius ? '#059669' : '#dc2626';
      const circleFill = isInRadius ? '#10b981' : '#ef4444';

      const circle = L.circle([safeSchoolLat, safeSchoolLng], {
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: 0.18,
        radius: safeRadius,
        weight: 2,
        dashArray: '5, 5',
      });

      layersGroup.addLayer(circle);

      // User Marker
      if (showUserMarker && userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number' && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `
            <div style="
              background: ${isInRadius ? '#10b981' : '#ef4444'};
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px ${isInRadius ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
              border: 2px solid white;
              font-size: 15px;
            ">📍</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
        });

        userMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 2px; font-size: 12px;">
            <strong style="color: ${isInRadius ? '#047857' : '#b91c1c'}; font-size: 13px;">
              ${isInRadius ? '✅ Dalam Radius Sekolah' : '⚠️ Di Luar Radius Sekolah'}
            </strong><br/>
            <span>Jarak: <strong>${distance} meter</strong> (Maks: ${safeRadius}m)</span><br/>
            <span style="color: #6b7280; font-size: 10px;">${userLocation.address || 'Koordinat Terdeteksi'}</span>
          </div>
        `);

        layersGroup.addLayer(userMarker);

        const bounds = L.latLngBounds([
          [safeSchoolLat, safeSchoolLng],
          [userLocation.lat, userLocation.lng],
        ]);
        map.fitBounds(bounds.pad(0.3), { animate: false });
      } else {
        map.panTo([safeSchoolLat, safeSchoolLng], { animate: false });
      }
    } catch (err) {
      console.warn('Error updating Leaflet layers:', err);
    }
  }, [
    safeSchoolLat,
    safeSchoolLng,
    schoolLocation?.name,
    userLocation?.lat,
    userLocation?.lng,
    userLocation?.address,
    safeRadius,
    isInRadius,
    distance,
    showUserMarker,
  ]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col z-0"
      style={{ height }}
    >
      {/* Map Top Bar Info */}
      <div className="absolute top-2 left-2 right-2 z-1000 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md text-xs flex items-center space-x-2 pointer-events-auto">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isInRadius ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-bold text-slate-800">
            {isInRadius ? 'Dalam Radius Geofence' : 'Di Luar Radius Sekolah'}
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            ({distance}m / maks {radiusMeters}m)
          </span>
        </div>

        {/* View Toggle */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-md flex items-center space-x-1 pointer-events-auto text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMapType('street')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'street'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Peta
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'satellite'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Satelit
          </button>
        </div>
      </div>

      {/* Leaflet Map Target DOM */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {isInteractive && (
        <div className="bg-slate-900/90 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 flex items-center justify-between border-t border-slate-800 z-1000">
          <span className="flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>Klik pada peta untuk memindahkan titik koordinat pusat sekolah</span>
          </span>
          <span className="font-mono text-slate-400">
            {schoolLocation.lat.toFixed(5)}, {schoolLocation.lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
};
