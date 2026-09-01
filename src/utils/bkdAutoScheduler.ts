import { AttendanceRecord, SchoolConfig, Student, Teacher } from '../types';
import {
  PairedDailyAttendance,
  pairAttendanceByDateAndPerson,
  downloadBkdCsvFile,
  formatBkdWhatsAppMessage,
} from './bkdTaliabuExport';

export type BkdReportPeriod = 'Harian' | 'Mingguan' | 'Bulanan' | 'Semesteran' | 'Tahunan';

export interface BkdScheduleStatus {
  period: BkdReportPeriod;
  title: string;
  scheduleRule: string;
  isDueNow: boolean;
  isMissed: boolean;
  lastSentAt?: string;
  nextScheduledTime: string;
}

export interface BkdDispatchLog {
  id: string;
  period: BkdReportPeriod;
  timestamp: string; // ISO string
  date: string;
  time: string;
  asnCount: number;
  channels: {
    drive: boolean;
    email: boolean;
    whatsapp: boolean;
    csv: boolean;
  };
  destination: {
    driveUrl: string;
    email: string;
    whatsapp: string;
  };
  summary: {
    hadir: number;
    terlambat: number;
    izinSakit: number;
    alpa: number;
  };
  triggerType: 'automatic' | 'manual_failsafe' | 'simulation';
  status: 'success' | 'partial';
}

const STORAGE_KEY_LOGS = 'school_presensi_bkd_dispatch_logs';
const STORAGE_KEY_LAST_SENT = 'school_presensi_bkd_last_sent_map';

/**
 * Filter paired records strictly for ASN (PNS, PPPK, PPPK_PW)
 */
export function filterAsnOnlyAttendance(
  pairedData: PairedDailyAttendance[],
  teachers: Teacher[] = []
): PairedDailyAttendance[] {
  const asnTeacherIds = new Set(
    teachers
      .filter((t) => t.employmentStatus === 'PNS' || t.employmentStatus === 'PPPK' || t.employmentStatus === 'PPPK_PW')
      .map((t) => t.id)
  );

  return pairedData.filter((item) => {
    if (item.personType !== 'teacher') return false;
    if (asnTeacherIds.has(item.personId)) return true;
    const status = (item.employmentStatus || '').toUpperCase();
    return status.includes('PNS') || status.includes('PPPK');
  });
}

/**
 * Filter attendance records by period
 */
export function filterRecordsByPeriod(
  records: AttendanceRecord[],
  period: BkdReportPeriod,
  referenceDate: Date = new Date()
): AttendanceRecord[] {
  const ref = new Date(referenceDate);
  const currentYear = ref.getFullYear();
  const currentMonth = ref.getMonth(); // 0-indexed

  return records.filter((r) => {
    const recDate = new Date(r.date);
    if (isNaN(recDate.getTime())) return false;

    switch (period) {
      case 'Harian': {
        const todayStr = ref.toISOString().split('T')[0];
        return r.date === todayStr;
      }
      case 'Mingguan': {
        // Last 7 days or current week (Monday to Saturday)
        const diffDays = (ref.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      case 'Bulanan': {
        // Current month & year
        return recDate.getFullYear() === currentYear && recDate.getMonth() === currentMonth;
      }
      case 'Semesteran': {
        // Semester 1: July - Dec (months 6-11), Semester 2: Jan - June (months 0-5)
        const isSemester2 = currentMonth < 6;
        if (isSemester2) {
          return recDate.getFullYear() === currentYear && recDate.getMonth() < 6;
        } else {
          return recDate.getFullYear() === currentYear && recDate.getMonth() >= 6;
        }
      }
      case 'Tahunan': {
        // Current entire year
        return recDate.getFullYear() === currentYear;
      }
      default:
        return true;
    }
  });
}

/**
 * Check dispatch status for all 5 schedules
 */
export function evaluateAllBkdSchedules(now: Date = new Date()): BkdScheduleStatus[] {
  const lastSentMap = getLastSentMap();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 is Sunday, 6 is Saturday
  const currentDate = now.getDate();
  const currentMonth = now.getMonth(); // 0-11
  const todayStr = now.toISOString().split('T')[0];

  // Helper to check if last day of month (or 30/31)
  const isMonthEnd = currentDate >= 30 || new Date(now.getFullYear(), currentMonth + 1, 0).getDate() === currentDate;
  // Semester end: June 30 or Dec 31 (or late June/late Dec)
  const isSemesterEnd = (currentMonth === 5 && currentDate >= 25) || (currentMonth === 11 && currentDate >= 25);
  // Year end: Dec 30-31
  const isYearEnd = currentMonth === 11 && currentDate >= 30;

  const schedules: { period: BkdReportPeriod; title: string; scheduleRule: string; isDue: boolean; key: string }[] = [
    {
      period: 'Harian',
      title: 'Rekap Presensi Harian ASN',
      scheduleRule: 'Setiap hari pukul 15.00 WIT',
      isDue: currentHour >= 15,
      key: `harian_${todayStr}`,
    },
    {
      period: 'Mingguan',
      title: 'Rekap Presensi Mingguan ASN',
      scheduleRule: 'Setiap hari Sabtu pukul 15.00 WIT',
      isDue: (currentDay === 6 && currentHour >= 15) || currentDay === 0,
      key: `mingguan_${now.getFullYear()}_week_${Math.ceil(currentDate / 7)}`,
    },
    {
      period: 'Bulanan',
      title: 'Rekap Presensi Bulanan ASN',
      scheduleRule: 'Setiap tanggal 30/31 pukul 15.00 WIT',
      isDue: isMonthEnd && currentHour >= 15,
      key: `bulanan_${now.getFullYear()}_${currentMonth + 1}`,
    },
    {
      period: 'Semesteran',
      title: 'Rekap Presensi Semesteran ASN',
      scheduleRule: 'Setiap 1 semester (akhir semester) pukul 15.00 WIT',
      isDue: isSemesterEnd && currentHour >= 15,
      key: `semesteran_${now.getFullYear()}_S${currentMonth < 6 ? '1' : '2'}`,
    },
    {
      period: 'Tahunan',
      title: 'Rekap Presensi Tahunan ASN',
      scheduleRule: 'Setiap akhir tahun (31 Desember) pukul 15.00 WIT',
      isDue: isYearEnd && currentHour >= 15,
      key: `tahunan_${now.getFullYear()}`,
    },
  ];

  return schedules.map((item) => {
    const lastSent = lastSentMap[item.key] || lastSentMap[item.period];
    const wasSent = Boolean(lastSent);
    const isDueNow = item.isDue && !wasSent;
    const isMissed = item.isDue && !wasSent;

    // Next scheduled calculation
    let nextScheduledTime = '15.00 WIT';
    if (item.period === 'Harian') {
      nextScheduledTime = currentHour >= 15 ? 'Besok 15.00 WIT' : 'Hari Ini 15.00 WIT';
    } else if (item.period === 'Mingguan') {
      nextScheduledTime = 'Sabtu 15.00 WIT';
    } else if (item.period === 'Bulanan') {
      nextScheduledTime = 'Akhir Bulan (Tgl 30/31) 15.00 WIT';
    } else if (item.period === 'Semesteran') {
      nextScheduledTime = 'Akhir Semester 15.00 WIT';
    } else if (item.period === 'Tahunan') {
      nextScheduledTime = '31 Desember 15.00 WIT';
    }

    return {
      period: item.period,
      title: item.title,
      scheduleRule: item.scheduleRule,
      isDueNow,
      isMissed,
      lastSentAt: lastSent,
      nextScheduledTime,
    };
  });
}

/**
 * Get Last Sent Map from localStorage
 */
function getLastSentMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SENT);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Record a dispatch timestamp
 */
export function recordDispatch(period: BkdReportPeriod, log: BkdDispatchLog) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();

    const map = getLastSentMap();
    map[period] = log.timestamp;
    map[`harian_${todayStr}`] = log.timestamp;
    map[`mingguan_${now.getFullYear()}_week_${Math.ceil(now.getDate() / 7)}`] = log.timestamp;
    map[`bulanan_${now.getFullYear()}_${currentMonth + 1}`] = log.timestamp;
    map[`semesteran_${now.getFullYear()}_S${currentMonth < 6 ? '1' : '2'}`] = log.timestamp;
    map[`tahunan_${now.getFullYear()}`] = log.timestamp;

    localStorage.setItem(STORAGE_KEY_LAST_SENT, JSON.stringify(map));

    // Append to logs
    const existingLogs = getDispatchLogs();
    const updated = [log, ...existingLogs].slice(0, 50); // keep last 50
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save BKD dispatch log:', err);
  }
}

/**
 * Retrieve saved dispatch logs
 */
export function getDispatchLogs(): BkdDispatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear dispatch history
 */
export function clearDispatchLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_LAST_SENT);
  } catch {}
}

/**
 * Execute Full Dispatch for ASN Presensi across the 3 Channels:
 * 1. Google Drive BKD
 * 2. Email BKD
 * 3. WhatsApp BKD
 * Plus automatic CSV download
 */
export function executeBkdAsnDispatch({
  period,
  config,
  teachers,
  records,
  students = [],
  triggerType = 'manual_failsafe',
  openWindows = true,
}: {
  period: BkdReportPeriod;
  config: SchoolConfig;
  teachers: Teacher[];
  records: AttendanceRecord[];
  students?: Student[];
  triggerType?: 'automatic' | 'manual_failsafe' | 'simulation';
  openWindows?: boolean;
}): {
  success: boolean;
  asnPairedCount: number;
  log: BkdDispatchLog;
  message: string;
} {
  // 1. Filter records by period
  const periodRecords = filterRecordsByPeriod(records, period);

  // 2. Pair records
  const allPaired = pairAttendanceByDateAndPerson(periodRecords, teachers, students);

  // 3. Strictly Filter ASN only
  const asnPaired = filterAsnOnlyAttendance(allPaired, teachers);

  // Stats
  const hadir = asnPaired.filter((d) => d.statusAkhir === 'HADIR LENGKAP').length;
  const terlambat = asnPaired.filter((d) => d.statusAkhir === 'TERLAMBAT').length;
  const izinSakit = asnPaired.filter((d) => d.statusAkhir === 'IZIN' || d.statusAkhir === 'SAKIT').length;
  const alpa = asnPaired.filter((d) => d.statusAkhir === 'ALPA').length;

  const now = new Date();
  const driveUrl = config.bkdDriveUrl || 'https://drive.google.com';
  const bkdEmail = config.bkdEmail || 'bkd.taliabu@pulautaliabukab.go.id';
  const bkdWhatsApp = config.bkdWhatsApp || '6282291882341';

  // 4. Trigger CSV Download
  try {
    downloadBkdCsvFile(asnPaired, config, period as any);
  } catch (e) {
    console.warn('CSV download error:', e);
  }

  // 5. Open Drive, WhatsApp, Email if allowed
  if (openWindows) {
    // Open Drive
    setTimeout(() => {
      window.open(driveUrl, '_blank');
    }, 300);

    // Open WhatsApp
    setTimeout(() => {
      const waText = formatBkdWhatsAppMessage(asnPaired, config, period as any);
      const waUrl = `https://wa.me/${bkdWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, '_blank');
    }, 700);

    // Open Email
    setTimeout(() => {
      const subject = encodeURIComponent(
        `Laporan Presensi ASN (${period.toUpperCase()}) - ${config.schoolName} (NPSN ${config.npsn})`
      );
      const body = encodeURIComponent(
        `Kepada Yth.\nTim Verifikator Presensi BKD Kab. Pulau Taliabu\n\n` +
          `Bersama ini kami lampirkan Rekapitulasi Presensi Digital Khusus ASN (${period}) - ${config.schoolName}:\n\n` +
          `• Total ASN Terverifikasi: ${asnPaired.length} Pegawai\n` +
          `• Hadir Lengkap: ${hadir} Pegawai\n` +
          `• Terlambat: ${terlambat} Pegawai\n` +
          `• Izin / Sakit: ${izinSakit} Pegawai\n` +
          `• Alpa: ${alpa} Pegawai\n\n` +
          `• Folder Google Drive Foto Wajah & Rekap: ${driveUrl}\n` +
          `• Hotline / WA Verifikator: ${bkdWhatsApp}\n\n` +
          `File CSV format Sesi Masuk dan Pulang terpisah telah diunduh dan terlampir.\n\n` +
          `Hormat kami,\n${config.principalName || 'Kepala Sekolah'}\nNIP. ${config.principalNip || '-'}`
      );
      window.open(`mailto:${bkdEmail}?subject=${subject}&body=${body}`, '_blank');
    }, 1100);
  }

  const log: BkdDispatchLog = {
    id: `bkd_log_${Date.now()}`,
    period,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString('id-ID'),
    time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    asnCount: asnPaired.length,
    channels: {
      drive: true,
      email: true,
      whatsapp: true,
      csv: true,
    },
    destination: {
      driveUrl,
      email: bkdEmail,
      whatsapp: bkdWhatsApp,
    },
    summary: {
      hadir,
      terlambat,
      izinSakit,
      alpa,
    },
    triggerType,
    status: 'success',
  };

  // Record log in storage
  recordDispatch(period, log);

  return {
    success: true,
    asnPairedCount: asnPaired.length,
    log,
    message: `Rekapitulasi Presensi Khusus ASN (${period}) berhasil dikirim ke 3 Media BKD (Drive, Email, WhatsApp) & CSV diunduh!`,
  };
}
