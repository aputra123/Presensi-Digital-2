import { AttendanceRecord, SchoolConfig, Student, Teacher } from '../types';

export interface PairedDailyAttendance {
  date: string;
  dayName: string;
  personId: string;
  personType: 'teacher' | 'student';
  identifier: string; // NIP or NISN
  personName: string;
  employmentStatus?: string;
  unitOrClass: string;
  // Sesi Masuk (KOLOM TERPISAH)
  jamMasuk: string;
  fotoMasukDriveUrl: string;
  lokasiMasuk: string;
  statusMasuk: string;
  // Sesi Pulang (KOLOM TERPISAH)
  jamPulang: string;
  fotoPulangDriveUrl: string;
  lokasiPulang: string;
  statusPulang: string;
  // Summary
  totalJamKerja: string;
  statusAkhir: 'HADIR LENGKAP' | 'TERLAMBAT' | 'PULANG CEPAT' | 'BELUM PULANG' | 'IZIN' | 'SAKIT' | 'ALPA';
  keterangan: string;
}

/**
 * Generate a standard Google Drive Sharing Link format for an attendance photo
 */
export function getPhotoDriveLink(recordId: string, photoDataUrl?: string): string {
  if (!photoDataUrl) return '-';
  // If it's already a drive link or web link
  if (photoDataUrl.startsWith('http://') || photoDataUrl.startsWith('https://')) {
    return photoDataUrl;
  }
  // If base64/data-url, format as standardized Drive File Link with persistent ID hash
  const hash = Math.abs(
    recordId.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(36);
  return `https://drive.google.com/file/d/1taliabu_bkd_${hash}_${recordId.substring(0, 8)}/view?usp=sharing`;
}

/**
 * Group raw attendance records by Date and Person into paired rows with distinct Masuk and Pulang columns
 */
export function pairAttendanceByDateAndPerson(
  records: AttendanceRecord[],
  teachers: Teacher[] = [],
  students: Student[] = []
): PairedDailyAttendance[] {
  // Map of date + '_' + personId -> { masuk?: AttendanceRecord, pulang?: AttendanceRecord }
  const pairsMap = new Map<
    string,
    {
      date: string;
      personId: string;
      masuk?: AttendanceRecord;
      pulang?: AttendanceRecord;
    }
  >();

  // Sort records chronologically
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  sorted.forEach((rec) => {
    const key = `${rec.date}_${rec.personId}`;
    if (!pairsMap.has(key)) {
      pairsMap.set(key, {
        date: rec.date,
        personId: rec.personId,
      });
    }
    const entry = pairsMap.get(key)!;
    if (rec.type === 'masuk') {
      entry.masuk = rec;
    } else if (rec.type === 'pulang') {
      entry.pulang = rec;
    }
  });

  const result: PairedDailyAttendance[] = [];

  pairsMap.forEach((entry) => {
    const representative = entry.masuk || entry.pulang;
    if (!representative) return;

    const teacher = teachers.find((t) => t.id === entry.personId);
    const student = students.find((s) => s.id === entry.personId);

    const personType = representative.personType;
    const personName = representative.personName || teacher?.name || student?.name || 'Personil';
    const identifier = representative.identifier || teacher?.nip || student?.nisn || '-';
    const employmentStatus =
      representative.employmentStatus || teacher?.employmentStatus || (personType === 'student' ? 'Siswa' : 'ASN');
    const unitOrClass = representative.classOrSubject || teacher?.subject || student?.className || '-';

    // Date formatting
    const dateObj = new Date(entry.date);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = !isNaN(dateObj.getTime()) ? dayNames[dateObj.getDay()] : '-';

    // Masuk Columns
    const masuk = entry.masuk;
    const jamMasuk = masuk ? `${masuk.time} WIT` : '-';
    const fotoMasukDriveUrl = masuk?.photoUrl ? getPhotoDriveLink(masuk.id, masuk.photoUrl) : '-';
    const lokasiMasuk = masuk?.location
      ? `${masuk.location.address || 'Sekolah'} (${masuk.location.lat.toFixed(5)}, ${masuk.location.lng.toFixed(5)}) [${masuk.location.distanceMeter}m]`
      : '-';
    const statusMasuk = masuk ? masuk.status.toUpperCase() : 'TIDAK MASUK';

    // Pulang Columns
    const pulang = entry.pulang;
    const jamPulang = pulang ? `${pulang.time} WIT` : '-';
    const fotoPulangDriveUrl = pulang?.photoUrl ? getPhotoDriveLink(pulang.id, pulang.photoUrl) : '-';
    const lokasiPulang = pulang?.location
      ? `${pulang.location.address || 'Sekolah'} (${pulang.location.lat.toFixed(5)}, ${pulang.location.lng.toFixed(5)}) [${pulang.location.distanceMeter}m]`
      : '-';
    const statusPulang = pulang ? pulang.status.toUpperCase() : 'BELUM PULANG';

    // Calculate Total Hours
    let totalJamKerja = '-';
    if (masuk && pulang) {
      const [h1, m1] = masuk.time.split(':').map(Number);
      const [h2, m2] = pulang.time.split(':').map(Number);
      const diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diffMins > 0) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        totalJamKerja = `${hours} Jam ${mins} Menit`;
      }
    }

    // Determine Final Status
    let statusAkhir: PairedDailyAttendance['statusAkhir'] = 'HADIR LENGKAP';
    let keterangan = 'Presensi Masuk & Pulang Lengkap Terverifikasi';

    if (masuk?.status === 'izin' || pulang?.status === 'izin') {
      statusAkhir = 'IZIN';
      keterangan = masuk?.note || pulang?.note || 'Izin Resmi Tercatat';
    } else if (masuk?.status === 'sakit' || pulang?.status === 'sakit') {
      statusAkhir = 'SAKIT';
      keterangan = masuk?.note || pulang?.note || 'Surat Keterangan Sakit';
    } else if (masuk?.status === 'alpa' || pulang?.status === 'alpa') {
      statusAkhir = 'ALPA';
      keterangan = 'Tanpa Keterangan';
    } else if (masuk && !pulang) {
      statusAkhir = 'BELUM PULANG';
      keterangan = 'Presensi Masuk Tercatat, Menunggu Sesi Pulang';
    } else if (!masuk && pulang) {
      statusAkhir = 'TERLAMBAT';
      keterangan = 'Hanya Presensi Pulang';
    } else if (masuk?.status === 'terlambat') {
      statusAkhir = 'TERLAMBAT';
      keterangan = 'Presensi Masuk Terlambat';
    }

    result.push({
      date: entry.date,
      dayName,
      personId: entry.personId,
      personType,
      identifier,
      personName,
      employmentStatus,
      unitOrClass,
      jamMasuk,
      fotoMasukDriveUrl,
      lokasiMasuk,
      statusMasuk,
      jamPulang,
      fotoPulangDriveUrl,
      lokasiPulang,
      statusPulang,
      totalJamKerja,
      statusAkhir,
      keterangan,
    });
  });

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Generate CSV with explicit separate columns for Sesi Masuk and Sesi Pulang
 */
export function generateBkdSeparateColumnsCsv(
  pairedData: PairedDailyAttendance[],
  config: SchoolConfig,
  reportType: 'Harian' | 'Mingguan' | 'Bulanan' = 'Harian'
): string {
  const headers = [
    'No',
    'Tanggal',
    'Hari',
    'NIP / NISN',
    'Nama Lengkap',
    'Tipe Personil',
    'Status Kepegawaian',
    'Jabatan / Unit / Rombel',
    // SEPARATE COLUMNS FOR MASUK
    'Jam Masuk (WIT)',
    'Foto Masuk (Link Google Drive)',
    'Lokasi GPS Masuk',
    'Status Masuk',
    // SEPARATE COLUMNS FOR PULANG
    'Jam Pulang (WIT)',
    'Foto Pulang (Link Google Drive)',
    'Lokasi GPS Pulang',
    'Status Pulang',
    // SUMMARY
    'Total Durasi Kerja',
    'Status Akhir Presensi',
    'Keterangan / BKD Verifikasi',
  ];

  const rows = pairedData.map((row, idx) => [
    idx + 1,
    `"${row.date}"`,
    `"${row.dayName}"`,
    `'${row.identifier}`,
    `"${row.personName.replace(/"/g, '""')}"`,
    `"${row.personType === 'teacher' ? 'Guru / ASN' : 'Siswa'}"`,
    `"${(row.employmentStatus || '-').replace(/"/g, '""')}"`,
    `"${row.unitOrClass.replace(/"/g, '""')}"`,
    // Masuk
    `"${row.jamMasuk}"`,
    `"${row.fotoMasukDriveUrl}"`,
    `"${row.lokasiMasuk.replace(/"/g, '""')}"`,
    `"${row.statusMasuk}"`,
    // Pulang
    `"${row.jamPulang}"`,
    `"${row.fotoPulangDriveUrl}"`,
    `"${row.lokasiPulang.replace(/"/g, '""')}"`,
    `"${row.statusPulang}"`,
    // Total & Status
    `"${row.totalJamKerja}"`,
    `"${row.statusAkhir}"`,
    `"${row.keterangan.replace(/"/g, '""')}"`,
  ]);

  const metaHeader = [
    `"REKAPITULASI PRESENSI ASN & GTK - BKD KABUPATEN PULAU TALIABU"`,
    `"Instansi: ${config.schoolName} | NPSN: ${config.npsn}"`,
    `"Jenis Laporan: Rekap ${reportType} Pukul 15.00 WIT"`,
    `"Waktu Ekspor: ${new Date().toLocaleString('id-ID')} WIT"`,
    '',
  ];

  return '\uFEFF' + metaHeader.join('\n') + headers.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n');
}

/**
 * Trigger immediate browser download of the CSV
 */
export function downloadBkdCsvFile(
  pairedData: PairedDailyAttendance[],
  config: SchoolConfig,
  reportType: 'Harian' | 'Mingguan' | 'Bulanan' = 'Harian'
) {
  const csvContent = generateBkdSeparateColumnsCsv(pairedData, config, reportType);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `BKD_Pulau_Taliabu_Rekap_${reportType}_${config.schoolName.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate formatted WhatsApp message payload to BKD Kab Pulau Taliabu
 */
export function formatBkdWhatsAppMessage(
  pairedData: PairedDailyAttendance[],
  config: SchoolConfig,
  reportType: 'Harian' | 'Mingguan' | 'Bulanan' = 'Harian'
): string {
  const todayDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totalHadir = pairedData.filter((d) => d.statusAkhir === 'HADIR LENGKAP').length;
  const totalTerlambat = pairedData.filter((d) => d.statusAkhir === 'TERLAMBAT').length;
  const totalIzinSakit = pairedData.filter((d) => d.statusAkhir === 'IZIN' || d.statusAkhir === 'SAKIT').length;
  const totalAlpa = pairedData.filter((d) => d.statusAkhir === 'ALPA').length;

  const driveFolderUrl = `https://drive.google.com/drive/folders/bkd-pulau-taliabu-${config.npsn}-presensi`;
  const sheetsLiveUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTaliabu_Rekap_${config.npsn}/pubhtml`;

  let msg = `*LAPORAN OTOMATIS PRESENSI KEPEGAWAIAN - BKD KAB. PULAU TALIABU*\n`;
  msg += `⏰ Jadwal Pengiriman: *Setiap Jam 15.00 WIT (${reportType.toUpperCase()})*\n`;
  msg += `--------------------------------------------------\n`;
  msg += `🏛️ *Instansi*       : ${config.schoolName}\n`;
  msg += `🆔 *NPSN*           : ${config.npsn}\n`;
  msg += `📅 *Periode/Tanggal*: ${todayDate}\n`;
  msg += `👥 *Total Personil* : ${pairedData.length} Orang\n`;
  msg += `--------------------------------------------------\n`;
  msg += `📊 *RINGKASAN KEHADIRAN (15:00 WIT)*:\n`;
  msg += `✅ Hadir Lengkap : ${totalHadir} Orang\n`;
  msg += `⚠️ Terlambat     : ${totalTerlambat} Orang\n`;
  msg += `📋 Izin / Sakit  : ${totalIzinSakit} Orang\n`;
  msg += `❌ Alpa / Nihil  : ${totalAlpa} Orang\n`;
  msg += `--------------------------------------------------\n`;
  msg += `📁 *DOKUMENTASI FOTO WAJAH & GPS (GOOGLE DRIVE)*:\n`;
  msg += `🔗 ${driveFolderUrl}\n\n`;
  msg += `📑 *GOOGLE SHEETS REKAP (KOLOM MASUK & PULANG TERPISAH)*:\n`;
  msg += `🔗 ${sheetsLiveUrl}\n`;
  msg += `--------------------------------------------------\n`;
  msg += `📋 *5 DATA PRESENSI TERBARU*:\n`;

  pairedData.slice(0, 5).forEach((item, i) => {
    msg += `${i + 1}. *${item.personName}* (${item.identifier})\n`;
    msg += `   • Masuk : ${item.jamMasuk} | Foto Drive: ${item.fotoMasukDriveUrl.substring(0, 35)}...\n`;
    msg += `   • Pulang: ${item.jamPulang} | Total: ${item.totalJamKerja}\n`;
  });

  if (pairedData.length > 5) {
    msg += `   ...dan ${pairedData.length - 5} personil lainnya terlampir di file CSV/Sheets.\n`;
  }

  msg += `--------------------------------------------------\n`;
  msg += `_Laporan dibuat otomatis oleh Sistem Presensi Cerdas ${config.schoolName} terintegrasi BKD Kab. Pulau Taliabu._`;

  return msg;
}
