import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  Send,
  Download,
  Share2,
  CheckCircle2,
  FileSpreadsheet,
  HardDrive,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Camera,
  Layers,
  FileText,
  AlertCircle,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  History,
  Trash2,
  Lock,
  Edit3,
  Save,
  X,
  Sliders,
  Check,
} from 'lucide-react';
import {
  AttendanceRecord,
  SchoolConfig,
  Teacher,
  Student,
  UserRole,
  ActivityLog,
} from '../types';
import {
  pairAttendanceByDateAndPerson,
  downloadBkdCsvFile,
  formatBkdWhatsAppMessage,
  PairedDailyAttendance,
} from '../utils/bkdTaliabuExport';
import {
  BkdReportPeriod,
  evaluateAllBkdSchedules,
  executeBkdAsnDispatch,
  filterAsnOnlyAttendance,
  filterRecordsByPeriod,
  getDispatchLogs,
  clearDispatchLogs,
  BkdDispatchLog,
  BkdScheduleStatus,
} from '../utils/bkdAutoScheduler';

interface BKDTaliabuAutomationTabProps {
  records?: AttendanceRecord[];
  teachers?: Teacher[];
  students?: Student[];
  config: SchoolConfig;
  userRole?: UserRole;
  onUpdateConfig?: (updatedConfig: SchoolConfig) => void;
  onAddLog?: (log: ActivityLog) => void;
}

export const BKDTaliabuAutomationTab: React.FC<BKDTaliabuAutomationTabProps> = ({
  records = [],
  teachers = [],
  students = [],
  config,
  userRole = 'admin',
  onUpdateConfig,
  onAddLog,
}) => {
  const [reportPeriod, setReportPeriod] = useState<BkdReportPeriod>('Harian');
  const [copiedWA, setCopiedWA] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'asn_only' | 'all_teachers' | 'all'>('asn_only');
  const [logs, setLogs] = useState<BkdDispatchLog[]>([]);
  const [schedules, setSchedules] = useState<BkdScheduleStatus[]>([]);

  // Configuration Edit State
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editForm, setEditForm] = useState({
    bkdDriveUrl: config.bkdDriveUrl || 'https://drive.google.com/drive/folders/bkd_taliabu_presensi_asn_2026',
    bkdEmail: config.bkdEmail || 'bkd.taliabu@pulautaliabukab.go.id',
    bkdWhatsApp: config.bkdWhatsApp || '6282291882341',
    dispatchTime: config.checkOutStart || '15:00',
    principalName: config.principalName || 'M. Ali Taher, S.Pd., M.M.',
    principalNip: config.principalNip || '197405122003121004',
  });

  // Permission Check: Only admin and bkd_staff (or legacy bkd) can edit automation configurations
  const canModifyAutomation = userRole === 'admin' || userRole === 'bkd_staff' || userRole === 'bkd';

  // Sorting state for table
  const [sortField, setSortField] = useState<'date' | 'name' | 'nip' | 'jamMasuk' | 'jamPulang' | 'durasi' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Live countdown to next 15:00 WIT
  const [countdownText, setCountdownText] = useState('');

  // Reload logs and schedules
  const refreshSchedulerStatus = () => {
    setSchedules(evaluateAllBkdSchedules());
    setLogs(getDispatchLogs());
  };

  useEffect(() => {
    refreshSchedulerStatus();

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(15, 0, 0, 0);

      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdownText(`${hours}j ${mins}m ${secs}d`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update edit form when config prop changes
  useEffect(() => {
    setEditForm({
      bkdDriveUrl: config.bkdDriveUrl || 'https://drive.google.com/drive/folders/bkd_taliabu_presensi_asn_2026',
      bkdEmail: config.bkdEmail || 'bkd.taliabu@pulautaliabukab.go.id',
      bkdWhatsApp: config.bkdWhatsApp || '6282291882341',
      dispatchTime: config.checkOutStart || '15:00',
      principalName: config.principalName || 'M. Ali Taher, S.Pd., M.M.',
      principalNip: config.principalNip || '197405122003121004',
    });
  }, [config]);

  // Handle Save Automation Settings with Audit Trail Logging
  const handleSaveAutomationConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyAutomation) return;

    const changes: string[] = [];
    if ((config.bkdDriveUrl || '') !== editForm.bkdDriveUrl) {
      changes.push(`Drive URL: "${config.bkdDriveUrl || '-'}" ➔ "${editForm.bkdDriveUrl}"`);
    }
    if ((config.bkdEmail || '') !== editForm.bkdEmail) {
      changes.push(`Email BKD: "${config.bkdEmail || '-'}" ➔ "${editForm.bkdEmail}"`);
    }
    if ((config.bkdWhatsApp || '') !== editForm.bkdWhatsApp) {
      changes.push(`WhatsApp BKD: "${config.bkdWhatsApp || '-'}" ➔ "${editForm.bkdWhatsApp}"`);
    }
    if ((config.checkOutStart || '15:00') !== editForm.dispatchTime) {
      changes.push(`Jadwal Dispatch: "${config.checkOutStart || '15:00'}" ➔ "${editForm.dispatchTime}"`);
    }
    if ((config.principalName || '') !== editForm.principalName) {
      changes.push(`Kepala Sekolah: "${config.principalName || '-'}" ➔ "${editForm.principalName}"`);
    }
    if ((config.principalNip || '') !== editForm.principalNip) {
      changes.push(`NIP Kepsek: "${config.principalNip || '-'}" ➔ "${editForm.principalNip}"`);
    }

    const updatedConfig: SchoolConfig = {
      ...config,
      bkdDriveUrl: editForm.bkdDriveUrl,
      bkdEmail: editForm.bkdEmail,
      bkdWhatsApp: editForm.bkdWhatsApp,
      checkOutStart: editForm.dispatchTime,
      principalName: editForm.principalName,
      principalNip: editForm.principalNip,
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    } else {
      localStorage.setItem('school_presensi_config', JSON.stringify(updatedConfig));
    }

    // Specialized Audit Trail Logging
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const actorName =
      userRole === 'admin'
        ? config.adminName || 'Admin SIMPEG'
        : userRole === 'bkd_staff' || userRole === 'bkd'
        ? 'Staf BKD Pulau Taliabu'
        : 'Pengguna Sistem';

    const actorRoleName =
      userRole === 'admin'
        ? 'Administrator SIMPEG'
        : userRole === 'bkd_staff' || userRole === 'bkd'
        ? 'Staf Auditor BKD'
        : 'Guru';

    const logEntry: ActivityLog = {
      id: `audit_bkd_${Date.now()}`,
      timestamp: now.toISOString(),
      date: todayDate,
      time: timeStr,
      category: 'bkd_automation',
      actor: {
        name: actorName,
        role: actorRoleName,
        email: userRole === 'admin' ? 'admin.simpeg@pulautaliabukab.go.id' : 'bkd.taliabu@pulautaliabukab.go.id',
      },
      action: '[BKD-AUTOMATION-CONFIG] Modifikasi Konfigurasi Otomasi BKD',
      description:
        changes.length > 0
          ? `Perubahan parameter transmisi 3 Media BKD: ${changes.join(' | ')}.`
          : 'Konfigurasi otomasi presensi BKD disimpan kembali tanpa perubahan nilai.',
      targetName: 'Konfigurasi Otomasi 3 Media BKD Taliabu',
      status: 'success',
      deviceInfo: `Web Console (${userRole.toUpperCase()})`,
    };

    if (onAddLog) {
      onAddLog(logEntry);
    }

    // Persist to local activity logs
    try {
      const savedLogs = localStorage.getItem('school_presensi_activity_logs');
      const parsedLogs = savedLogs ? JSON.parse(savedLogs) : [];
      localStorage.setItem('school_presensi_activity_logs', JSON.stringify([logEntry, ...parsedLogs]));
    } catch (err) {
      console.error('Failed to persist audit log', err);
    }

    setIsEditingConfig(false);
    setSendSuccessMsg('Konfigurasi transmisi 3 Media BKD berhasil diperbarui & tercatat di Audit Trail.');
    setTimeout(() => setSendSuccessMsg(null), 6000);
  };

  // Filter records by the chosen period
  const periodRecords = useMemo(() => {
    return filterRecordsByPeriod(records, reportPeriod);
  }, [records, reportPeriod]);

  // Pair records
  const allPaired = useMemo(() => {
    return pairAttendanceByDateAndPerson(periodRecords, teachers, students);
  }, [periodRecords, teachers, students]);

  // Filter ASN only if required
  const asnPaired = useMemo(() => {
    return filterAsnOnlyAttendance(allPaired, teachers);
  }, [allPaired, teachers]);

  // Total ASN count in master data
  const totalAsnTeachers = useMemo(() => {
    return teachers.filter(
      (t) => t.employmentStatus === 'PNS' || t.employmentStatus === 'PPPK' || t.employmentStatus === 'PPPK_PW'
    ).length;
  }, [teachers]);

  // Filtered & Sorted Paired Data for display
  const displayPaired = useMemo(() => {
    let source = allPaired;
    if (previewFilter === 'asn_only') {
      source = asnPaired;
    } else if (previewFilter === 'all_teachers') {
      source = allPaired.filter((r) => r.personType === 'teacher');
    }

    return source
      .filter((item) => {
        const matchesSearch =
          item.personName.toLowerCase().includes(searchFilter.toLowerCase()) ||
          item.identifier.includes(searchFilter) ||
          (item.employmentStatus && item.employmentStatus.toLowerCase().includes(searchFilter.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';

        if (sortField === 'durasi') {
          valA = a.totalJamKerja || '';
          valB = b.totalJamKerja || '';
        } else if (sortField === 'status') {
          valA = a.statusAkhir || '';
          valB = b.statusAkhir || '';
        } else if (sortField === 'nip') {
          valA = a.identifier || '';
          valB = b.identifier || '';
        } else if (sortField === 'name') {
          valA = a.personName || '';
          valB = b.personName || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [allPaired, asnPaired, previewFilter, searchFilter, sortField, sortDirection]);

  // Handle Sort
  const handleSort = (field: 'date' | 'name' | 'nip' | 'jamMasuk' | 'jamPulang' | 'durasi' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Actions
  const handleExportCsv = () => {
    downloadBkdCsvFile(previewFilter === 'asn_only' ? asnPaired : displayPaired, config, reportPeriod);
  };

  const handleCopyWhatsApp = () => {
    const text = formatBkdWhatsAppMessage(previewFilter === 'asn_only' ? asnPaired : displayPaired, config, reportPeriod);
    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handleOpenDriveBkd = () => {
    const driveUrl = config.bkdDriveUrl || 'https://drive.google.com';
    window.open(driveUrl, '_blank');
  };

  const handleSendEmailBkd = () => {
    const email = config.bkdEmail || 'bkd.taliabu@pulautaliabukab.go.id';
    const dataToSend = previewFilter === 'asn_only' ? asnPaired : displayPaired;
    const subject = encodeURIComponent(
      `Laporan Presensi Digital ${reportPeriod} Khusus ASN - ${config.schoolName} (NPSN ${config.npsn})`
    );
    const body = encodeURIComponent(
      `Kepada Yth.\nTim Verifikator Presensi BKD Kab. Pulau Taliabu\n\n` +
      `Bersama ini kami kirimkan Rekapitulasi Presensi Digital ${reportPeriod} Khusus ASN (${dataToSend.length} Pegawai ASN):\n` +
      `- Nama Sekolah: ${config.schoolName}\n` +
      `- NPSN: ${config.npsn}\n` +
      `- Periode Laporan: ${reportPeriod}\n` +
      `- Link Folder Google Drive BKD: ${config.bkdDriveUrl || '(Terlampir)'}\n` +
      `- Kontak WA Verifikator: ${config.bkdWhatsApp || '-'}\n\n` +
      `Data telah diformat dalam kolom Masuk & Pulang terpisah sesuai regulasi BKD Kab. Pulau Taliabu.\n\n` +
      `Hormat kami,\n${config.principalName || 'Kepala Sekolah'}\nNIP. ${config.principalNip || '-'}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendWhatsAppBkd = () => {
    const phone = config.bkdWhatsApp || '6282291882341';
    const text = formatBkdWhatsAppMessage(previewFilter === 'asn_only' ? asnPaired : displayPaired, config, reportPeriod);
    const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Automated Dispatch to 3 Channels
  const handleExecuteAutomatedDispatch = () => {
    const result = executeBkdAsnDispatch({
      period: reportPeriod,
      config,
      teachers,
      records,
      students,
      triggerType: 'manual_failsafe',
      openWindows: true,
    });

    setSendSuccessMsg(
      `Berhasil mengekspor & mengirim rekapitulasi presensi Khusus ASN (${reportPeriod}) ke 3 Media BKD (Drive, Email, WA)! (${result.asnPairedCount} ASN terverifikasi)`
    );
    refreshSchedulerStatus();
    setTimeout(() => setSendSuccessMsg(null), 8000);
  };

  const handleClearLogs = () => {
    if (window.confirm('Hapus seluruh riwayat log pengiriman otomatis BKD?')) {
      clearDispatchLogs();
      refreshSchedulerStatus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Auditor BKD Special Notice Bar */}
      {userRole === 'bkd' && (
        <div className="bg-amber-500 text-slate-950 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-amber-400 animate-in fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-950">
                  Mode Auditor Badan Kepegawaian Daerah (BKD) Pulau Taliabu
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-bold">
                  Hak Akses Verifikator ASN
                </span>
              </div>
              <p className="text-xs text-slate-900 font-medium mt-0.5">
                Anda sedang meninjau rekapitulasi data presensi ASN (PNS, PPPK, PPPK PW) untuk validasi Tambahan Penghasilan Pegawai (TPP) dan disiplin jam kerja.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => downloadBkdCsvFile(asnPaired, config, reportPeriod)}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Arsip Audit BKD</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner / Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Otomatisasi Presensi Khusus ASN BKD</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs border border-indigo-500/30">
                Kab. Pulau Taliabu
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Otomasi Rekapitulasi Presensi Khusus ASN ke 3 Media BKD
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Jika admin lupa mengirimkan rekapitulasi, sistem secara otomatis mengekspor presensi <strong>Khusus ASN (PNS & PPPK)</strong> dan
              mengirimkannya ke <strong>Link Google Drive BKD</strong>, <strong>Email BKD</strong>, dan <strong>Nomor WhatsApp BKD</strong> pada
              jadwal reguler (Harian jam 15.00 WIT, Mingguan Sabtu jam 15.00 WIT, Bulanan tgl 30/31 jam 15.00 WIT, Semesteran, dan Tahunan).
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-slate-700 space-y-2 text-xs min-w-[240px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Jadwal Dispatch 15:00 WIT</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">Aktif</span>
            </div>
            <div className="text-xl font-extrabold font-mono text-amber-300">
              {countdownText}
            </div>
            <div className="text-[10px] text-slate-400">
              Menuju jadwal kirim otomatis berikutnya (Pukul 15.00 WIT)
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {sendSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{sendSuccessMsg}</span>
        </div>
      )}

      {/* Target Config Summary Card & Permission Wrapper */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Permission Info Banner */}
        {!canModifyAutomation ? (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold block text-amber-950">Mode Akses Baca-Saja (Read-Only)</span>
                <span className="text-[11px] text-amber-800">
                  Peran Guru / Petugas Piket memiliki akses pantau. Perubahan konfigurasi parameter 3 Media BKD hanya dapat dilakukan oleh <strong>Administrator SIMPEG</strong> atau <strong>Staf BKD</strong>.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-lg text-[10px] font-bold shrink-0">
              🔒 Terkunci
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                  <span>Kontrol Konfigurasi Otomasi BKD</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {userRole === 'admin' ? 'Akses Admin SIMPEG' : 'Akses Staf BKD'}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Setiap perubahan parameter dicatat dalam Audit Trail resmi dengan identitas akun Anda.
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditingConfig(!isEditingConfig)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              {isEditingConfig ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup Form</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah Konfigurasi BKD</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Configuration Edit Form (Only visible when toggled by Admin/BKD Staff) */}
        {isEditingConfig && canModifyAutomation && (
          <form onSubmit={handleSaveAutomationConfig} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Pengaturan Transmisi 3 Media BKD Pulau Taliabu</span>
              </h4>
              <span className="text-[11px] text-indigo-600 font-bold">Audit Trail Siap Merekam</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  URL Google Drive Folder BKD *
                </label>
                <input
                  type="url"
                  required
                  value={editForm.bkdDriveUrl}
                  onChange={(e) => setEditForm({ ...editForm, bkdDriveUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Resmi BKD / Verifikator *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.bkdEmail}
                  onChange={(e) => setEditForm({ ...editForm, bkdEmail: e.target.value })}
                  placeholder="bkd.taliabu@pulautaliabukab.go.id"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Verifikator BKD *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.bkdWhatsApp}
                  onChange={(e) => setEditForm({ ...editForm, bkdWhatsApp: e.target.value })}
                  placeholder="6282291882341"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jadwal Kirim Otomatis (WIT)
                </label>
                <input
                  type="time"
                  required
                  value={editForm.dispatchTime}
                  onChange={(e) => setEditForm({ ...editForm, dispatchTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah (Penandatangan)
                </label>
                <input
                  type="text"
                  required
                  value={editForm.principalName}
                  onChange={(e) => setEditForm({ ...editForm, principalName: e.target.value })}
                  placeholder="M. Ali Taher, S.Pd., M.M."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={editForm.principalNip}
                  onChange={(e) => setEditForm({ ...editForm, principalNip: e.target.value })}
                  placeholder="197405122003121004"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditingConfig(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan & Catat Log Audit</span>
              </button>
            </div>
          </form>
        )}

        {/* Current Active Configuration Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center space-x-2 text-slate-600 font-semibold">
            <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Tujuan 3 Media BKD Terkonfigurasi:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 font-mono text-[11px] flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate max-w-[180px]">Drive: {config.bkdDriveUrl || 'Default'}</span>
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-900 rounded-xl border border-purple-200 font-mono text-[11px] flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>{config.bkdEmail || 'bkd.taliabu@pulautaliabukab.go.id'}</span>
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 font-mono text-[11px] flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WA: {config.bkdWhatsApp || '6282291882341'}</span>
            </span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-200 font-bold text-[11px]">
              Total ASN: {totalAsnTeachers} Guru/GTK
            </span>
          </div>
        </div>
      </div>

      {/* 5 Period Scheduler Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>5 Periode Pengiriman Otomatis Presensi Khusus ASN</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Pilih periode untuk pratinjau & pengiriman
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              id: 'Harian' as BkdReportPeriod,
              title: '1. Harian',
              subtitle: 'Setiap hari',
              time: '15.00 WIT',
              desc: 'Rekapitulasi harian presensi ASN masuk & pulang.',
            },
            {
              id: 'Mingguan' as BkdReportPeriod,
              title: '2. Mingguan',
              subtitle: 'Setiap hari Sabtu',
              time: '15.00 WIT',
              desc: 'Akumulasi presensi ASN perminggu.',
            },
            {
              id: 'Bulanan' as BkdReportPeriod,
              title: '3. Bulanan',
              subtitle: 'Akhir bulan (Tgl 30/31)',
              time: '15.00 WIT',
              desc: 'Rekapitulasi bulanan resmi untuk BKD.',
            },
            {
              id: 'Semesteran' as BkdReportPeriod,
              title: '4. Semesteran',
              subtitle: 'Setiap 1 semester',
              time: '15.00 WIT',
              desc: 'Rekap kehadiran ASN 1 semester.',
            },
            {
              id: 'Tahunan' as BkdReportPeriod,
              title: '5. Tahunan',
              subtitle: 'Akhir tahun (31 Des)',
              time: '15.00 WIT',
              desc: 'Laporan tahunan presensi ASN.',
            },
          ].map((item) => {
            const isSelected = reportPeriod === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setReportPeriod(item.id)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      {item.time}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-indigo-600">{item.subtitle}</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                    {isSelected ? '✓ Aktif Dipilih' : 'Klik untuk Pilih'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Bar with 3 Channels & CSV */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Unduh CSV ({reportPeriod})</span>
            </button>

            <button
              onClick={handleOpenDriveBkd}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Buka Folder Google Drive BKD"
            >
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>Buka Drive BKD</span>
              <ExternalLink className="w-3 h-3 text-amber-500" />
            </button>

            <button
              onClick={handleSendWhatsAppBkd}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Kirim Format Rekapitulasi ke WhatsApp BKD"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Kirim WA BKD</span>
            </button>

            <button
              onClick={handleSendEmailBkd}
              className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Kirim Laporan Resmi via Email Verifikator BKD"
            >
              <Mail className="w-4 h-4 text-purple-600" />
              <span>Kirim Email BKD</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4 text-slate-600" />
              <span>{copiedWA ? 'Tersalin!' : 'Salin Pesan'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExecuteAutomatedDispatch}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-2xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/25"
              title="Kirim Otomatis Presensi Khusus ASN ke 3 Media BKD Sekaligus"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Otomatis ke 3 Media BKD (Khusus ASN - {reportPeriod})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Preview (Kolom Sesi Masuk & Sesi Pulang Terpisah) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Pratinjau Rekapitulasi Presensi BKD ({reportPeriod}) - Kolom Masuk & Pulang Terpisah</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {displayPaired.length} data baris presensi terstruktur sesuai regulasi BKD Kab. Pulau Taliabu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Cari nama, NIP..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={previewFilter}
              onChange={(e) => setPreviewFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="asn_only">Khusus ASN Saja (PNS & PPPK)</option>
              <option value="all_teachers">Semua Guru & GTK</option>
              <option value="all">Semua Personil (Termasuk Siswa)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table with Click-to-Sort Headers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] select-none">
                <th className="p-3 border-r border-slate-200 w-10 text-center">No</th>
                <th
                  onClick={() => handleSort('date')}
                  className="p-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tanggal</span>
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nip')}
                  className="p-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>NIP / Identitas</span>
                    {sortField === 'nip' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="p-3 border-r border-slate-200 min-w-[150px] cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Lengkap ASN</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200">Status ASN</th>
                {/* SESI MASUK (KOLOM TERPISAH) */}
                <th
                  onClick={() => handleSort('jamMasuk')}
                  className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Jam Masuk</span>
                    {sortField === 'jamMasuk' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-emerald-600/50" />
                    )}
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">
                  Foto Masuk (Drive Link)
                </th>
                <th className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">
                  Lokasi Masuk
                </th>
                {/* SESI PULANG (KOLOM TERPISAH) */}
                <th
                  onClick={() => handleSort('jamPulang')}
                  className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Jam Pulang</span>
                    {sortField === 'jamPulang' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-700" /> : <ArrowDown className="w-3 h-3 text-indigo-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-indigo-600/50" />
                    )}
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black">
                  Foto Pulang (Drive Link)
                </th>
                <th className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black">
                  Lokasi Pulang
                </th>
                {/* SUMMARY */}
                <th
                  onClick={() => handleSort('durasi')}
                  className="p-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Durasi Kerja</span>
                    {sortField === 'durasi' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status Akhir</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayPaired.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-slate-400">
                    Belum ada data presensi ASN untuk periode {reportPeriod}.
                  </td>
                </tr>
              ) : (
                displayPaired.map((row, idx) => (
                  <tr key={`${row.date}-${row.personId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-slate-100 text-slate-400 font-mono text-center">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px]">{row.date}</td>
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px] text-indigo-600 font-bold">
                      {row.identifier}
                    </td>
                    <td className="p-3 border-r border-slate-100 font-bold text-slate-900">
                      {row.personName}
                    </td>
                    <td className="p-3 border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        {row.employmentStatus || 'ASN / GTK'}
                      </span>
                    </td>
                    {/* Sesi Masuk Columns */}
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 font-mono font-bold text-emerald-800">
                      {row.jamMasuk}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 text-[11px]">
                      {row.fotoMasukDriveUrl !== '-' ? (
                        <a
                          href={row.fotoMasukDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline font-mono flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Drive Link</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 text-[10px] text-slate-600 max-w-xs truncate">
                      {row.lokasiMasuk}
                    </td>
                    {/* Sesi Pulang Columns */}
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 font-mono font-bold text-indigo-800">
                      {row.jamPulang}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 text-[11px]">
                      {row.fotoPulangDriveUrl !== '-' ? (
                        <a
                          href={row.fotoPulangDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline font-mono flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Drive Link</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 text-[10px] text-slate-600 max-w-xs truncate">
                      {row.lokasiPulang}
                    </td>
                    {/* Summary */}
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px] text-slate-700">
                      {row.totalJamKerja}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          row.statusAkhir === 'HADIR LENGKAP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.statusAkhir === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800'
                            : row.statusAkhir === 'BELUM PULANG'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.statusAkhir}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch History Logs */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>Riwayat Pengiriman Otomatis ke BKD (3 Media)</span>
          </h3>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Riwayat</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
            Belum ada catatan pengiriman otomatis presensi ASN.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 8).map((l) => (
              <div
                key={l.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900">
                      Presensi Khusus ASN ({l.period}) - {l.asnCount} Pegawai ASN
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {l.date} pukul {l.time} WIT • Status: {l.status === 'success' ? 'Terkirim Sukses' : 'Sebagian'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-600">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Drive ✓</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">Email ✓</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">WhatsApp ✓</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">CSV ✓</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

