import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Zap,
  Volume2,
  CalendarOff,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';
import { AttendanceMethod, AttendanceRecord, AttendanceStatus, AttendanceType, SchoolConfig, Student, Teacher, AcademicEvent } from '../types';
import { formatTimeIndo, playBeepSound, checkDateIsHoliday } from '../utils/soundAndDate';

interface QrScannerTabProps {
  todayDate: string;
  students?: Student[];
  teachers?: Teacher[];
  config: SchoolConfig;
  events?: AcademicEvent[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  existingRecords?: AttendanceRecord[];
}

export const QrScannerTab: React.FC<QrScannerTabProps> = ({
  todayDate,
  students = [],
  teachers = [],
  config,
  events = [],
  onRecordAttendance,
  existingRecords = [],
}) => {
  const safeStudents = students || [];
  const safeTeachers = teachers || [];
  const safeExistingRecords = existingRecords || [];

  const [attendanceType, setAttendanceType] = useState<AttendanceType>('masuk');
  const [personType, setPersonType] = useState<'student' | 'teacher'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputIdentifier, setInputIdentifier] = useState('');
  const [overrideHoliday, setOverrideHoliday] = useState(false);
  const [lastScanned, setLastScanned] = useState<{
    person: Student | Teacher;
    status: AttendanceStatus;
    time: string;
    note: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  // Check if today is a holiday in academic events
  const holidayInfo = checkDateIsHoliday(todayDate, events);
  const isHolidayLocked = holidayInfo.isHoliday && !overrideHoliday;

  // Determine attendance status based on current time
  const evaluateStatus = (): { status: AttendanceStatus; note: string } => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [deadlineH, deadlineM] = config.checkInDeadline.split(':').map(Number);
    const deadlineMins = deadlineH * 60 + deadlineM;

    if (attendanceType === 'masuk') {
      if (currentMins <= deadlineMins) {
        return { status: 'hadir', note: 'Hadir Tepat Waktu (Gerbang Depan)' };
      } else {
        const diffMins = currentMins - deadlineMins;
        return { status: 'terlambat', note: `Terlambat ${diffMins} menit` };
      }
    } else {
      return { status: 'hadir', note: 'Presensi Pulang Sekolah' };
    }
  };

  const handleScanPerson = (person: Student | Teacher) => {
    if (isHolidayLocked) {
      alert(`⚠️ Perekaman Presensi Ditutup: Hari ini terdaftar sebagai Hari Libur (${holidayInfo.eventTitle}). Presensi tidak dapat dilakukan kecuali Anda mengaktifkan Bypass Override Admin.`);
      return;
    }

    const now = new Date();
    const timeStr = formatTimeIndo(now);
    const isStudent = 'nisn' in person;
    const identifier = isStudent ? (person as Student).nisn : (person as Teacher).nip;
    const classOrSubj = isStudent ? (person as Student).className : (person as Teacher).subject;

    // Check if already checked in today for this type
    const alreadyRecorded = existingRecords.some(
      (r) => r.date === todayDate && r.personId === person.id && r.type === attendanceType
    );

    if (alreadyRecorded) {
      alert(`${person.name} sudah melakukan presensi ${attendanceType} hari ini!`);
      return;
    }

    const { status, note } = evaluateStatus();

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      personId: person.id,
      personType: isStudent ? 'student' : 'teacher',
      personName: person.name,
      identifier,
      classOrSubject: classOrSubj,
      date: todayDate,
      time: timeStr,
      type: attendanceType,
      status,
      method: 'qrcode',
      note: overrideHoliday ? `${note} (Override Hari Libur)` : note,
      photoUrl: person.avatar,
      location: {
        lat: config.schoolLat,
        lng: config.schoolLng,
        address: 'Pos Pemindai QR Gerbang Sekolah',
        inRadius: true,
        distanceMeter: 5,
      },
    };

    playBeepSound();
    onRecordAttendance(newRecord);
    setLastScanned({
      person,
      status,
      time: timeStr,
      note,
    });
    setInputIdentifier('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayLocked) {
      alert(`⚠️ Hari Libur: Presensi ditutup otomatis (${holidayInfo.eventTitle}).`);
      return;
    }
    if (!inputIdentifier.trim()) return;

    if (personType === 'student') {
      const found = students.find(
        (s) => s.nisn === inputIdentifier.trim() || s.name.toLowerCase().includes(inputIdentifier.toLowerCase())
      );
      if (found) {
        handleScanPerson(found);
      } else {
        alert('NISN atau Nama Siswa tidak ditemukan dalam database.');
      }
    } else {
      const found = teachers.find(
        (t) => t.nip === inputIdentifier.trim() || t.name.toLowerCase().includes(inputIdentifier.toLowerCase())
      );
      if (found) {
        handleScanPerson(found);
      } else {
        alert('NIP atau Nama Guru tidak ditemukan dalam database.');
      }
    }
  };

  // Filter list for quick click simulation
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nip.includes(searchQuery) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Holiday Notification Banner */}
      {holidayInfo.isHoliday && (
        <div
          className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
            isHolidayLocked
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                isHolidayLocked ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <CalendarOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-600 text-white">
                  HARI LIBUR TERDAFTAR
                </span>
                <span className="font-extrabold text-sm">{holidayInfo.eventTitle}</span>
              </div>
              <p className="text-xs mt-1 text-slate-600">
                {holidayInfo.description} • Sistem otomatis mengunci perekaman presensi untuk mencegah kekeliruan absensi di hari libur.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setOverrideHoliday(!overrideHoliday)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                overrideHoliday
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              {overrideHoliday ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{overrideHoliday ? 'Bypass Aktif (Testing)' : 'Bypass Override Admin'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Config Header for Scanner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900 flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Pemindai QR Code Presensi Siswa & Guru</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arahkan kamera ke Kartu Pelajar Digital atau pilih siswa dari daftar untuk simulasi tap kartu
          </p>
        </div>

        {/* Type Toggle: Masuk vs Pulang */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-full border border-slate-200">
          <button
            onClick={() => setAttendanceType('masuk')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              attendanceType === 'masuk'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presensi Masuk (Check-In)
          </button>
          <button
            onClick={() => setAttendanceType('pulang')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              attendanceType === 'pulang'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presensi Pulang (Check-Out)
          </button>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Virtual Camera Laser View & Scanner Feedback */}
        <div className="lg:col-span-6 space-y-5">
          <div className="relative aspect-[4/3] rounded-[2.5rem] bg-slate-950 overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center text-white shadow-lg p-6">
            {/* Live Camera View Simulation Frame */}
            <div className="absolute inset-4 rounded-3xl border border-dashed border-indigo-500/40 flex flex-col items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              {isScanning && (
                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-bounce duration-1000" />
              )}

              <div className="text-center space-y-2 z-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center mx-auto text-indigo-400">
                  <QrCode className="w-8 h-8 animate-pulse" />
                </div>
                <p className="font-bold text-xs text-slate-200">
                  Kamera Pemindai Aktif
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs">
                  Batas toleransi masuk: <strong>{config.checkInDeadline} WIB</strong>
                </p>
              </div>

              {/* Audio chime badge */}
              <div className="absolute bottom-3 left-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-300 border border-slate-700">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>Audio Beep Aktif</span>
              </div>
            </div>
          </div>

          {/* Last Scanned Instant Notification Card */}
          {lastScanned && (
            <div className="p-5 rounded-[2rem] bg-emerald-50 border border-emerald-200/90 flex items-center space-x-4 animate-in zoom-in-95 duration-200">
              <img
                src={lastScanned.person.avatar}
                alt={lastScanned.person.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Berhasil Dipindai!
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-900">
                    {lastScanned.time} WIB
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 truncate mt-1">
                  {lastScanned.person.name}
                </h4>
                <p className="text-xs text-slate-600">
                  {'className' in lastScanned.person ? lastScanned.person.className : lastScanned.person.subject} • {lastScanned.note}
                </p>
              </div>
            </div>
          )}

          {/* Manual Input / Barcode Scanner Field */}
          <form onSubmit={handleManualSubmit} className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Input Manual / Scanner Barcode USB</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputIdentifier}
                onChange={(e) => setInputIdentifier(e.target.value)}
                placeholder={personType === 'student' ? 'Ketik / Scan NISN (Contoh: 0078129001)' : 'Ketik NIP Guru...'}
                className="flex-1 text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
              >
                Proses
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Quick Tap Roster List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Cepat Tap Kartu Pelajar</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik tombol <strong>"Tap Kartu"</strong> pada siswa untuk mensimulasikan scan instan
                </p>
              </div>

              {/* Student vs Teacher Switcher */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-full border border-slate-200">
                <button
                  onClick={() => setPersonType('student')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    personType === 'student'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Siswa ({students.length})
                </button>
                <button
                  onClick={() => setPersonType('teacher')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    personType === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guru & GTK ({teachers.length})
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama, NISN/NIP, atau kelas..."
                className="w-full text-xs pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Scrollable Person List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {personType === 'student' ? (
                filteredStudents.map((std) => {
                  const alreadyChecked = existingRecords.some(
                    (r) => r.date === todayDate && r.personId === std.id && r.type === attendanceType
                  );

                  return (
                    <div
                      key={std.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={std.avatar}
                          alt={std.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {std.name}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                              {std.className}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            NISN: {std.nisn}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleScanPerson(std)}
                        disabled={alreadyChecked}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                          alreadyChecked
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{alreadyChecked ? 'Sudah Presensi' : 'Tap Kartu QR'}</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                filteredTeachers.map((tch) => {
                  const alreadyChecked = existingRecords.some(
                    (r) => r.date === todayDate && r.personId === tch.id && r.type === attendanceType
                  );

                  return (
                    <div
                      key={tch.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={tch.avatar}
                          alt={tch.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {tch.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            NIP: {tch.nip} • {tch.subject}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleScanPerson(tch)}
                        disabled={alreadyChecked}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                          alreadyChecked
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{alreadyChecked ? 'Sudah Presensi' : 'Tap Kartu NIP'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
