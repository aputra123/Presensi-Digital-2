import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface BiometricLeafletMapProps {
  schoolLat: number;
  schoolLng: number;
  schoolName: string;
  maxRadiusMeters: number;
  attemptLat?: number;
  attemptLng?: number;
  attemptName: string;
  distanceMeters: number;
  isPassed: boolean;
}

export const BiometricLeafletMap: React.FC<BiometricLeafletMapProps> = ({
  schoolLat,
  schoolLng,
  schoolName,
  maxRadiusMeters,
  attemptLat,
  attemptLng,
  attemptName,
  distanceMeters,
  isPassed,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const safeRadius = Math.max(1, Number(maxRadiusMeters) || 80);
  const safeSchoolLat = typeof schoolLat === 'number' && !isNaN(schoolLat) ? schoolLat : -1.8682;
  const safeSchoolLng = typeof schoolLng === 'number' && !isNaN(schoolLng) ? schoolLng : 124.4172;

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      return;
    }

    try {
      const userLat = typeof attemptLat === 'number' && !isNaN(attemptLat) ? attemptLat : safeSchoolLat + 0.0012;
      const userLng = typeof attemptLng === 'number' && !isNaN(attemptLng) ? attemptLng : safeSchoolLng + 0.0015;
      const centerLat = (safeSchoolLat + userLat) / 2;
      const centerLng = (safeSchoolLng + userLng) / 2;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([centerLat, centerLng], 16);

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

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
      console.warn('Failed to initialize biometric map:', err);
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
    };
  }, []);

  // Update Layers when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup || !(map as unknown as { _mapPane?: HTMLElement })._mapPane) return;

    try {
      layersGroup.clearLayers();

      const userLat = typeof attemptLat === 'number' && !isNaN(attemptLat) ? attemptLat : safeSchoolLat + 0.0012;
      const userLng = typeof attemptLng === 'number' && !isNaN(attemptLng) ? attemptLng : safeSchoolLng + 0.0015;

      // School center marker & radius circle
      const schoolIcon = L.divIcon({
        className: 'custom-school-marker',
        html: `
          <div style="
            background: #4f46e5;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45);
            border: 2px solid white;
            font-weight: bold;
            font-size: 14px;
          ">🏫</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const schoolMarker = L.marker([safeSchoolLat, safeSchoolLng], { icon: schoolIcon });
      schoolMarker.bindPopup(`<strong>${schoolName || 'Pusat Sekolah'}</strong><br>Radius Resmi: ${safeRadius}m`);
      layersGroup.addLayer(schoolMarker);

      // Radius circle around school
      const circle = L.circle([safeSchoolLat, safeSchoolLng], {
        color: '#4f46e5',
        fillColor: '#818cf8',
        fillOpacity: 0.15,
        radius: safeRadius,
        weight: 2,
        dashArray: '4, 4',
      });
      layersGroup.addLayer(circle);

      // User attempt pin
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            background: ${isPassed ? '#10b981' : '#ef4444'};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px ${isPassed ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'};
            border: 2px solid white;
            font-weight: bold;
            font-size: 14px;
          ">${isPassed ? '👤' : '⚠️'}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLat, userLng], { icon: userIcon });
      userMarker.bindPopup(`
        <strong>${attemptName}</strong><br>
        Jarak: ${distanceMeters} meter<br>
        Status: ${isPassed ? '<span style="color:green;font-weight:bold">Dalam Radius</span>' : '<span style="color:red;font-weight:bold">Di Luar Radius (Anomali)</span>'}
      `);
      layersGroup.addLayer(userMarker);

      // Polyline connector
      const polyline = L.polyline(
        [
          [safeSchoolLat, safeSchoolLng],
          [userLat, userLng],
        ],
        {
          color: isPassed ? '#10b981' : '#ef4444',
          weight: 2.5,
          dashArray: isPassed ? undefined : '6, 6',
        }
      );
      layersGroup.addLayer(polyline);

      // Fit bounds nicely with padding
      const group = L.featureGroup([schoolMarker, userMarker]);
      map.fitBounds(group.getBounds().pad(0.3), { animate: false });
    } catch (err) {
      console.warn('Error updating biometric map layers:', err);
    }
  }, [safeSchoolLat, safeSchoolLng, schoolName, safeRadius, attemptLat, attemptLng, attemptName, distanceMeters, isPassed]);

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '256px' }} />
    </div>
  );
};
