import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { AttendanceRecord, SchoolConfig } from '../types';
import { School, MapPin, User, Clock, Compass } from 'lucide-react';

interface AttendanceMapViewProps {
  records: AttendanceRecord[];
  config: SchoolConfig;
  height?: string;
}

export const AttendanceMapView: React.FC<AttendanceMapViewProps> = ({
  records,
  config,
  height = '480px',
}) => {
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'student'>('all');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const locationRecords = records.filter(
    (r) =>
      r.location &&
      typeof r.location.lat === 'number' &&
      typeof r.location.lng === 'number' &&
      (filterType === 'all' || r.personType === filterType)
  );

  const safeRadius = Math.max(
    1,
    Number(config.maxRadiusMeters) ||
      Number((config as unknown as { radiusMeter?: number }).radiusMeter) ||
      80
  );
  const safeSchoolLat = typeof config.schoolLat === 'number' && !isNaN(config.schoolLat) ? config.schoolLat : -1.8682;
  const safeSchoolLng = typeof config.schoolLng === 'number' && !isNaN(config.schoolLng) ? config.schoolLng : 124.4172;

  // Initialize Map Once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      return;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([safeSchoolLat, safeSchoolLng], 15);

      mapInstanceRef.current = map;

      const tileUrl =
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      tileLayerRef.current = tileLayer;

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
      console.warn('Failed to initialize Leaflet attendance map:', err);
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
  }, []); // Mount once

  // Update Tile Layer when mapType changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl =
      mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [mapType]);

  // Update Markers and Circles when records or config changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup || !(map as unknown as { _mapPane?: HTMLElement })._mapPane) return;

    try {
      layersGroup.clearLayers();

      // School center marker
      const schoolIcon = L.divIcon({
        className: 'custom-school-pin',
        html: `
          <div style="
            background: #4f46e5;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5);
            border: 2px solid white;
            font-size: 16px;
          ">🏫</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const schoolMarker = L.marker([safeSchoolLat, safeSchoolLng], {
        icon: schoolIcon,
      });

      schoolMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 2px; font-size: 12px;">
          <strong style="color: #4338ca; font-size: 13px;">${config.schoolName || 'Pusat Sekolah'}</strong><br/>
          <span style="color: #6b7280; font-size: 11px;">Pusat Geofence Presensi Resmi</span><br/>
          <div style="margin-top: 4px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; display: inline-block;">
            Radius: ${safeRadius} Meter
          </div>
        </div>
      `);

      layersGroup.addLayer(schoolMarker);

      // School Geofence Circle
      const schoolCircle = L.circle([safeSchoolLat, safeSchoolLng], {
        color: '#4f46e5',
        fillColor: '#818cf8',
        fillOpacity: 0.15,
        radius: safeRadius,
        weight: 2,
        dashArray: '5, 5',
      });

      layersGroup.addLayer(schoolCircle);

      // Add user attendance pins
      const markers: L.Marker[] = [schoolMarker];

      locationRecords.forEach((rec) => {
        if (!rec.location || isNaN(rec.location.lat) || isNaN(rec.location.lng)) return;
        const isTeacher = rec.personType === 'teacher';
        const isLate = rec.status === 'terlambat';
        const pinBg = isLate ? '#f59e0b' : isTeacher ? '#7c3aed' : '#2563eb';
        const pinEmoji = isTeacher ? '👨‍🏫' : '🎒';

        const userIcon = L.divIcon({
          className: 'custom-attendance-pin',
          html: `
            <div style="
              background: ${pinBg};
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              border: 2px solid white;
              font-size: 13px;
            ">${pinEmoji}</div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const m = L.marker([rec.location.lat, rec.location.lng], { icon: userIcon });

        m.bindPopup(`
          <div style="font-family: sans-serif; min-width: 170px; padding: 3px; font-size: 11px;">
            <strong style="color: #0f172a; font-size: 12px; display: block; margin-bottom: 2px;">${rec.personName}</strong>
            <span style="color: #64748b; font-size: 10px; display: block;">${rec.personType === 'teacher' ? 'Guru / Pegawai' : 'Peserta Didik'} • ${rec.identifier}</span>
            <div style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-weight: bold; font-size: 10px;">⏰ ${rec.time} WITA</span>
              <span style="font-weight: bold; font-size: 10px; color: ${isLate ? '#b45309' : '#047857'}; text-transform: uppercase;">${rec.status}</span>
            </div>
            <div style="margin-top: 4px; font-size: 10px; color: #475569;">
              📍 Jarak: ${rec.location.distanceMeter}m ${rec.location.inRadius ? '(✅ Dalam Radius)' : '(⚠️ Luar Radius)'}
            </div>
          </div>
        `);

        m.on('click', () => {
          setSelectedRecord(rec);
        });

        layersGroup.addLayer(m);
        markers.push(m);
      });

      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2), { animate: false });
      } else {
        map.panTo([safeSchoolLat, safeSchoolLng], { animate: false });
      }
    } catch (err) {
      console.warn('Error updating attendance map layers:', err);
    }
  }, [
    safeSchoolLat,
    safeSchoolLng,
    config.schoolName,
    safeRadius,
    locationRecords,
  ]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Peta Sebaran Presensi Real-Time
            </h3>
            <p className="text-[11px] text-slate-500">
              Visualisasi titik koordinat GPS presensi guru & siswa hari ini ({locationRecords.length} titik lokasi)
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({records.filter((r) => r.location).length})
            </button>
            <button
              onClick={() => setFilterType('teacher')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'teacher'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Guru/ASN
            </button>
            <button
              onClick={() => setFilterType('student')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'student'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Siswa
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setMapType('street')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mapType === 'street' ? 'bg-slate-800 text-white' : 'text-slate-600'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mapType === 'satellite' ? 'bg-slate-800 text-white' : 'text-slate-600'
              }`}
            >
              Satelit
            </button>
          </div>
        </div>
      </div>

      {/* Map Target DOM */}
      <div className="relative w-full z-0" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating summary badge */}
        <div className="absolute bottom-3 left-3 right-3 z-1000 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-xl border border-slate-700 shadow-lg pointer-events-none">
          <div className="flex items-center space-x-3 pointer-events-auto">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Guru/ASN ({records.filter((r) => r.personType === 'teacher' && r.location).length})</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Siswa ({records.filter((r) => r.personType === 'student' && r.location).length})</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Terlambat ({records.filter((r) => r.status === 'terlambat' && r.location).length})</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-mono">
            Radius Sekolah: {safeRadius}m
          </span>
        </div>
      </div>
    </div>
  );
};


