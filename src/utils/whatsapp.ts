import { AttendanceRecord, Student, Teacher, SchoolConfig, LeaveRequest } from '../types';
import { formatDateIndo } from './soundAndDate';

export const generateAttendanceWhatsAppMessage = (
  record: AttendanceRecord,
  config: SchoolConfig,
  targetPerson?: Student | Teacher
): string => {
  const statusEmoji =
    record.status === 'hadir'
      ? '✅ *HADIR*'
      : record.status === 'terlambat'
      ? '⚠️ *TERLAMBAT*'
      : record.status === 'sakit'
      ? '🩺 *SAKIT*'
      : record.status === 'izin'
      ? '📝 *IZIN*'
      : '❌ *ALPA / TANPA KETERANGAN*';

  const dateFormatted = formatDateIndo(record.date);
  const typeStr = record.type === 'masuk' ? 'Presensi Masuk Sekolah' : 'Presensi Pulang Sekolah';

  let msg = `*NOTIFIKASI PRESENSI DIGITAL*\n`;
  msg += `*${config.schoolName}*\n`;
  msg += `------------------------------------\n`;
  msg += `Kepada Yth. Orang Tua / Wali / Ybs,\n\n`;
  msg += `Diberitahukan data kehadiran per hari ini:\n`;
  msg += `• *Nama:* ${record.personName}\n`;
  msg += `• *NISN/NIP:* ${record.identifier}\n`;
  msg += `• *Kelas/Mapel:* ${record.classOrSubject}\n`;
  msg += `• *Tanggal:* ${dateFormatted}\n`;
  msg += `• *Waktu:* ${record.time} WIB\n`;
  msg += `• *Sesi:* ${typeStr}\n`;
  msg += `• *Status:* ${statusEmoji}\n`;
  if (record.note) {
    msg += `• *Catatan:* ${record.note}\n`;
  }
  if (record.location?.address) {
    msg += `• *Lokasi Verifikasi:* ${record.location.address}\n`;
  }
  msg += `------------------------------------\n`;
  msg += `Pesan otomatis terverifikasi sistem presensi ${config.schoolName}.\n`;
  msg += `_Terima kasih atas perhatian dan kerja samanya._`;

  return msg;
};

export const generateLeaveWhatsAppMessage = (
  leave: LeaveRequest,
  configOrSchoolName?: SchoolConfig | string
): string => {
  const schoolName =
    typeof configOrSchoolName === 'string'
      ? configOrSchoolName
      : configOrSchoolName?.schoolName || 'SMAN 1 Nusantara';

  const dateFormatted = formatDateIndo(leave.startDate);
  const endFormatted = leave.endDate !== leave.startDate ? ` s/d ${formatDateIndo(leave.endDate)}` : '';

  let msg = `*NOTIFIKASI PENGAJUAN PERIZINAN*\n`;
  msg += `*${schoolName}*\n`;
  msg += `------------------------------------\n`;
  msg += `Permohonan ketidakhadiran telah tercatat:\n`;
  msg += `• *Nama:* ${leave.personName}\n`;
  msg += `• *Kelas/Jabatan:* ${leave.classOrSubject}\n`;
  msg += `• *Jenis:* ${leave.type.toUpperCase()}\n`;
  msg += `• *Periode:* ${dateFormatted}${endFormatted}\n`;
  msg += `• *Alasan:* ${leave.reason}\n`;
  msg += `• *Status:* ${leave.status === 'approved' ? '✅ Disetujui' : leave.status === 'rejected' ? '❌ Ditolak' : '⏳ Sedang Diverifikasi'}\n`;
  msg += `------------------------------------\n`;
  msg += `Sistem Presensi & Perizinan Digital ${schoolName}.`;

  return msg;
};

export const createWhatsAppUrl = (phone: string, text: string): string => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.substring(1);
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

export const sendWhatsAppNotification = (phone: string, text: string): void => {
  const url = createWhatsAppUrl(phone, text);
  window.open(url, '_blank');
};
