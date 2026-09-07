import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Radio,
  Cloud,
  CloudOff,
  RefreshCw,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Users,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Info,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord, SchoolConfig } from '../types';
import { formatDateIndo, playSuccessChime } from '../utils/soundAndDate';
import * as XLSX from 'xlsx';

interface OfflineBlankspotModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isManualBlankspot: boolean;
  onToggleManualBlankspot: (enabled: boolean) => void;
  pendingRecords: AttendanceRecord[];
  allRecords: AttendanceRecord[];
  config: SchoolConfig;
  onSyncPendingRecords: () => Promise<boolean>;
  todayDate: string;
}

export const OfflineBlankspotModal: React.FC<OfflineBlankspotModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isManualBlankspot,
  onToggleManualBlankspot,
  pendingRecords,
  allRecords,
  config,
  onSyncPendingRecords,
  todayDate,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isEffectivelyOffline = !isOnline || isManualBlankspot;

  const pendingTeachers = pendingRecords.filter((r) => r.personType === 'teacher');
  const pendingStudents = pendingRecords.filter((r) => r.personType === 'student');

  const handleSyncClick = async () => {
    if (isEffectivelyOffline) {
      alert('Jaringan internet saat ini tidak aktif atau Mode Blankspot Darurat masih dinyalakan. Pastikan perangkat Anda terhubung ke sinyal internet untuk menyinkronkan data.');
      return;
    }

    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const success = await onSyncPendingRecords();
      if (success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        playSuccessChime();
        setSyncSuccessMsg('Semua data presensi offline berhasil dikirim & disinkronkan ke server!');
      }
    } catch (err) {
      console.error('Failed syncing offline records:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Kirim Rekapitulasi Presensi via WhatsApp (SOP Darurat Wilayah 3T / Blankspot)
  const handleShareWhatsAppRecap = () => {
    const todayRecords = allRecords.filter((r) => r.date === todayDate);
    const teacherToday = todayRecords.filter((r) => r.personType === 'teacher');
    const studentToday = todayRecords.filter((r) => r.personType === 'student');

    const teacherHadir = teacherToday.filter((r) => r.status === 'hadir' && r.type === 'masuk').length;
    const teacherLate = teacherToday.filter((r) => r.status === 'terlambat' && r.type === 'masuk').length;
    const teacherIzin = teacherToday.filter((r) => (r.status === 'izin' || r.status === 'sakit') && r.type === 'masuk').length;
    const teacherAlpa = teacherToday.filter((r) => r.status === 'alpa' && r.type === 'masuk').length;

    const studentHadir = studentToday.filter((r) => r.status === 'hadir' && r.type === 'masuk').length;
    const studentLate = studentToday.filter((r) => r.status === 'terlambat' && r.type === 'masuk').length;
    const studentIzin = studentToday.filter((r) => (r.status === 'izin' || r.status === 'sakit') && r.type === 'masuk').length;
    const studentAlpa = studentToday.filter((r) => r.status === 'alpa' && r.type === 'masuk').length;

    const messageLines = [
      `*LAPORAN PRESENSI HARIAN (WILAYAH BLANKSPOT)*`,
      `*${config.schoolName}*`,
      `NPSN: ${config.npsn} | Desa Pancoran, Kec. Taliabu Barat`,
      `Tanggal: ${formatDateIndo(todayDate)}`,
      `Status Jaringan: ${isEffectivelyOffline ? 'Offline / Blankspot Mode' : 'Online'}`,
      `----------------------------------------`,
      `*📊 REKAPITULASI GURU & GTK:*`,
      `• Hadir Tepat Waktu: ${teacherHadir} orang`,
      `• Terlambat: ${teacherLate} orang`,
      `• Izin / Sakit: ${teacherIzin} orang`,
      `• Tanpa Keterangan (Alpa): ${teacherAlpa} orang`,
      `• Total GTK Tercatat: ${teacherToday.length} presensi`,
      `----------------------------------------`,
      `*🎓 REKAPITULASI SISWA:*`,
      `• Hadir Tepat Waktu: ${studentHadir} orang`,
      `• Terlambat: ${studentLate} orang`,
      `• Izin / Sakit: ${studentIzin} orang`,
      `• Tanpa Keterangan (Alpa): ${studentAlpa} orang`,
      `• Total Siswa Tercatat: ${studentToday.length} presensi`,
      `----------------------------------------`,
      `*⚡ STATUS SINKRONISASI OFFLINE:*`,
      `• Antrean Belum Terkirim: ${pendingRecords.length} record (${pendingTeachers.length} Guru, ${pendingStudents.length} Siswa)`,
      `_Pesan otomatis dikirim melalui Sistem Presensi Digital Offline SMPN 4 Satap Taliabu Barat._`,
    ];

    const targetPhone = config.bkdWhatsApp || '';
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageLines.join('\n'))}`;
    window.open(waUrl, '_blank');
  };

  // Export Excel File for Offline Records
  const handleExportOfflineExcel = () => {
    const dataToExport = (pendingRecords.length > 0 ? pendingRecords : allRecords.filter((r) => r.date === todayDate)).map(
      (r, idx) => ({
        No: idx + 1,
        'Nama Lengkap': r.personName,
        'NIP / NISN': r.identifier,
        Kategori: r.personType === 'teacher' ? 'Guru / GTK' : 'Siswa',
        'Kelas / Mapel': r.classOrSubject,
        Tanggal: r.date,
        'Waktu Scan': r.time,
        Sesi: r.type === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang',
        Status: r.status.toUpperCase(),
        Metode: r.method,
        'Status Sinkronisasi': r.syncStatus === 'pending_sync' ? 'Antrean Offline' : 'Tersinkronisasi',
        'Waktu Sinkronisasi': r.syncedAt || '-',
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Offline');
    XLSX.writeFile(workbook, `Rekap_Presensi_Offline_${todayDate}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isEffectivelyOffline ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isEffectivelyOffline ? <Radio className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base text-slate-900">Mode Offline & Blankspot</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  isEffectivelyOffline 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {isEffectivelyOffline ? 'Wilayah Blankspot' : 'Online'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Presensi Tetap Berjalan Tanpa Jaringan • SMPN 4 Satap Taliabu Barat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className={`p-3.5 rounded-lg border flex items-start space-x-2.5 ${
            isEffectivelyOffline 
              ? 'bg-amber-50/60 border-amber-200 text-amber-900' 
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
          }`}>
            {isEffectivelyOffline ? (
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-0.5">
              <div className="font-medium text-xs">
                {isManualBlankspot
                  ? 'Mode Blankspot Manual Sedang Aktif'
                  : !isOnline
                  ? 'Koneksi Internet Terputus (Mode Blankspot Otomatis)'
                  : 'Koneksi Internet Stabil (Siap Sinkronisasi)'}
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {isEffectivelyOffline
                  ? 'Pemindaian QR, pencatatan presensi Guru & Siswa, serta verifikasi tetap dapat dilakukan 100% offline. Data tersimpan di memori perangkat dan siap dikirim saat ada jaringan.'
                  : 'Perangkat terhubung ke internet. Anda dapat mengirim seluruh antrean presensi offline ke server pusat.'}
              </p>
            </div>
          </div>

          {/* Toggle Paksa Mode Blankspot */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-600" />
                <span>Paksa Mode Blankspot (Offline Darurat)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gunakan mode ini di area sinyal tidak stabil agar aplikasi tidak menunggu timeout jaringan.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isManualBlankspot}
                onChange={(e) => onToggleManualBlankspot(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>

          {/* Statistik Antrean Presensi Offline */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
              <span>Antrean Presensi Offline</span>
              <span className="text-slate-700 font-semibold">{pendingRecords.length} Record</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Guru / GTK</span>
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-slate-900">{pendingTeachers.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tersimpan di perangkat</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  <span>Siswa</span>
                </div>
                <div className="mt-1 text-2xl font-bold font-mono text-slate-900">{pendingStudents.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tersimpan di perangkat</div>
              </div>
            </div>
          </div>

          {/* Feedback Success Message */}
          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Tindakan Utama Saat Ada Jaringan */}
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-medium text-slate-500">
              Aksi Pengiriman Presensi
            </div>

            {/* Tombol Sinkronisasi Utama */}
            <button
              id="btn-sync-all-offline"
              onClick={handleSyncClick}
              disabled={isSyncing || pendingRecords.length === 0 || isEffectivelyOffline}
              className={`w-full py-2.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 transition-colors ${
                isEffectivelyOffline || pendingRecords.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Sedang Mengirim & Menyinkronkan...'
                  : isEffectivelyOffline
                  ? 'Menunggu Jaringan Internet untuk Kirim'
                  : pendingRecords.length === 0
                  ? 'Semua Data Telah Tersinkronkan'
                  : `Kirim & Sinkronkan ${pendingRecords.length} Presensi ke Server`}
              </span>
            </button>

            {/* Tombol Alternatif Wilayah 3T */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleShareWhatsAppRecap}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="Kirim format teks WhatsApp ke Kepala Sekolah / BKD"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kirim via WhatsApp</span>
              </button>

              <button
                onClick={handleExportOfflineExcel}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="Unduh file Excel untuk dibawa ke pusat kota"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Rincian Daftar Antrean Offline jika ada */}
          {pendingRecords.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-700 flex items-center justify-between">
                <span>Daftar Presensi Menunggu Pengiriman ({pendingRecords.length})</span>
                <span className="text-[11px] text-slate-400">Tersimpan lokal</span>
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                {pendingRecords.slice(0, 15).map((rec) => (
                  <div key={rec.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      <div>
                        <div className="font-medium text-slate-800 text-xs">{rec.personName}</div>
                        <div className="text-[10px] text-slate-400">
                          {rec.identifier} • {rec.classOrSubject} • {rec.type} ({rec.time} WITA)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium border bg-amber-50 text-amber-800 border-amber-200">
                        {rec.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                {pendingRecords.length > 15 && (
                  <div className="p-1.5 text-center text-[10px] text-slate-400 bg-slate-50">
                    + {pendingRecords.length - 15} presensi lainnya dalam antrean
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Integritas data lokal terjamin</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
