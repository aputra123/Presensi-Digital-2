import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
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
  ShieldAlert,
  ShieldCheck,
  Timer,
  Hourglass,
  Smartphone,
  Play,
  Copy,
  Radio,
  Wifi,
  Send,
  CloudOff,
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
import { getResilientCameraStream, attachStreamToVideoElement } from '../utils/cameraStream';
import { createDynamicQrString, validateQrCodeSecurity } from '../utils/qrSecurity';

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
  isOffline?: boolean;
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
  isOnline?: boolean;
  isManualBlankspot?: boolean;
  onOpenOfflineModal?: () => void;
  pendingOfflineCount?: number;
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
  isOnline = true,
  isManualBlankspot = false,
  onOpenOfflineModal,
  pendingOfflineCount = 0,
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

  // Camera Stream State with Resilient Fallback (Fixing Black Screen)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simCleanupRef = useRef<(() => void) | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraLive, setIsCameraLive] = useState(true);

  // Security & 60-Second Dynamic QR Expiration Management
  const usedNoncesRef = useRef<Set<string>>(new Set());
  const [strictDynamicMode, setStrictDynamicMode] = useState<boolean>(false);
  const [securityAlert, setSecurityAlert] = useState<{
    status: 'expired' | 'already_used' | 'invalid_format';
    title: string;
    message: string;
    expiredSecondsAgo?: number;
  } | null>(null);

  // Dynamic QR Token Generator Modal / Card State (60s Expiration Preview)
  const [showDynamicQrModal, setShowDynamicQrModal] = useState<boolean>(false);
  const [dynamicPersonType, setDynamicPersonType] = useState<'student' | 'teacher'>('teacher');
  const [dynamicSelectedPersonId, setDynamicSelectedPersonId] = useState<string>(
    safeTeachers[0]?.id || safeStudents[0]?.id || ''
  );
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string>('');
  const [dynamicQrString, setDynamicQrString] = useState<string>('');
  const [dynamicTimeLeft, setDynamicTimeLeft] = useState<number>(60);
  const [copiedToken, setCopiedToken] = useState(false);

  // Start Camera Stream with Resilient Engine
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setIsCameraLive(true);
    try {
      const res = await getResilientCameraStream(targetFacing, undefined, 'selfie');
      streamRef.current = res.stream;
      if (res.cleanup) {
        simCleanupRef.current = res.cleanup;
      }
      if (videoRef.current) {
        attachStreamToVideoElement(videoRef.current, res.stream);
      }
    } catch (e) {
      console.warn('Camera stream notice:', e);
    }
  };

  const stopCamera = () => {
    if (simCleanupRef.current) {
      simCleanupRef.current();
      simCleanupRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, []);

  const toggleFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Generate 60-second Dynamic QR Code payload
  const generateDynamicQrCode = async () => {
    const targetPerson =
      dynamicPersonType === 'teacher'
        ? safeTeachers.find((t) => t.id === dynamicSelectedPersonId) || safeTeachers[0]
        : safeStudents.find((s) => s.id === dynamicSelectedPersonId) || safeStudents[0];

    if (!targetPerson) return;

    const identifier = 'nip' in targetPerson ? targetPerson.nip : targetPerson.nisn;
    const { qrString } = createDynamicQrString(
      {
        id: targetPerson.id,
        name: targetPerson.name,
        type: dynamicPersonType,
        identifier,
      },
      60000
    );

    setDynamicQrString(qrString);
    setDynamicTimeLeft(60);

    try {
      const dataUrl = await QRCode.toDataURL(qrString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setDynamicQrDataUrl(dataUrl);
    } catch (err) {
      console.warn('Dynamic QR render notice:', err);
    }
  };

  useEffect(() => {
    if (showDynamicQrModal) {
      generateDynamicQrCode();
    }
  }, [showDynamicQrModal, dynamicSelectedPersonId, dynamicPersonType]);

  // Live 60-Second Countdown Timer
  useEffect(() => {
    if (!showDynamicQrModal) return;
    const interval = setInterval(() => {
      setDynamicTimeLeft((prev) => {
        if (prev <= 1) {
          generateDynamicQrCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDynamicQrModal, dynamicSelectedPersonId, dynamicPersonType]);

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

  const handleScanPerson = (person: Student | Teacher, securityTag?: string) => {
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

    const isEffectivelyOffline = !isOnline || isManualBlankspot;

    const effectiveNote = [
      overrideHoliday ? `${note} (Override Hari Libur)` : note,
      isEffectivelyOffline ? `${note} [Antrean Offline Blankspot]` : note,
      securityTag || 'Metode: QR Scanner Resmi',
    ]
      .filter(Boolean)
      .join(' • ');

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
      note: effectiveNote,
      photoUrl: person.avatar,
      syncStatus: isEffectivelyOffline ? 'pending_sync' : 'synced',
      isOfflineRecord: isEffectivelyOffline,
      syncedAt: isEffectivelyOffline ? undefined : new Date().toISOString(),
      location: {
        lat: config.schoolLat,
        lng: config.schoolLng,
        address: isEffectivelyOffline
          ? 'Pos Pemindai QR Gerbang Sekolah (Perekaman Offline Wilayah Blankspot)'
          : 'Pos Pemindai QR Gerbang Sekolah (SMPN 4 Satap Taliabu Barat)',
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
      isOffline: isEffectivelyOffline,
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

  const parseRawScan = (raw: string): { type: 'student' | 'teacher' | 'unknown'; identifier: string; id?: string } => {
    const text = raw.trim();

    // Check VCard:
    if (text.includes('BEGIN:VCARD')) {
      const nisnMatch = text.match(/NISN[:\s]+([0-9]+)/i);
      const uidMatch = text.match(/UID[:\s]+STUDENT-([a-zA-Z0-9_-]+)/i);
      if (nisnMatch) return { type: 'student', identifier: nisnMatch[1] };
      if (uidMatch) return { type: 'student', identifier: '', id: uidMatch[1] };
    }

    // Check JSON:
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const obj = JSON.parse(text);
        if (obj.nisn) return { type: 'student', identifier: String(obj.nisn), id: obj.id };
        if (obj.nip) return { type: 'teacher', identifier: String(obj.nip), id: obj.id };
      } catch {}
    }

    // Check Unique ID format: UID-STD-<id>-<nisn>
    if (text.startsWith('UID-STD-')) {
      const parts = text.split('-');
      const nisn = parts[parts.length - 1];
      const stdId = parts[2];
      return { type: 'student', identifier: nisn, id: stdId };
    }

    // Check Prefix STD-<nisn>
    if (text.startsWith('STD-')) {
      return { type: 'student', identifier: text.replace('STD-', '') };
    }

    return { type: 'unknown', identifier: text };
  };

  const handleProcessScannedCode = (rawText: string) => {
    if (!rawText.trim()) return;
    if (isHolidayLocked) {
      alert(`⚠️ Hari Libur: Presensi ditutup otomatis (${holidayInfo.eventTitle}).`);
      return;
    }

    // 1. Validate against 60-second expiration and anti-replay
    const val = validateQrCodeSecurity(rawText, usedNoncesRef.current, !strictDynamicMode);
    if (!val.isValid) {
      setSecurityAlert({
        status: val.status as any,
        title:
          val.status === 'expired'
            ? 'KODE QR KADALUWARSA (EXPIRED)'
            : val.status === 'already_used'
            ? 'KODE QR SUDAH DIGUNAKAN (ONE-TIME)'
            : 'VALIDASI QR DITOLAK',
        message: val.message,
        expiredSecondsAgo: val.expiredSecondsAgo,
      });
      return;
    }

    // Register nonce if dynamic to prevent duplicate/replay attacks
    if (val.isDynamic && val.parsedData?.nonce) {
      usedNoncesRef.current.add(val.parsedData.nonce);
    }
    setSecurityAlert(null);

    // 2. Identify Person
    let targetPerson: Student | Teacher | undefined;
    if (val.parsedData) {
      if (val.parsedData.personType === 'student') {
        targetPerson = safeStudents.find(
          (s) =>
            s.id === val.parsedData?.personId ||
            s.nisn === val.parsedData?.identifier ||
            s.name.toLowerCase() === val.parsedData?.name.toLowerCase()
        );
      } else {
        targetPerson = safeTeachers.find(
          (t) =>
            t.id === val.parsedData?.personId ||
            t.nip === val.parsedData?.identifier ||
            t.name.toLowerCase() === val.parsedData?.name.toLowerCase()
        );
      }
    }

    if (!targetPerson) {
      const parsed = parseRawScan(rawText);
      const idToSearch = parsed.identifier || rawText.trim();
      targetPerson =
        safeStudents.find(
          (s) =>
            s.nisn === idToSearch ||
            (Boolean(parsed.id) && s.id === parsed.id) ||
            s.name.toLowerCase().includes(idToSearch.toLowerCase())
        ) ||
        safeTeachers.find(
          (t) =>
            t.nip === idToSearch ||
            (Boolean(parsed.id) && t.id === parsed.id) ||
            t.name.toLowerCase().includes(idToSearch.toLowerCase())
        );
    }

    if (targetPerson) {
      handleScanPerson(
        targetPerson,
        val.isDynamic
          ? `✓ QR Dinamis 60s Terverifikasi (Sisa ${val.remainingSeconds}s)`
          : 'Metode: Kartu Fisik / QR NISN'
      );
    } else {
      alert('Data Siswa atau Guru tidak ditemukan untuk kode pemindaian ini.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputIdentifier.trim()) return;
    handleProcessScannedCode(inputIdentifier.trim());
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
      {/* Mode Blankspot / Offline Status Banner */}
      {!isOnline || isManualBlankspot ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-400/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                  MODE BLANKSPOT AKTIF (OFFLINE)
                </span>
                <span className="font-extrabold text-xs sm:text-sm text-amber-950">
                  Pemindaian Berjalan 100% Normal Tanpa Koneksi Internet
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Wilayah Taliabu Barat tanpa jaringan: Perekaman QR Siswa & Guru tetap instan, disimpan ke antrean lokal, dan siap disinkronkan saat ada sinyal.
              </p>
            </div>
          </div>
          {onOpenOfflineModal && (
            <button
              onClick={onOpenOfflineModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold shrink-0 transition-all shadow-xs flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Pusat Antrean {pendingOfflineCount > 0 ? `(${pendingOfflineCount} Pending)` : ''}</span>
            </button>
          )}
        </div>
      ) : pendingOfflineCount > 0 ? (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white">
                  KONEKSI ONLINE TERDETEKSI
                </span>
                <span className="font-bold text-xs text-emerald-900">
                  Terdapat {pendingOfflineCount} presensi offline dalam antrean
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Koneksi internet telah aktif kembali. Anda dapat langsung mengirim dan menyinkronkan seluruh data ke cloud server.
              </p>
            </div>
          </div>
          {onOpenOfflineModal && (
            <button
              onClick={onOpenOfflineModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shrink-0 transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Presensi Sekarang</span>
            </button>
          )}
        </div>
      ) : null}

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
          {/* Dynamic 60s QR Badge Generator Button */}
          <button
            onClick={() => setShowDynamicQrModal(true)}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xs cursor-pointer transition-all"
            title="Tampilkan Kartu QR Dinamis dengan Masa Berlaku 60 Detik"
          >
            <Timer className="w-4 h-4 text-indigo-200 animate-spin" />
            <span>Kartu QR Dinamis (60 Detik)</span>
          </button>

          {/* Strict 60s Dynamic Mode Toggle */}
          <button
            onClick={() => setStrictDynamicMode(!strictDynamicMode)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              strictDynamicMode
                ? 'bg-purple-700 border-purple-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Wajibkan Kode QR Dinamis 60 Detik (Tolak Kartu Statis)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mode Anti-Manipulasi: {strictDynamicMode ? 'Ketat' : 'Standar'}</span>
          </button>

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
            <span>Mode Kilat: {rapidScanMode ? 'ON' : 'OFF'}</span>
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
            <span>Urungkan</span>
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
              Masuk
            </button>
            <button
              onClick={() => setAttendanceType('pulang')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                attendanceType === 'pulang'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pulang
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Virtual Camera Laser View & Scanner Feedback */}
        <div className="lg:col-span-6 space-y-5">
          {/* Real/Resilient Live Camera Viewfinder (Never Black Screen) */}
          <div className="relative aspect-[4/3] rounded-[2.5rem] bg-slate-950 overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center text-white shadow-lg">
            {/* Live Video Tag connected to resilient camera stream */}
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current) {
                  attachStreamToVideoElement(el, streamRef.current);
                }
              }}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Viewfinder Overlays & Corner Brackets */}
            <div className="absolute inset-4 rounded-3xl border border-dashed border-indigo-500/40 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              {isScanning && (
                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-bounce duration-1000" />
              )}

              {/* Central crosshair aim */}
              <div className="w-44 h-44 border border-white/25 rounded-2xl flex items-center justify-center backdrop-blur-2xs">
                <QrCode className="w-10 h-10 text-white/30 animate-pulse" />
              </div>
            </div>

            {/* Camera Controls Overlay */}
            <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
              <button
                type="button"
                onClick={toggleFacing}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white text-xs font-bold backdrop-blur-md border border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-md"
                title="Ganti Kamera Depan/Belakang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">{facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
              </button>
            </div>

            {/* Bottom Status Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-[10px] text-slate-300 border border-slate-700">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Beep Aktif</span>
                </div>
                {rapidScanMode && (
                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-[10px] text-white font-bold">
                    <Flame className="w-3 h-3" />
                    <span>Mode Kilat ON</span>
                  </div>
                )}
                {strictDynamicMode && (
                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-700/90 text-[10px] text-white font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Anti-Manipulasi 60s</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Alert: Expired or Replayed QR Code Notification */}
          {securityAlert && (
            <div
              className={`p-4 rounded-3xl border shadow-md flex items-start space-x-3.5 transition-all animate-in fade-in slide-in-from-top-2 ${
                securityAlert.status === 'expired'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  securityAlert.status === 'expired' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs uppercase tracking-wide px-2 py-0.5 rounded-md bg-rose-600 text-white">
                    {securityAlert.title}
                  </span>
                  {securityAlert.expiredSecondsAgo !== undefined && securityAlert.expiredSecondsAgo > 0 && (
                    <span className="text-[11px] font-bold text-rose-700">
                      Lewat {securityAlert.expiredSecondsAgo}s
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold mt-1 leading-relaxed">
                  {securityAlert.message}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowDynamicQrModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Buka Kartu QR Dinamis 60s</span>
                  </button>
                  <button
                    onClick={() => setSecurityAlert(null)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Tutup Peringatan
                  </button>
                </div>
              </div>
            </div>
          )}

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
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Berhasil Dipindai!
                  </span>
                  {lastScanned.isOffline && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center space-x-1 shadow-2xs">
                      <Radio className="w-3 h-3 text-slate-950 shrink-0" />
                      <span>Antrean Offline</span>
                    </span>
                  )}
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
                          {scan.isOffline && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 flex items-center space-x-0.5">
                              <Radio className="w-2.5 h-2.5" />
                              <span>Offline</span>
                            </span>
                          )}
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

      {/* Dynamic 60-Second Expiring QR Code Modal */}
      {showDynamicQrModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Kartu QR Dinamis Anti-Manipulasi
                  </h3>
                  <p className="text-[11px] text-slate-500">Masa berlaku otomatis 60 detik (One-Time Token)</p>
                </div>
              </div>
              <button
                onClick={() => setShowDynamicQrModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Switch Person Type */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setDynamicPersonType('teacher');
                  setDynamicSelectedPersonId(safeTeachers[0]?.id || '');
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dynamicPersonType === 'teacher'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Guru & GTK
              </button>
              <button
                type="button"
                onClick={() => {
                  setDynamicPersonType('student');
                  setDynamicSelectedPersonId(safeStudents[0]?.id || '');
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dynamicPersonType === 'student'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Siswa
              </button>
            </div>

            {/* Select Person Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Pilih Nama Personil:</label>
              <select
                value={dynamicSelectedPersonId}
                onChange={(e) => setDynamicSelectedPersonId(e.target.value)}
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30"
              >
                {dynamicPersonType === 'teacher'
                  ? safeTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP: {t.nip}) - {t.subject}
                      </option>
                    ))
                  : safeStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (NISN: {s.nisn}) - {s.className}
                      </option>
                    ))}
              </select>
            </div>

            {/* Dynamic QR Code Card Display */}
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-3">
              {dynamicQrDataUrl ? (
                <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={dynamicQrDataUrl}
                    alt="Kode QR Dinamis 60 Detik"
                    className="w-52 h-52 object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-1 flex justify-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[9px] font-mono font-bold tracking-wider">
                      ONE-TIME TOKEN
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              )}

              {/* Countdown Timer Bar */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center space-x-1.5 text-indigo-700">
                    <Timer className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                    <span>Masa Berlaku Token:</span>
                  </span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                      dynamicTimeLeft <= 10
                        ? 'bg-rose-100 text-rose-700 animate-pulse font-black'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {dynamicTimeLeft} Detik Tersisa
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      dynamicTimeLeft <= 10 ? 'bg-rose-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${(dynamicTimeLeft / 60) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <p className="text-[11px] text-slate-500 leading-snug text-center">
              Kode QR ini otomatis kadaluwarsa dalam <strong>60 detik</strong> atau hangus setelah dipindai satu kali (one-time use) untuk mencegah titip absen atau penggunaan tangkapan layar (screenshot).
            </p>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={generateDynamicQrCode}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Token Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleProcessScannedCode(dynamicQrString);
                  setShowDynamicQrModal(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji Pindai QR Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
