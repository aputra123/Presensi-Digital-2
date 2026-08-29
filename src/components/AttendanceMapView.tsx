import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { AttendanceRecord, SchoolConfig } from '../types';
import { School, MapPin, User, Clock, CheckCircle2, AlertTriangle, Layers, Navigation, Compass } from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface AttendanceMapViewProps {
  records: AttendanceRecord[];
  config: SchoolConfig;
  height?: string;
}

// Fallback Attendance Records Distribution Canvas
const AttendanceDistributionFallback: React.FC<{
  records: AttendanceRecord[];
  config: SchoolConfig;
  height: string;
}> = ({ records, config, height }) => {
  const locationRecords = records.filter(
    (r) => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number'
  );

  return (
    <div
      className="relative w-full rounded-2xl bg-slate-900 text-white p-5 overflow-hidden flex flex-col justify-between"
      style={{ height }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
          <School className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-200">{config.schoolName}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({config.schoolLat.toFixed(4)}, {config.schoolLng.toFixed(4)})
          </span>
        </div>

        <div className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700 text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
          <Compass className="w-3 h-3 text-emerald-400" />
          <span>Sebaran Koordinat Aktif ({locationRecords.length} Titik)</span>
        </div>
      </div>

      {/* Visual radar cluster */}
      <div className="relative z-10 my-auto flex items-center justify-center">
        <div className="w-48 h-48 rounded-full border border-indigo-500/30 flex items-center justify-center relative">
          <div className="w-32 h-32 rounded-full border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center relative">
            <div className="w-16 h-16 rounded-full border border-indigo-400/50 bg-indigo-500/10 flex items-center justify-center">
              <School className="w-6 h-6 text-indigo-400" />
            </div>
            {/* Sample scattered pins */}
            {locationRecords.slice(0, 8).map((rec, i) => {
              const angle = (i * 360) / Math.min(locationRecords.length, 8);
              const dist = 35 + (i % 3) * 15;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * dist;
              const y = Math.sin(rad) * dist;
              return (
                <div
                  key={rec.id}
                  className="absolute w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                  title={rec.personName}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3 text-slate-300">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Guru/ASN ({records.filter((r) => r.personType === 'teacher').length})</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Siswa ({records.filter((r) => r.personType === 'student').length})</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Terlambat ({records.filter((r) => r.status === 'terlambat').length})</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Radius Geofence Sekolah: {config.radiusMeter}m
        </span>
      </div>
    </div>
  );
};

const InnerMapCanvas: React.FC<AttendanceMapViewProps & {
  locationRecords: AttendanceRecord[];
  filterType: 'all' | 'teacher' | 'student';
  mapType: 'roadmap' | 'satellite' | 'hybrid';
}> = ({ locationRecords, config, mapType, height = '480px' }) => {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  return (
    <div className="relative w-full" style={{ height }}>
      <Map
        defaultCenter={{ lat: config.schoolLat, lng: config.schoolLng }}
        defaultZoom={15}
        mapTypeId={mapType}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
        disableDefaultUI={false}
      >
        {/* School Center Marker */}
        <AdvancedMarker
          position={{ lat: config.schoolLat, lng: config.schoolLng }}
          title={config.schoolName}
        >
          <div className="p-1 bg-white rounded-full shadow-lg border-2 border-indigo-600 flex items-center justify-center">
            <School className="w-5 h-5 text-indigo-700" />
          </div>
        </AdvancedMarker>

        {/* Attendance Markers */}
        {locationRecords.map((rec) => {
          const isTeacher = rec.personType === 'teacher';
          const isLate = rec.status === 'terlambat';
          const pinColor = isLate ? '#F59E0B' : isTeacher ? '#7C3AED' : '#2563EB';

          return (
            <AdvancedMarker
              key={rec.id}
              position={{ lat: rec.location!.lat, lng: rec.location!.lng }}
              title={`${rec.personName} (${rec.time})`}
              onClick={() => setSelectedRecord(rec)}
            >
              <Pin
                background={pinColor}
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={0.9}
              />
            </AdvancedMarker>
          );
        })}

        {/* InfoWindow for Selected Record */}
        {selectedRecord && selectedRecord.location && (
          <InfoWindow
            position={{
              lat: selectedRecord.location.lat,
              lng: selectedRecord.location.lng,
            }}
            onCloseClick={() => setSelectedRecord(null)}
          >
            <div className="p-2 text-xs space-y-2 max-w-xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-1.5">
                {selectedRecord.photoUrl ? (
                  <img
                    src={selectedRecord.photoUrl}
                    alt="Selfie"
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs leading-tight">
                    {selectedRecord.personName}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {selectedRecord.personType === 'teacher' ? 'Guru / ASN' : 'Peserta Didik'} • {selectedRecord.identifier}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="bg-slate-50 p-1.5 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Waktu Presensi</span>
                  <span className="font-bold text-slate-800 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400 inline" />
                    <span>{selectedRecord.time} WIB</span>
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Status</span>
                  <span
                    className={`font-bold capitalize ${
                      selectedRecord.status === 'hadir'
                        ? 'text-emerald-700'
                        : selectedRecord.status === 'terlambat'
                        ? 'text-amber-700'
                        : 'text-indigo-700'
                    }`}
                  >
                    {selectedRecord.status} ({selectedRecord.type})
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-600">
                📍 {selectedRecord.location.address || 'Lokasi Terverifikasi'}
              </p>
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>Radius: {selectedRecord.location.distanceMeter}m</span>
                <span>{selectedRecord.location.inRadius ? '✅ Dalam Radius' : '⚠️ Luar Radius'}</span>
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

const SafeAttendanceMapContainer: React.FC<AttendanceMapViewProps & {
  locationRecords: AttendanceRecord[];
  filterType: 'all' | 'teacher' | 'student';
  mapType: 'roadmap' | 'satellite' | 'hybrid';
}> = (props) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.LOADED) {
    return <InnerMapCanvas {...props} />;
  }

  return (
    <AttendanceDistributionFallback
      records={props.records}
      config={props.config}
      height={props.height || '480px'}
    />
  );
};

export const AttendanceMapView: React.FC<AttendanceMapViewProps> = ({
  records,
  config,
  height = '480px',
}) => {
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'student'>('all');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const handleAuthError = () => setAuthFailed(true);
    window.addEventListener('gm_authFailure', handleAuthError);
    return () => window.removeEventListener('gm_authFailure', handleAuthError);
  }, []);

  const locationRecords = records.filter(
    (r) =>
      r.location &&
      typeof r.location.lat === 'number' &&
      typeof r.location.lng === 'number' &&
      (filterType === 'all' || r.personType === filterType)
  );

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
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mapType === 'roadmap' ? 'bg-slate-800 text-white' : 'text-slate-600'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mapType === 'hybrid' ? 'bg-slate-800 text-white' : 'text-slate-600'
              }`}
            >
              Satelit
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas / Fallback */}
      {!GOOGLE_MAPS_API_KEY || authFailed ? (
        <AttendanceDistributionFallback
          records={records}
          config={config}
          height={height}
        />
      ) : (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker', 'geometry']}>
          <SafeAttendanceMapContainer
            records={records}
            config={config}
            height={height}
            locationRecords={locationRecords}
            filterType={filterType}
            mapType={mapType}
          />
        </APIProvider>
      )}
    </div>
  );
};

