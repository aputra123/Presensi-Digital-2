import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  School,
  AlertCircle,
  LocateFixed,
  ExternalLink,
  ShieldCheck,
  Compass,
  Layers,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';

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

interface GeofenceCircleProps {
  center: { lat: number; lng: number };
  radius: number;
  isInRadius?: boolean;
}

const GeofenceCircle: React.FC<GeofenceCircleProps> = ({ center, radius, isInRadius = true }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !window.google?.maps?.Circle) return;

    const strokeColor = isInRadius ? '#059669' : '#DC2626';
    const fillColor = isInRadius ? '#10B981' : '#EF4444';

    const circle = new window.google.maps.Circle({
      strokeColor,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor,
      fillOpacity: 0.18,
      map,
      center,
      radius,
      clickable: false,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, center.lat, center.lng, radius, isInRadius]);

  return null;
};

interface GoogleMapsGeofenceProps {
  schoolLocation: { lat: number; lng: number; name?: string };
  userLocation?: { lat: number; lng: number; address?: string };
  radiusMeters: number;
  isInteractive?: boolean;
  onLocationChange?: (coords: { lat: number; lng: number }) => void;
  height?: string;
  showUserMarker?: boolean;
  onDistanceCalculated?: (distanceMeters: number, isInRadius: boolean) => void;
}

// Standalone Interactive Geofence Canvas (Zero-dependency fallback if Maps API is not loaded/activated)
const RadarGeofenceFallback: React.FC<GoogleMapsGeofenceProps & { errorMessage?: string }> = ({
  schoolLocation,
  userLocation,
  radiusMeters,
  isInteractive,
  onLocationChange,
  height = '280px',
  showUserMarker = true,
  errorMessage,
}) => {
  const distance = useMemo(() => {
    if (!userLocation) return 0;
    return calculateDistanceMeters(
      schoolLocation.lat,
      schoolLocation.lng,
      userLocation.lat,
      userLocation.lng
    );
  }, [schoolLocation, userLocation]);

  const isInRadius = distance <= radiusMeters;
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !onLocationChange || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Convert pixel offset to lat/lng delta (approximate scale)
    const metersPerPixel = (radiusMeters * 2.5) / rect.width;
    const deltaMetersLng = x * metersPerPixel;
    const deltaMetersLat = -y * metersPerPixel;

    const deltaLat = deltaMetersLat / 111111;
    const deltaLng = deltaMetersLng / (111111 * Math.cos((schoolLocation.lat * Math.PI) / 180));

    onLocationChange({
      lat: schoolLocation.lat + deltaLat,
      lng: schoolLocation.lng + deltaLng,
    });
  };

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 text-white flex flex-col justify-between select-none ${
        isInteractive ? 'cursor-crosshair' : ''
      }`}
      style={{ height }}
    >
      {/* Background Radar Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Geofence Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer Zone Circle */}
        <div
          className={`rounded-full border border-dashed transition-all ${
            isInRadius ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10'
          }`}
          style={{ width: '65%', height: '65%' }}
        />
        {/* Inner Safe Ring */}
        <div
          className={`absolute rounded-full border ${
            isInRadius ? 'border-emerald-400/80 bg-emerald-400/5' : 'border-rose-400/80'
          }`}
          style={{ width: '45%', height: '45%' }}
        />
        {/* Radar Center Pulse */}
        <div className="absolute w-4 h-4 rounded-full bg-indigo-500/40 animate-ping" />
      </div>

      {/* Top Status Bar */}
      <div className="relative z-10 p-3 flex items-center justify-between text-xs">
        <div className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-md flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isInRadius ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-bold">
            {isInRadius ? 'Dalam Radius Sekolah' : 'Di Luar Radius Sekolah'}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            ({distance}m / maks {radiusMeters}m)
          </span>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700 text-[10px] text-indigo-300 font-mono flex items-center space-x-1">
          <Compass className="w-3 h-3 text-indigo-400" />
          <span>Radar Geofence Live</span>
        </div>
      </div>

      {/* Center Marker: School */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
        <div className="p-2 rounded-full bg-indigo-600 shadow-lg border-2 border-white flex items-center justify-center">
          <School className="w-4 h-4 text-white" />
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-bold text-indigo-200 border border-indigo-800 whitespace-nowrap">
          {schoolLocation.name || 'Pusat Sekolah'}
        </span>
      </div>

      {/* User Location Marker relative offset */}
      {showUserMarker && userLocation && (
        <div
          className="absolute z-20 flex flex-col items-center pointer-events-none transition-all duration-500"
          style={{
            top: isInRadius ? '42%' : '20%',
            left: isInRadius ? '58%' : '80%',
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className={`absolute -inset-2 rounded-full opacity-60 animate-ping ${isInRadius ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <div className={`p-1.5 rounded-full shadow-lg border-2 border-white ${isInRadius ? 'bg-emerald-500' : 'bg-rose-600'}`}>
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <span className={`mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap border ${
            isInRadius
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              : 'bg-rose-950/90 text-rose-300 border-rose-700'
          }`}>
            Posisi Anda ({distance}m)
          </span>
        </div>
      )}

      {/* Bottom Footer Details */}
      <div className="relative z-10 p-2.5 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[10px]">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            {schoolLocation.lat.toFixed(6)}, {schoolLocation.lng.toFixed(6)} (Radius {radiusMeters}m)
          </span>
        </div>

        {errorMessage && (
          <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
};

// Inner Google Maps View
const InnerGoogleMapView: React.FC<GoogleMapsGeofenceProps> = ({
  schoolLocation,
  userLocation,
  radiusMeters,
  isInteractive = false,
  onLocationChange,
  height = '320px',
  showUserMarker = true,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<'school' | 'user' | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  const distance = useMemo(() => {
    if (!userLocation) return 0;
    return calculateDistanceMeters(
      schoolLocation.lat,
      schoolLocation.lng,
      userLocation.lat,
      userLocation.lng
    );
  }, [schoolLocation, userLocation]);

  const isInRadius = distance <= radiusMeters;

  const mapCenter = useMemo(() => {
    if (userLocation && showUserMarker) {
      return {
        lat: (schoolLocation.lat + userLocation.lat) / 2,
        lng: (schoolLocation.lng + userLocation.lng) / 2,
      };
    }
    return { lat: schoolLocation.lat, lng: schoolLocation.lng };
  }, [schoolLocation, userLocation, showUserMarker]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isInteractive || !onLocationChange || !e.latLng) return;
    onLocationChange({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col" style={{ height }}>
      {/* Map Top Bar Info */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md text-xs flex items-center space-x-2 pointer-events-auto">
          <div className={`w-2.5 h-2.5 rounded-full ${isInRadius ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-bold text-slate-800">
            {isInRadius ? 'Dalam Radius Geofence' : 'Di Luar Radius Sekolah'}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            ({distance}m / maks {radiusMeters}m)
          </span>
        </div>

        {/* View Toggle */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-md flex items-center space-x-1 pointer-events-auto text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-1 rounded-lg transition-all ${
              mapType === 'roadmap' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Peta
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-1 rounded-lg transition-all ${
              mapType === 'hybrid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Satelit
          </button>
        </div>
      </div>

      <Map
        defaultCenter={mapCenter}
        defaultZoom={17}
        mapTypeId={mapType}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        onClick={handleMapClick}
        className="w-full h-full"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        <GeofenceCircle
          center={{ lat: schoolLocation.lat, lng: schoolLocation.lng }}
          radius={radiusMeters}
          isInRadius={isInRadius}
        />

        <AdvancedMarker
          position={{ lat: schoolLocation.lat, lng: schoolLocation.lng }}
          title={schoolLocation.name || 'Lokasi Sekolah'}
          onClick={() => setSelectedMarker('school')}
        >
          <Pin
            background="#4F46E5"
            borderColor="#312E81"
            glyphColor="#FFFFFF"
            scale={1.15}
          />
        </AdvancedMarker>

        {showUserMarker && userLocation && (
          <AdvancedMarker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            title="Posisi Anda Saat Ini"
            onClick={() => setSelectedMarker('user')}
          >
            <div className="relative flex items-center justify-center">
              <div className={`absolute -inset-2 rounded-full opacity-40 animate-ping ${isInRadius ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <Pin
                background={isInRadius ? '#059669' : '#DC2626'}
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={1.1}
              />
            </div>
          </AdvancedMarker>
        )}

        {selectedMarker === 'school' && (
          <InfoWindow
            position={{ lat: schoolLocation.lat, lng: schoolLocation.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 text-xs space-y-1 max-w-xs">
              <div className="font-bold text-slate-900 flex items-center space-x-1">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>{schoolLocation.name || 'Titik Pusat Sekolah'}</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Koordinat: {schoolLocation.lat.toFixed(6)}, {schoolLocation.lng.toFixed(6)}
              </p>
              <div className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                Radius Geofence: {radiusMeters} Meter
              </div>
            </div>
          </InfoWindow>
        )}

        {selectedMarker === 'user' && userLocation && (
          <InfoWindow
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 text-xs space-y-1 max-w-xs">
              <div className="font-bold text-slate-900 flex items-center space-x-1">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Posisi Presensi Anda</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {userLocation.address || 'Koordinat Terdeteksi'}
              </p>
              <p className="text-slate-500 font-mono text-[10px]">
                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </p>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${isInRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                Jarak ke Sekolah: {distance} Meter ({isInRadius ? 'Valid' : 'Terlalu Jauh'})
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>

      {isInteractive && (
        <div className="bg-slate-900/90 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 flex items-center justify-between border-t border-slate-800">
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

// Safe API loader wrapper that automatically falls back to radar if key is missing/unactivated
const SafeMapContainer: React.FC<GoogleMapsGeofenceProps> = (props) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.LOADED) {
    return <InnerGoogleMapView {...props} />;
  }

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <RadarGeofenceFallback
        {...props}
        errorMessage="Google Maps API belum diaktivasi pada project. Menampilkan Mode Radar Geofence."
      />
    );
  }

  // Loading state
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-6 text-white space-y-3"
      style={{ height: props.height || '280px' }}
    >
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-300">Memuat Peta Google Maps...</span>
    </div>
  );
};

export const GoogleMapsGeofence: React.FC<GoogleMapsGeofenceProps> = (props) => {
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    // Listen for global Google Maps auth failure
    const handleAuthError = () => {
      setAuthFailed(true);
    };
    window.addEventListener('gm_authFailure', handleAuthError);
    return () => window.removeEventListener('gm_authFailure', handleAuthError);
  }, []);

  const distance = useMemo(() => {
    if (!props.userLocation) return 0;
    return calculateDistanceMeters(
      props.schoolLocation.lat,
      props.schoolLocation.lng,
      props.userLocation.lat,
      props.userLocation.lng
    );
  }, [props.schoolLocation, props.userLocation]);

  const isInRadius = distance <= props.radiusMeters;

  useEffect(() => {
    if (props.userLocation && props.onDistanceCalculated) {
      props.onDistanceCalculated(distance, isInRadius);
    }
  }, [distance, isInRadius, props.userLocation, props.onDistanceCalculated]);

  // If no API key configured or auth failed, render Radar directly
  if (!GOOGLE_MAPS_API_KEY || authFailed) {
    return (
      <RadarGeofenceFallback
        {...props}
        errorMessage={
          !GOOGLE_MAPS_API_KEY
            ? 'Kunci API Maps belum diatur. Mode Radar Geofence aktif.'
            : 'Google Maps API belum diaktifkan pada project. Mode Radar Geofence aktif.'
        }
      />
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker', 'geometry']}>
      <SafeMapContainer {...props} />
    </APIProvider>
  );
};

