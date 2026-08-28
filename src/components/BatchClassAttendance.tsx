import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  UserX,
  Save,
  Sparkles,
  BookOpen,
  CalendarDays,
  Check,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, SchoolClass, SchoolConfig, Student, AcademicEvent } from '../types';
import { formatDateIndo, formatTimeIndo, playBeepSound, checkDateIsHoliday } from '../utils/soundAndDate';
import { CalendarOff, Lock, Unlock } from 'lucide-react';

interface BatchClassAttendanceProps {
  todayDate: string;
  classes?: SchoolClass[];
  students?: Student[];
  config: SchoolConfig;
  events?: AcademicEvent[];
  existingRecords?: AttendanceRecord[];
  onSaveBatchAttendance: (newRecords: AttendanceRecord[]) => void;
}

interface StudentAttendanceRow {
  student: Student;
  status: AttendanceStatus;
  note: string;
}

export const BatchClassAttendance: React.FC<BatchClassAttendanceProps> = ({
  todayDate,
  classes = [],
  students = [],
  config,
  events = [],
  existingRecords = [],
  onSaveBatchAttendance,
}) => {
  const safeClasses = classes || [];
  const safeStudents = students || [];
  const safeExistingRecords = existingRecords || [];

  const [selectedClassId, setSelectedClassId] = useState<string>(safeClasses[0]?.id || '');
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [overrideHoliday, setOverrideHoliday] = useState(false);

  // Check if today is a holiday
  const holidayInfo = checkDateIsHoliday(todayDate, events);

  const selectedClass = safeClasses.find((c) => c.id === selectedClassId);
  const classStudents = safeStudents.filter((s) => s.classId === selectedClassId);

  // Initialize row data when class changes or records change
  useEffect(() => {
    const initialRows: StudentAttendanceRow[] = classStudents.map((std) => {
      const existing = existingRecords.find(
        (r) => r.date === todayDate && r.personId === std.id && r.type === 'masuk'
      );
      return {
        student: std,
        status: existing ? existing.status : 'hadir',
        note: existing ? existing.note || '' : '',
      };
    });
    setRows(initialRows);
  }, [selectedClassId, todayDate, existingRecords]);

  const handleSetAllStatus = (newStatus: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: newStatus,
      }))
    );
  };

  const handleUpdateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, status } : r))
    );
  };

  const handleUpdateStudentNote = (studentId: string, note: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, note } : r))
    );
  };

  const handleSaveClassAttendance = () => {
    const now = new Date();
    const timeStr = formatTimeIndo(now);

    const newRecords: AttendanceRecord[] = rows.map((r) => {
      let finalNote = r.note;
      if (!finalNote) {
        if (r.status === 'hadir') finalNote = 'Presensi Rombel (Wali Kelas)';
        if (r.status === 'terlambat') finalNote = 'Terlambat Masuk Jam Pertama';
        if (r.status === 'sakit') finalNote = 'Keterangan Sakit';
        if (r.status === 'izin') finalNote = 'Izin Urusan Keluarga';
        if (r.status === 'alpa') finalNote = 'Tanpa Keterangan (Alpa)';
      }

      return {
        id: `rec_batch_${r.student.id}_${todayDate}`,
        personId: r.student.id,
        personType: 'student',
        personName: r.student.name,
        identifier: r.student.nisn,
        classOrSubject: r.student.className,
        date: todayDate,
        time: timeStr,
        type: 'masuk',
        status: r.status,
        method: 'manual',
        note: finalNote,
        photoUrl: r.student.avatar,
        location: {
          lat: config.schoolLat,
          lng: config.schoolLng,
          address: `Ruang Kelas ${r.student.className}`,
          inRadius: true,
          distanceMeter: 10,
        },
      };
    });

    playBeepSound();
    onSaveBatchAttendance(newRecords);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Stats for this class
  const hadirCount = rows.filter((r) => r.status === 'hadir').length;
  const terlambatCount = rows.filter((r) => r.status === 'terlambat').length;
  const sakitCount = rows.filter((r) => r.status === 'sakit').length;
  const izinCount = rows.filter((r) => r.status === 'izin').length;
  const alpaCount = rows.filter((r) => r.status === 'alpa').length;

  return (
    <div className="space-y-6">
      {/* Top Header Bento */}
      <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="font-extrabold text-lg text-slate-900">
              Absensi Rombongan Belajar (Wali Kelas & Guru Piket)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengisian absensi langsung satu kelas dengan opsi 1-klik tanda hadir dan penyesuaian status
          </p>
        </div>

        {/* Class Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Pilih Kelas:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs font-bold px-4 py-2 bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.major})
              </option>
            ))}
          </select>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Absensi untuk kelas {selectedClass?.name} berhasil disimpan ke sistem!</span>
        </div>
      )}

      {/* Class Meta & Quick Action Bar */}
      <div className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-base">
            {selectedClass?.grade}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Kelas {selectedClass?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Wali Kelas: <strong>{selectedClass?.homeroomTeacher}</strong> • Total {classStudents.length} Siswa
            </p>
          </div>
        </div>

        {/* Quick Bulk Marking Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Tandai Semua:</span>
          <button
            onClick={() => handleSetAllStatus('hadir')}
            className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
          >
            Semua Hadir (H)
          </button>
          <button
            onClick={() => handleSetAllStatus('alpa')}
            className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
          >
            Reset Alpa (A)
          </button>
        </div>
      </div>

      {/* Summary Counter Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Hadir</span>
          <span className="text-xl font-extrabold text-emerald-900">{hadirCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
          <span className="text-[10px] font-bold text-amber-700 uppercase block">Terlambat</span>
          <span className="text-xl font-extrabold text-amber-900">{terlambatCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-center">
          <span className="text-[10px] font-bold text-blue-700 uppercase block">Sakit</span>
          <span className="text-xl font-extrabold text-blue-900">{sakitCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80 text-center">
          <span className="text-[10px] font-bold text-purple-700 uppercase block">Izin</span>
          <span className="text-xl font-extrabold text-purple-900">{izinCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-rose-700 uppercase block">Alpa</span>
          <span className="text-xl font-extrabold text-rose-900">{alpaCount}</span>
        </div>
      </div>

      {/* Interactive Students Table */}
      <div className="rounded-[2.5rem] bg-white border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Siswa & NISN</th>
                <th className="py-3.5 px-4 text-center">L/P</th>
                <th className="py-3.5 px-4 text-center min-w-[280px]">Status Kehadiran</th>
                <th className="py-3.5 px-4 min-w-[220px]">Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((row, idx) => {
                const std = row.student;
                return (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={std.avatar}
                          alt={std.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{std.name}</p>
                          <p className="text-[11px] text-slate-400">NISN: {std.nisn}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {std.gender}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Hadir */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(std.id, 'hadir')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            row.status === 'hadir'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title="Hadir"
                        >
                          H
                        </button>

                        {/* Terlambat */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(std.id, 'terlambat')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            row.status === 'terlambat'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title="Terlambat"
                        >
                          T
                        </button>

                        {/* Sakit */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(std.id, 'sakit')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            row.status === 'sakit'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                          title="Sakit"
                        >
                          S
                        </button>

                        {/* Izin */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(std.id, 'izin')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            row.status === 'izin'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                          title="Izin"
                        >
                          I
                        </button>

                        {/* Alpa */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentStatus(std.id, 'alpa')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            row.status === 'alpa'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                          title="Alpa"
                        >
                          A
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) => handleUpdateStudentNote(std.id, e.target.value)}
                        placeholder="Tambahkan catatan..."
                        className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Holiday Notification Banner */}
        {holidayInfo.isHoliday && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-rose-800 font-extrabold">
              <CalendarOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Hari Libur Terjadwal: {holidayInfo.eventName}</span>
            </div>
            <button
              type="button"
              onClick={() => setOverrideHoliday(!overrideHoliday)}
              className="text-[11px] font-bold text-rose-700 underline hover:text-rose-900 flex items-center space-x-1 cursor-pointer"
            >
              {overrideHoliday ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{overrideHoliday ? 'Bypass Libur Aktif (Tombol Dibuka)' : 'Bypass Libur Khusus Kelas Tambahan'}</span>
            </button>
          </div>
        )}

        {/* Footer Submit Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Perubahan akan dicatat ke log presensi tanggal <strong>{todayDate}</strong>
          </p>

          <button
            onClick={handleSaveClassAttendance}
            disabled={holidayInfo.isHoliday && !overrideHoliday}
            className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            {holidayInfo.isHoliday && !overrideHoliday ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Presensi Nonaktif (Hari Libur)</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Absensi Kelas {selectedClass?.name}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
