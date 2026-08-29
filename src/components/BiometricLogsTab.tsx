import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Camera,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Info,
  ChevronRight,
  X,
  FileSpreadsheet,
  UserCheck,
  Zap,
} from 'lucide-react';
import { BiometricLog, SchoolConfig, Teacher, Student } from '../types';

interface BiometricLogsTabProps {
  biometricLogs: BiometricLog[];
  config: SchoolConfig;
  teachers: Teacher[];
  students: Student[];
  onAddBiometricLog?: (log: BiometricLog) => void;
  onClearLogs?: () => void;
}

export const BiometricLogsTab: React.FC<BiometricLogsTabProps> = ({
  biometricLogs,
  config,
  teachers,
  students,
  onAddBiometricLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'failed' | 'flagged'>('all');
  const [personTypeFilter, setPersonTypeFilter] = useState<'all' | 'teacher' | 'student'>('all');
  const [selectedLog, setSelectedLog] = useState<BiometricLog | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = biometricLogs.length;
    const verified = biometricLogs.filter((l) => l.status === 'verified').length;
    const failed = biometricLogs.filter((l) => l.status === 'failed').length;
    const flagged = biometricLogs.filter((l) => l.status === 'flagged').length;
    const successRate = total > 0 ? Math.round((verified / total) * 100) : 100;
    const avgScore =
      total > 0
        ? (biometricLogs.reduce((acc, curr) => acc + curr.matchScore, 0) / total).toFixed(1)
        : '0.0';

    return { total, verified, failed, flagged, successRate, avgScore };
  }, [biometricLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return biometricLogs.filter((log) => {
      // Search
      const matchSearch =
        log.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.classOrSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.failureReason && log.failureReason.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status
      const matchStatus = statusFilter === 'all' || log.status === statusFilter;

      // Person Type
      const matchType = personTypeFilter === 'all' || log.personType === personTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [biometricLogs, searchTerm, statusFilter, personTypeFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Log',
      'Waktu',
      'Tanggal',
      'Nama',
      'NIP/NISN',
      'Kategori',
      'Kelas/Mapel',
      'Status',
      'Skor Kemiripan (%)',
      'Ambang Batas (%)',
      'Liveness',
      'GPS Valid',
      'Jarak GPS (m)',
      'Kamera',
      'Perangkat',
      'Catatan / Kegagalan',
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.time,
      l.date,
      `"${l.personName}"`,
      `'${l.identifier}`,
      l.personType === 'teacher' ? 'Guru/GTK' : 'Siswa',
      `"${l.classOrSubject}"`,
      l.status.toUpperCase(),
      l.matchScore,
      l.threshold,
      l.livenessPassed ? 'Lolos' : 'Gagal',
      l.gpsPassed ? 'Valid' : 'Luar Radius',
      l.distanceMeter,
      l.cameraFacing === 'user' ? 'Kamera Depan' : 'Kamera Belakang',
      `"${l.ipOrDevice || '-'}"`,
      `"${(l.failureReason || 'Verifikasi Biometrik Valid').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Biometric_Logs_${config.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulate verification attempt (for troubleshooting testing)
  const handleSimulateAttempt = (mode: 'success' | 'fail_match' | 'fail_gps') => {
    if (!onAddBiometricLog) return;
    setIsSimulating(true);

    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toISOString().slice(0, 10);

      const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)] || {
        id: 'tch_01',
        name: 'Dra. Sri Wahyuni, M.Pd.',
        nip: '196805141994032001',
        subject: 'Bahasa Indonesia',
      };

      let newLog: BiometricLog;

      if (mode === 'success') {
        const score = +(94 + Math.random() * 5).toFixed(1);
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: randomTeacher.id,
          personName: randomTeacher.name,
          identifier: randomTeacher.nip,
          personType: 'teacher',
          classOrSubject: randomTeacher.subject,
          status: 'verified',
          matchScore: score,
          threshold: 80,
          livenessPassed: true,
          gpsPassed: true,
          distanceMeter: Math.floor(10 + Math.random() * 30),
          cameraFacing: 'user',
          deviceId: 'simulated_front_cam_hd',
          photoThumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Simulated Testing Agent / Desa Pancoran',
        };
      } else if (mode === 'fail_match') {
        const score = +(55 + Math.random() * 18).toFixed(1);
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: randomTeacher.id,
          personName: randomTeacher.name,
          identifier: randomTeacher.nip,
          personType: 'teacher',
          classOrSubject: randomTeacher.subject,
          status: 'failed',
          matchScore: score,
          threshold: 80,
          livenessPassed: false,
          gpsPassed: true,
          distanceMeter: 18,
          cameraFacing: 'user',
          deviceId: 'simulated_front_cam_lowres',
          failureReason: `Skor kemiripan biometrik (${score}%) di bawah ambang batas (80%). Pencahayaan minim atau wajah tidak terfokus.`,
          photoThumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Simulated Testing Agent / Mobile Cam',
        };
      } else {
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: randomTeacher.id,
          personName: randomTeacher.name,
          identifier: randomTeacher.nip,
          personType: 'teacher',
          classOrSubject: randomTeacher.subject,
          status: 'flagged',
          matchScore: 94.5,
          threshold: 80,
          livenessPassed: true,
          gpsPassed: false,
          distanceMeter: 210,
          cameraFacing: 'user',
          deviceId: 'simulated_front_cam_hd',
          failureReason: 'GPS di luar geofencing sekolah. Terdeteksi jarak 210m dari titik resmi SMPN 4 Satap Taliabu Barat.',
          photoThumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Simulated Testing Agent / Luar Radius',
        };
      }

      onAddBiometricLog(newLog);
      setIsSimulating(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>MediaDevices & Biometrik Wajah</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                Desa Pancoran, Taliabu Barat
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Biometric Logs & Troubleshoot Otentikasi Wajah
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Visualisasi rekaman upaya verifikasi wajah langsung (Face Recognition) GTK & Siswa{' '}
              <strong className="text-white">{config.schoolName}</strong> untuk analisis akurasi, pencegahan kecurangan, dan troubleshooting otentikasi.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor CSV</span>
            </button>
            <div className="flex items-center space-x-1 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/80">
              <button
                onClick={() => handleSimulateAttempt('success')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Lolos Verifikasi"
              >
                + Tes Lolos
              </button>
              <button
                onClick={() => handleSimulateAttempt('fail_match')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Gagal Skor Rendah"
              >
                + Tes Gagal
              </button>
              <button
                onClick={() => handleSimulateAttempt('fail_gps')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Diluar Radius"
              >
                + Tes Radius
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Upaya Scan</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Audit kamera depan</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Lolos Verifikasi</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.verified}</div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-bold mt-0.5 block">
              {stats.successRate}% Rasio Akurasi
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Gagal / Ditolak</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.failed}</div>
            <span className="text-[11px] text-rose-500 font-bold mt-0.5 block">Kemiripan &lt; 80% / Spoof</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Rerata Skor Match</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.avgScore}%</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Ambang Batas: 80%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Troubleshooting Insights Card */}
      <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-2xl shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
              Panduan Pemecahan Masalah (Troubleshooting Guide) Otentikasi
            </h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
              Jika seorang guru atau siswa sering mengalami <em>Gagal Verifikasi</em>: (1) Pastikan wajah berada tepat di dalam bingkai oval panduan, (2) Hindari masker atau kacamata hitam, (3) Pastikan izin kamera depan aktif di browser, (4) Periksa radius GPS (harus &lt; {config.maxRadiusMeters}m dari Desa Pancoran).
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIP, NISN, rombel, atau alasan kegagalan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => setStatusFilter('verified')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'verified'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                }`}
              >
                ✓ Terverifikasi
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                }`}
              >
                ✕ Gagal
              </button>
              <button
                onClick={() => setStatusFilter('flagged')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'flagged'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                }`}
              >
                ⚠ Peringatan
              </button>
            </div>

            {/* Person Type Filter */}
            <select
              value={personTypeFilter}
              onChange={(e) => setPersonTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Pengguna</option>
              <option value="teacher">Guru & GTK</option>
              <option value="student">Siswa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Biometric Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Riwayat Upaya Otentikasi Biometrik ({filteredLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            SMP Negeri 4 Satu Atap Taliabu Barat
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Tidak Ada Log Biometrik</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Belum ada data rekaman pencocokan wajah yang sesuai dengan kata kunci pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Pengguna (GTK / Siswa)</th>
                  <th className="py-3.5 px-4">Perangkat / Kamera</th>
                  <th className="py-3.5 px-4">Skor Kemiripan</th>
                  <th className="py-3.5 px-4">Status & Liveness</th>
                  <th className="py-3.5 px-4">GPS Geofence</th>
                  <th className="py-3.5 px-4 text-center">Aksi / Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{log.time}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.date}</div>
                    </td>

                    {/* Person Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            log.photoThumbnail ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                          }
                          alt={log.personName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate">
                            {log.personName}
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono">{log.identifier}</span>
                            <span>•</span>
                            <span className="truncate">{log.classOrSubject}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Device & Camera */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{log.ipOrDevice || 'MediaDevices Camera'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {log.cameraFacing === 'user' ? '✓ Kamera Depan (User)' : '⚠ Kamera Belakang'}
                      </div>
                    </td>

                    {/* Match Score */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              log.matchScore >= 80
                                ? 'bg-emerald-500'
                                : log.matchScore >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(log.matchScore, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono font-extrabold text-xs ${
                            log.matchScore >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.matchScore >= 70
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.matchScore}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ambang: {log.threshold}%</div>
                    </td>

                    {/* Status & Liveness */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.status === 'verified' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Terverifikasi</span>
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Gagal / Ditolak</span>
                        </span>
                      )}
                      {log.status === 'flagged' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Peringatan GPS</span>
                        </span>
                      )}
                      {log.failureReason && (
                        <p className="text-[10px] text-rose-500 dark:text-rose-400 max-w-[200px] truncate mt-1">
                          {log.failureReason}
                        </p>
                      )}
                    </td>

                    {/* GPS Geofence */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <MapPin
                          className={`w-3.5 h-3.5 ${
                            log.gpsPassed ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        />
                        <span
                          className={`font-bold ${
                            log.gpsPassed
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.distanceMeter}m
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {log.gpsPassed ? 'Dalam Radius (< 80m)' : 'Luar Radius Sekolah'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center space-x-1 mx-auto transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail Bukti</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot & Diagnostic Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Audit Snapshot & Diagnostik Biometrik
                </h4>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Photo Snapshot with Biometric Stamp Overlay */}
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
                <img
                  src={
                    selectedLog.photoThumbnail ||
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={selectedLog.personName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

                {/* Simulated Bounding Box */}
                <div className="absolute inset-10 border-2 border-indigo-400 rounded-3xl pointer-events-none flex items-center justify-center">
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-md rounded text-[10px] text-cyan-300 font-mono font-bold">
                    Face Match: {selectedLog.matchScore}%
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-3 left-3 right-3 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl text-white text-[11px] font-mono flex items-center justify-between border border-slate-700">
                  <div>
                    <span className="font-bold">{selectedLog.personName}</span>
                    <span className="text-slate-400 block text-[10px]">{selectedLog.identifier} • {selectedLog.classOrSubject}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      selectedLog.status === 'verified'
                        ? 'bg-emerald-500 text-white'
                        : selectedLog.status === 'failed'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* Diagnostic Parameters Grid */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2.5 text-xs">
                <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Parameter Verifikasi Sistem</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{selectedLog.time} WIB</span>
                </h5>

                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Skor Kemiripan Wajah</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.matchScore}% / Ambang 80%
                    </span>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Jarak Radius Geofencing</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.distanceMeter} meter ({selectedLog.gpsPassed ? 'Valid' : 'Invalid'})
                    </span>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Uji Liveness & Kamera</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.livenessPassed ? 'Lolos (Kamera Depan)' : 'Gagal Liveness'}
                    </span>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Lokasi Titik Acuan</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Desa Pancoran, Taliabu
                    </span>
                  </div>
                </div>

                {selectedLog.failureReason && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                    <span className="font-bold text-rose-800 dark:text-rose-300 text-[11px] block">
                      Analisis Kendala / Kegagalan Otentikasi:
                    </span>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                      {selectedLog.failureReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
