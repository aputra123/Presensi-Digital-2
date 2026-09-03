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
  status?: string;
  severity?: 'info' | 'warning' | 'error';
  isSuspicious?: boolean;
  failureReason?: string;
  matchScore?: number;
  threshold?: number;
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
  status,
  severity,
  isSuspicious,
  failureReason,
  matchScore,
  threshold = 80,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const safeRadius = Math.max(1, Number(maxRadiusMeters) || 80);
  const safeSchoolLat = typeof schoolLat === 'number' && !isNaN(schoolLat) ? schoolLat : -1.8485;
  const safeSchoolLng = typeof schoolLng === 'number' && !isNaN(schoolLng) ? schoolLng : 124.4682;

  const isAnomaly = !isPassed || status === 'failed' || severity === 'error' || isSuspicious === true;

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
      }).setView([centerLat, centerLng], isAnomaly ? 17 : 16);

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
            background: #4338ca;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(67, 56, 202, 0.55);
            border: 2.5px solid white;
            font-weight: bold;
            font-size: 16px;
          ">🏫</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const schoolMarker = L.marker([safeSchoolLat, safeSchoolLng], { icon: schoolIcon });
      schoolMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #4338ca;">${schoolName || 'Pusat Sekolah SMPN 4 Satap'}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">Koordinat: ${safeSchoolLat.toFixed(5)}, ${safeSchoolLng.toFixed(5)}</span><br/>
          <span style="font-weight: bold; color: #059669;">Radius Resmi Geofence: ${safeRadius} Meter</span>
        </div>
      `);
      layersGroup.addLayer(schoolMarker);

      // School Geofence Circle
      const schoolCircle = L.circle([safeSchoolLat, safeSchoolLng], {
        color: '#4f46e5',
        fillColor: '#818cf8',
        fillOpacity: 0.18,
        radius: safeRadius,
        weight: 2,
        dashArray: '4, 4',
      });
      layersGroup.addLayer(schoolCircle);

      // Custom marker icon differentiating 'Normal' vs 'Anomaly' attempts
      let userIconHtml = '';
      if (isAnomaly) {
        // High-visibility Anomaly Marker with pulsing warning animation and distinct styling
        userIconHtml = `
          <div style="position: relative; width: 42px; height: 42px;">
            <div style="
              position: absolute;
              inset: -6px;
              background: rgba(239, 68, 68, 0.4);
              border-radius: 50%;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
              color: white;
              width: 42px;
              height: 42px;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 10px rgba(0,0,0,0.3);
              border: 2.5px solid #ffffff;
              font-weight: 900;
              font-size: 18px;
            ">
              ⚠️
            </div>
            <div style="
              position: absolute;
              bottom: -16px;
              left: 50%;
              transform: translateX(-50%);
              background: #991b1b;
              color: #fee2e2;
              font-size: 9px;
              font-weight: 900;
              padding: 1px 5px;
              border-radius: 4px;
              white-space: nowrap;
              border: 1px solid #f87171;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ANOMALI
            </div>
          </div>
        `;
      } else {
        // Normal / Verified Attempt Marker with clean emerald glow
        userIconHtml = `
          <div style="position: relative; width: 36px; height: 36px;">
            <div style="
              position: absolute;
              inset: -3px;
              background: rgba(16, 185, 129, 0.3);
              border-radius: 50%;
            "></div>
            <div style="
              position: relative;
              background: linear-gradient(135deg, #10b981 0%, #047857 100%);
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(16, 185, 129, 0.55);
              border: 2.5px solid white;
              font-weight: bold;
              font-size: 15px;
            ">
              ✓
            </div>
            <div style="
              position: absolute;
              bottom: -14px;
              left: 50%;
              transform: translateX(-50%);
              background: #047857;
              color: #d1fae5;
              font-size: 8px;
              font-weight: 800;
              padding: 1px 4px;
              border-radius: 4px;
              white-space: nowrap;
            ">
              NORMAL
            </div>
          </div>
        `;
      }

      const userIcon = L.divIcon({
        className: isAnomaly ? 'custom-anomaly-marker' : 'custom-normal-marker',
        html: userIconHtml,
        iconSize: isAnomaly ? [42, 42] : [36, 36],
        iconAnchor: isAnomaly ? [21, 21] : [18, 18],
      });

      const userMarker = L.marker([userLat, userLng], { icon: userIcon });
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 170px;">
          <div style="font-weight: bold; font-size: 13px; color: ${isAnomaly ? '#b91c1c' : '#047857'}; margin-bottom: 2px;">
            ${isAnomaly ? '🚨 UPAYA ANOMALI / GAGAL' : '✓ UPAYA NORMAL TERVERIFIKASI'}
          </div>
          <strong>${attemptName}</strong><br/>
          <span>Jarak Geofence: <strong>${distanceMeters} meter</strong></span><br/>
          <span>Skor Kemiripan: <strong>${matchScore !== undefined ? matchScore + '%' : '-'}</strong> (Ambang ${threshold}%)</span><br/>
          <div style="margin-top: 4px; padding: 3px 6px; border-radius: 4px; font-size: 11px; background: ${isAnomaly ? '#fee2e2' : '#dcfce7'}; color: ${isAnomaly ? '#991b1b' : '#166534'};">
            ${isAnomaly ? (failureReason || 'Peringatan Anomali Biometrik/GPS Terdeteksi') : 'Posisi Valid dalam Radius Sekolah'}
          </div>
        </div>
      `);
      layersGroup.addLayer(userMarker);

      // If anomaly, add a highlight breach circle around the attempt position
      if (isAnomaly) {
        const anomalyCircle = L.circle([userLat, userLng], {
          color: '#ef4444',
          fillColor: '#f87171',
          fillOpacity: 0.25,
          radius: Math.max(25, Math.min(distanceMeters / 2, 100)),
          weight: 2,
          dashArray: '6, 6',
        });
        layersGroup.addLayer(anomalyCircle);
      }

      // Polyline connector with distance marker
      const polyline = L.polyline(
        [
          [safeSchoolLat, safeSchoolLng],
          [userLat, userLng],
        ],
        {
          color: isAnomaly ? '#ef4444' : '#10b981',
          weight: isAnomaly ? 3.5 : 2.5,
          dashArray: isAnomaly ? '8, 6' : undefined,
          opacity: 0.9,
        }
      );
      layersGroup.addLayer(polyline);

      // Automatically zoom to a specific radius when a failed/anomaly attempt is selected
      const group = L.featureGroup([schoolMarker, userMarker]);
      if (isAnomaly) {
        // Zoom closely to tightly bound the anomaly and school geofence
        map.fitBounds(group.getBounds().pad(0.35), {
          maxZoom: 18,
          animate: true,
        });
        // Open the warning popup automatically for immediate administrator focus
        setTimeout(() => {
          try {
            userMarker.openPopup();
          } catch {
            // ignore
          }
        }, 300);
      } else {
        map.fitBounds(group.getBounds().pad(0.25), {
          maxZoom: 17,
          animate: true,
        });
      }
    } catch (err) {
      console.warn('Error updating biometric map layers:', err);
    }
  }, [
    safeSchoolLat,
    safeSchoolLng,
    schoolName,
    safeRadius,
    attemptLat,
    attemptLng,
    attemptName,
    distanceMeters,
    isPassed,
    isAnomaly,
    status,
    severity,
    isSuspicious,
    failureReason,
    matchScore,
    threshold,
  ]);

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '256px' }} />
    </div>
  );
};
