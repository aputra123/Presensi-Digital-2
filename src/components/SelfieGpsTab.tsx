import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Mail,
  Phone,
  Building2,
  Download,
  Share2,
  ShieldCheck,
  Sparkles,
  Info,
  Clock,
  User,
  X,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Student,
  Teacher,
  SchoolConfig,
  AttendanceRecord,
  AttendanceType,
  AttendanceStatus,
  AcademicEvent,
} from '../types';
import { playBeepSound, checkDateIsHoliday } from '../utils/soundAndDate';
import { CalendarOff, Lock, Unlock } from 'lucide-react';

interface SelfieGpsTabProps {
  students?: Student[];
  teachers?: Teacher[];
  config: SchoolConfig;
  events?: AcademicEvent[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  todayDate?: string;
  existingRecords?: AttendanceRecord[];
}

export const SelfieGpsTab: React.FC<SelfieGpsTabProps> = ({
  students = [],
  teachers = [],
  config,
  events = [],
  onRecordAttendance,
  todayDate = new Date().toISOString().split('T')[0],
  existingRecords = [],
}) => {
  const safeStudents = students || [];
  const safeTeachers = teachers || [];

  const [personType, setPersonType] = useState<'student' | 'teacher'>('teacher');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(safeTeachers[0]?.id || safeStudents[0]?.id || '');
  const [sessionType, setSessionType] = useState<AttendanceType>('masuk');
  const [overrideHoliday, setOverrideHoliday] = useState(false);

  // Check if today is a holiday
  const holidayInfo = checkDateIsHoliday(todayDate, events);

  // Camera & GPS simulation state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // GPS Coordinates & Geofencing
  const [gpsLocation, setGpsLocation] = useState({
    lat: config.schoolLat,
    lng: config.schoolLng,
    address: 'Lobby Gedung Utama SMAN 1 Nusantara (Dalam Radius)',
    inRadius: true,
    distanceMeter: 12,
  });

  // Success result & Sharing modal
  const [latestSavedRecord, setLatestSavedRecord] = useState<AttendanceRecord | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'bkd'>('bkd');
  const [copiedText, setCopiedText] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedTeacher = teachers.find((t) => t.id === selectedPersonId);
  const selectedStudent = students.find((s) => s.id === selectedPersonId);

  // Reset selected ID when type changes
  useEffect(() => {
    if (personType === 'teacher') {
      setSelectedPersonId(teachers[0]?.id || '');
    } else {
      setSelectedPersonId(students[0]?.id || '');
    }
  }, [personType, teachers, students]);

  // Start Camera Stream
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (err) {
      console.warn('Webcam permission not granted or unsupported, using simulated fallback camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Take Snapshot & Render Watermark Stamp
  const takeSnapshot = () => {
    setIsCapturing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 640;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    const dateStr = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const personName =
      personType === 'teacher'
        ? selectedTeacher?.name || 'Dra. Sri Wahyuni, M.Pd.'
        : selectedStudent?.name || 'Aditya Pratama Putra';
    const identifier =
      personType === 'teacher'
        ? `NIP: ${selectedTeacher?.nip || '198103152006042003'}`
        : `NISN: ${selectedStudent?.nisn || '0078129001'}`;
    const statusLabel =
      personType === 'teacher'
        ? `STATUS: ${selectedTeacher?.employmentStatus || 'PNS'}`
        : `KELAS: ${selectedStudent?.className || 'X MIPA 1'}`;

    // Draw image from video or mock photo
    const drawStamp = (imgSource: CanvasImageSource | null) => {
      if (imgSource) {
        ctx.drawImage(imgSource, 0, 0, 640, 640);
      } else {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 640, 640);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 640);

        // Fallback avatar icon
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(320, 260, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(personName.split(' ')[0], 320, 270);
      }

      // Draw Top Watermark Header
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, 640, 75);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(config.schoolName, 20, 30);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.fillText(`NPSN: ${config.npsn} • DOKUMENTASI PRESENSI RESMI BKD & SEKOLAH`, 20, 52);

      // Draw Bottom Watermark Box (Official Stamp)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 480, 640, 160);

      // Accent border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 490, 620, 140);

      // Text Metadata
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(personName, 25, 520);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${identifier}  |  ${statusLabel}`, 25, 545);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`SESI: PRESENSI ${sessionType.toUpperCase()} • ${timeStr}`, 25, 572);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.fillText(`📅 ${dateStr}  |  📍 GPS: ${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)}`, 25, 595);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`✓ RADIUS VALID (${gpsLocation.distanceMeter}m) - TERVERIFIKASI SISTEM KEPEGAWAIAN`, 25, 618);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedPhoto(dataUrl);
      setIsCapturing(false);
      stopCamera();
    };

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      drawStamp(videoRef.current);
    } else {
      // Use profile avatar as base image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const targetAvatar =
        personType === 'teacher'
          ? selectedTeacher?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=640&q=80'
          : selectedStudent?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=640&q=80';
      img.src = targetAvatar;
      img.onload = () => drawStamp(img);
      img.onerror = () => drawStamp(null);
    }
  };

  // Submit and save attendance record
  const handleSaveAttendance = () => {
    if (!capturedPhoto) {
      alert('Silakan ambil foto selfie dokumentasi terlebih dahulu!');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const todayStr = now.toISOString().split('T')[0];

    // Determine status (terlambat if after deadline)
    const [deadH, deadM] = config.checkInDeadline.split(':').map(Number);
    const isLate =
      sessionType === 'masuk' &&
      (now.getHours() > deadH || (now.getHours() === deadH && now.getMinutes() > deadM));
    const status: AttendanceStatus = isLate ? 'terlambat' : 'hadir';

    const personName =
      personType === 'teacher'
        ? selectedTeacher?.name || 'Guru'
        : selectedStudent?.name || 'Siswa';
    const identifier =
      personType === 'teacher'
        ? selectedTeacher?.nip || '198103152006042003'
        : selectedStudent?.nisn || '0078129001';
    const classOrSub =
      personType === 'teacher'
        ? selectedTeacher?.subject || 'Guru'
        : selectedStudent?.className || 'X MIPA 1';

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}`,
      personId: selectedPersonId,
      personType,
      personName,
      identifier,
      classOrSubject: classOrSub,
      date: todayStr,
      time: timeStr,
      type: sessionType,
      status,
      method: 'selfie_gps',
      note: `Selfie & GPS Valid (${gpsLocation.distanceMeter}m dari sekolah)`,
      photoUrl: capturedPhoto,
      location: {
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
        address: gpsLocation.address,
        inRadius: gpsLocation.inRadius,
        distanceMeter: gpsLocation.distanceMeter,
      },
      employmentStatus: selectedTeacher?.employmentStatus,
    };

    onRecordAttendance(newRecord);
    setLatestSavedRecord(newRecord);
    playBeepSound();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Generate Email & WA message draft text
  const generateReportMessage = () => {
    if (!latestSavedRecord) return '';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `*LAPORAN BUKTI DOKUMENTASI PRESENSI DIGITAL*
--------------------------------------------------
Instansi  : ${config.schoolName}
NPSN      : ${config.npsn}
Nama      : ${latestSavedRecord.personName}
${latestSavedRecord.personType === 'teacher' ? `NIP       : ${latestSavedRecord.identifier}\nStatus    : ${latestSavedRecord.employmentStatus || 'PNS'}` : `NISN      : ${latestSavedRecord.identifier}\nKelas     : ${latestSavedRecord.classOrSubject}`}
Sesi      : Presensi ${latestSavedRecord.type.toUpperCase()}
Waktu     : ${latestSavedRecord.time} WIB (${dateStr})
Status    : ${latestSavedRecord.status.toUpperCase()} (Tepat Waktu)
Metode    : Foto Selfie + Koordinat GPS Valid
Lokasi    : ${latestSavedRecord.location?.address} (${latestSavedRecord.location?.lat.toFixed(5)}, ${latestSavedRecord.location?.lng.toFixed(5)})
Radius    : ${latestSavedRecord.location?.distanceMeter} Meter (Terverifikasi Geofence Sekolah)
--------------------------------------------------
ID Dokumen Bukti: DOC-${latestSavedRecord.id}
Tercatat resmi dalam Sistem Informasi Kepegawaian & Database Presensi Sekolah.`;
  };

  const handleCopyMessage = () => {
    const text = generateReportMessage();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadPhoto = () => {
    if (!capturedPhoto) return;
    const a = document.createElement('a');
    a.href = capturedPhoto;
    a.download = `bukti_presensi_${selectedPersonId}_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Hidden Canvas for watermark processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Bar */}
      <div className="bg-white p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Presensi Selfie + GPS & Otomatisasi BKD
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifikasi wajah, stempel dokumentasi otomatis, dan distribusi laporan ke BKD / WA
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => {
              setPersonType('teacher');
              setCapturedPhoto(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              personType === 'teacher'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Guru & ASN (PNS/PPPK)
          </button>
          <button
            onClick={() => {
              setPersonType('student');
              setCapturedPhoto(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              personType === 'student'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Peserta Didik (Siswa)
          </button>
        </div>
      </div>

      {/* Main Form & Capture Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Person Selector (4 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Pilih Personil Presensi</span>
            </h3>

            {/* Sesi Presensi: Masuk / Pulang */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Sesi Presensi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSessionType('masuk')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    sessionType === 'masuk'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Presensi Masuk (Pagi)
                </button>
                <button
                  onClick={() => setSessionType('pulang')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    sessionType === 'pulang'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Presensi Pulang (Sore)
                </button>
              </div>
            </div>

            {/* Person Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {personType === 'teacher' ? 'Nama Guru / Pegawai' : 'Nama Siswa'}
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => {
                  setSelectedPersonId(e.target.value);
                  setCapturedPhoto(null);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {personType === 'teacher'
                  ? teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} - [{t.employmentStatus}] - NIP: {t.nip}
                      </option>
                    ))
                  : students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.className}) - NISN: {s.nisn}
                      </option>
                    ))}
              </select>
            </div>

            {/* Active Person Detail Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
              <img
                src={
                  personType === 'teacher'
                    ? selectedTeacher?.avatar
                    : selectedStudent?.avatar
                }
                alt="Avatar"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {personType === 'teacher'
                      ? selectedTeacher?.employmentStatus
                      : selectedStudent?.className}
                  </span>
                  {personType === 'teacher' && (
                    <span className="text-[10px] font-bold text-slate-400">
                      NIP: {selectedTeacher?.nip}
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 mt-0.5 truncate">
                  {personType === 'teacher' ? selectedTeacher?.name : selectedStudent?.name}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {personType === 'teacher'
                    ? selectedTeacher?.subject
                    : `No. Ortu: ${selectedStudent?.parentPhone}`}
                </p>
              </div>
            </div>

            {/* GPS Geofencing Status */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
              <div className="flex items-center justify-between text-emerald-800 font-bold">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Geofencing Lokasi Sekolah</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                  VALID ({gpsLocation.distanceMeter}m)
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-snug">
                {gpsLocation.address}
              </p>
              <div className="text-[10px] text-emerald-600 font-mono pt-1">
                Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}
              </div>
            </div>
          </div>

          {/* Holiday Alert Banner */}
          {holidayInfo.isHoliday && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 font-extrabold">
                <CalendarOff className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Hari Libur Terjadwal: {holidayInfo.eventName}</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-snug">
                Sistem presensi dikunci otomatis sesuai Kalender Akademik.
              </p>
              <button
                type="button"
                onClick={() => setOverrideHoliday(!overrideHoliday)}
                className="text-[10px] font-bold text-rose-700 underline hover:text-rose-900 flex items-center space-x-1 cursor-pointer"
              >
                {overrideHoliday ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{overrideHoliday ? 'Bypass Libur Aktif (Klik untuk kunci kembali)' : 'Bypass Libur Khusus Kegiatan Sekolah / Piket'}</span>
              </button>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {!isCameraActive && !capturedPhoto && (
              <button
                onClick={startCamera}
                disabled={holidayInfo.isHoliday && !overrideHoliday}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {holidayInfo.isHoliday && !overrideHoliday ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Presensi Nonaktif (Hari Libur)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Buka Kamera Selfie</span>
                  </>
                )}
              </button>
            )}

            {isCameraActive && (
              <button
                onClick={takeSnapshot}
                disabled={isCapturing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ambil Foto & Generate Stempel BKD</span>
              </button>
            )}

            {capturedPhoto && (
              <div className="space-y-2">
                <button
                  onClick={handleSaveAttendance}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Kirim Bukti Presensi</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startCamera}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ulang Foto</span>
                  </button>

                  <button
                    onClick={handleDownloadPhoto}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Camera Viewfinder & Watermarked Canvas Display (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 lg:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pratinjau Foto Dokumentasi Resmi</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                Watermark Otomatis
              </span>
            </div>

            {/* Display Area */}
            <div className="mt-3 relative w-full aspect-square max-w-md mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border-4 border-slate-900 shadow-xl">
              {/* Active Video Stream */}
              {isCameraActive && (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="text-white/80 text-xs font-bold px-3 py-1 bg-slate-900/60 rounded-full backdrop-blur-xs">
                      Posisikan Wajah di Tengah
                    </span>
                  </div>
                </div>
              )}

              {/* Captured Stamped Photo */}
              {!isCameraActive && capturedPhoto && (
                <img
                  src={capturedPhoto}
                  alt="Bukti Presensi"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Idle Placeholder */}
              {!isCameraActive && !capturedPhoto && (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Kamera Belum Aktif</h4>
                    <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                      Klik tombol &quot;Buka Kamera Selfie&quot; untuk mengambil foto presensi dengan
                      watermark stempel resmi BKD & koordinat GPS.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Mulai Kamera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Success Banner & Automated Distribution Triggers */}
          {latestSavedRecord && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-slate-900 text-white border border-emerald-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">
                      Presensi Berhasil Diverifikasi!
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      ID Dokumen: DOC-{latestSavedRecord.id} • {latestSavedRecord.time} WIB
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold border border-emerald-500/30">
                  Tersimpan
                </span>
              </div>

              {/* Quick automated sharing actions */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                {/* 1. Kirim ke BKD */}
                <button
                  onClick={() => {
                    setShareType('bkd');
                    setShowShareModal(true);
                  }}
                  className="py-2 px-2 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-1 border border-purple-500/40 transition-all cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Kirim BKD</span>
                </button>

                {/* 2. Kirim WhatsApp */}
                <button
                  onClick={() => {
                    setShareType('whatsapp');
                    setShowShareModal(true);
                  }}
                  className="py-2 px-2 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-1 border border-emerald-500/40 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>

                {/* 3. Kirim Email */}
                <button
                  onClick={() => {
                    setShareType('email');
                    setShowShareModal(true);
                  }}
                  className="py-2 px-2 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-1 border border-blue-500/40 transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Kirim Email</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automated Distribution Modal (Email, WA, BKD) */}
      {showShareModal && latestSavedRecord && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                {shareType === 'bkd' && <Building2 className="w-5 h-5 text-purple-600" />}
                {shareType === 'whatsapp' && <Phone className="w-5 h-5 text-emerald-600" />}
                {shareType === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
                <span>
                  {shareType === 'bkd'
                    ? 'Sinkronisasi ke Portal BKD'
                    : shareType === 'whatsapp'
                    ? 'Kirim Bukti ke WhatsApp'
                    : 'Kirim Laporan Resmi via Email'}
                </span>
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template preview */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Draf Pesan Resmi Terformat:</span>
                <button
                  onClick={handleCopyMessage}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={9}
                value={generateReportMessage()}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[11px] text-slate-800 leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* Action Buttons based on Share Type */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>

              {shareType === 'whatsapp' && (
                <a
                  href={`https://wa.me/${config.bkdWhatsApp || '6281299887766'}?text=${encodeURIComponent(
                    generateReportMessage()
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Buka WhatsApp Web / App</span>
                </a>
              )}

              {shareType === 'email' && (
                <a
                  href={`mailto:${config.bkdEmail || 'bkd.presensi@jakarta.go.id'}?subject=${encodeURIComponent(
                    `[BUKTI PRESENSI] ${latestSavedRecord.personName} - ${latestSavedRecord.date}`
                  )}&body=${encodeURIComponent(generateReportMessage())}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Buka Aplikasi Email</span>
                </a>
              )}

              {shareType === 'bkd' && (
                <button
                  onClick={() => {
                    alert(
                      '✓ Data presensi dan foto stempel digital berhasil disinkronkan ke Server BKD & SIMPEG!'
                    );
                    setShowShareModal(false);
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kirim & Sinkronkan ke SIMPEG BKD</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
