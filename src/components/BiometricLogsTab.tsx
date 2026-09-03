import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  Archive,
  CheckSquare,
  Square,
  AlertOctagon,
  TrendingUp,
  User,
  Activity,
  Layers,
  ChevronDown,
  FileText,
  Flame,
  Radio,
  Users,
  Copy,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { BiometricLog, SchoolConfig, Teacher, Student } from '../types';
import { BiometricLeafletMap } from './BiometricLeafletMap';
import { BiometricTimelineScrubber } from './BiometricTimelineScrubber';
import {
  getTodayDateString,
  formatTimeIndo,
  formatDateIndo,
  formatDateTimeWita,
  downloadCsv,
} from '../utils/soundAndDate';
import {
  generateBiometricIncidentReportPdf,
  exportBiometricIncidentReportCsv,
} from '../utils/incidentReportPdf';

interface BiometricLogsTabProps {
  biometricLogs?: BiometricLog[];
  logs?: BiometricLog[];
  config?: SchoolConfig;
  teachers?: Teacher[];
  students?: Student[];
  onAddBiometricLog?: (log: BiometricLog) => void;
  onAddLog?: (log: BiometricLog) => void;
  onUpdateLogs?: (logs: BiometricLog[]) => void;
  onClearLogs?: () => void;
}

export const BiometricLogsTab: React.FC<BiometricLogsTabProps> = ({
  biometricLogs = [],
  logs = [],
  config = {
    schoolName: 'SMP NEGERI 4 SATU ATAP TALIABU BARAT',
    npsn: '60203598',
    address: 'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    checkInStart: '06:15',
    checkInDeadline: '07:15',
    checkOutStart: '14:30',
    schoolLat: -1.8485,
    schoolLng: 124.4682,
    maxRadiusMeters: 80,
    principalName: 'Drs. Ruslan La Ode, M.Pd.',
    adminName: 'Hendra Hasan, S.Pd. (Admin Dapodik/BKD)',
  },
  teachers = [],
  students = [],
  onAddBiometricLog,
  onAddLog,
  onUpdateLogs,
  onClearLogs,
}) => {
  const currentLogs = biometricLogs.length > 0 ? biometricLogs : (logs || []);
  const safeTeachers = teachers || [];
  const safeStudents = students || [];
  const handleAdd = onAddBiometricLog || onAddLog;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'failed' | 'flagged' | 'suspicious'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [personTypeFilter, setPersonTypeFilter] = useState<'all' | 'teacher' | 'student'>('all');
  const [selectedTimelineHour, setSelectedTimelineHour] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<BiometricLog | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredUser, setHoveredUser] = useState<{ id: string; name: string; type: string } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [archiveSuccessMsg, setArchiveSuccessMsg] = useState<string | null>(null);
  const [incidentReportSuccessMsg, setIncidentReportSuccessMsg] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedSuspiciousGroupId, setSelectedSuspiciousGroupId] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'last30' | 'custom'>('all');

  const handleSetDatePreset = (preset: 'all' | 'today' | 'last7' | 'last30') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const today = getTodayDateString(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(getTodayDateString(d));
      setEndDate(getTodayDateString(now));
    } else if (preset === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(getTodayDateString(d));
      setEndDate(getTodayDateString(now));
    }
  };

  const todayStr = getTodayDateString();

  // Step 1: Assign default severity if missing
  const baseNormalizedLogs = useMemo(() => {
    return currentLogs.map((l) => {
      let severity: 'info' | 'warning' | 'error' = l.severity || 'info';
      if (l.status === 'failed' || (l.matchScore < (l.threshold || 80)) || !l.livenessPassed) {
        severity = 'error';
      } else if (l.status === 'flagged' || !l.gpsPassed) {
        severity = 'warning';
      }
      return { ...l, severity };
    });
  }, [currentLogs]);

  // Step 2: Automated Mass-Spoofing & Collision Detection
  // Automatically flag log entries with identical timestamps or GPS coordinates across multiple users as 'Suspicious' and group them
  const { normalizedLogs, suspiciousGroups, totalSuspiciousCount } = useMemo(() => {
    const coordMap: Record<string, BiometricLog[]> = {};
    const timeMap: Record<string, BiometricLog[]> = {};

    baseNormalizedLogs.forEach((log) => {
      // Group by coordinate (rounded to 4 decimals for tight proximity match)
      if (log.latitude && log.longitude) {
        const coordKey = `${log.date}_${log.latitude.toFixed(4)}_${log.longitude.toFixed(4)}`;
        if (!coordMap[coordKey]) coordMap[coordKey] = [];
        coordMap[coordKey].push(log);
      }

      // Group by exact time down to minute/second
      const timeKey = `${log.date}_${log.time.substring(0, 5)}`; // same minute
      if (!timeMap[timeKey]) timeMap[timeKey] = [];
      timeMap[timeKey].push(log);
    });

    const groups: {
      id: string;
      type: 'gps_collision' | 'timestamp_collision';
      title: string;
      description: string;
      logs: BiometricLog[];
      date: string;
      timeKey: string;
      coordinateInfo?: string;
    }[] = [];

    const flaggedLogMeta = new Map<string, { reason: string; groupId: string }>();

    // 1. Detect Identical GPS coordinates across multiple distinct users
    Object.entries(coordMap).forEach(([key, list]) => {
      const distinctUsers = new Set(list.map((l) => l.personId || l.identifier || l.personName));
      if (distinctUsers.size >= 2) {
        const groupId = `grp_gps_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const first = list[0];
        const coordInfo = `${first.latitude?.toFixed(5)}, ${first.longitude?.toFixed(5)}`;
        const reason = `Koordinat GPS Identik (${coordInfo}) terdeteksi serentak pada ${distinctUsers.size} pengguna berbeda (Indikasi Mock Location / Proxy Massal)`;

        list.forEach((l) => {
          flaggedLogMeta.set(l.id, { reason, groupId });
        });

        groups.push({
          id: groupId,
          type: 'gps_collision',
          title: `🚨 Indikasi GPS Mock / Spoofing Massal (${distinctUsers.size} Pengguna)`,
          description: reason,
          logs: list,
          date: first.date,
          timeKey: first.time,
          coordinateInfo: coordInfo,
        });
      }
    });

    // 2. Detect Identical Timestamps across multiple distinct users
    Object.entries(timeMap).forEach(([key, list]) => {
      const distinctUsers = new Set(list.map((l) => l.personId || l.identifier || l.personName));
      if (distinctUsers.size >= 3) {
        const groupId = `grp_time_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const first = list[0];
        const reason = `Timestamp presensi identik serentak (${first.time} WITA) pada ${distinctUsers.size} akun (Indikasi Bot Submission / Shared Script)`;

        list.forEach((l) => {
          if (!flaggedLogMeta.has(l.id)) {
            flaggedLogMeta.set(l.id, { reason, groupId });
          }
        });

        // Add group if not already covered in GPS groups
        if (!groups.some((g) => g.logs.some((gl) => list.some((l) => l.id === gl.id)))) {
          groups.push({
            id: groupId,
            type: 'timestamp_collision',
            title: `⚡ Timestamp Identik Serentak (${distinctUsers.size} Pengguna)`,
            description: reason,
            logs: list,
            date: first.date,
            timeKey: first.time,
          });
        }
      }
    });

    // Enrich logs with suspicious flags
    const enriched = baseNormalizedLogs.map((l) => {
      const meta = flaggedLogMeta.get(l.id);
      if (meta) {
        return {
          ...l,
          isSuspicious: true,
          suspiciousReason: meta.reason,
          suspiciousGroupId: meta.groupId,
          severity: (l.severity === 'error' ? 'error' : 'warning') as 'error' | 'warning',
        };
      }
      return l;
    });

    return {
      normalizedLogs: enriched,
      suspiciousGroups: groups,
      totalSuspiciousCount: flaggedLogMeta.size,
    };
  }, [baseNormalizedLogs]);

  // Statistics calculation for Operational Health Insights
  const stats = useMemo(() => {
    const total = normalizedLogs.length;
    const todayLogs = normalizedLogs.filter((l) => l.date === todayStr);
    const todayTotal = todayLogs.length;
    const todayVerified = todayLogs.filter((l) => l.status === 'verified').length;
    const todayFailed = todayLogs.filter((l) => l.status === 'failed' || l.severity === 'error').length;
    const todayFlagged = todayLogs.filter((l) => l.status === 'flagged').length;
    const todaySuspicious = todayLogs.filter((l) => l.isSuspicious).length;

    const totalVerified = normalizedLogs.filter((l) => l.status === 'verified').length;
    const totalFailed = normalizedLogs.filter((l) => l.status === 'failed' || l.severity === 'error').length;

    const successRateToday = todayTotal > 0 ? Math.round((todayVerified / todayTotal) * 100) : (total > 0 ? Math.round((totalVerified / total) * 100) : 100);
    const failureRateToday = todayTotal > 0 ? Math.round((todayFailed / todayTotal) * 100) : (total > 0 ? Math.round((totalFailed / total) * 100) : 0);

    const avgScore =
      total > 0
        ? (normalizedLogs.reduce((acc, curr) => acc + (curr.matchScore || 0), 0) / total).toFixed(1)
        : '0.0';

    return {
      total,
      todayTotal,
      todayVerified,
      todayFailed,
      todayFlagged,
      todaySuspicious,
      successRateToday,
      failureRateToday,
      totalVerified,
      totalFailed,
      avgScore,
    };
  }, [normalizedLogs, todayStr]);

  // Automated anomaly detection: 3 consecutive failed biometric attempts within 5 minutes
  const anomalyWarnings = useMemo(() => {
    const userAttempts: Record<string, BiometricLog[]> = {};

    normalizedLogs.forEach((log) => {
      const pid = log.personId || log.identifier || log.personName;
      if (!userAttempts[pid]) userAttempts[pid] = [];
      userAttempts[pid].push(log);
    });

    const warnings: { personId: string; personName: string; count: number; lastTime: string; reason: string }[] = [];

    Object.entries(userAttempts).forEach(([pid, list]) => {
      const sorted = [...list].sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());

      let consecutiveFails = 0;
      let failTimestamps: number[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const isFail = item.status === 'failed' || item.severity === 'error';
        const itemTime = new Date(`${item.date} ${item.time}`).getTime();

        if (isFail) {
          consecutiveFails++;
          failTimestamps.push(itemTime);

          if (consecutiveFails >= 3) {
            const timeDiffMinutes = (failTimestamps[failTimestamps.length - 1] - failTimestamps[failTimestamps.length - 3]) / (1000 * 60);
            if (timeDiffMinutes <= 5) {
              warnings.push({
                personId: pid,
                personName: item.personName,
                count: consecutiveFails,
                lastTime: item.time,
                reason: `3+ kegagalan biometrik berturut-turut dalam ${Math.round(timeDiffMinutes)} menit`,
              });
              break;
            }
          }
        } else {
          consecutiveFails = 0;
          failTimestamps = [];
        }
      }
    });

    return warnings;
  }, [normalizedLogs]);

  // 30-Day Activity Visualization Data
  const chartData = useMemo(() => {
    const daysMap: Record<string, { date: string; displayDate: string; verified: number; failed: number; suspicious: number; total: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = getTodayDateString(d);
      const displayDate = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short' });
      daysMap[dateKey] = {
        date: dateKey,
        displayDate,
        verified: 0,
        failed: 0,
        suspicious: 0,
        total: 0,
      };
    }

    normalizedLogs.forEach((log) => {
      if (daysMap[log.date]) {
        if (log.status === 'verified') {
          daysMap[log.date].verified += 1;
        } else {
          daysMap[log.date].failed += 1;
        }
        if (log.isSuspicious) {
          daysMap[log.date].suspicious += 1;
        }
        daysMap[log.date].total += 1;
      }
    });

    return Object.values(daysMap);
  }, [normalizedLogs]);

  // Filtered Logs (including scrubber hour filter and suspicious group filter)
  const filteredLogs = useMemo(() => {
    return normalizedLogs.filter((log) => {
      // Search term
      const matchSearch =
        (log.personName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.classOrSubject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.failureReason && log.failureReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.suspiciousReason && log.suspiciousReason.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status
      let matchStatus = true;
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'suspicious') {
        matchStatus = log.isSuspicious === true;
      } else {
        matchStatus = log.status === statusFilter;
      }

      // Severity
      const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;

      // Person Type
      const matchType = personTypeFilter === 'all' || log.personType === personTypeFilter;

      // Timeline Scrubber Hour Filter
      let matchHour = true;
      if (selectedTimelineHour !== null) {
        const hour = parseInt(log.time.split(':')[0], 10);
        matchHour = hour === selectedTimelineHour;
      }

      // Suspicious Group Filter
      let matchGroup = true;
      if (selectedSuspiciousGroupId !== null) {
        matchGroup = log.suspiciousGroupId === selectedSuspiciousGroupId;
      }

      // Date Range Match
      const matchDate =
        (!startDate || log.date >= startDate) &&
        (!endDate || log.date <= endDate);

      return matchDate && matchSearch && matchStatus && matchSeverity && matchType && matchHour && matchGroup;
    });
  }, [normalizedLogs, startDate, endDate, searchTerm, statusFilter, severityFilter, personTypeFilter, selectedTimelineHour, selectedSuspiciousGroupId]);

  // Hover Card Quick User Profile Stats
  const hoveredUserStats = useMemo(() => {
    if (!hoveredUser) return null;
    const userLogs = normalizedLogs.filter(
      (l) => l.personId === hoveredUser.id || l.personName === hoveredUser.name
    );
    const totalAttempts = userLogs.length;
    const verifiedAttempts = userLogs.filter((l) => l.status === 'verified').length;
    const failedAttempts = userLogs.filter((l) => l.status === 'failed' || l.severity === 'error').length;
    const successRatio = totalAttempts > 0 ? Math.round((verifiedAttempts / totalAttempts) * 100) : 0;
    const recentLogs = [...userLogs].slice(-5).reverse();

    return {
      totalAttempts,
      verifiedAttempts,
      failedAttempts,
      successRatio,
      recentLogs,
    };
  }, [hoveredUser, normalizedLogs]);

  // Multi-Select Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLogs.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkStatusChange = (newStatus: 'verified' | 'failed' | 'flagged') => {
    if (!onUpdateLogs || selectedIds.length === 0) return;
    const updated = normalizedLogs.map((log) => {
      if (selectedIds.includes(log.id)) {
        return {
          ...log,
          status: newStatus,
          severity: newStatus === 'verified' ? ('info' as const) : newStatus === 'failed' ? ('error' as const) : ('warning' as const),
        };
      }
      return log;
    });
    onUpdateLogs(updated);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (!onUpdateLogs || selectedIds.length === 0) return;
    if (window.confirm(`Hapus ${selectedIds.length} log biometrik yang dipilih secara permanen?`)) {
      const updated = normalizedLogs.filter((log) => !selectedIds.includes(log.id));
      onUpdateLogs(updated);
      setSelectedIds([]);
    }
  };

  // Quarantine / Flag Suspicious Group
  const handleQuarantineSuspiciousGroup = (groupId: string) => {
    if (!onUpdateLogs) return;
    const updated = normalizedLogs.map((log) => {
      if (log.suspiciousGroupId === groupId) {
        return {
          ...log,
          status: 'flagged' as const,
          severity: 'warning' as const,
          failureReason: log.failureReason || log.suspiciousReason || 'Dikarantina oleh Admin karena indikasi mass-spoofing',
        };
      }
      return log;
    });
    onUpdateLogs(updated);
    setIncidentReportSuccessMsg('Berhasil mengkarantina semua rekaman pada grup anomali ini.');
    setTimeout(() => setIncidentReportSuccessMsg(null), 5000);
  };

  // Cleanup Old Logs (> 90 Days)
  const handleCleanupOldLogs = () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDateStr = getTodayDateString(ninetyDaysAgo);

    const oldLogs = normalizedLogs.filter((log) => log.date < cutoffDateStr);
    const activeLogs = normalizedLogs.filter((log) => log.date >= cutoffDateStr);

    if (oldLogs.length === 0) {
      alert('Tidak ada log biometrik yang lebih lama dari 90 hari untuk diarsipkan.');
      return;
    }

    if (
      window.confirm(
        `Ditemukan ${oldLogs.length} rekaman log yang lebih dari 90 hari. Arsipkan ke penyimpanan lokal dan bersihkan dari tabel utama?`
      )
    ) {
      try {
        const existingArchiveJson = localStorage.getItem('school_biometric_archive_compressed');
        const existingArchive: BiometricLog[] = existingArchiveJson ? JSON.parse(existingArchiveJson) : [];
        const mergedArchive = [...existingArchive, ...oldLogs];

        localStorage.setItem('school_biometric_archive_compressed', JSON.stringify(mergedArchive));

        if (onUpdateLogs) {
          onUpdateLogs(activeLogs);
        }

        setArchiveSuccessMsg(
          `Berhasil mengarsipkan ${oldLogs.length} rekaman log (> 90 hari) ke arsip lokal. Performa tabel kini optimal!`
        );
        setTimeout(() => setArchiveSuccessMsg(null), 6000);
      } catch (err) {
        alert('Gagal mengarsipkan log. Pastikan kapasitas penyimpanan browser mencukupi.');
      }
    }
  };

  // Export to standard CSV with GPS & Liveness forensic metadata
  const handleExportCSV = () => {
    const headers = [
      'ID Log',
      'Waktu (WITA)',
      'Tanggal',
      'Tingkat Urgensi (Severity)',
      'Nama Pengguna',
      'NIP/NISN',
      'Kategori',
      'Kelas/Mapel',
      'Status Verifikasi',
      'Indikasi Mass-Spoofing',
      'Skor Kemiripan (%)',
      'Ambang Batas Liveness / Match Threshold (%)',
      'Hasil Uji Liveness Sensor',
      'Status GPS Geofence',
      'Jarak GPS Aktual (Meter)',
      'Latitude GPS Upaya',
      'Longitude GPS Upaya',
      'Koordinat Pusat Sekolah Target',
      'Batas Radius Geofence (Meter)',
      'Arah Kamera',
      'Perangkat / IP',
      'Alasan Kegagalan / Keterangan',
      'Catatan Forensik / Anomali',
    ];

    const schoolTargetCoord = config ? `"${config.schoolLat}, ${config.schoolLng}"` : '"-1.8485, 124.4682"';
    const schoolMaxRadius = config?.maxRadiusMeters || 80;

    const rows = filteredLogs.map((l) => [
      l.id,
      l.time,
      l.date,
      (l.severity || 'info').toUpperCase(),
      `"${(l.personName || '').replace(/"/g, '""')}"`,
      `'${l.identifier || ''}`,
      l.personType === 'teacher' ? 'Guru/GTK' : 'Siswa',
      `"${(l.classOrSubject || '').replace(/"/g, '""')}"`,
      l.status.toUpperCase(),
      l.isSuspicious ? 'YA (SPOOF)' : 'TIDAK',
      l.matchScore,
      l.threshold || 80,
      l.livenessPassed ? 'Lolos (Liveness Valid)' : 'Gagal (Liveness Tidak Terpenuhi)',
      l.gpsPassed ? 'Dalam Radius' : 'Luar Radius',
      l.distanceMeter,
      l.latitude !== undefined ? l.latitude : '-',
      l.longitude !== undefined ? l.longitude : '-',
      schoolTargetCoord,
      schoolMaxRadius,
      l.cameraFacing === 'user' ? 'Kamera Depan' : 'Kamera Belakang',
      `"${(l.ipOrDevice || '-').replace(/"/g, '""')}"`,
      `"${(l.failureReason || 'Verifikasi Biometrik Valid').replace(/"/g, '""')}"`,
      `"${(l.suspiciousReason || '-').replace(/"/g, '""')}"`,
    ]);

    const csvBody = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    downloadCsv(`Biometric_Logs_Forensik_SMPN4_Taliabu_${startDate ? startDate + '_sd_' + (endDate || todayStr) : todayStr}`, csvBody);
  };

  // Specialized Incident Report Export (PDF & CSV)
  const handleTriggerIncidentReport = (format: 'pdf' | 'csv') => {
    const currentMonth = todayStr.substring(0, 7);
    const monthName = new Date().toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      month: 'long',
      year: 'numeric',
    });

    if (format === 'pdf') {
      generateBiometricIncidentReportPdf({
        logs: normalizedLogs,
        config,
        monthString: currentMonth,
        monthName,
      });
      setIncidentReportSuccessMsg(`Laporan Insiden Biometrik resmi (${monthName}) berhasil diunduh sebagai PDF.`);
    } else {
      exportBiometricIncidentReportCsv({
        logs: normalizedLogs,
        config,
        monthString: currentMonth,
        monthName,
      });
      setIncidentReportSuccessMsg(`Data CSV Laporan Insiden Biometrik (${monthName}) berhasil diekspor.`);
    }

    setTimeout(() => setIncidentReportSuccessMsg(null), 6000);
    setShowIncidentModal(false);
  };

  // Simulate attempt for troubleshooting testing
  const handleSimulateAttempt = (mode: 'success' | 'fail_match' | 'fail_gps' | 'spoof_collision') => {
    if (!handleAdd) return;
    setIsSimulating(true);

    setTimeout(() => {
      const now = new Date();
      const timeStr = formatTimeIndo(now);
      const dateStr = getTodayDateString(now);

      const sampleTeacher =
        safeTeachers.length > 0
          ? safeTeachers[Math.floor(Math.random() * safeTeachers.length)]
          : {
              id: 'tch_01',
              name: 'Dra. Sri Wahyuni, M.Pd.',
              nip: '198103152006042003',
              subject: 'Matematika Peminatan',
            };

      let newLog: BiometricLog;

      if (mode === 'success') {
        const score = +(94 + Math.random() * 5).toFixed(1);
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: sampleTeacher.id,
          personName: sampleTeacher.name,
          identifier: sampleTeacher.nip,
          personType: 'teacher',
          classOrSubject: sampleTeacher.subject,
          status: 'verified',
          severity: 'info',
          matchScore: score,
          threshold: 80,
          livenessPassed: true,
          gpsPassed: true,
          distanceMeter: Math.floor(10 + Math.random() * 25),
          latitude: config.schoolLat + (Math.random() - 0.5) * 0.0003,
          longitude: config.schoolLng + (Math.random() - 0.5) * 0.0003,
          cameraFacing: 'user',
          deviceId: 'front_cam_hd',
          photoThumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Samsung Galaxy A54 / Browser Mobile',
        };
      } else if (mode === 'fail_match') {
        const score = +(55 + Math.random() * 18).toFixed(1);
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: sampleTeacher.id,
          personName: sampleTeacher.name,
          identifier: sampleTeacher.nip,
          personType: 'teacher',
          classOrSubject: sampleTeacher.subject,
          status: 'failed',
          severity: 'error',
          matchScore: score,
          threshold: 80,
          livenessPassed: false,
          gpsPassed: true,
          distanceMeter: 24,
          latitude: config.schoolLat,
          longitude: config.schoolLng,
          cameraFacing: 'user',
          deviceId: 'front_cam_hd',
          failureReason: `Skor kemiripan wajah (${score}%) di bawah ambang batas resmi (80%). Citra buram atau pencahayaan minim.`,
          photoThumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Redmi Note 12 / Kamera Depan',
        };
      } else if (mode === 'spoof_collision') {
        // Generates identical mock coordinate to trigger mass-spoofing alert
        const spoofLat = config.schoolLat + 0.0045;
        const spoofLng = config.schoolLng + 0.0045;
        newLog = {
          id: `bio_sim_spoof_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: sampleTeacher.id,
          personName: sampleTeacher.name,
          identifier: sampleTeacher.nip,
          personType: 'teacher',
          classOrSubject: sampleTeacher.subject,
          status: 'flagged',
          severity: 'warning',
          matchScore: 88.5,
          threshold: 80,
          livenessPassed: true,
          gpsPassed: false,
          distanceMeter: 480,
          latitude: spoofLat,
          longitude: spoofLng,
          cameraFacing: 'user',
          deviceId: 'mock_gps_detector',
          failureReason: 'GPS terdeteksi di luar radius sekolah (480m) dengan koordinat identik multi-perangkat.',
          photoThumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Xiaomi Pad 6 / Mock Location Provider',
        };
      } else {
        newLog = {
          id: `bio_sim_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          date: dateStr,
          time: timeStr,
          personId: sampleTeacher.id,
          personName: sampleTeacher.name,
          identifier: sampleTeacher.nip,
          personType: 'teacher',
          classOrSubject: sampleTeacher.subject,
          status: 'flagged',
          severity: 'warning',
          matchScore: 93.4,
          threshold: 80,
          livenessPassed: true,
          gpsPassed: false,
          distanceMeter: 215,
          latitude: config.schoolLat + 0.0022,
          longitude: config.schoolLng + 0.0018,
          cameraFacing: 'user',
          deviceId: 'front_cam_hd',
          failureReason: 'GPS di luar geofencing sekolah. Terdeteksi berjarak 215m dari titik koordinat resmi SMPN 4 Satap Taliabu Barat.',
          photoThumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
          ipOrDevice: 'Google Pixel 7a / Luar Radius',
        };
      }

      if (onAddBiometricLog) {
        onAddBiometricLog(newLog);
      } else if (onAddLog) {
        onAddLog(newLog);
      }
      setIsSimulating(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Automated Mass-Spoofing & Collision Alert Banner */}
      {suspiciousGroups.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-rose-950 text-white rounded-3xl border-2 border-purple-500/80 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-purple-800/60">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-600 rounded-2xl shadow-md text-white animate-pulse shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-black tracking-wider uppercase border border-purple-400/40">
                    Sistem Anti-Spoofing & Geofence Collision
                  </span>
                  <span className="text-xs font-bold text-rose-300">
                    {suspiciousGroups.length} Grup Anomali Massal Terdeteksi
                  </span>
                </div>
                <h3 className="font-extrabold text-sm md:text-base mt-0.5 text-white">
                  Deteksi Upaya Mass-Spoofing & Koordinat / Timestamp Identik
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setStatusFilter('suspicious');
                  setSelectedSuspiciousGroupId(null);
                }}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Lihat Semua ({totalSuspiciousCount} Log Mencurigakan)
              </button>
            </div>
          </div>

          {/* Suspicious Groups List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suspiciousGroups.map((grp) => {
              const isSelectedGroup = selectedSuspiciousGroupId === grp.id;
              return (
                <div
                  key={grp.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelectedGroup
                      ? 'bg-purple-900/60 border-purple-400 shadow-md ring-1 ring-purple-400'
                      : 'bg-slate-900/80 border-purple-800/60 hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-purple-300">{grp.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {grp.description}
                      </p>
                    </div>
                  </div>

                  {/* Group Members Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-purple-800/40">
                    {grp.logs.map((item) => (
                      <span
                        key={item.id}
                        onClick={() => setSelectedLog(item)}
                        className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-purple-900/80 text-[11px] font-bold text-purple-200 border border-purple-700/60 cursor-pointer flex items-center space-x-1"
                        title={`Klik untuk audit: ${item.personName} (${item.time} WITA)`}
                      >
                        <User className="w-3 h-3 text-purple-400" />
                        <span>{item.personName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({item.time})</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 text-xs">
                    <button
                      onClick={() => {
                        setSelectedSuspiciousGroupId(isSelectedGroup ? null : grp.id);
                        setStatusFilter('all');
                      }}
                      className="text-purple-300 hover:text-white font-bold text-[11px] underline cursor-pointer"
                    >
                      {isSelectedGroup ? '✕ Batal Filter Grup' : '🔍 Filter Tabel ke Grup Ini'}
                    </button>

                    <button
                      onClick={() => handleQuarantineSuspiciousGroup(grp.id)}
                      className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer"
                    >
                      Karantina Grup Ini
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Automated Consecutive Failure Alert Trigger Banner */}
      {anomalyWarnings.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 rounded-3xl shadow-md animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-2xl shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-[10px] font-black uppercase rounded-md tracking-wider">
                    Peringatan Otomatis Administrator
                  </span>
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Deteksi Kegagalan Beruntun (Anti-Spoofing Trigger)
                  </span>
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  Sistem mendeteksi <strong>{anomalyWarnings.length} pengguna</strong> mengalami 3x atau lebih kegagalan otentikasi biometrik berturut-turut dalam rentang 5 menit:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {anomalyWarnings.map((w, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 shadow-2xs"
                    >
                      ⚠️ {w.personName} ({w.count}x gagal, terakhir {w.lastTime} WITA)
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('failed');
                setSeverityFilter('error');
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Investigasi Log Gagal
            </button>
          </div>
        </div>
      )}

      {/* Incident Report Success Alert */}
      {incidentReportSuccessMsg && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{incidentReportSuccessMsg}</span>
          </div>
          <button
            onClick={() => setIncidentReportSuccessMsg(null)}
            className="text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Archive Success Alert */}
      {archiveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{archiveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setArchiveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Otentikasi Biometrik Wajah & GPS Terverifikasi</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                Waktu Indonesia Tengah (WITA)
              </span>
              {totalSuspiciousCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-400/40 flex items-center space-x-1">
                  <Radio className="w-3.5 h-3.5 text-purple-400" />
                  <span>{totalSuspiciousCount} Mass-Spoof Terdeteksi</span>
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Biometric Logs & Troubleshooting Otentikasi
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Monitoring rekaman kecocokan wajah real-time, audit liveness test, dan pemetaan koordinat GPS{' '}
              <strong className="text-white">{config.schoolName}</strong> untuk memastikan integritas presensi ASN & Siswa.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Specialized Incident Report Export Trigger Button */}
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl flex items-center space-x-2 transition-all cursor-pointer shadow-md"
              title="Ekspor Ringkasan Laporan Insiden (Error & Warning Bulan Ini)"
            >
              <AlertTriangle className="w-4 h-4 text-rose-200" />
              <span>🚨 Laporan Insiden (Bulan Ini)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
              title="Unduh Data Log Biometrik sebagai CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Semua CSV</span>
            </button>

            <button
              onClick={handleCleanupOldLogs}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
              title="Arsipkan data log lebih dari 90 hari"
            >
              <Archive className="w-4 h-4 text-amber-400" />
              <span>Bersihkan Log &gt; 90 Hari</span>
            </button>

            {/* Simulation Controls */}
            <div className="flex items-center space-x-1 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/80">
              <button
                onClick={() => handleSimulateAttempt('success')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Lolos Verifikasi"
              >
                + Lolos
              </button>
              <button
                onClick={() => handleSimulateAttempt('fail_match')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Gagal Skor Rendah"
              >
                + Gagal
              </button>
              <button
                onClick={() => handleSimulateAttempt('spoof_collision')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 text-purple-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                title="Simulasi Upaya Mass Spoofing"
              >
                + Spoof
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card at Top: Total Events Today & Success-to-Failure Ratio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Upaya Hari Ini</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.todayTotal}{' '}
              <span className="text-xs font-normal text-slate-400 font-mono">({stats.total} total)</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Audit kamera depan WITA</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Rasio Keberhasilan</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.successRateToday}%
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-bold mt-0.5 block">
              {stats.todayVerified} Lolos / {stats.todayFailed} Gagal
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Gagal & Anomali</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.todayFailed}
            </div>
            <span className="text-[11px] text-rose-500 font-bold mt-0.5 block">
              Tingkat Kegagalan: {stats.failureRateToday}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Rerata Skor Match</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.avgScore}%</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Ambang Batas Resmi: 80%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 30-Day Visualization of Biometric Authentication Events */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Tren Upaya Otentikasi Biometrik (30 Hari Terakhir)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Analisis pola frekuensi verifikasi berhasil vs gagal per hari untuk monitoring stabilitas sistem.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold">Lolos (Verified)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold">Gagal / Error</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold">Suspicious Spoof</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '11px',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'verified' || name === 'Lolos Verifikasi') return [value, 'Lolos Verifikasi'];
                  if (name === 'failed' || name === 'Gagal / Error') return [value, 'Gagal / Error'];
                  if (name === 'suspicious' || name === 'Mass-Spoofing') return [value, 'Mass-Spoofing'];
                  return [value, name];
                }}
              />
              <Bar dataKey="verified" name="Lolos Verifikasi" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="failed" name="Gagal / Error" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="suspicious" name="Mass-Spoofing" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search, Date Range Picker & Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Date Range Picker & Quick Presets Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                Rentang Waktu & Periode Forensik
              </span>
              <span className="text-[10px] text-slate-400">
                Filter rekaman biometrik berdasarkan rentang tanggal
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Presets */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSetDatePreset('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  datePreset === 'all' && !startDate && !endDate
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('today')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('last7')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  datePreset === 'last7'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('last30')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  datePreset === 'last30'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                30 Hari
              </button>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center space-x-1.5 text-xs">
              <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold focus:outline-hidden"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('all')}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                  title="Reset Filter Tanggal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pengguna, NIP, NISN, rombel, atau alasan kegagalan..."
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
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedSuspiciousGroupId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' && selectedSuspiciousGroupId === null
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => {
                  setStatusFilter('verified');
                  setSelectedSuspiciousGroupId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'verified'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                }`}
              >
                ✓ Sukses (Lolos)
              </button>
              <button
                onClick={() => {
                  setStatusFilter('failed');
                  setSelectedSuspiciousGroupId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                }`}
              >
                ✕ Gagal (Anomali)
              </button>
              <button
                onClick={() => {
                  setStatusFilter('flagged');
                  setSelectedSuspiciousGroupId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'flagged'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                }`}
              >
                ⚠ Warning
              </button>
              <button
                onClick={() => {
                  setStatusFilter('suspicious');
                  setSelectedSuspiciousGroupId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'suspicious'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                }`}
              >
                🚨 Suspicious ({totalSuspiciousCount})
              </button>
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Severity</option>
              <option value="info">🟢 Info (Aman)</option>
              <option value="warning">🟡 Warning (GPS/Radius)</option>
              <option value="error">🔴 Error (Gagal/Spoof)</option>
            </select>

            {/* Person Type Filter */}
            <select
              value={personTypeFilter}
              onChange={(e) => setPersonTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="teacher">Guru & GTK</option>
              <option value="student">Siswa</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(selectedTimelineHour !== null || selectedSuspiciousGroupId !== null || startDate || endDate) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-500">Filter Aktif:</span>
            {(startDate || endDate) && (
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {startDate ? formatDateIndo(startDate) : 'Awal'} s/d {endDate ? formatDateIndo(endDate) : 'Sekarang'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('all')}
                  className="text-indigo-600 hover:text-indigo-900 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTimelineHour !== null && (
              <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-xl font-bold flex items-center space-x-1">
                <span>Jam: {String(selectedTimelineHour).padStart(2, '0')}:00 WITA</span>
                <button
                  onClick={() => setSelectedTimelineHour(null)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSuspiciousGroupId !== null && (
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-xl font-bold flex items-center space-x-1">
                <span>Grup Suspicious: {selectedSuspiciousGroupId}</span>
                <button
                  onClick={() => setSelectedSuspiciousGroupId(null)}
                  className="text-purple-600 hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Biometric Logs Table with Checkboxes, Severity Tag, and Quick User Profile Hover */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Riwayat Upaya Otentikasi Biometrik ({filteredLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Klik baris untuk audit rincian & peta GPS
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Tidak Ada Log Biometrik</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Belum ada data rekaman otentikasi wajah yang sesuai dengan filter atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredLogs.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Waktu (WITA)</th>
                  <th className="py-3.5 px-4">Severity & Deteksi</th>
                  <th className="py-3.5 px-4">Pengguna (Arahkan Kursor)</th>
                  <th className="py-3.5 px-4">Perangkat / Kamera</th>
                  <th className="py-3.5 px-4">Skor Kemiripan</th>
                  <th className="py-3.5 px-4">Status & Alasan</th>
                  <th className="py-3.5 px-4">GPS Geofence</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogs.map((log) => {
                  const isFailed = log.status === 'failed' || log.severity === 'error' || !log.livenessPassed || !log.gpsPassed;
                  const isSuspicious = log.isSuspicious === true;
                  const isSelected = selectedIds.includes(log.id);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-all duration-300 ${
                        isSuspicious
                          ? 'bg-purple-50/90 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 border-l-4 border-l-purple-600 ring-1 ring-purple-400/40'
                          : isFailed
                          ? 'bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-l-4 border-l-rose-600 ring-1 ring-rose-400/50 shadow-xs animate-[pulse_3s_ease-in-out_infinite]'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      } ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4" onClick={(e) => handleToggleSelect(log.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{log.time} WITA</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.date}</div>
                      </td>

                      {/* Severity Tag & Suspicious Flag */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1 items-start">
                          {isSuspicious && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 animate-pulse">
                              🚨 Suspicious Spoof
                            </span>
                          )}
                          {isFailed ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-700 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                              <span>🔴 Error / Anomali</span>
                            </span>
                          ) : log.severity === 'warning' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              🟡 Warning
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              🟢 Info
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Person Info with Hover Card Trigger */}
                      <td
                        className="py-3.5 px-4"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPos({ x: rect.left, y: rect.bottom + 6 });
                          setHoveredUser({ id: log.personId, name: log.personName, type: log.personType });
                        }}
                        onMouseLeave={() => {
                          setHoveredUser(null);
                          setHoverPos(null);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <img
                              src={
                                log.photoThumbnail ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                              }
                              alt={log.personName}
                              referrerPolicy="no-referrer"
                              className={`w-9 h-9 rounded-xl object-cover border shrink-0 ${
                                isFailed
                                  ? 'border-rose-400 ring-2 ring-rose-400/50'
                                  : 'border-slate-200 dark:border-slate-700'
                              }`}
                            />
                            {isFailed && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping"></span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white truncate hover:underline hover:text-indigo-600">
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
                          <span className="truncate max-w-[140px]">{log.ipOrDevice || 'Kamera Web'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {log.cameraFacing === 'user' ? '✓ Kamera Depan' : '⚠ Kamera Belakang'}
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
                      <td className="py-3.5 px-4">
                        {log.status === 'verified' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terverifikasi</span>
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Gagal</span>
                          </span>
                        )}
                        {log.status === 'flagged' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Radius Anomali</span>
                          </span>
                        )}
                        {log.suspiciousReason ? (
                          <p className="text-[10px] text-purple-700 dark:text-purple-300 font-bold max-w-[220px] truncate mt-0.5" title={log.suspiciousReason}>
                            ⚡ {log.suspiciousReason}
                          </p>
                        ) : log.failureReason ? (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[200px] truncate mt-0.5" title={log.failureReason}>
                            {log.failureReason}
                          </p>
                        ) : null}
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
                          {log.gpsPassed ? '< 80m (Valid)' : 'Di Luar Radius'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center space-x-1 mx-auto transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Horizontal Timeline View Component Below the Table */}
      <BiometricTimelineScrubber
        logs={normalizedLogs}
        selectedHour={selectedTimelineHour}
        onSelectHour={(hour) => setSelectedTimelineHour(hour)}
        onSelectLog={(log) => setSelectedLog(log)}
        selectedDate={todayStr}
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-4 z-40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span>Log Terpilih</span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkStatusChange('verified')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Set Terverifikasi
            </button>
            <button
              onClick={() => handleBulkStatusChange('flagged')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Set Peringatan
            </button>
            <button
              onClick={() => handleBulkStatusChange('failed')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Set Gagal
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/80 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Incident Report Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Ekspor Laporan Insiden Biometrik Resmi
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Bulan Berjalan ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">
                Dokumen ini secara otomatis menyaring rekaman dengan klasifikasi:
              </p>
              <ul className="space-y-1.5 pl-2 text-slate-600 dark:text-slate-300 text-[11px]">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>
                    <strong>Severity Error & Gagal:</strong> Skor kecocokan rendah atau gagal liveness.
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    <strong>Severity Warning:</strong> Pelanggaran geofence radius &gt; 80 meter.
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span>
                    <strong>Suspicious Spoof:</strong> Timestamp serentak & koordinat GPS identik multi-user.
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleTriggerIncidentReport('pdf')}
                className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer shadow-md"
              >
                <FileText className="w-5 h-5 text-white" />
                <span>Unduh PDF Resmi</span>
                <span className="text-[10px] font-normal text-rose-200">KOP Sekolah & TTD</span>
              </button>

              <button
                onClick={() => handleTriggerIncidentReport('csv')}
                className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer shadow-md"
              >
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <span>Ekspor CSV Audit</span>
                <span className="text-[10px] font-normal text-emerald-200">Format Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick User Profile Hover Card Popover */}
      {hoveredUser && hoverPos && hoveredUserStats && (
        <div
          style={{ top: `${hoverPos.y}px`, left: `${Math.min(hoverPos.x, window.innerWidth - 320)}px` }}
          className="fixed z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                {hoveredUser.name}
              </h5>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {hoveredUser.type === 'teacher' ? 'Guru / Tenaga Pendidik' : 'Peserta Didik'}
              </p>
            </div>
          </div>

          {/* Success vs Failure Stats */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                Lolos Verifikasi
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                {hoveredUserStats.verifiedAttempts}
              </span>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold block">
                Gagal Otentikasi
              </span>
              <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                {hoveredUserStats.failedAttempts}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Tingkat Keberhasilan:</span>
              <span className={hoveredUserStats.successRatio >= 80 ? 'text-emerald-600' : 'text-rose-600'}>
                {hoveredUserStats.successRatio}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${hoveredUserStats.successRatio >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${hoveredUserStats.successRatio}%` }}
              />
            </div>
          </div>

          {/* Recent 5 attempts badges */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Riwayat Terakhir:</span>
            <div className="flex items-center space-x-1">
              {hoveredUserStats.recentLogs.map((rl, idx) => (
                <span
                  key={idx}
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                    rl.isSuspicious
                      ? 'bg-purple-600 text-white'
                      : rl.status === 'verified'
                      ? 'bg-emerald-500 text-white'
                      : rl.status === 'failed'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                  title={`${rl.date} ${rl.time}: ${rl.isSuspicious ? 'Suspicious Spoof' : rl.status}`}
                >
                  {rl.isSuspicious ? '🚨' : rl.status === 'verified' ? '✓' : rl.status === 'failed' ? '✕' : '⚠'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Detail Modal with Full Metadata & Leaflet Map View */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Audit Snapshot, Diagnostik & Peta Geofencing
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
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Bounding Box Stamp */}
                  <div className="absolute inset-8 border-2 border-indigo-400 rounded-3xl pointer-events-none flex items-center justify-center">
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/85 backdrop-blur-md rounded text-[10px] text-cyan-300 font-mono font-bold">
                      Face Match: {selectedLog.matchScore}%
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl text-white text-[11px] font-mono flex items-center justify-between border border-slate-700">
                    <div>
                      <span className="font-bold">{selectedLog.personName}</span>
                      <span className="text-slate-400 block text-[10px]">
                        {selectedLog.identifier} • {selectedLog.classOrSubject}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        selectedLog.isSuspicious
                          ? 'bg-purple-600 text-white'
                          : selectedLog.status === 'verified'
                          ? 'bg-emerald-500 text-white'
                          : selectedLog.status === 'failed'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {selectedLog.isSuspicious ? 'SUSPICIOUS' : selectedLog.status}
                    </span>
                  </div>
                </div>

                {/* Leaflet-based Map View */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Verifikasi Koordinat Geofence (Leaflet)</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        selectedLog.gpsPassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Jarak: {selectedLog.distanceMeter}m
                    </span>
                  </div>

                  <BiometricLeafletMap
                    schoolLat={config.schoolLat}
                    schoolLng={config.schoolLng}
                    schoolName={config.schoolName}
                    maxRadiusMeters={config.maxRadiusMeters || 80}
                    attemptLat={selectedLog.latitude}
                    attemptLng={selectedLog.longitude}
                    attemptName={selectedLog.personName}
                    distanceMeters={selectedLog.distanceMeter}
                    isPassed={selectedLog.gpsPassed}
                    status={selectedLog.status}
                    severity={selectedLog.severity}
                    isSuspicious={selectedLog.isSuspicious}
                    failureReason={selectedLog.failureReason || selectedLog.suspiciousReason}
                    matchScore={selectedLog.matchScore}
                    threshold={selectedLog.threshold || 80}
                  />
                  <p className="text-[10px] text-slate-400 text-center">
                    Titik Sekolah: Desa Pancoran ({config.schoolLat}, {config.schoolLng})
                  </p>
                </div>
              </div>

              {/* Diagnostic Parameters Grid & Metadata */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-3 text-xs">
                <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Parameter Verifikasi & Metadata Perangkat</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {selectedLog.date} {selectedLog.time} WITA
                  </span>
                </h5>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Skor Kemiripan Wajah</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.matchScore}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Ambang: {selectedLog.threshold}%</span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Radius Geofencing</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.distanceMeter} meter
                    </span>
                    <span
                      className={`text-[10px] font-bold block mt-0.5 ${
                        selectedLog.gpsPassed ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {selectedLog.gpsPassed ? '✓ Dalam Radius' : '✕ Di Luar Radius'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Uji Liveness & Sensor</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedLog.livenessPassed ? 'Lolos' : 'Gagal'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {selectedLog.cameraFacing === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Informasi Perangkat</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                      {selectedLog.ipOrDevice || 'Browser Mobile'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Tingkat Severity</span>
                    <span
                      className={`font-black text-xs uppercase block ${
                        selectedLog.isSuspicious
                          ? 'text-purple-600'
                          : selectedLog.severity === 'error'
                          ? 'text-rose-600'
                          : selectedLog.severity === 'warning'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {selectedLog.isSuspicious ? 'SUSPICIOUS (SPOOF)' : selectedLog.severity || 'info'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Zona Waktu</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block font-mono">
                      WITA (Asia/Makassar)
                    </span>
                  </div>
                </div>

                {selectedLog.suspiciousReason && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
                    <span className="font-bold text-purple-800 dark:text-purple-300 text-[11px] block">
                      Indikasi Anomali Mass-Spoofing / Collision:
                    </span>
                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                      {selectedLog.suspiciousReason}
                    </p>
                  </div>
                )}

                {selectedLog.failureReason && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                    <span className="font-bold text-rose-800 dark:text-rose-300 text-[11px] block">
                      Analisis Kendala / Alasan Penolakan:
                    </span>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                      {selectedLog.failureReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">ID: {selectedLog.id}</span>
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
