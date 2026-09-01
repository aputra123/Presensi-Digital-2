import React, { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  Send,
  Sparkles,
  UserCheck,
  Building2,
  Calendar,
  X,
  Share2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  AttendanceRecord,
  LeaveRequest,
  SchoolConfig,
  Teacher,
  Student,
} from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface PrincipalDailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  records?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  teachers?: Teacher[];
  students?: Student[];
  config: SchoolConfig;
  onApproveLeave?: (leaveId: string) => void;
  onRejectLeave?: (leaveId: string) => void;
}

export interface AbnormalAttendanceFlag {
  id: string;
  personName: string;
  personType: 'teacher' | 'student';
  identifier: string;
  classOrSubject: string;
  type: 'masuk' | 'pulang';
  time: string;
  flagType: 'outside_radius' | 'severe_late' | 'missing_checkout' | 'unverified_alpa';
  flagSeverity: 'high' | 'medium' | 'low';
  description: string;
  locationDetails?: string;
  photoUrl?: string;
}

export const PrincipalDailyDigestModal: React.FC<PrincipalDailyDigestModalProps> = ({
  isOpen,
  onClose,
  records = [],
  leaveRequests = [],
  teachers = [],
  students = [],
  config,
  onApproveLeave,
  onRejectLeave,
}) => {
  const [activeDigestTab, setActiveDigestTab] = useState<'all' | 'leaves' | 'abnormal'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const safeRecords = records || [];
  const safeLeaveRequests = leaveRequests || [];
  const safeTeachers = teachers || [];
  const safeStudents = students || [];

  // 1. Pending Leaves (Izin & Sakit)
  const pendingLeaves = useMemo(() => {
    return safeLeaveRequests.filter((l) => l.status === 'pending');
  }, [safeLeaveRequests]);

  // 2. Abnormal Attendance Flags from the last 24 hours
  const abnormalFlags = useMemo(() => {
    const flags: AbnormalAttendanceFlag[] = [];
    const todayRecs = safeRecords.filter((r) => r.date === todayStr);

    todayRecs.forEach((rec) => {
      // Flag 1: Di luar radius geofence
      if (rec.location && !rec.location.inRadius) {
        flags.push({
          id: `flag-rad-${rec.id}`,
          personName: rec.personName,
          personType: rec.personType,
          identifier: rec.identifier,
          classOrSubject: rec.classOrSubject,
          type: rec.type,
          time: rec.time,
          flagType: 'outside_radius',
          flagSeverity: 'high',
          description: `Presensi di luar radius sekolah (${rec.location.distanceMeter}m dari pusat)`,
          locationDetails: rec.location.address,
          photoUrl: rec.photoUrl,
        });
      }

      // Flag 2: Terlambat parah (> 07:30 atau > deadline)
      if (rec.status === 'terlambat') {
        flags.push({
          id: `flag-late-${rec.id}`,
          personName: rec.personName,
          personType: rec.personType,
          identifier: rec.identifier,
          classOrSubject: rec.classOrSubject,
          type: rec.type,
          time: rec.time,
          flagType: 'severe_late',
          flagSeverity: 'medium',
          description: `Presensi terlambat pada pukul ${rec.time} WIB (Batas: ${config.checkInDeadline || '07:15'})`,
          photoUrl: rec.photoUrl,
        });
      }
    });

    // Flag 3: Teachers who checked in but haven't checked out if past check-out time
    const teacherCheckIns = todayRecs.filter((r) => r.personType === 'teacher' && r.type === 'masuk');
    teacherCheckIns.forEach((checkIn) => {
      const hasCheckedOut = todayRecs.some(
        (r) => r.personId === checkIn.personId && r.type === 'pulang'
      );
      if (!hasCheckedOut && new Date().getHours() >= 15) {
        flags.push({
          id: `flag-no-out-${checkIn.id}`,
          personName: checkIn.personName,
          personType: 'teacher',
          identifier: checkIn.identifier,
          classOrSubject: checkIn.classOrSubject,
          type: 'pulang',
          time: '-',
          flagType: 'missing_checkout',
          flagSeverity: 'low',
          description: `Belum melakukan presensi pulang hingga pukul 15.00+ WIB`,
        });
      }
    });

    return flags;
  }, [records, todayStr, config]);

  // Executive Summary stats
  const totalRegistered = safeTeachers.length + safeStudents.length;
  const todayRecs = safeRecords.filter((r) => r.date === todayStr);
  const presentToday = todayRecs.filter((r) => r.status === 'hadir' || r.status === 'terlambat').length;
  const attendanceRate = totalRegistered > 0 ? Math.round((presentToday / totalRegistered) * 100) : 95;

  if (!isOpen) return null;

  // Generate Digest Message for WhatsApp/Email
  const generateDigestText = () => {
    const dateFormatted = formatDateIndo(todayStr);
    let msg = `*DAILY DIGEST EKSEKUTIF KEPALA SEKOLAH*\n`;
    msg += `🏛️ *${config.schoolName}*\n`;
    msg += `📅 *Tanggal*: ${dateFormatted}\n`;
    msg += `⏰ *Waktu Terbit*: ${new Date().toLocaleTimeString('id-ID')} WIB\n`;
    msg += `-------------------------------------------\n`;
    msg += `📊 *RINGKASAN KEHADIRAN 24 JAM TERAKHIR*:\n`;
    msg += `• Tingkat Kehadiran: *${attendanceRate}%* (${presentToday} dari ${totalRegistered} Personil)\n`;
    msg += `• Permohonan Izin Tertunda: *${pendingLeaves.length} Berkas*\n`;
    msg += `• Anomali / Temuan Khusus: *${abnormalFlags.length} Kejadian*\n`;
    msg += `-------------------------------------------\n`;

    if (pendingLeaves.length > 0) {
      msg += `📋 *PERMOHONAN IZIN/SAKIT MENUNGGU PERSETUJUAN (${pendingLeaves.length})*:\n`;
      pendingLeaves.forEach((l, i) => {
        msg += `${i + 1}. *${l.personName}* (${l.personType === 'teacher' ? 'Guru' : 'Siswa - ' + l.classOrSubject})\n`;
        msg += `   Jenis: ${l.type.toUpperCase()} | Alasan: "${l.reason}"\n`;
        msg += `   Durasi: ${l.startDate} s/d ${l.endDate}\n`;
      });
      msg += `\n`;
    }

    if (abnormalFlags.length > 0) {
      msg += `⚠️ *TEMUAN ANOMALI PRESENSI 24 JAM TERAKHIR (${abnormalFlags.length})*:\n`;
      abnormalFlags.forEach((f, i) => {
        msg += `${i + 1}. *${f.personName}* (${f.classOrSubject}) - ${f.description}\n`;
      });
      msg += `\n`;
    }

    msg += `-------------------------------------------\n`;
    msg += `_Laporan otomatis disiapkan untuk ${config.principalName || 'Kepala Sekolah'}_`;
    return msg;
  };

  const handleCopyDigest = () => {
    const text = generateDigestText();
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`DAILY DIGEST KEPALA SEKOLAH - ${config.schoolName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${formatDateIndo(todayStr)} | Terbit: ${new Date().toLocaleTimeString('id-ID')} WIB`, 14, 28);
    doc.text(`Kepala Sekolah: ${config.principalName || '-'} (NIP: ${config.principalNip || '-'})`, 14, 34);

    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    let y = 46;
    doc.setFontSize(12);
    doc.text(`1. Ringkasan Eksekutif Kehadiran:`, 14, y);
    doc.setFontSize(10);
    y += 6;
    doc.text(`- Persentase Kehadiran: ${attendanceRate}% (${presentToday} hadir dari ${totalRegistered} total)`, 16, y);
    y += 6;
    doc.text(`- Izin/Sakit Menunggu Validasi: ${pendingLeaves.length} Berkas`, 16, y);
    y += 6;
    doc.text(`- Anomali/Temuan Khusus: ${abnormalFlags.length} Kejadian`, 16, y);

    y += 12;
    doc.setFontSize(12);
    doc.text(`2. Permohonan Izin Menunggu Persetujuan (${pendingLeaves.length}):`, 14, y);
    y += 6;
    doc.setFontSize(9);
    if (pendingLeaves.length === 0) {
      doc.text(`Tidak ada permohonan izin pending.`, 16, y);
      y += 6;
    } else {
      pendingLeaves.forEach((l) => {
        doc.text(`• ${l.personName} (${l.classOrSubject}) - ${l.type.toUpperCase()}: ${l.reason} (${l.startDate} s/d ${l.endDate})`, 16, y);
        y += 5;
      });
    }

    y += 8;
    doc.setFontSize(12);
    doc.text(`3. Temuan Anomali Presensi (${abnormalFlags.length}):`, 14, y);
    y += 6;
    doc.setFontSize(9);
    if (abnormalFlags.length === 0) {
      doc.text(`Semua presensi berada dalam batas normal dan valid.`, 16, y);
      y += 6;
    } else {
      abnormalFlags.forEach((f) => {
        doc.text(`• ${f.personName} (${f.classOrSubject}) - ${f.description}`, 16, y);
        y += 5;
      });
    }

    doc.save(`Daily_Digest_Kepsek_${config.schoolName}_${todayStr}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider uppercase border border-amber-400/30">
                  Executive Briefing
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  {formatDateIndo(todayStr)}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Daily Digest Kepala Sekolah (24 Jam Terakhir)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-bold block text-[10px]">Tingkat Kehadiran Hari Ini</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-extrabold text-emerald-600">{attendanceRate}%</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400">{presentToday} dari {totalRegistered} Personil</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-bold block text-[10px]">Permohonan Izin Pending</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-extrabold text-indigo-600">{pendingLeaves.length}</span>
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-[10px] text-slate-400">Memerlukan Keputusan Kepsek</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-bold block text-[10px]">Temuan Anomali Presensi</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-extrabold text-amber-600">{abnormalFlags.length}</span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-400">Luar Radius / Terlambat Parah</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-bold block text-[10px]">Penerima Laporan</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-extrabold text-slate-800 truncate">
                {config.principalName || 'Kepala Sekolah'}
              </span>
              <UserCheck className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">NIP: {config.principalNip || '-'}</span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-100">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveDigestTab('all')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeDigestTab === 'all'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Temuan & Izin ({pendingLeaves.length + abnormalFlags.length})
            </button>
            <button
              onClick={() => setActiveDigestTab('leaves')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1 ${
                activeDigestTab === 'leaves'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Permohonan Izin</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
                {pendingLeaves.length}
              </span>
            </button>
            <button
              onClick={() => setActiveDigestTab('abnormal')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1 ${
                activeDigestTab === 'abnormal'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Anomali Presensi</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {abnormalFlags.length}
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            <button
              onClick={handleCopyDigest}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedNotification ? 'Tersalin!' : 'Salin Format WA'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Pending Leaves */}
          {(activeDigestTab === 'all' || activeDigestTab === 'leaves') && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Permohonan Izin/Sakit Menunggu Validasi ({pendingLeaves.length})</span>
              </h3>

              {pendingLeaves.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Tidak ada permohonan izin yang tertunda saat ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-300 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{leave.personName}</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            {leave.personType === 'teacher' ? 'Guru' : 'Siswa'} • {leave.classOrSubject}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                            {leave.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Alasan:</span> {leave.reason}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Durasi: {leave.startDate} s/d {leave.endDate}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {onApproveLeave && (
                          <button
                            onClick={() => onApproveLeave(leave.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                        )}
                        {onRejectLeave && (
                          <button
                            onClick={() => onRejectLeave(leave.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Abnormal Attendance Flags */}
          {(activeDigestTab === 'all' || activeDigestTab === 'abnormal') && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Temuan Anomali Presensi 24 Jam Terakhir ({abnormalFlags.length})</span>
              </h3>

              {abnormalFlags.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-medium">
                  Semua presensi hari ini tercatat tertib dan sesuai radius geofence sekolah.
                </div>
              ) : (
                <div className="space-y-2">
                  {abnormalFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-300 transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            flag.flagType === 'outside_radius'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {flag.flagType === 'outside_radius' ? (
                            <MapPin className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs">{flag.personName}</span>
                            <span className="text-slate-400 text-[11px]">({flag.classOrSubject})</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                flag.flagSeverity === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {flag.flagType === 'outside_radius'
                                ? 'Luar Radius Geofence'
                                : flag.flagType === 'severe_late'
                                ? 'Terlambat'
                                : 'Belum Pulang'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{flag.description}</p>
                          {flag.locationDetails && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Lokasi: {flag.locationDetails}
                            </p>
                          )}
                        </div>
                      </div>

                      {flag.photoUrl && (
                        <div className="shrink-0 flex items-center space-x-2">
                          <img
                            src={flag.photoUrl}
                            alt="Bukti"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Laporan terhubung langsung dengan Database Presensi Cloud & Kepegawaian Sekolah.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};
