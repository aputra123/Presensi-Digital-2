import React, { useState } from 'react';
import {
  HardDrive,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Radio,
  Wifi,
  WifiOff,
  Database,
  AlertTriangle,
  Layers,
  Download,
  ShieldCheck,
  Clock,
  Users,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, SchoolConfig } from '../types';

interface LocalStorageSyncStatsCardProps {
  records: AttendanceRecord[];
  isOnline?: boolean;
  isManualBlankspot?: boolean;
  onOpenOfflineModal?: () => void;
  onSyncPendingRecords?: () => Promise<boolean> | void;
  onAddNotification?: (notif: any) => void;
  config: SchoolConfig;
}

export const LocalStorageSyncStatsCard: React.FC<LocalStorageSyncStatsCardProps> = ({
  records = [],
  isOnline = true,
  isManualBlankspot = false,
  onOpenOfflineModal,
  onSyncPendingRecords,
  onAddNotification,
  config,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Compute pending and synced records
  const pendingRecords = records.filter(
    (r) => r.syncStatus === 'pending_sync' || r.isOfflineRecord === true
  );
  const pendingCount = pendingRecords.length;

  const pendingStudents = pendingRecords.filter((r) => r.personType === 'student').length;
  const pendingTeachers = pendingRecords.filter((r) => r.personType === 'teacher').length;
  const pendingWithPhotos = pendingRecords.filter(
    (r) => !!r.photoUrl || !!r.selfiePhotoUrl
  ).length;

  const totalRecords = records.length;
  const syncedCount = totalRecords - pendingCount;
  const syncPercentage = totalRecords > 0 ? Math.round((syncedCount / totalRecords) * 100) : 100;

  const handleSyncNow = async () => {
    if (!onSyncPendingRecords) return;
    if (pendingCount === 0) {
      setSyncFeedback('Seluruh data presensi sudah tersinkronisasi ke server.');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncPendingRecords();
      if (res !== false) {
        setSyncFeedback(`Sukses menyinkronkan ${pendingCount} data ke cloud.`);
      } else {
        setSyncFeedback('Sinkronisasi tertunda, periksa kembali koneksi jaringan.');
      }
    } catch (e) {
      console.error(e);
      setSyncFeedback('Terjadi kendala saat menyinkronkan data.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleDownloadPendingJson = () => {
    if (pendingRecords.length === 0) {
      alert('Tidak ada antrean data pending sync saat ini.');
      return;
    }
    const payload = {
      schoolName: config.schoolName,
      npsn: config.npsn,
      exportedAt: new Date().toISOString(),
      pendingCount: pendingRecords.length,
      records: pendingRecords,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute(
      'download',
      `Antrean_Offline_Presensi_${config.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    );
    dlAnchorElem.click();

    if (onAddNotification) {
      onAddNotification({
        id: `backup_pending_${Date.now()}`,
        title: 'Berkas Antrean Lokal Diunduh',
        message: `${pendingRecords.length} data antrean offline berhasil diunduh sebagai cadangan darurat.`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
        read: false,
      });
    }
  };

  const isNetworkOffline = !isOnline || isManualBlankspot;

  return (
    <div
      id="dashboard-local-storage-sync-card"
      className={`rounded-2xl border transition-all p-4 sm:p-5 ${
        pendingCount > 0
          ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border-amber-300 shadow-xs'
          : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 border-slate-200/80 shadow-2xs'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/60">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              pendingCount > 0
                ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-100'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {pendingCount > 0 ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <HardDrive className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Penyimpanan Lokal & Antrean Sinkronisasi (Offline Buffer)
              </h3>
              {pendingCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 animate-pulse">
                  {pendingCount} Pending Sync
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Cloud Selaras (0 Pending)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring buffer data presensi luring wilayah blankspot & pulau terluar
            </p>
          </div>
        </div>

        {/* Network status badge */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          <div
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border ${
              isNetworkOffline
                ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {isNetworkOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                <span>Mode Blankspot / Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Koneksi Cloud Online</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3.5">
        {/* Metric 1: Pending Sync Total */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            pendingCount > 0
              ? 'bg-amber-50 border-amber-200/90 text-amber-950'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Antrean Lokal</span>
            <Database className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-black font-mono tracking-tight">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-500 ml-1">data</span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            {pendingCount > 0 ? 'Perlu disinkronkan' : 'Semua tersinkron'}
          </p>
        </div>

        {/* Metric 2: Pending Siswa */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Presensi Siswa</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {pendingStudents}
            </span>
            <span className="text-xs text-slate-500 ml-1">tertahan</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Siswa kelas VII - IX</p>
        </div>

        {/* Metric 3: Pending Guru & ASN GTK */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Guru & ASN GTK</span>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {pendingTeachers}
            </span>
            <span className="text-xs text-slate-500 ml-1">tertahan</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">PNS, PPPK & Honorer</p>
        </div>

        {/* Metric 4: Foto / Biometrik GPS Offline */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Foto & GPS Buffer</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {pendingWithPhotos}
            </span>
            <span className="text-xs text-slate-500 ml-1">foto</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Bukti visual offline</p>
        </div>
      </div>

      {/* Sync Ratio Progress Bar */}
      <div className="space-y-1.5 mb-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
            <span>Integritas Sinkronisasi Basis Data</span>
            <span className="text-[11px] font-normal text-slate-500">
              ({syncedCount} dari {totalRecords} data berada di cloud)
            </span>
          </span>
          <span className="font-mono font-bold text-slate-900">{syncPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pendingCount > 0 ? 'bg-gradient-to-r from-amber-500 to-indigo-600' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(syncPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Action Buttons & Feedback Alert */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Data aman tersimpan di <strong>IndexedDB Browser</strong> (tidak hilang saat refresh).
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Download JSON Backup Button */}
          {pendingCount > 0 && (
            <button
              onClick={handleDownloadPendingJson}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Unduh berkas cadangan JSON dari antrean lokal"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Cadangan JSON</span>
            </button>
          )}

          {/* Open Detailed Queue Modal */}
          {onOpenOfflineModal && (
            <button
              onClick={onOpenOfflineModal}
              className="px-3 py-1.5 bg-white hover:bg-indigo-50/60 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Buka detail data yang belum disinkronkan"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lihat Detail Antrean</span>
            </button>
          )}

          {/* Sync Now Button */}
          {onSyncPendingRecords && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || pendingCount === 0}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs ${
                pendingCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-98'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Result Feedback Toast */}
      {syncFeedback && (
        <div className="mt-2.5 p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center space-x-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}
    </div>
  );
};
