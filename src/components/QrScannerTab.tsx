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
  Undo2,
  Flame,
  Check,
  X,
  History,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AttendanceMethod,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  SchoolConfig,
  Student,
  Teacher,
  AcademicEvent,
} from '../types';
import { formatTimeIndo, playBeepSound, checkDateIsHoliday } from '../utils/soundAndDate';

interface SessionScanItem {
  id: string;
  recordId: string;
  person: Student | Teacher;
  personType: 'student' | 'teacher';
  status: AttendanceStatus;
  time: string;
  note: string;
  type: AttendanceType;
  timestamp: number;
}

interface QrScannerTabProps {
  todayDate: string;
  students?: Student[];
  teachers?: Teacher[];
  config: SchoolConfig;
  events?: AcademicEvent[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
  existingRecords?: AttendanceRecord[];
}

export const QrScannerTab: React.FC<QrScannerTabProps> = ({
  todayDate,
  students = [],
  teachers = [],
  config,
  events = [],
  onRecordAttendance,
  onDeleteRecord,
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
  const [isScanning, setIsScanning] = useState(true);

  // Rapid Scan Mode (Suppresses heavy popup, shows last 5 scans banner under camera)
  const [rapidScanMode, setRapidScanMode] = useState(false);

  // Live session scans (up to 10 last scans)
  const [sessionScans, setSessionScans] = useState<SessionScanItem[]>([]);

  // Detailed last scanned item (for normal popup mode)
  const [lastScanned, setLastScanned] = useState<SessionScanItem | null>(null);

  // Undo confirmation feedback toast
  const [undoFeedback, setUndoFeedback] = useState<string | null>(null);

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
      alert(
        `⚠️ Perekaman Presensi Ditutup: Hari ini terdaftar sebagai Hari Libur (${holidayInfo.eventTitle}). Presensi tidak dapat dilakukan kecuali Anda mengaktifkan Bypass Override Admin.`
      );
      return;
    }

    const now = new Date();
    const timeStr = formatTimeIndo(now);
    const isStudent = 'nisn' in person;
    const identifier = isStudent ? (person as Student).nisn : (person as Teacher).nip;
    const classOrSubj = isStudent ? (person as Student).className : (person as Teacher).subject;

    // Check if already checked in today for this type
    const alreadyRecorded = safeExistingRecords.some(
      (r) => r.date === todayDate && r.personId === person.id && r.type === attendanceType
    );

    if (alreadyRecorded) {
      alert(`${person.name} sudah melakukan presensi ${attendanceType} hari ini!`);
      return;
    }

    const { status, note } = evaluateStatus();
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
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
        address: 'Pos Pemindai QR Gerbang Sekolah (SMPN 4 Satap Taliabu Barat)',
        inRadius: true,
        distanceMeter: 5,
      },
    };

    playBeepSound();
    onRecordAttendance(newRecord);

    const scanItem: SessionScanItem = {
      id: `scan_${Date.now()}`,
      recordId,
      person,
      personType: isStudent ? 'student' : 'teacher',
      status,
      time: timeStr,
      note,
      type: attendanceType,
      timestamp: Date.now(),
    };

    // Update session scans (keep last 10)
    setSessionScans((prev) => [scanItem, ...prev.slice(0, 9)]);

    if (!rapidScanMode) {
      setLastScanned(scanItem);
    } else {
      setLastScanned(null);
    }

    setInputIdentifier('');
    setUndoFeedback(null);
  };

  // Quick Undo Last Scan Handler
  const handleUndoLastScan = () => {
    if (sessionScans.length === 0) {
      alert('Belum ada riwayat pemindaian pada sesi ini untuk dibatalkan.');
      return;
    }

    const targetToUndo = sessionScans[0];
    if (onDeleteRecord) {
      onDeleteRecord(targetToUndo.recordId);
    }

    setSessionScans((prev) => prev.slice(1));
    if (lastScanned?.recordId === targetToUndo.recordId) {
      setLastScanned(null);
    }

    setUndoFeedback(`Presensi ${targetToUndo.person.name} berhasil dibatalkan (dihapus).`);
    setTimeout(() => setUndoFeedback(null), 4000);
  };

  // Inline Undo Specific Scan Handler
  const handleUndoSpecificScan = (scanItem: SessionScanItem) => {
    if (onDeleteRecord) {
      onDeleteRecord(scanItem.recordId);
    }

    setSessionScans((prev) => prev.filter((s) => s.id !== scanItem.id));
    if (lastScanned?.recordId === scanItem.recordId) {
      setLastScanned(null);
    }

    setUndoFeedback(`Presensi ${scanItem.person.name} berhasil dibatalkan.`);
    setTimeout(() => setUndoFeedback(null), 4000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayLocked) {
      alert(`⚠️ Hari Libur: Presensi ditutup otomatis (${holidayInfo.eventTitle}).`);
      return;
    }
    if (!inputIdentifier.trim()) return;

    if (personType === 'student') {
      const found = safeStudents.find(
        (s) =>
          s.nisn === inputIdentifier.trim() ||
          s.name.toLowerCase().includes(inputIdentifier.toLowerCase())
      );
      if (found) {
        handleScanPerson(found);
      } else {
        alert('NISN atau Nama Siswa tidak ditemukan dalam database.');
      }
    } else {
      const found = safeTeachers.find(
        (t) =>
          t.nip === inputIdentifier.trim() ||
          t.name.toLowerCase().includes(inputIdentifier.toLowerCase())
      );
      if (found) {
        handleScanPerson(found);
      } else {
        alert('NIP atau Nama Guru tidak ditemukan dalam database.');
      }
    }
  };

  // Filter list for quick click simulation
  const filteredStudents = safeStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = safeTeachers.filter(
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
                {holidayInfo.description} • Sistem otomatis mengunci perekaman presensi untuk mencegah
                kekeliruan absensi di hari libur.
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

      {/* Undo Feedback Banner */}
      {undoFeedback && (
        <div className="p-4 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Undo2 className="w-4 h-4" />
            <span>{undoFeedback}</span>
          </div>
          <button
            onClick={() => setUndoFeedback(null)}
            className="p-1 hover:bg-amber-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Config Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900 flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Pemindai QR Code Presensi Siswa & Guru</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Waktu Standar WITA (UTC+8) • Arahkan kamera atau gunakan scanner barcode USB
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Rapid Scan Mode Toggle Button */}
          <button
            onClick={() => setRapidScanMode(!rapidScanMode)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer border ${
              rapidScanMode
                ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Scan Cepat: Hilangkan popup individual untuk antrian siswa pagi hari"
          >
            <Flame className={`w-4 h-4 ${rapidScanMode ? 'animate-bounce text-amber-100' : 'text-slate-500'}`} />
            <span>Mode Scan Kilat (Rapid): {rapidScanMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick Undo Button */}
          <button
            onClick={handleUndoLastScan}
            disabled={sessionScans.length === 0}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              sessionScans.length > 0
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              sessionScans.length > 0
                ? `Batalkan scan terakhir: ${sessionScans[0].person.name}`
                : 'Belum ada scan untuk dibatalkan'
            }
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Urungkan Scan Terakhir</span>
          </button>

          {/* Type Toggle: Masuk vs Pulang */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setAttendanceType('masuk')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                attendanceType === 'masuk'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk (Check-In)
            </button>
            <button
              onClick={() => setAttendanceType('pulang')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                attendanceType === 'pulang'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pulang (Check-Out)
            </button>
          </div>
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
                  Kamera Pemindai Aktif (Waktu WITA)
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs">
                  Batas toleransi masuk: <strong>{config.checkInDeadline} WITA</strong>
                </p>
              </div>

              {/* Status Tags */}
              <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-300 border border-slate-700">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Beep Aktif</span>
                </div>
                {rapidScanMode && (
                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-[10px] text-white font-bold">
                    <Flame className="w-3 h-3" />
                    <span>Mode Kilat ON</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rapid Scan Mode: Compact 5-Item Live Stream Banner */}
          {rapidScanMode && (
            <div className="p-4 rounded-[2rem] bg-amber-50/80 border border-amber-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span className="font-extrabold text-xs text-amber-900">
                    Live Stream Scan Kilat (5 Terakhir)
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {sessionScans.length} Total Sesi Ini
                </span>
              </div>

              {sessionScans.length === 0 ? (
                <p className="text-xs text-slate-500 py-1 italic">
                  Siap memindai kartu... Tempelkan kartu QR siswa secara berurutan.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sessionScans.slice(0, 5).map((scan, idx) => (
                    <div
                      key={scan.id}
                      className="p-2 rounded-xl bg-white border border-amber-200 flex items-center space-x-2 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={scan.person.avatar}
                        alt={scan.person.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {scan.person.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {scan.time} WITA • {scan.status === 'hadir' ? 'Tepat Waktu' : 'Terlambat'}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Standard Mode: Last Scanned Instant Notification Card */}
          {!rapidScanMode && lastScanned && (
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
                    {lastScanned.time} WITA
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 truncate mt-1">
                  {lastScanned.person.name}
                </h4>
                <p className="text-xs text-slate-600">
                  {'className' in lastScanned.person
                    ? lastScanned.person.className
                    : lastScanned.person.subject}{' '}
                  • {lastScanned.note}
                </p>
              </div>
            </div>
          )}

          {/* Manual Input / Barcode Scanner Field */}
          <form
            onSubmit={handleManualSubmit}
            className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs space-y-3"
          >
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Input Manual / Scanner Barcode USB</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputIdentifier}
                onChange={(e) => setInputIdentifier(e.target.value)}
                placeholder={
                  personType === 'student'
                    ? 'Ketik / Scan NISN (Contoh: 0078129001)'
                    : 'Ketik NIP Guru...'
                }
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

        {/* Right Column: Quick Tap Roster List & Live 10 Last Scans */}
        <div className="lg:col-span-6 space-y-5">
          {/* Section: Live List of Last 10 Scans Performed in Current Session */}
          <div className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Live 10 Pemindaian Terakhir (Sesi Ini)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Verifikasi langsung siswa/guru yang baru saja tercatat hadir
                  </p>
                </div>
              </div>

              {sessionScans.length > 0 && (
                <button
                  onClick={() => setSessionScans([])}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Bersihkan Riwayat
                </button>
              )}
            </div>

            {sessionScans.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada pemindaian di sesi ini
                </p>
                <p className="text-[10px] text-slate-400">
                  Hasil scan QR kartu pelajar atau guru akan langsung muncul di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {sessionScans.slice(0, 10).map((scan, idx) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={scan.person.avatar}
                        alt={scan.person.name}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {scan.person.name}
                          </p>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                              scan.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {scan.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {'className' in scan.person ? scan.person.className : scan.person.subject} •{' '}
                          <span className="font-mono">{scan.time} WITA</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUndoSpecificScan(scan)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Batalkan (Hapus) presensi orang ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Tap Roster List */}
          <div className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Cepat Tap Kartu Pelajar</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik tombol <strong>"Tap Kartu"</strong> untuk mensimulasikan scan instan
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
                  Siswa ({safeStudents.length})
                </button>
                <button
                  onClick={() => setPersonType('teacher')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    personType === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guru & GTK ({safeTeachers.length})
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
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {personType === 'student' ? (
                filteredStudents.map((std) => {
                  const alreadyChecked = safeExistingRecords.some(
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
                            <p className="font-bold text-xs text-slate-900 truncate">{std.name}</p>
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
                  const alreadyChecked = safeExistingRecords.some(
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
                            <p className="font-bold text-xs text-slate-900 truncate">{tch.name}</p>
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
