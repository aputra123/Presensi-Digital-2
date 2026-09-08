import React, { useState } from 'react';
import {
  Zap,
  Plus,
  X,
  AlertTriangle,
  FileText,
  UserCheck,
  Lock,
  Unlock,
  ShieldAlert,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  MapPin,
  Sparkles,
  Download,
  Smartphone,
} from 'lucide-react';
import {
  AttendanceRecord,
  Student,
  Teacher,
  SchoolConfig,
  ActiveTab,
  LeaveRequest,
} from '../types';

interface QuickActionsFabProps {
  students: Student[];
  teachers: Teacher[];
  records: AttendanceRecord[];
  config: SchoolConfig;
  isSystemLocked: boolean;
  onToggleSystemLock: (locked: boolean) => void;
  onAddEmergencyAbsence: (leave: LeaveRequest, record?: AttendanceRecord) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenInstallModal?: () => void;
}

export const QuickActionsFab: React.FC<QuickActionsFabProps> = ({
  students,
  teachers,
  records,
  config,
  isSystemLocked,
  onToggleSystemLock,
  onAddEmergencyAbsence,
  onNavigateTab,
  onOpenInstallModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [teacherLogsModalOpen, setTeacherLogsModalOpen] = useState(false);
  const [lockdownConfirmOpen, setLockdownConfirmOpen] = useState(false);

  // Emergency Absence Form State
  const [personType, setPersonType] = useState<'student' | 'teacher'>('student');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [absenceType, setAbsenceType] = useState<'sakit' | 'izin' | 'dispensasi'>('sakit');
  const [reason, setReason] = useState('');
  const [emergencyDate, setEmergencyDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Today's Teacher Records
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTeacherRecords = records.filter(
    (r) => r.personType === 'teacher' && r.date === todayStr
  );

  const handleSubmitEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !reason.trim()) return;

    let personName = '';
    let classOrSubject = '';

    if (personType === 'student') {
      const st = students.find((s) => s.id === selectedPersonId);
      if (st) {
        personName = st.name;
        classOrSubject = st.className;
      }
    } else {
      const tc = teachers.find((t) => t.id === selectedPersonId);
      if (tc) {
        personName = tc.name;
        classOrSubject = tc.subject;
      }
    }

    const newLeave: LeaveRequest = {
      id: `emg_leave_${Date.now()}`,
      personId: selectedPersonId,
      personType,
      personName: personName || 'Personil Sekolah',
      classOrSubject: classOrSubject || '-',
      type: absenceType,
      startDate: emergencyDate,
      endDate: emergencyDate,
      reason: `[DARURAT] ${reason.trim()}`,
      status: 'approved',
      createdAt: new Date().toISOString(),
      reviewNote: 'Disetujui otomatis melalui Tindakan Cepat (Quick Action) Darurat.',
    };

    const newRecord: AttendanceRecord = {
      id: `emg_rec_${Date.now()}`,
      personId: selectedPersonId,
      personType,
      personName: personName || 'Personil Sekolah',
      identifier: selectedPersonId,
      classOrSubject: classOrSubject || '-',
      date: emergencyDate,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: 'masuk',
      status: absenceType === 'sakit' ? 'sakit' : 'izin',
      method: 'manual',
      note: `Izin Darurat: ${reason.trim()}`,
    };

    onAddEmergencyAbsence(newLeave, newRecord);
    setEmergencyModalOpen(false);
    setReason('');
    setSelectedPersonId('');
  };

  return (
    <>
      {/* Floating Action Speed-Dial Container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3 print:hidden">
        {/* Expanded Speed-Dial Menu Items */}
        {isOpen && (
          <div className="flex flex-col items-end space-y-2.5 mb-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Action 1: Log Emergency Absence */}
            <button
              onClick={() => {
                setIsOpen(false);
                setEmergencyModalOpen(true);
              }}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer group"
            >
              <span className="text-xs font-extrabold whitespace-nowrap">Log Emergency Absence</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
            </button>

            {/* Action 2: View Latest Teacher Logs */}
            <button
              onClick={() => {
                setIsOpen(false);
                setTeacherLogsModalOpen(true);
              }}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer group"
            >
              <span className="text-xs font-extrabold whitespace-nowrap">View Latest Teacher Logs</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
            </button>

            {/* Action 3: Emergency System Lockdown */}
            <button
              onClick={() => {
                setIsOpen(false);
                setLockdownConfirmOpen(true);
              }}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl shadow-xl border transition-all cursor-pointer group ${
                isSystemLocked
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-extrabold whitespace-nowrap">
                {isSystemLocked ? 'Buka Kunci (Unlock System)' : 'Emergency System Lockdown'}
              </span>
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                  isSystemLocked ? 'bg-rose-600 shadow-rose-600/30' : 'bg-slate-900 shadow-slate-900/30'
                }`}
              >
                {isSystemLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
            </button>

            {/* Action 4: Download / Pasang Aplikasi */}
            {onOpenInstallModal && (
              <button
                id="fab-download-app-btn"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInstallModal();
                }}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer group"
              >
                <span className="text-xs font-extrabold whitespace-nowrap text-indigo-950 dark:text-indigo-200">
                  Download Aplikasi PWA
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-3xl text-white shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 dark:bg-slate-700 rotate-90 scale-105'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 hover:scale-105 shadow-indigo-600/40'
          }`}
          title="Tindakan Cepat (Quick Actions)"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6 fill-white" />}
        </button>
      </div>

      {/* 1. Modal: Log Emergency Absence */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Catat Izin / Sakit Darurat</h3>
                  <p className="text-xs text-amber-100">Log Emergency Absence Instan</p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEmergency} className="p-6 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPersonType('student');
                    setSelectedPersonId('');
                  }}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    personType === 'student'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Siswa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPersonType('teacher');
                    setSelectedPersonId('');
                  }}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    personType === 'teacher'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Guru / Pegawai
                </button>
              </div>

              {/* Person Select */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih {personType === 'student' ? 'Siswa' : 'Guru / Tenaga Pendidik'}:
                </label>
                <select
                  required
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Pilih Nama Personil --</option>
                  {personType === 'student'
                    ? students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.className})
                        </option>
                      ))
                    : teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} - {t.subject} ({t.employmentStatus})
                        </option>
                      ))}
                </select>
              </div>

              {/* Absence Category */}
              <div className="grid grid-cols-3 gap-2">
                {(['sakit', 'izin', 'dispensasi'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAbsenceType(cat)}
                    className={`py-2 px-3 rounded-xl font-bold capitalize border transition-all ${
                      absenceType === cat
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Berlaku:
                </label>
                <input
                  type="date"
                  value={emergencyDate}
                  onChange={(e) => setEmergencyDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Alasan Darurat:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Mengalami demam mendadak / Kendala transportasi laut / Tugas luar mendadak dari dinas"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center space-x-1.5 shadow-md shadow-amber-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Simpan & Sahkan Izin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: View Latest Teacher Logs */}
      {teacherLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Presensi Guru & GTK Terkini</h3>
                  <p className="text-xs text-slate-400">
                    {todayTeacherRecords.length} Guru Tercatat Hadir Hari Ini ({todayStr})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTeacherLogsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {todayTeacherRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold">Belum ada guru yang melakukan presensi hari ini.</p>
                </div>
              ) : (
                todayTeacherRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {r.personName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {r.personName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          NIP: {r.identifier} • {r.classOrSubject}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status} ({r.time} WIB)
                      </span>
                      <div className="text-[10px] text-slate-500 flex items-center justify-end space-x-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>{r.location?.address || 'Kampus SMPN 4'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setTeacherLogsModalOpen(false);
                  onNavigateTab('teachers');
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Buka Manajemen Guru &gt;
              </button>
              <button
                onClick={() => setTeacherLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Emergency System Lockdown */}
      {lockdownConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-rose-200 dark:border-rose-900/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {isSystemLocked ? 'Buka Kunci Sistem (Unlock)' : 'Emergency System Lockdown'}
                  </h3>
                  <p className="text-xs text-rose-100">Kontrol Keamanan Presensi</p>
                </div>
              </div>
              <button
                onClick={() => setLockdownConfirmOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 leading-relaxed space-y-2">
                <span className="font-extrabold block">
                  {isSystemLocked
                    ? 'Konfirmasi Pengaktifan Kembali Input Presensi Manual:'
                    : 'Konfirmasi Penguncian Darurat Sistem (Lockdown):'}
                </span>
                <p>
                  {isSystemLocked
                    ? 'Sistem akan membuka kembali izin input presensi manual dan absensi rombel kelas untuk operator sekolah.'
                    : 'Lockdown akan **menonaktifkan seluruh input presensi manual** demi menjaga integritas data selama investigasi atau situasi darurat sekolah.'}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLockdownConfirmOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleSystemLock(!isSystemLocked);
                    setLockdownConfirmOpen(false);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white font-extrabold shadow-md flex items-center space-x-1.5 ${
                    isSystemLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  {isSystemLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{isSystemLocked ? 'Buka Kunci Sistem' : 'Aktifkan Lockdown Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
