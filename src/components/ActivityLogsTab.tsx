import React, { useState, useMemo } from 'react';
import {
  ActivityLog,
  ActivityLogCategory,
  SchoolConfig,
  UserRole,
} from '../types';
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  RefreshCw,
  Clock,
  User,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  FileSpreadsheet,
  Trash2,
  Plus,
  Calendar,
} from 'lucide-react';
import { downloadCsv, formatDateIndo } from '../utils/soundAndDate';

interface ActivityLogsTabProps {
  logs?: ActivityLog[];
  onAddLog?: (log: any) => void;
  onClearLogs?: () => void;
  schoolConfig?: SchoolConfig;
  userRole?: UserRole;
}

export const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({
  logs = [],
  onAddLog,
  onClearLogs,
  schoolConfig = {
    schoolName: 'SMPN 4 Satap Taliabu Barat',
    npsn: '69901234',
    address: 'Jl. Pendidikan No. 4, Bobong, Pulau Taliabu, Maluku Utara',
    academicYear: '2025/2026',
    semester: 'Genap',
    checkInStart: '06:15',
    checkInDeadline: '07:15',
    checkOutStart: '14:30',
    schoolLat: -1.8214,
    schoolLng: 124.4981,
    maxRadiusMeters: 500,
    principalName: 'M. Ali Taher, S.Pd., M.M.',
    adminName: 'Admin SIMPEG',
  },
  userRole = 'admin',
}) => {
  const safeLogs = logs || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New log form state
  const [newAction, setNewAction] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityLogCategory>('system');
  const [newStatus, setNewStatus] = useState<'success' | 'warning' | 'info' | 'error'>('info');

  const filteredLogs = useMemo(() => {
    return safeLogs.filter((log) => {
      // Search by description or target ID, action, target name, actor, etc.
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.description.toLowerCase().includes(q) ||
        (Boolean(log.targetId) && log.targetId!.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q) ||
        (Boolean(log.targetName) && log.targetName!.toLowerCase().includes(q)) ||
        log.actor.name.toLowerCase().includes(q) ||
        log.actor.role.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        (Boolean(log.deviceInfo) && log.deviceInfo!.toLowerCase().includes(q));

      // Category
      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;

      // Status
      const matchStatus = selectedStatus === 'all' || log.status === selectedStatus;

      // Date
      let matchDate = true;
      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchDate = log.date === todayStr;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchDate = new Date(log.date) >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        matchDate = new Date(log.date) >= monthAgo;
      }

      return matchSearch && matchCategory && matchStatus && matchDate;
    });
  }, [logs, searchQuery, selectedCategory, selectedStatus, dateFilter]);

  const handleExportCsv = () => {
    const headers = [
      'ID Log',
      'Timestamp',
      'Tanggal',
      'Waktu',
      'Kategori',
      'Aktor / Pelaku',
      'Peran Aktor',
      'Aksi',
      'Deskripsi',
      'Target',
      'Status',
      'Perangkat / IP',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${l.category}"`,
      `"${l.actor.name.replace(/"/g, '""')}"`,
      `"${l.actor.role.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.targetName || l.targetId || '-').replace(/"/g, '""')}"`,
      `"${l.status.toUpperCase()}"`,
      `"${(l.deviceInfo || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const today = new Date().toISOString().split('T')[0];
    downloadCsv(`Log_Aktivitas_Audit_${schoolConfig.schoolName.replace(/\s+/g, '_')}_${today}.csv`, csvContent);
  };

  const handleCreateManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction || !newDesc) return;

    onAddLog({
      category: newCategory,
      actor: {
        name:
          userRole === 'admin'
            ? (schoolConfig.adminName || 'Admin SIMPEG')
            : userRole === 'bkd'
            ? 'Auditor BKD Pulau Taliabu'
            : 'Guru / Petugas Piket',
        role:
          userRole === 'admin'
            ? 'Administrator SIMPEG'
            : userRole === 'bkd'
            ? 'Auditor Kepegawaian BKD'
            : 'Petugas Piket Presensi',
      },
      action: newAction,
      description: newDesc,
      status: newStatus,
      deviceInfo: 'Web Admin Dashboard',
    });

    setNewAction('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const getCategoryBadge = (cat: ActivityLogCategory) => {
    switch (cat) {
      case 'bkd_automation':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Otomasi BKD Taliabu</span>;
      case 'attendance':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Presensi GTK & ASN</span>;
      case 'gtk_service':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Layanan GTK</span>;
      case 'leave':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Izin & Cuti GTK</span>;
      case 'master_data':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">Master Data GTK</span>;
      case 'config':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">Pengaturan SIMPEG</span>;
      case 'workspace':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">Workspace / Cloud</span>;
      case 'auth':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Keamanan</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Sistem</span>;
    }
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'info' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
  };

  return (
    <div id="activity-logs-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Audit Trail & Log Aktivitas Sistem</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Recording
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Merekam setiap riwayat transaksi data, absensi selfie/QR, perubahan master data, serta alur persetujuan ganda GTK (Kepala Sekolah & Admin) untuk akuntabilitas & audit resmi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="export-audit-csv-btn"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Audit (.CSV)</span>
            </button>

            {onClearLogs && safeLogs.length > 0 && (
              <button
                id="clear-audit-logs-btn"
                onClick={() => {
                  if (confirm('Kosongkan seluruh riwayat dan log audit? Data log akan direset ke status kosong.')) {
                    onClearLogs();
                  }
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-sm font-medium rounded-xl border border-rose-800/60 transition-all active:scale-95"
                title="Kosongkan seluruh riwayat log aktivitas"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Kosongkan Riwayat</span>
              </button>
            )}

            {userRole === 'admin' && (
              <button
                id="add-manual-log-btn"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Log Manual</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Total Rekaman Log</div>
            <div className="text-xl font-bold text-white mt-0.5">{safeLogs.length}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Log Hari Ini</div>
            <div className="text-xl font-bold text-indigo-300 mt-0.5">
              {safeLogs.filter((l) => l.date === new Date().toISOString().split('T')[0]).length}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Aktivitas GTK & Izin</div>
            <div className="text-xl font-bold text-purple-300 mt-0.5">
              {safeLogs.filter((l) => l.category === 'gtk_service' || l.category === 'leave').length}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Kejadian Sukses / Valid</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {safeLogs.filter((l) => l.status === 'success').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Description & Target ID emphasis */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-audit-log"
            type="text"
            placeholder="Cari deskripsi atau Target ID (NIP/NISN/UUID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter */}
          <select
            id="filter-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="bkd_automation">⚙️ Otomasi BKD Taliabu (3 Media)</option>
            <option value="attendance">Presensi GTK & ASN</option>
            <option value="gtk_service">Layanan & Izin GTK</option>
            <option value="leave">Izin & Cuti GTK</option>
            <option value="master_data">Master Data Guru & ASN</option>
            <option value="config">Pengaturan SIMPEG</option>
            <option value="workspace">Google Workspace / Cloud</option>
            <option value="auth">Keamanan & Akses Akun</option>
            <option value="system">Sistem & Pemeliharaan</option>
          </select>

          {/* Date Filter */}
          <select
            id="filter-date-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
          </select>

          {/* Status Filter */}
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="success">Sukses / Valid</option>
            <option value="info">Informasi</option>
            <option value="warning">Peringatan</option>
            <option value="error">Gagal / Ditolak</option>
          </select>

          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setDateFilter('all');
              }}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reset Filter"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center space-x-2 text-xs px-2 text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Filter Aktif:</span>
          <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
            Mencari Deskripsi / Target ID: &ldquo;{searchQuery}&rdquo;
          </span>
          <span className="text-slate-400">({filteredLogs.length} hasil ditemukan)</span>
        </div>
      )}

      {/* Logs Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Daftar Riwayat Aktivitas ({filteredLogs.length} entri)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Diurutkan dari yang terbaru
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {safeLogs.length === 0 ? (
              <>
                <p className="text-slate-800 dark:text-slate-200 font-bold text-base">
                  Belum Ada Riwayat Aktivitas & Presensi (Data Kosong)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Jika belum pernah melakukan absensi atau aksi sistem, log audit dan riwayat akan tetap bersih dan kosong.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Tidak ada data log yang sesuai dengan filter atau pencarian &ldquo;{searchQuery}&rdquo;.
                </p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci deskripsi, Target ID, atau bersihkan filter di atas.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => {
              const isBkdAutomationLog = log.category === 'bkd_automation' || log.action.includes('BKD');

              return (
                <div
                  key={log.id}
                  className={`p-4 sm:p-5 transition-colors ${
                    isBkdAutomationLog
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className={`mt-0.5 p-2 rounded-xl ${
                        isBkdAutomationLog
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {getStatusIcon(log.status)}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {log.action}
                          </span>
                          {getCategoryBadge(log.category)}
                          {isBkdAutomationLog && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase shadow-xs">
                              Audit Verified
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                          {log.description}
                        </p>

                        {(Boolean(log.targetName) || Boolean(log.targetId)) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {log.targetName && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Target: {log.targetName}
                              </span>
                            )}
                            {log.targetId && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold">
                                Target ID: {log.targetId}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <strong className="text-slate-700 dark:text-slate-300 font-medium">{log.actor.name}</strong>
                            <span className="text-slate-400">({log.actor.role})</span>
                          </span>

                          {log.deviceInfo && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.deviceInfo}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right flex-shrink-0 pl-11 sm:pl-0">
                      <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                        {log.time} WIT
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateIndo(log.date)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add Manual Log */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Catat Aktivitas Audit Manual</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Aksi / Peristiwa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Verifikasi Berkas Fisik, Sinkronisasi Manual Dapodik"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ActivityLogCategory)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gtk_service">Layanan GTK (SK / Izin / SPT)</option>
                  <option value="attendance">Presensi & Kehadiran</option>
                  <option value="master_data">Master Data GTK & Siswa</option>
                  <option value="config">Pengaturan Sekolah</option>
                  <option value="workspace">Google Workspace / Cloud</option>
                  <option value="auth">Keamanan / Otorisasi</option>
                  <option value="system">Sistem & Pemeliharaan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan & Rincian Log *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Rincian catatan audit atau alasan perubahan..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Hasil
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'success', 'warning', 'error'] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        newStatus === s
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all"
                >
                  Simpan Log Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
