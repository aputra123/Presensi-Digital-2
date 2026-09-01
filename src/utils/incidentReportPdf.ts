import jsPDF from 'jspdf';
import { BiometricLog, SchoolConfig } from '../types';
import { formatDateIndo, downloadCsv } from './soundAndDate';

export interface IncidentReportOptions {
  logs: BiometricLog[];
  config: SchoolConfig;
  monthString?: string; // e.g. "2026-08"
  monthName?: string; // e.g. "Agustus 2026"
}

export function generateBiometricIncidentReportPdf({
  logs,
  config,
  monthString = new Date().toISOString().slice(0, 7),
  monthName = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    month: 'long',
    year: 'numeric',
  }),
}: IncidentReportOptions) {
  // Filter for incident logs (Severity Error, Warning, Failed, Flagged, or Suspicious)
  const incidentLogs = logs.filter((log) => {
    const isThisMonth = log.date.startsWith(monthString);
    const isIncident =
      log.severity === 'error' ||
      log.severity === 'warning' ||
      log.status === 'failed' ||
      log.status === 'flagged' ||
      log.isSuspicious === true;
    return isThisMonth && isIncident;
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header KOP Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PEMERINTAH KABUPATEN PULAU TALIABU', pageWidth / 2, 16, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(14);
  doc.text((config.schoolName || 'SMP NEGERI 4 SATU ATAP TALIABU BARAT').toUpperCase(), pageWidth / 2, 27, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `NPSN: ${config.npsn || '60203598'} • Alamat: ${config.address || 'Desa Pancoran, Kec. Taliabu Barat, Maluku Utara'}`,
    pageWidth / 2,
    32,
    { align: 'center' }
  );
  doc.text(
    `Zona Waktu Operasional: WITA (Asia/Makassar) • Titik Koordinat Pusat: ${config.schoolLat}, ${config.schoolLng}`,
    pageWidth / 2,
    36,
    { align: 'center' }
  );

  // Double Divider Line
  doc.setLineWidth(0.8);
  doc.line(14, 39, pageWidth - 14, 39);
  doc.setLineWidth(0.2);
  doc.line(14, 40.5, pageWidth - 14, 40.5);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('BERITA ACARA & LAPORAN RESMI AUDIT INSIDEN BIOMETRIK', pageWidth / 2, 48, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode Evaluasi: ${monthName} • Dokumen Resmi Pengawasan ASN & Peserta Didik`, pageWidth / 2, 53, {
    align: 'center',
  });

  // KPI & Metric Breakdown Box
  const errorCount = incidentLogs.filter((l) => l.severity === 'error' || l.status === 'failed').length;
  const warningCount = incidentLogs.filter((l) => l.severity === 'warning' || l.status === 'flagged').length;
  const suspiciousCount = incidentLogs.filter((l) => l.isSuspicious).length;
  const gpsFailCount = incidentLogs.filter((l) => !l.gpsPassed).length;

  let y = 60;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RINGKASAN AUDIT ANOMALI & INSIDEN OTENTIKASI:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`• Total Kejadian Insiden: ${incidentLogs.length} Kasus`, 18, y + 12);
  doc.text(`• Anomali Kegagalan Wajah (Error): ${errorCount} Kasus`, 18, y + 17);

  doc.text(`• Pelanggaran Radius GPS (Warning): ${gpsFailCount} Kasus`, 85, y + 12);
  doc.text(`• Peringatan Geofencing / Flagged: ${warningCount} Kasus`, 85, y + 17);

  doc.text(`• Deteksi Mass-Spoofing / Collision: ${suspiciousCount} Terduga`, 145, y + 12);
  doc.text(`• Status Sistem Keamanan: TINGKAT WASPADA AKTIF`, 145, y + 17);

  // Table Headers
  y = 88;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('NO', 16, y + 5.5);
  doc.text('WAKTU (WITA)', 24, y + 5.5);
  doc.text('NAMA PERSONIL / ID', 50, y + 5.5);
  doc.text('TIPE', 96, y + 5.5);
  doc.text('SEVERITY', 112, y + 5.5);
  doc.text('SKOR / GPS', 133, y + 5.5);
  doc.text('DESKRIPSI KENDALA / ANOMALI', 156, y + 5.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  if (incidentLogs.length === 0) {
    y += 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, pageWidth - 28, 12, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(
      `Tidak ada rekaman insiden atau kegagalan otentikasi biometrik tercatat pada periode ${monthName}.`,
      pageWidth / 2,
      y + 7.5,
      { align: 'center' }
    );
    y += 12;
  } else {
    // Sort chronological descending
    const sorted = [...incidentLogs].sort(
      (a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime()
    );

    // Limit to max 30 rows per PDF for neat formatting or multi-page
    const displayRows = sorted.slice(0, 28);

    displayRows.forEach((item, idx) => {
      y += 6.5;

      // Check page break
      if (y > pageHeight - 48) {
        doc.addPage();
        y = 20;

        // Subheader on new page
        doc.setFillColor(30, 41, 59);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('NO', 16, y + 4.8);
        doc.text('WAKTU (WITA)', 24, y + 4.8);
        doc.text('NAMA PERSONIL / ID', 50, y + 4.8);
        doc.text('TIPE', 96, y + 4.8);
        doc.text('SEVERITY', 112, y + 4.8);
        doc.text('SKOR / GPS', 133, y + 4.8);
        doc.text('DESKRIPSI KENDALA / ANOMALI', 156, y + 4.8);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        y += 7;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
      }

      doc.setFontSize(7);
      doc.text((idx + 1).toString(), 16, y + 3.5);
      doc.text(`${item.date.slice(8, 10)}/${item.date.slice(5, 7)} ${item.time}`, 24, y + 3.5);

      const nameTrunc = item.personName.length > 24 ? item.personName.substring(0, 22) + '..' : item.personName;
      doc.text(nameTrunc, 50, y + 3.5);

      doc.text(item.personType === 'teacher' ? 'Guru' : 'Siswa', 96, y + 3.5);

      // Severity tag
      const sev = (item.isSuspicious ? 'SUSPICIOUS' : item.severity || item.status).toUpperCase();
      if (item.isSuspicious || sev === 'ERROR' || sev === 'FAILED') {
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'bold');
      }
      doc.text(sev, 112, y + 3.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.matchScore}% | ${item.distanceMeter}m`, 133, y + 3.5);

      const reason = item.suspiciousReason || item.failureReason || 'Penyimpangan parameter otentikasi';
      const reasonTrunc = reason.length > 28 ? reason.substring(0, 26) + '..' : reason;
      doc.text(reasonTrunc, 156, y + 3.5);
    });

    if (sorted.length > 28) {
      y += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`...dan ${sorted.length - 28} rekaman insiden lainnya tersimpan di audit log lengkap.`, 16, y + 3);
      doc.setTextColor(15, 23, 42);
    }
  }

  // Recommendations & Signatures
  let sigY = Math.max(y + 12, pageHeight - 44);
  if (sigY > pageHeight - 38) {
    doc.addPage();
    sigY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY - 4, pageWidth - 14, sigY - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CATATAN AUDITOR & TINDAK LANJUT:', 14, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    '1. Log terverifikasi secara kriptografis & disimpan sesuai regulasi presensi BKD Taliabu.',
    14,
    sigY + 4
  );
  doc.text(
    '2. Personil dengan status SUSPICIOUS / ERROR berulang wajib diverifikasi langsung oleh Admin Sekolah.',
    14,
    sigY + 7.5
  );

  // Signatures
  const dateSign = `Taliabu Barat, ${formatDateIndo(new Date().toISOString().slice(0, 10))}`;
  doc.setFontSize(8);
  doc.text(dateSign, pageWidth - 65, sigY + 3);

  doc.text('Mengetahui,', 20, sigY + 7);
  doc.text('Kepala Sekolah', 20, sigY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(config.principalName || 'Drs. Ruslan La Ode, M.Pd.', 20, sigY + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`NIP. ${config.principalNip || '196812311994121002'}`, 20, sigY + 32);

  doc.setFontSize(8);
  doc.text('Penanggung Jawab Sistem / Admin BKD', pageWidth - 70, sigY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(config.adminName || 'Hendra Hasan, S.Pd.', pageWidth - 70, sigY + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Admin Dapodik & Otentikasi Biometrik', pageWidth - 70, sigY + 32);

  const cleanMonth = monthString.replace('-', '_');
  doc.save(`Laporan_Insiden_Biometrik_SMPN4_Taliabu_${cleanMonth}.pdf`);
}

export function exportBiometricIncidentReportCsv({
  logs,
  config,
  monthString = new Date().toISOString().slice(0, 7),
}: IncidentReportOptions) {
  const incidentLogs = logs.filter((log) => {
    const isThisMonth = log.date.startsWith(monthString);
    const isIncident =
      log.severity === 'error' ||
      log.severity === 'warning' ||
      log.status === 'failed' ||
      log.status === 'flagged' ||
      log.isSuspicious === true;
    return isThisMonth && isIncident;
  });

  const headers = [
    'ID Log',
    'Tanggal',
    'Waktu (WITA)',
    'Tingkat Urgensi (Severity)',
    'Status Verifikasi',
    'Indikasi Mass-Spoofing',
    'Nama Pengguna',
    'NIP / NISN',
    'Kategori',
    'Kelas / Mapel',
    'Skor Kemiripan (%)',
    'Ambang Batas Resmi (%)',
    'Uji Liveness',
    'Validasi GPS Geofence',
    'Jarak dari Sekolah (Meter)',
    'Latitude Upaya',
    'Longitude Upaya',
    'Kamera Terpakai',
    'Informasi Perangkat / IP',
    'Alasan Kegagalan / Catatan Insiden',
    'Alasan Suspicious (Spoof Group)',
  ];

  const rows = incidentLogs.map((l) => [
    l.id,
    l.date,
    l.time,
    (l.severity || 'warning').toUpperCase(),
    l.status.toUpperCase(),
    l.isSuspicious ? 'YA (MENCURIGAKAN)' : 'TIDAK',
    `"${(l.personName || '').replace(/"/g, '""')}"`,
    `'${l.identifier || ''}`,
    l.personType === 'teacher' ? 'Guru/GTK' : 'Siswa',
    `"${(l.classOrSubject || '').replace(/"/g, '""')}"`,
    l.matchScore,
    l.threshold,
    l.livenessPassed ? 'Lolos' : 'Gagal',
    l.gpsPassed ? 'Valid Radius' : 'Di Luar Radius',
    l.distanceMeter,
    l.latitude || config.schoolLat,
    l.longitude || config.schoolLng,
    l.cameraFacing === 'user' ? 'Kamera Depan' : 'Kamera Belakang',
    `"${(l.ipOrDevice || '-').replace(/"/g, '""')}"`,
    `"${(l.failureReason || 'Anomali parameter otentikasi').replace(/"/g, '""')}"`,
    `"${(l.suspiciousReason || '-').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const cleanMonth = monthString.replace('-', '_');
  downloadCsv(`Laporan_Insiden_Biometrik_SMPN4_Taliabu_${cleanMonth}`, csvContent);
}
