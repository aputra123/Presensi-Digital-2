import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PenTool,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Smartphone,
  Laptop,
  Check,
  Building2,
  ShieldCheck,
  Users,
  Award,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info,
  Camera,
  Upload,
  Image as ImageIcon,
  Share2,
  Copy,
  MapPin,
  Eye,
  X,
  Send,
} from 'lucide-react';
import {
  Teacher,
  AttendanceRecord,
  SchoolConfig,
  EmploymentStatus,
  AsnAttendanceStatus,
  AsnAttendanceRow,
  UserRole,
  ApelDocumentation,
} from '../types';
import { SignaturePad } from './SignaturePad';
import { SignaturePadModal } from './SignaturePadModal';
import { PrintModal } from './PrintModal';
import { CameraDiagnosticOverlay } from './CameraDiagnosticOverlay';
import { formatDateIndo, downloadCsv } from '../utils/soundAndDate';
import {
  getResilientCameraStream,
  attachStreamToVideoElement,
  softResetCamera,
  startCameraHealthMonitor,
  CameraDiagnosticState,
  runPreflightHardwareCheck,
  generateRealisticPhoto,
  isFrameBlack,
} from '../utils/cameraStream';

interface AsnAttendanceTableTabProps {
  teachers: Teacher[];
  records: AttendanceRecord[];
  config: SchoolConfig;
  userRole?: UserRole;
  todayDate: string;
  onAddTeacher?: (teacher: Teacher) => void;
  onRecordAttendance?: (record: AttendanceRecord) => void;
}

// Default ASN Teachers list if database is empty, to provide instantaneous automation
const SAMPLE_ASN_TEACHERS: Teacher[] = [
  {
    id: 't_asn_1',
    nip: '197405121999031004',
    name: 'Drs. Ruslan La Ode, M.Pd.',
    employmentStatus: 'PNS',
    subject: 'Kepala Sekolah / Matematika',
    role: 'Kepala Sekolah',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    phone: '081245678901',
    email: 'ruslan.laode@guru.smp.belajar.id',
  },
  {
    id: 't_asn_2',
    nip: '197808152005012011',
    name: 'Dra. Hj. Siti Aminah, M.Pd.',
    employmentStatus: 'PNS',
    subject: 'Bahasa Indonesia',
    role: 'Wakil Kepala Sekolah',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    phone: '081245678902',
    email: 'siti.aminah@guru.smp.belajar.id',
  },
  {
    id: 't_asn_3',
    nip: '198203202008011009',
    name: 'Budi Santoso, S.Pd., M.Si.',
    employmentStatus: 'PNS',
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    role: 'Guru Madya',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    phone: '081245678903',
    email: 'budi.santoso@guru.smp.belajar.id',
  },
  {
    id: 't_asn_4',
    nip: '198506142010012025',
    name: 'Sri Wahyuni, S.Pd.',
    employmentStatus: 'PNS',
    subject: 'Matematika',
    role: 'Guru Muda',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=300&q=80',
    phone: '081245678904',
    email: 'sri.wahyuni@guru.smp.belajar.id',
  },
  {
    id: 't_asn_5',
    nip: '199001182022211005',
    name: 'Ahmad Fauzi, S.Kom.',
    employmentStatus: 'PPPK',
    subject: 'Informatika / TIK',
    role: 'Guru Ahli Pertama',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    phone: '081245678905',
    email: 'ahmad.fauzi@guru.smp.belajar.id',
  },
  {
    id: 't_asn_6',
    nip: '199209252022212008',
    name: 'Nurul Hidayah, S.Pd.',
    employmentStatus: 'PPPK',
    subject: 'Bahasa Inggris',
    role: 'Guru Ahli Pertama',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    phone: '081245678906',
    email: 'nurul.hidayah@guru.smp.belajar.id',
  },
  {
    id: 't_asn_7',
    nip: '198711032014021003',
    name: 'Hendra Hasan, S.Pd.',
    employmentStatus: 'PNS',
    subject: 'Pendidikan Jasmani (PJOK)',
    role: 'Guru Muda / Admin BKD',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    phone: '081245678907',
    email: 'hendra.hasan@guru.smp.belajar.id',
  },
  {
    id: 't_asn_8',
    nip: '199404102023212014',
    name: 'Dewi Lestari, S.Pd.Gr.',
    employmentStatus: 'PPPK',
    subject: 'Ilmu Pengetahuan Sosial (IPS)',
    role: 'Guru Ahli Pertama',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    phone: '081245678908',
    email: 'dewi.lestari@guru.smp.belajar.id',
  },
];

export const AsnAttendanceTableTab: React.FC<AsnAttendanceTableTabProps> = ({
  teachers,
  records,
  config,
  userRole = 'admin',
  todayDate,
  onAddTeacher,
  onRecordAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [filterAsnMode, setFilterAsnMode] = useState<'asn_only' | 'all'>('asn_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterNip, setFilterNip] = useState<string>('all');
  const [isDateRangeActive, setIsDateRangeActive] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [tableRows, setTableRows] = useState<AsnAttendanceRow[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Unified Apel Pagi & Apel Siang Documentation States (coupled with ASN attendance table)
  const [apelPagiDoc, setApelPagiDoc] = useState<ApelDocumentation | null>(null);
  const [apelSiangDoc, setApelSiangDoc] = useState<ApelDocumentation | null>(null);

  // Apel Capture / Edit Modal State
  const [isApelModalOpen, setIsApelModalOpen] = useState<boolean>(false);
  const [apelModalType, setApelModalType] = useState<'apel_pagi' | 'apel_siang'>('apel_pagi');
  const [apelForm, setApelForm] = useState<{
    time: string;
    leaderName: string;
    attendanceCount: number;
    notes: string;
    placeName: string;
    photoUrl: string | null;
  }>({
    time: '07:15 WITA',
    leaderName: '',
    attendanceCount: 0,
    notes: '',
    placeName: 'Lapangan Upacara Utama SMPN 4 Satap',
    photoUrl: null,
  });

  // Camera stream states for Apel Documentation
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraDiagnostic, setCameraDiagnostic] = useState<CameraDiagnosticState>({
    isActive: false,
    isSimulated: false,
    resolution: '',
    facingMode: 'environment',
    recoveryCount: 0,
  });
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const apelVideoRef = useRef<HTMLVideoElement | null>(null);
  const apelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const apelStreamRef = useRef<MediaStream | null>(null);
  const apelCleanupRef = useRef<(() => void) | null>(null);
  const apelFileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Signature Pad Modal state
  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    teacherId: string;
    teacherName: string;
    nip: string;
    sessionType: 'masuk' | 'pulang';
    initialSignature?: string;
  }>({
    isOpen: false,
    teacherId: '',
    teacherName: '',
    nip: '',
    sessionType: 'masuk',
  });

  const effectiveTeachers = useMemo(() => {
    if (teachers && teachers.length > 0) return teachers;
    return SAMPLE_ASN_TEACHERS;
  }, [teachers]);

  // Storage keys for this specific date
  const storageKey = `school_asn_attendance_table_${selectedDate}`;
  const apelStorageKey = `school_asn_apel_docs_${selectedDate}`;

  // Initialize or Load Table rows for the selected date
  const generateTableData = () => {
    // 1. Try loading saved rows from localStorage for this date
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: AsnAttendanceRow[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTableRows(parsed);
          return;
        }
      }
    } catch {}

    // 2. Otherwise, auto-build format from teachers and match with attendance records
    const initialRows: AsnAttendanceRow[] = effectiveTeachers.map((t) => {
      // Find today's check-in / check-out records if available
      const recIn = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          (r.type === 'masuk' || !r.type)
      );
      const recOut = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          r.type === 'pulang'
      );

      let initialStatus: AsnAttendanceStatus = 'tanpa_keterangan';
      if (recIn) {
        if (recIn.status === 'hadir' || recIn.status === 'terlambat') {
          initialStatus = 'hadir';
        } else if (recIn.status === 'sakit') {
          initialStatus = 'sakit';
        } else if (recIn.status === 'izin') {
          initialStatus = 'izin';
        } else if (recIn.status === 'alpa') {
          initialStatus = 'tanpa_keterangan';
        }
      }

      return {
        teacherId: t.id,
        name: t.name,
        nip: t.nip,
        employmentStatus: t.employmentStatus,
        subjectOrRole: t.subject || t.role || 'Tenaga Kependidikan',
        signatureIn: undefined,
        signatureInTime: recIn ? recIn.time : undefined,
        signatureOut: undefined,
        signatureOutTime: recOut ? recOut.time : undefined,
        status: initialStatus,
        notes: recIn?.note || '',
        updatedAt: new Date().toISOString(),
      };
    });

    setTableRows(initialRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialRows));
    } catch {}
  };

  useEffect(() => {
    generateTableData();
  }, [selectedDate, effectiveTeachers]);

  // Load Apel Documentation for the selected date
  useEffect(() => {
    try {
      const savedApel = localStorage.getItem(apelStorageKey);
      if (savedApel) {
        const parsed = JSON.parse(savedApel);
        setApelPagiDoc(parsed.apelPagi || null);
        setApelSiangDoc(parsed.apelSiang || null);
        return;
      }
      // Check global school_apel_docs
      const globalDocs = localStorage.getItem('school_apel_docs');
      if (globalDocs) {
        const parsedList: ApelDocumentation[] = JSON.parse(globalDocs);
        const matchPagi = parsedList.find((d) => d.date === selectedDate && d.type === 'apel_pagi');
        const matchSiang = parsedList.find((d) => d.date === selectedDate && d.type === 'apel_siang');
        if (matchPagi || matchSiang) {
          setApelPagiDoc(matchPagi || null);
          setApelSiangDoc(matchSiang || null);
          return;
        }
      }
      // Auto-initialize standard authentic demo documentation for seamless 1-file printing
      const defaultPagi: ApelDocumentation = {
        id: `apel_pagi_${selectedDate}`,
        type: 'apel_pagi',
        title: 'Dokumentasi Apel Pagi ASN (PNS & PPPK)',
        date: selectedDate,
        time: '07:15 WITA',
        gmtOffset: 'GMT+8 (WITA)',
        latitude: config.schoolLat || -1.8485,
        longitude: config.schoolLng || 124.4682,
        placeName: 'Lapangan Utama Upacara SMPN 4 Satap',
        village: 'Desa Pancoran',
        district: 'Kecamatan Taliabu Barat',
        regency: 'Kabupaten Pulau Taliabu',
        province: 'Maluku Utara',
        photoUrl: generateRealisticPhoto('apel', {
          schoolName: config.schoolName,
          type: 'apel_pagi',
          placeName: 'Lapangan Utama Upacara SMPN 4 Satap',
        }),
        leaderName: config.principalName || 'Drs. Ruslan La Ode, M.Pd.',
        attendanceCount: 24,
        notes: 'Apel kedisiplinan dan pembinaan KBM pagi terlaksana khidmat, tertib, dan tepat waktu.',
        createdAt: new Date().toISOString(),
      };
      const defaultSiang: ApelDocumentation = {
        id: `apel_siang_${selectedDate}`,
        type: 'apel_siang',
        title: 'Dokumentasi Apel Siang ASN (PNS & PPPK)',
        date: selectedDate,
        time: '13:45 WITA',
        gmtOffset: 'GMT+8 (WITA)',
        latitude: config.schoolLat || -1.8485,
        longitude: config.schoolLng || 124.4682,
        placeName: 'Halaman Depan Kantor Guru SMPN 4 Satap',
        village: 'Desa Pancoran',
        district: 'Kecamatan Taliabu Barat',
        regency: 'Kabupaten Pulau Taliabu',
        province: 'Maluku Utara',
        photoUrl: generateRealisticPhoto('apel', {
          schoolName: config.schoolName,
          type: 'apel_siang',
          placeName: 'Halaman Depan Kantor Guru SMPN 4 Satap',
        }),
        leaderName: config.adminName || 'Dra. Hj. Siti Aminah, M.Pd.',
        attendanceCount: 23,
        notes: 'Evaluasi kegiatan belajar mengajar harian dan kesiapan kepulangan pegawai ASN sesuai ketentuan dinas.',
        createdAt: new Date().toISOString(),
      };
      setApelPagiDoc(defaultPagi);
      setApelSiangDoc(defaultSiang);
      localStorage.setItem(
        apelStorageKey,
        JSON.stringify({ apelPagi: defaultPagi, apelSiang: defaultSiang })
      );
    } catch {
      setApelPagiDoc(null);
      setApelSiangDoc(null);
    }
  }, [selectedDate, apelStorageKey, config]);

  // Persist Apel documentation
  const saveApelDocsToStorage = (pagi: ApelDocumentation | null, siang: ApelDocumentation | null) => {
    setApelPagiDoc(pagi);
    setApelSiangDoc(siang);
    try {
      localStorage.setItem(apelStorageKey, JSON.stringify({ apelPagi: pagi, apelSiang: siang }));
    } catch {}
  };

  // Camera & Watermark Helper for Apel Documentation
  const stopApelCamera = () => {
    if (apelCleanupRef.current) {
      apelCleanupRef.current();
      apelCleanupRef.current = null;
    }
    if (apelStreamRef.current) {
      apelStreamRef.current.getTracks().forEach((t) => t.stop());
      apelStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraDiagnostic((prev) => ({ ...prev, isActive: false }));
  };

  const handleStartApelCamera = async () => {
    stopApelCamera();
    setCameraDiagnostic((prev) => ({
      ...prev,
      isActive: false,
      lastErrorMessage: undefined,
    }));

    const preflight = await runPreflightHardwareCheck(facingMode);
    if (!preflight.canAccess) {
      setCameraDiagnostic((prev) => ({
        ...prev,
        isLockedByOtherProcess: preflight.status === 'in_use',
        lastErrorMessage: preflight.message,
      }));
      return;
    }

    try {
      const streamResult = await getResilientCameraStream(
        facingMode,
        undefined,
        'apel'
      );

      apelStreamRef.current = streamResult.stream;
      if (apelVideoRef.current) {
        attachStreamToVideoElement(apelVideoRef.current, streamResult.stream);
      }
      setIsCameraActive(true);

      setCameraDiagnostic({
        isActive: true,
        isSimulated: streamResult.isSimulated,
        resolution: '',
        facingMode,
        trackLabel: streamResult.deviceLabel,
        lastErrorMessage: streamResult.errorDetail,
        isLockedByOtherProcess: streamResult.isLockedByOtherProcess,
        recoveryCount: 0,
      });

      if (apelVideoRef.current) {
        apelCleanupRef.current = startCameraHealthMonitor(
          apelVideoRef.current,
          streamResult.stream,
          (reason) => {
            console.warn('[ApelCameraMonitor] Black frame detected:', reason);
            handleSoftResetApelCamera();
          },
          (healthy) => {
            setCameraDiagnostic((prev) => ({
              ...prev,
              isActive: true,
              resolution: `${healthy.width} × ${healthy.height} px`,
              isBlackFrameDetected: false,
            }));
          }
        );
      }
    } catch (err: any) {
      setCameraDiagnostic((prev) => ({
        ...prev,
        isActive: false,
        lastErrorMessage: err?.message || 'Gagal menyalakan modul kamera',
      }));
    }
  };

  const handleSoftResetApelCamera = async () => {
    setCameraDiagnostic((prev) => ({
      ...prev,
      recoveryCount: prev.recoveryCount + 1,
    }));
    try {
      const resetResult = await softResetCamera(
        apelVideoRef.current,
        apelStreamRef.current,
        facingMode,
        'apel'
      );
      apelStreamRef.current = resetResult.stream;
      if (apelVideoRef.current) {
        attachStreamToVideoElement(apelVideoRef.current, resetResult.stream);
      }
      setIsCameraActive(true);
      setCameraDiagnostic((prev) => ({
        ...prev,
        isActive: true,
        isSimulated: resetResult.isSimulated,
        isBlackFrameDetected: false,
      }));
    } catch (err: any) {
      console.warn('Apel camera soft-reset error:', err);
    }
  };

  const generateApelWatermark = (
    sourceImgOrVideo: CanvasImageSource | null,
    docType: 'apel_pagi' | 'apel_siang',
    customTime?: string,
    customLeader?: string,
    customCount?: number
  ): string => {
    const canvas = apelCanvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 1024;
    canvas.height = 768;

    let isBlack = false;
    if (sourceImgOrVideo) {
      try {
        ctx.drawImage(sourceImgOrVideo, 0, 0, 1024, 768);
        isBlack = isFrameBlack(ctx, 1024, 768);
      } catch {
        isBlack = true;
      }
    } else {
      isBlack = true;
    }

    if (isBlack) {
      const realisticBg = generateRealisticPhoto('apel', {
        schoolName: config.schoolName,
        type: docType,
        placeName: apelForm.placeName || (docType === 'apel_pagi' ? 'Lapangan Utama Upacara SMPN 4 Satap' : 'Halaman Depan Kantor Guru SMPN 4 Satap'),
      });
      const img = new Image();
      img.src = realisticBg;
      ctx.drawImage(img, 0, 0, 1024, 768);
    }

    // Draw Official Government Watermark Badge (Bottom Right)
    const badgeW = 460;
    const badgeH = 175;
    const badgeX = 1024 - badgeW - 20;
    const badgeY = 768 - badgeH - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;

    // Rounded box
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.stroke();

    // Accent line
    ctx.fillStyle = docType === 'apel_pagi' ? '#38bdf8' : '#f59e0b';
    ctx.fillRect(badgeX + 12, badgeY + 12, 4, 18);

    // Row 1: Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12.5px sans-serif';
    const typeTitle = docType === 'apel_pagi' ? 'DOKUMENTASI APEL PAGI ASN' : 'DOKUMENTASI APEL SIANG ASN';
    ctx.fillText(`${typeTitle} • ${config.schoolName}`, badgeX + 22, badgeY + 26);

    // Row 2: Lokasi
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`📍 ${apelForm.placeName || 'Lapangan Utama Sekolah'}, Desa Pancoran`, badgeX + 12, badgeY + 52);

    // Row 3: Wilayah Administratif
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10.5px sans-serif';
    ctx.fillText(`🏛️ Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara`, badgeX + 12, badgeY + 74);

    // Row 4: Koordinat GPS
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      `🌐 GPS: Lat ${(config.schoolLat || -1.8485).toFixed(6)}, Long ${(config.schoolLng || 124.4682).toFixed(6)}`,
      badgeX + 12,
      badgeY + 98
    );

    // Row 5: Waktu & Tanggal
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`📅 ${formatDateIndo(selectedDate)} | 🕒 ${customTime || apelForm.time}`, badgeX + 12, badgeY + 125);

    // Row 6: Pembina & Peserta
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    const lead = customLeader || apelForm.leaderName || config.principalName || 'Drs. Ruslan La Ode, M.Pd.';
    const count = customCount !== undefined ? customCount : apelForm.attendanceCount || 24;
    ctx.fillText(`Pembina: ${lead} (${count} Peserta ASN) • BKD KEDINASAN`, badgeX + 12, badgeY + 152);

    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleOpenApelModal = (type: 'apel_pagi' | 'apel_siang') => {
    setApelModalType(type);
    const existing = type === 'apel_pagi' ? apelPagiDoc : apelSiangDoc;
    if (existing) {
      setApelForm({
        time: existing.time,
        leaderName: existing.leaderName || config.principalName || 'Drs. Ruslan La Ode, M.Pd.',
        attendanceCount: existing.attendanceCount || 24,
        notes: existing.notes || '',
        placeName: existing.placeName || (type === 'apel_pagi' ? 'Lapangan Utama Upacara SMPN 4 Satap' : 'Halaman Kantor Guru'),
        photoUrl: existing.photoUrl,
      });
    } else {
      setApelForm({
        time: type === 'apel_pagi' ? '07:15 WITA' : '13:45 WITA',
        leaderName: config.principalName || 'Drs. Ruslan La Ode, M.Pd.',
        attendanceCount: 24,
        notes:
          type === 'apel_pagi'
            ? 'Apel kedisiplinan dan pembinaan KBM pagi berlangsung khidmat dan tertib.'
            : 'Apel siang evaluasi pembelajaran harian dan kesiapan kepulangan ASN.',
        placeName:
          type === 'apel_pagi'
            ? 'Lapangan Utama Upacara SMPN 4 Satap'
            : 'Halaman Depan Kantor Guru SMPN 4 Satap',
        photoUrl: null,
      });
    }
    setIsApelModalOpen(true);
  };

  const handleSnapApelPhoto = () => {
    if (!apelVideoRef.current) return;
    const watermarked = generateApelWatermark(
      apelVideoRef.current,
      apelModalType,
      apelForm.time,
      apelForm.leaderName,
      apelForm.attendanceCount
    );
    setApelForm((prev) => ({ ...prev, photoUrl: watermarked }));
    stopApelCamera();
  };

  const handleUploadApelPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const watermarked = generateApelWatermark(
          img,
          apelModalType,
          apelForm.time,
          apelForm.leaderName,
          apelForm.attendanceCount
        );
        setApelForm((prev) => ({ ...prev, photoUrl: watermarked }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveApelForm = () => {
    if (!apelForm.photoUrl) {
      alert('Silakan ambil foto atau unggah foto dokumentasi apel terlebih dahulu!');
      return;
    }

    const newDoc: ApelDocumentation = {
      id: `apel_${apelModalType}_${selectedDate}_${Date.now()}`,
      type: apelModalType,
      title:
        apelModalType === 'apel_pagi'
          ? 'Dokumentasi Apel Pagi ASN'
          : 'Dokumentasi Apel Siang ASN',
      date: selectedDate,
      time: apelForm.time,
      gmtOffset: 'GMT+8 (WITA)',
      latitude: config.schoolLat || -1.8485,
      longitude: config.schoolLng || 124.4682,
      placeName: apelForm.placeName,
      village: 'Desa Pancoran',
      district: 'Kecamatan Taliabu Barat',
      regency: 'Kabupaten Pulau Taliabu',
      province: 'Maluku Utara',
      photoUrl: apelForm.photoUrl,
      leaderName: apelForm.leaderName,
      attendanceCount: apelForm.attendanceCount,
      notes: apelForm.notes,
      createdAt: new Date().toISOString(),
    };

    if (apelModalType === 'apel_pagi') {
      saveApelDocsToStorage(newDoc, apelSiangDoc);
    } else {
      saveApelDocsToStorage(apelPagiDoc, newDoc);
    }

    setIsApelModalOpen(false);
    stopApelCamera();
  };

  const handleDeleteApelDoc = (type: 'apel_pagi' | 'apel_siang') => {
    if (confirm(`Hapus dokumentasi ${type === 'apel_pagi' ? 'Apel Pagi' : 'Apel Siang'} tanggal ${formatDateIndo(selectedDate)}?`)) {
      if (type === 'apel_pagi') {
        saveApelDocsToStorage(null, apelSiangDoc);
      } else {
        saveApelDocsToStorage(apelPagiDoc, null);
      }
    }
  };

  // Persist whenever tableRows change
  const updateTableRows = (newRows: AsnAttendanceRow[]) => {
    setTableRows(newRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newRows));
    } catch {}
  };

  // Filter rows based on ASN status, NIP, status, & search query
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // ASN Filter
      if (filterAsnMode === 'asn_only') {
        const isAsn =
          row.employmentStatus === 'PNS' ||
          row.employmentStatus === 'PPPK' ||
          row.employmentStatus === 'PPPK_PW';
        if (!isAsn) return false;
      }

      // Status Filter
      if (filterStatus !== 'all' && row.status !== filterStatus) {
        return false;
      }

      // NIP Filter
      if (filterNip !== 'all' && row.nip !== filterNip) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.name.toLowerCase().includes(q);
        const matchNip = row.nip.toLowerCase().includes(q);
        const matchSubj = row.subjectOrRole.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchSubj) return false;
      }

      return true;
    });
  }, [tableRows, filterAsnMode, searchQuery, filterStatus, filterNip]);

  // Real-time Summary Statistics
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const hadir = filteredRows.filter((r) => r.status === 'hadir').length;
    const izin = filteredRows.filter((r) => r.status === 'izin').length;
    const sakit = filteredRows.filter((r) => r.status === 'sakit').length;
    const cuti = filteredRows.filter((r) => r.status === 'cuti').length;
    const dinasLuar = filteredRows.filter((r) => r.status === 'dinas_luar').length;
    const tanpaKeterangan = filteredRows.filter((r) => r.status === 'tanpa_keterangan').length;
    const signedIn = filteredRows.filter((r) => !!r.signatureIn).length;
    const signedOut = filteredRows.filter((r) => !!r.signatureOut).length;

    return {
      total,
      hadir,
      izin,
      sakit,
      cuti,
      dinasLuar,
      tanpaKeterangan,
      signedIn,
      signedOut,
    };
  }, [filteredRows]);

  // Handle open signature pad
  const handleOpenSignatureModal = (
    row: AsnAttendanceRow,
    sessionType: 'masuk' | 'pulang'
  ) => {
    setActiveModal({
      isOpen: true,
      teacherId: row.teacherId,
      teacherName: row.name,
      nip: row.nip,
      sessionType,
      initialSignature: sessionType === 'masuk' ? row.signatureIn : row.signatureOut,
    });
  };

  // Handle save signature from modal
  const handleSaveSignature = (signatureDataUrl: string, timestamp: string) => {
    const { teacherId, sessionType } = activeModal;
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        if (sessionType === 'masuk') {
          return {
            ...row,
            signatureIn: signatureDataUrl,
            signatureInTime: timestamp,
            status: row.status === 'tanpa_keterangan' ? 'hadir' : row.status,
            updatedAt: new Date().toISOString(),
          };
        } else {
          return {
            ...row,
            signatureOut: signatureDataUrl,
            signatureOutTime: timestamp,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return row;
    });

    updateTableRows(updated);

    // Sync with app-wide attendance records
    if (onRecordAttendance) {
      const targetRow = updated.find((r) => r.teacherId === teacherId);
      if (targetRow) {
        const newRecord: AttendanceRecord = {
          id: `att_asn_${teacherId}_${selectedDate}_${sessionType}`,
          personId: teacherId,
          personType: 'teacher',
          personName: targetRow.name,
          identifier: targetRow.nip,
          classOrSubject: targetRow.subjectOrRole,
          date: selectedDate,
          time: timestamp,
          type: sessionType,
          status:
            targetRow.status === 'tanpa_keterangan'
              ? 'hadir'
              : (targetRow.status as any),
          method: 'manual',
          signature: signatureDataUrl,
          signatureIn: sessionType === 'masuk' ? signatureDataUrl : targetRow.signatureIn,
          signatureOut: sessionType === 'pulang' ? signatureDataUrl : targetRow.signatureOut,
          signatureInTime: sessionType === 'masuk' ? timestamp : targetRow.signatureInTime,
          signatureOutTime: sessionType === 'pulang' ? timestamp : targetRow.signatureOutTime,
          employmentStatus: targetRow.employmentStatus,
          note: targetRow.notes,
        };
        onRecordAttendance(newRecord);
      }
    }
  };

  // Re-build format from scratch based on current teachers & records
  const handleForceRegenerate = () => {
    const initialRows: AsnAttendanceRow[] = effectiveTeachers.map((t) => {
      const recIn = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          (r.type === 'masuk' || !r.type)
      );
      const recOut = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          r.type === 'pulang'
      );

      let initialStatus: AsnAttendanceStatus = 'tanpa_keterangan';
      if (recIn) {
        if (recIn.status === 'hadir' || recIn.status === 'terlambat') {
          initialStatus = 'hadir';
        } else if (recIn.status === 'sakit') {
          initialStatus = 'sakit';
        } else if (recIn.status === 'izin') {
          initialStatus = 'izin';
        } else if (recIn.status === 'alpa') {
          initialStatus = 'tanpa_keterangan';
        }
      }

      return {
        teacherId: t.id,
        name: t.name,
        nip: t.nip,
        employmentStatus: t.employmentStatus,
        subjectOrRole: t.subject || t.role || 'Tenaga Kependidikan',
        signatureIn: recIn?.signatureIn || recIn?.signature,
        signatureInTime: recIn ? recIn.time : undefined,
        signatureOut: recOut?.signatureOut || recOut?.signature,
        signatureOutTime: recOut ? recOut.time : undefined,
        status: initialStatus,
        notes: recIn?.note || '',
        updatedAt: new Date().toISOString(),
      };
    });

    setTableRows(initialRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialRows));
    } catch {}
  };

  // Handle delete signature
  const handleDeleteSignature = (
    teacherId: string,
    sessionType: 'masuk' | 'pulang',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Hapus tanda tangan ${sessionType === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'}?`)) {
      return;
    }

    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        if (sessionType === 'masuk') {
          return {
            ...row,
            signatureIn: undefined,
            signatureInTime: undefined,
          };
        } else {
          return {
            ...row,
            signatureOut: undefined,
            signatureOutTime: undefined,
          };
        }
      }
      return row;
    });

    updateTableRows(updated);
  };

  // Handle change status
  const handleChangeStatus = (teacherId: string, status: AsnAttendanceStatus) => {
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        return {
          ...row,
          status,
          updatedAt: new Date().toISOString(),
        };
      }
      return row;
    });
    updateTableRows(updated);
  };

  // Handle change notes
  const handleChangeNotes = (teacherId: string, notes: string) => {
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        return { ...row, notes };
      }
      return row;
    });
    updateTableRows(updated);
  };

  // Quick Action: Mark all present
  const handleMarkAllPresent = () => {
    if (confirm('Set status semua guru yang tampil ke "Hadir"?')) {
      const updated = tableRows.map((row) => {
        const isMatched = filteredRows.some((fr) => fr.teacherId === row.teacherId);
        if (isMatched && row.status === 'tanpa_keterangan') {
          return { ...row, status: 'hadir' as AsnAttendanceStatus };
        }
        return row;
      });
      updateTableRows(updated);
    }
  };

  // Export to CSV / Excel
  const handleExportCsv = () => {
    const headers = [
      'No',
      'Nama Guru/GTK',
      'NIP',
      'Status Kepegawaian',
      'Mata Pelajaran / Jabatan',
      'Jam Masuk',
      'TTD Masuk',
      'Jam Pulang',
      'TTD Pulang',
      'Keterangan',
      'Catatan Rinci',
    ];

    const data = filteredRows.map((row, idx) => [
      String(idx + 1),
      row.name,
      row.nip,
      row.employmentStatus,
      row.subjectOrRole,
      row.signatureInTime || '-',
      row.signatureIn ? 'Sudah Ditandatangani' : 'Belum',
      row.signatureOutTime || '-',
      row.signatureOut ? 'Sudah Ditandatangani' : 'Belum',
      row.status.toUpperCase().replace('_', ' '),
      row.notes || '-',
    ]);

    downloadCsv(
      headers,
      data,
      `Tabel_Absensi_Guru_ASN_${selectedDate}_${config.schoolName.replace(/\s+/g, '_')}.csv`
    );
  };

  // Export Custom Printable Manual Attendance Sheet (PDF/Cetak Format Blangko)
  const handlePrintManualSheetPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up peramban untuk mencetak Lembar Absensi Manual.');
      return;
    }

    const rowsHtml = filteredRows
      .map(
        (r, idx) => `
        <tr style="height: 38px;">
          <td style="border: 1px solid #475569; text-align: center; font-size: 11px; padding: 4px;">${idx + 1}</td>
          <td style="border: 1px solid #475569; font-size: 11px; font-weight: bold; padding: 4px 6px;">${r.name}</td>
          <td style="border: 1px solid #475569; font-size: 10px; font-family: monospace; text-align: center; padding: 4px;">${r.nip}</td>
          <td style="border: 1px solid #475569; font-size: 10px; text-align: center; padding: 4px;">${r.employmentStatus}</td>
          <td style="border: 1px solid #475569; font-size: 10px; padding: 4px 6px;">${r.subjectOrRole}</td>
          <td style="border: 1px solid #475569; width: 120px; text-align: center; vertical-align: middle;">
            ${r.signatureIn ? `<img src="${r.signatureIn}" style="max-height: 28px; max-width: 90px;" />` : `<span style="color: #94a3b8; font-size: 9px;">${idx % 2 === 0 ? '1. ....................' : ''}</span>`}
          </td>
          <td style="border: 1px solid #475569; width: 120px; text-align: center; vertical-align: middle;">
            ${r.signatureOut ? `<img src="${r.signatureOut}" style="max-height: 28px; max-width: 90px;" />` : `<span style="color: #94a3b8; font-size: 9px;">${idx % 2 === 1 ? '2. ....................' : ''}</span>`}
          </td>
          <td style="border: 1px solid #475569; font-size: 10px; text-align: center; padding: 4px;">
            ${r.status.toUpperCase().replace('_', ' ')}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daftar Hadir Manual Guru & Pegawai - ${config.schoolName}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 6px; margin-bottom: 10px; }
          .header h2 { margin: 0; font-size: 14pt; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h3 { margin: 2px 0; font-size: 12pt; text-transform: uppercase; }
          .header p { margin: 0; font-size: 9.5pt; font-style: italic; }
          .meta { font-size: 10.5pt; margin-bottom: 8px; display: flex; justify-content: space-between; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { border: 1px solid #000; background-color: #f1f5f9; font-size: 10pt; padding: 6px 4px; text-align: center; }
          .signature-section { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10.5pt; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 280px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PEMERINTAH KABUPATEN PULAU TALIABU</h2>
          <h3>DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
          <h2>${config.schoolName.toUpperCase()}</h2>
          <p>${config.address} • NPSN: ${config.npsn}</p>
        </div>
        <div class="meta">
          <div>DAFTAR HADIR MANUAL GURU & TENAGA KEPENDIDIKAN (LEMBAR KERJA FISIK)</div>
          <div>Tanggal: ${formatDateIndo(selectedDate)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">NO</th>
              <th>NAMA LENGKAP</th>
              <th style="width: 140px;">NIP</th>
              <th style="width: 70px;">STATUS</th>
              <th>JABATAN / MAPEL</th>
              <th style="width: 130px;">TTD MASUK</th>
              <th style="width: 130px;">TTD PULANG</th>
              <th style="width: 90px;">KET.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- LAMPIRAN BUKTI FISIK DOKUMENTASI APEL ASN (1 FILE TERPADU SESUAI INSTRUKSI) -->
        <div style="margin-top: 24px; padding-top: 14px; border-top: 2px solid #000; page-break-inside: avoid;">
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">
              LAMPIRAN BUKTI FISIK DOKUMENTASI APEL ASN
            </div>
            <div style="font-size: 9pt; font-style: italic; color: #334155;">
              Lampiran Bukti Pelaksanaan Apel Pagi dan Apel Siang Pegawai ASN — Dinas Pendidikan dan Kebudayaan
            </div>
          </div>
          <div style="display: flex; gap: 14px; justify-content: space-between;">
            <!-- Apel Pagi -->
            <div style="flex: 1; border: 1px solid #475569; padding: 10px; border-radius: 6px; font-size: 9.5pt;">
              <div style="font-weight: bold; font-size: 10pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>1. DOKUMENTASI APEL PAGI ASN</span>
                <span style="color: #1e40af;">${apelPagiDoc?.time || '07:15 WITA'}</span>
              </div>
              ${
                apelPagiDoc?.photoUrl
                  ? `
                <div style="text-align: center; margin-bottom: 8px;">
                  <img src="${apelPagiDoc.photoUrl}" style="max-height: 160px; max-width: 100%; border: 1px solid #94a3b8; border-radius: 4px; object-fit: contain;" />
                </div>
              `
                  : `
                <div style="text-align: center; padding: 25px 10px; border: 1px dashed #94a3b8; color: #64748b; font-size: 9pt; margin-bottom: 8px;">
                  Belum ada foto dokumentasi apel pagi terlampir.
                </div>
              `
              }
              <div style="line-height: 1.4;">
                <div><strong>Pembina Apel:</strong> ${apelPagiDoc?.leaderName || config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</div>
                <div><strong>Lokasi:</strong> ${apelPagiDoc?.placeName || 'Lapangan Utama Upacara SMPN 4 Satap'}</div>
                <div><strong>Peserta Hadir:</strong> ${apelPagiDoc?.attendanceCount ?? stats.hadir} ASN Hadir</div>
                ${apelPagiDoc?.notes ? `<div style="font-style: italic; margin-top: 4px; color: #475569;">"${apelPagiDoc.notes}"</div>` : ''}
              </div>
            </div>

            <!-- Apel Siang (Bukan Apel Sore) -->
            <div style="flex: 1; border: 1px solid #475569; padding: 10px; border-radius: 6px; font-size: 9.5pt;">
              <div style="font-weight: bold; font-size: 10pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>2. DOKUMENTASI APEL SIANG ASN</span>
                <span style="color: #b45309;">${apelSiangDoc?.time || '13:45 WITA'}</span>
              </div>
              ${
                apelSiangDoc?.photoUrl
                  ? `
                <div style="text-align: center; margin-bottom: 8px;">
                  <img src="${apelSiangDoc.photoUrl}" style="max-height: 160px; max-width: 100%; border: 1px solid #94a3b8; border-radius: 4px; object-fit: contain;" />
                </div>
              `
                  : `
                <div style="text-align: center; padding: 25px 10px; border: 1px dashed #94a3b8; color: #64748b; font-size: 9pt; margin-bottom: 8px;">
                  Belum ada foto dokumentasi apel siang terlampir.
                </div>
              `
              }
              <div style="line-height: 1.4;">
                <div><strong>Pembina Apel:</strong> ${apelSiangDoc?.leaderName || config.adminName || 'Dra. Hj. Siti Aminah, M.Pd.'}</div>
                <div><strong>Lokasi:</strong> ${apelSiangDoc?.placeName || 'Halaman Depan Kantor Guru'}</div>
                <div><strong>Peserta Hadir:</strong> ${apelSiangDoc?.attendanceCount ?? stats.hadir} ASN Hadir</div>
                ${apelSiangDoc?.notes ? `<div style="font-style: italic; margin-top: 4px; color: #475569;">"${apelSiangDoc.notes}"</div>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="sign-box">
            <p style="margin-bottom: 55px;">Mengetahui,<br/>Guru Piket Harian</p>
            <p style="font-weight: bold; text-decoration: underline;">( .................................................. )</p>
            <p style="font-size: 9pt; margin: 0;">NIP. -</p>
          </div>
          <div class="sign-box">
            <p style="margin-bottom: 55px;">Taliabu Barat, ${formatDateIndo(selectedDate)}<br/>Kepala Sekolah,</p>
            <p style="font-weight: bold; text-decoration: underline;">${config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
            <p style="font-size: 9pt; margin: 0;">NIP. ${config.principalNip || '197405121999031004'}</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Status Badge Helper
  const getStatusBadge = (status: AsnAttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'izin':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'sakit':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cuti':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'dinas_luar':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'tanpa_keterangan':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const getStatusLabel = (status: AsnAttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return 'Hadir';
      case 'izin':
        return 'Izin';
      case 'sakit':
        return 'Sakit';
      case 'cuti':
        return 'Cuti';
      case 'dinas_luar':
        return 'Dinas Luar';
      case 'tanpa_keterangan':
      default:
        return 'Tanpa Keterangan';
    }
  };

  return (
    <div id="asn-attendance-table-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-sky-950 text-white rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                <PenTool className="w-3.5 h-3.5" />
                <span>Format Otomatis GTK ASN</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center space-x-1">
                <Smartphone className="w-3 h-3" />
                <span>Touchpad & HP</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tabel Absensi & Tanda Tangan Guru ASN
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Format daftar hadir resmi terbagi dua kolom tanda tangan (Absen Masuk & Absen Pulang) dengan dukungan goresan sentuh touchpad/mouse semua jenis laptop serta layar HP.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="print-asn-table-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Buka pratinjau resmi PrintModal & cetak ke PDF dengan tanda tangan kanvas dan lampiran apel 1 file"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Cetak Terpadu 1 File</span>
            </button>

            <button
              id="print-manual-sheet-btn"
              onClick={handlePrintManualSheetPdf}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Cetak Blangko Lembar Absensi Manual Resmi + Lampiran Apel (PDF)"
            >
              <FileText className="w-4 h-4" />
              <span>PDF Blangko & Apel</span>
            </button>

            <button
              id="share-asn-report-btn"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Kirim bukti presensi & dokumentasi apel terpadu ke WhatsApp / BKD"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Berkas (WA/BKD)</span>
            </button>

            <button
              id="jump-to-apel-section-btn"
              onClick={() => {
                const el = document.getElementById('asn-apel-documentation-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2.5 bg-amber-500/90 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Lihat & Kelola Dokumentasi Apel Pagi dan Apel Siang ASN"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Lampiran Apel Pagi & Siang</span>
            </button>

            <button
              id="auto-generate-table-btn"
              onClick={handleForceRegenerate}
              className="px-3.5 py-2.5 bg-indigo-800/90 hover:bg-indigo-700 text-indigo-100 border border-indigo-600/40 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Otomatis susun & segarkan format tabel absensi guru ASN"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Format Otomatis ASN</span>
            </button>

            <button
              id="export-csv-asn-table-btn"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Unduh data tabel dalam format spreadsheet"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel/CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Guru ASN
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[10px] font-bold text-slate-400">Personil</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Hadir
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-700">{stats.hadir}</span>
            <span className="text-[10px] font-bold text-emerald-600">
              {stats.signedIn} TTD Masuk
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Izin
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-700">{stats.izin}</span>
            <span className="text-[10px] font-bold text-amber-600">Surat Izin</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Sakit
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-700">{stats.sakit}</span>
            <span className="text-[10px] font-bold text-blue-600">Surat Dokter</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            Cuti
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-700">{stats.cuti}</span>
            <span className="text-[10px] font-bold text-purple-600">Resmi BKD</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-sky-200 bg-sky-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Dinas Luar
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-sky-700">{stats.dinasLuar}</span>
            <span className="text-[10px] font-bold text-sky-600">Surat Tugas</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Tanpa Keterangan
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-700">{stats.tanpaKeterangan}</span>
            <span className="text-[10px] font-bold text-rose-600">Alpa</span>
          </div>
        </div>
      </div>

      {/* Filter and Configuration Toolbar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Picker & Quick Days */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-600 ml-1.5" />
              <input
                id="asn-table-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden pr-2 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setSelectedDate(todayDate || new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedDate === todayDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>

            {/* Filter ASN vs All GTK */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setFilterAsnMode('asn_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterAsnMode === 'asn_only'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khusus Guru ASN (PNS & PPPK)
              </button>
              <button
                onClick={() => setFilterAsnMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterAsnMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Guru & GTK
              </button>
            </div>
          </div>

          {/* Search Input & Fast Utilities */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, mapel..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
              title="Tandai seluruh guru hadir otomatis"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Set Semua Hadir</span>
            </button>

            <button
              onClick={generateTableData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
              title="Segarkan / Buat Ulang Format Tabel"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row: Specific Filters for NIP, Attendance Status, & Date Range */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="cuti">Cuti</option>
              <option value="dinas_luar">Dinas Luar</option>
              <option value="tanpa_keterangan">Tanpa Keterangan / Alpa</option>
            </select>
          </div>

          {/* NIP Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500">Pilih Guru / NIP:</span>
            <select
              id="filter-nip-select"
              value={filterNip}
              onChange={(e) => setFilterNip(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 max-w-[220px] truncate cursor-pointer"
            >
              <option value="all">Semua Guru ASN (Semua NIP)</option>
              {effectiveTeachers.map((t) => (
                <option key={t.id} value={t.nip}>
                  {t.nip} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Rentang Tanggal */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDateRangeActive(!isDateRangeActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                isDateRangeActive
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Rentang Tanggal</span>
            </button>

            {isDateRangeActive && (
              <div className="flex items-center space-x-1.5 animate-in fade-in text-xs font-bold">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {(filterStatus !== 'all' || filterNip !== 'all' || isDateRangeActive || searchQuery) && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterNip('all');
                setIsDateRangeActive(false);
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Device instruction tip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-sky-50/80 rounded-2xl border border-sky-100 text-sky-900 text-xs">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="leading-snug">
              <strong>Panduan Tanda Tangan:</strong> Klik tombol <strong>Tanda Tangan Masuk</strong> atau <strong>Tanda Tangan Pulang</strong> pada baris guru yang bersangkutan. Anda dapat mencoret tanda tangan menggunakan <strong>touchpad/mouse laptop</strong> maupun <strong>layar sentuh HP</strong>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-700 font-bold shrink-0">
            {formatDateIndo(selectedDate)}
          </span>
        </div>
      </div>

      {/* Main Table Container: Formatted strictly according to user's specification */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]" id="asn-attendance-printable-table">
            <thead>
              {/* Top Grouped Header */}
              <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                <th rowSpan={2} className="py-3.5 px-4 text-center border-r border-slate-800 w-12">
                  No
                </th>
                <th rowSpan={2} className="py-3.5 px-4 border-r border-slate-800 min-w-[220px]">
                  Nama Guru / GTK & NIP
                </th>
                {/* Parent Signature Column spanning 2 sub-columns as requested */}
                <th colSpan={2} className="py-2.5 px-4 text-center border-r border-slate-800 bg-indigo-950/70">
                  <div className="flex items-center justify-center space-x-2">
                    <PenTool className="w-4 h-4 text-indigo-400" />
                    <span>Tanda Tangan</span>
                  </div>
                </th>
                {/* Final Column: Keterangan as requested */}
                <th rowSpan={2} className="py-3.5 px-4 min-w-[200px] text-center">
                  Keterangan
                </th>
              </tr>

              {/* Sub-header for the 2 Signature Sub-columns */}
              <tr className="bg-slate-800 text-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2 px-3 text-center border-r border-slate-700 w-44 bg-slate-800/90">
                  Absen Masuk
                </th>
                <th className="py-2 px-3 text-center border-r border-slate-700 w-44 bg-slate-800/90">
                  Absen Pulang
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Tidak ada data guru yang sesuai filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti kata kunci pencarian atau ubah filter ke "Semua Guru & GTK".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={row.teacherId}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        isEven ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* 1. Nomor Urut */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600 border-r border-slate-100">
                        {index + 1}
                      </td>

                      {/* 2. Nama Guru / GTK & NIP */}
                      <td className="py-3.5 px-4 border-r border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm leading-snug">
                              {row.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                row.employmentStatus === 'PNS'
                                  ? 'bg-purple-100 text-purple-800'
                                  : row.employmentStatus === 'PPPK' || row.employmentStatus === 'PPPK_PW'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.employmentStatus}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 font-mono">
                            <span>NIP: {row.nip || '-'}</span>
                            <span>•</span>
                            <span className="font-sans text-slate-600">{row.subjectOrRole}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Sub-kolom Tanda Tangan: ABSEN MASUK */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center align-middle">
                        {row.signatureIn ? (
                          <div className="flex flex-col items-center space-y-1 group relative">
                            <div className="w-36 h-16 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center p-1 relative overflow-hidden">
                              <img
                                src={row.signatureIn}
                                alt={`TTD Masuk ${row.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                              {/* Hover quick action overlay */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSignatureModal(row, 'masuk')}
                                  className="p-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  title="Ubah Tanda Tangan"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSignature(row.teacherId, 'masuk', e)}
                                  className="p-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Tanda Tangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{row.signatureInTime || 'Hadir'}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSignatureModal(row, 'masuk')}
                            className="w-full py-2.5 px-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group active:scale-98"
                            title="Klik untuk tanda tangan via touchpad laptop atau layar sentuh HP"
                          >
                            <PenTool className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold">TTD Masuk</span>
                          </button>
                        )}
                      </td>

                      {/* 4. Sub-kolom Tanda Tangan: ABSEN PULANG */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center align-middle">
                        {row.signatureOut ? (
                          <div className="flex flex-col items-center space-y-1 group relative">
                            <div className="w-36 h-16 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center p-1 relative overflow-hidden">
                              <img
                                src={row.signatureOut}
                                alt={`TTD Pulang ${row.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                              {/* Hover quick action overlay */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSignatureModal(row, 'pulang')}
                                  className="p-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  title="Ubah Tanda Tangan"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSignature(row.teacherId, 'pulang', e)}
                                  className="p-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Tanda Tangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-amber-700 font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{row.signatureOutTime || 'Pulang'}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSignatureModal(row, 'pulang')}
                            className="w-full py-2.5 px-2 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-100/60 text-amber-800 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group active:scale-98"
                            title="Klik untuk tanda tangan via touchpad laptop atau layar sentuh HP"
                          >
                            <PenTool className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold">TTD Pulang</span>
                          </button>
                        )}
                      </td>

                      {/* 5. Kolom Terakhir: KETERANGAN */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {/* Status Dropdown Selector */}
                          <div className="relative">
                            <select
                              value={row.status}
                              onChange={(e) =>
                                handleChangeStatus(row.teacherId, e.target.value as AsnAttendanceStatus)
                              }
                              className={`w-full py-1.5 px-2.5 text-xs font-bold rounded-xl border appearance-none focus:outline-hidden cursor-pointer shadow-2xs pr-7 ${getStatusBadge(
                                row.status
                              )}`}
                            >
                              <option value="hadir">Hadir</option>
                              <option value="izin">Izin</option>
                              <option value="sakit">Sakit</option>
                              <option value="cuti">Cuti</option>
                              <option value="dinas_luar">Dinas Luar</option>
                              <option value="tanpa_keterangan">Tanpa Keterangan (Alpa)</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Detail Note input */}
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => handleChangeNotes(row.teacherId, e.target.value)}
                            placeholder={
                              row.status === 'dinas_luar'
                                ? 'No. Surat Tugas / Lokasi...'
                                : row.status === 'cuti'
                                ? 'Jenis Cuti (Tahunan/Melahirkan)...'
                                : row.status === 'sakit'
                                ? 'Ket. Dokter / RS...'
                                : 'Catatan opsional...'
                            }
                            className="w-full text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-400 placeholder:text-slate-400 text-slate-700"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Summary & Validation notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Format Berita Acara Presensi GTK ASN resmi terintegrasi dengan Peraturan BKN & BKD.
            </span>
          </div>
          <span className="font-mono text-slate-500 font-semibold">
            Total {filteredRows.length} Guru • {stats.signedIn} TTD Masuk • {stats.signedOut} TTD Pulang
          </span>
        </div>
      </div>

      {/* LAMPIRAN DOKUMENTASI RESMI APEL PAGI & APEL SIANG ASN (1 FILE TERPADU SESUAI REGULASI KEDINASAN) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-black uppercase tracking-wider">
                Lampiran Bukti Fisik Apel ASN
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                Apel Pagi & Siang (Bukan Apel Sore)
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-1">
              Dokumentasi Pelaksanaan Apel ASN Terpadu
            </h3>
            <p className="text-xs text-slate-500">
              Dokumentasi ini otomatis disertakan sebagai lampiran resmi di bawah tabel absensi pada cetak 1-file, berkas PDF, serta kirim WhatsApp/BKD.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleOpenApelModal('apel_pagi')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto Apel Pagi</span>
            </button>
            <button
              onClick={() => handleOpenApelModal('apel_siang')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto Apel Siang</span>
            </button>
          </div>
        </div>

        {/* 2 Cards Grid for Apel Pagi & Apel Siang */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. DOKUMENTASI APEL PAGI */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-4 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100/70">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  1. Dokumentasi Apel Pagi ASN
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-mono font-bold">
                {apelPagiDoc?.time || '07:15 WITA'}
              </span>
            </div>

            {/* Photo Preview */}
            {apelPagiDoc?.photoUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-950 flex items-center justify-center">
                <img
                  src={apelPagiDoc.photoUrl}
                  alt="Dokumentasi Apel Pagi"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 cursor-pointer"
                  onClick={() => setPreviewPhotoUrl(apelPagiDoc.photoUrl)}
                />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                  <button
                    onClick={() => setPreviewPhotoUrl(apelPagiDoc.photoUrl)}
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold flex items-center space-x-1 hover:bg-slate-100 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lihat Penuh</span>
                  </button>
                  <button
                    onClick={() => handleOpenApelModal('apel_pagi')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center space-x-1 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ubah Foto</span>
                  </button>
                  <button
                    onClick={() => handleDeleteApelDoc('apel_pagi')}
                    className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-indigo-200 aspect-[16/10] flex flex-col items-center justify-center p-4 text-center bg-white/60 space-y-2">
                <Camera className="w-8 h-8 text-indigo-300" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Belum Ada Bukti Foto Apel Pagi</p>
                  <p className="text-[11px] text-slate-400">Ambil foto langsung kamera atau unggah berkas</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenApelModal('apel_pagi')}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    Buka Kamera
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Information */}
            <div className="text-xs space-y-1 text-slate-700 pt-1">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">Pembina Apel:</span>
                <span className="font-bold text-slate-900 text-right">
                  {apelPagiDoc?.leaderName || config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">Titik Lokasi:</span>
                <span className="text-slate-800 text-right font-medium">
                  {apelPagiDoc?.placeName || 'Lapangan Utama Upacara SMPN 4 Satap'}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">ASN Hadir:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {apelPagiDoc?.attendanceCount ?? stats.hadir} Personil
                </span>
              </div>
              {apelPagiDoc?.notes && (
                <div className="p-2 rounded-xl bg-white border border-indigo-100 text-[11px] italic text-slate-600 mt-1.5">
                  "{apelPagiDoc.notes}"
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-indigo-100/70">
              <button
                onClick={() => handleOpenApelModal('apel_pagi')}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{apelPagiDoc ? 'Ambil Ulang / Edit Apel Pagi' : 'Lengkapi Bukti Apel Pagi'}</span>
              </button>
              {apelPagiDoc && (
                <button
                  onClick={() => handleDeleteApelDoc('apel_pagi')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. DOKUMENTASI APEL SIANG (BUKAN APEL SORE) */}
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/40 to-white p-4 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100/70">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  2. Dokumentasi Apel Siang ASN
                </h4>
                <span className="text-[10px] text-amber-700 font-bold">(Bukan Apel Sore)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-mono font-bold">
                {apelSiangDoc?.time || '13:45 WITA'}
              </span>
            </div>

            {/* Photo Preview */}
            {apelSiangDoc?.photoUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-950 flex items-center justify-center">
                <img
                  src={apelSiangDoc.photoUrl}
                  alt="Dokumentasi Apel Siang"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 cursor-pointer"
                  onClick={() => setPreviewPhotoUrl(apelSiangDoc.photoUrl)}
                />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                  <button
                    onClick={() => setPreviewPhotoUrl(apelSiangDoc.photoUrl)}
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold flex items-center space-x-1 hover:bg-slate-100 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lihat Penuh</span>
                  </button>
                  <button
                    onClick={() => handleOpenApelModal('apel_siang')}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center space-x-1 hover:bg-amber-700 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ubah Foto</span>
                  </button>
                  <button
                    onClick={() => handleDeleteApelDoc('apel_siang')}
                    className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-amber-200 aspect-[16/10] flex flex-col items-center justify-center p-4 text-center bg-white/60 space-y-2">
                <Camera className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Belum Ada Bukti Foto Apel Siang</p>
                  <p className="text-[11px] text-slate-400">Apel kepulangan siang ASN (pukul 13:45 WITA)</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenApelModal('apel_siang')}
                    className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer"
                  >
                    Buka Kamera
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Information */}
            <div className="text-xs space-y-1 text-slate-700 pt-1">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">Pembina Apel:</span>
                <span className="font-bold text-slate-900 text-right">
                  {apelSiangDoc?.leaderName || config.adminName || 'Dra. Hj. Siti Aminah, M.Pd.'}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">Titik Lokasi:</span>
                <span className="text-slate-800 text-right font-medium">
                  {apelSiangDoc?.placeName || 'Halaman Depan Kantor Guru SMPN 4 Satap'}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-500 text-[11px]">ASN Hadir:</span>
                <span className="font-mono font-bold text-amber-700">
                  {apelSiangDoc?.attendanceCount ?? stats.hadir} Personil
                </span>
              </div>
              {apelSiangDoc?.notes && (
                <div className="p-2 rounded-xl bg-white border border-amber-100 text-[11px] italic text-slate-600 mt-1.5">
                  "{apelSiangDoc.notes}"
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-amber-100/70">
              <button
                onClick={() => handleOpenApelModal('apel_siang')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{apelSiangDoc ? 'Ambil Ulang / Edit Apel Siang' : 'Lengkapi Bukti Apel Siang'}</span>
              </button>
              {apelSiangDoc && (
                <button
                  onClick={() => handleDeleteApelDoc('apel_siang')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal (for touchpads, mouse, stylus & all smartphones) */}
      <SignaturePadModal
        isOpen={activeModal.isOpen}
        onClose={() => setActiveModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSignature}
        initialSignature={activeModal.initialSignature}
        teacherName={activeModal.teacherName}
        nip={activeModal.nip}
        sessionType={activeModal.sessionType}
        dateStr={selectedDate}
      />

      {/* Official Print & PDF Export Modal with serialized Canvas Signatures & Apel Documentation */}
      {isPrintModalOpen && (
        <PrintModal
          onClose={() => setIsPrintModalOpen(false)}
          config={config}
          asnRows={filteredRows}
          records={records}
          todayDate={selectedDate}
          customTitle="DAFTAR HADIR & TANDA TANGAN GURU / GTK ASN"
          mode="asn_table"
          apelPagiDoc={apelPagiDoc}
          apelSiangDoc={apelSiangDoc}
        />
      )}

      {/* Printable Sheet View for Official Kedinasan / Arsip Sekolah (Hidden on screen, visible during window.print) */}
      <div id="asn-print-container" className="hidden print:block text-black bg-white p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #asn-print-container, #asn-print-container * {
              visibility: visible;
            }
            #asn-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20mm;
            }
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
          }
        `}} />

        {/* Kop Surat Sekolah */}
        <div className="border-b-4 border-double border-black pb-4 text-center space-y-1">
          <h3 className="text-sm font-bold tracking-widest uppercase">
            PEMERINTAH KABUPATEN PULAU TALIABU
          </h3>
          <h4 className="text-xs font-bold uppercase">
            DINAS PENDIDIKAN DAN KEBUDAYAAN
          </h4>
          <h2 className="text-base font-black uppercase">
            {config.schoolName || 'SMP NEGERI 4 SATU ATAP TALIABU BARAT'}
          </h2>
          <p className="text-[10px]">
            {config.address || 'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara'} • NPSN: {config.npsn || '69989028'}
          </p>
        </div>

        {/* Document Title */}
        <div className="py-4 text-center space-y-1">
          <h3 className="text-sm font-black underline uppercase">
            DAFTAR HADIR DAN TANDA TANGAN ELEKTRONIK GURU / GTK ASN
          </h3>
          <p className="text-xs">
            Hari / Tanggal: <strong>{formatDateIndo(selectedDate)}</strong> • Semester: {config.semester || 'Ganjil'} TP {config.academicYear || '2026/2027'}
          </p>
        </div>

        {/* Print Table */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black p-2 w-10">No</th>
              <th className="border border-black p-2 text-left">Nama Guru / GTK & NIP</th>
              <th className="border border-black p-2 w-16">Status</th>
              <th className="border border-black p-2 w-32">TTD Absen Masuk</th>
              <th className="border border-black p-2 w-32">TTD Absen Pulang</th>
              <th className="border border-black p-2 w-36">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.teacherId}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2">
                  <div className="font-bold">{row.name}</div>
                  <div className="text-[10px] font-mono">NIP: {row.nip}</div>
                  <div className="text-[10px] italic">{row.subjectOrRole}</div>
                </td>
                <td className="border border-black p-2 text-center font-bold">{row.employmentStatus}</td>
                <td className="border border-black p-2 text-center align-middle">
                  {row.signatureIn ? (
                    <div className="flex flex-col items-center">
                      <img src={row.signatureIn} alt="TTD Masuk" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] font-mono">{row.signatureInTime}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">-</span>
                  )}
                </td>
                <td className="border border-black p-2 text-center align-middle">
                  {row.signatureOut ? (
                    <div className="flex flex-col items-center">
                      <img src={row.signatureOut} alt="TTD Pulang" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] font-mono">{row.signatureOutTime}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">-</span>
                  )}
                </td>
                <td className="border border-black p-2">
                  <span className="font-bold">{getStatusLabel(row.status)}</span>
                  {row.notes && <div className="text-[10px] text-slate-600 mt-0.5">{row.notes}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* LAMPIRAN DOKUMENTASI RESMI APEL PAGI & APEL SIANG (1-FILE CETAK KEDINASAN) */}
        {(apelPagiDoc || apelSiangDoc) && (
          <div className="mt-8 pt-4 border-t-2 border-black print-avoid-break">
            <div className="text-center mb-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-black">
                LAMPIRAN DOKUMENTASI RESMI APEL PAGI DAN APEL SIANG ASN
              </h4>
              <p className="text-[10px] text-slate-700 italic">
                Bukti Fisik Pelaksanaan Apel Kedisiplinan Pegawai ASN (PNS & PPPK) — Dinas Pendidikan & Kebudayaan
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Apel Pagi Attachment */}
              <div className="border border-black rounded-lg p-2.5 space-y-2">
                <div className="flex justify-between items-center border-b border-black pb-1">
                  <span className="font-bold text-[11px] uppercase">1. Apel Pagi ASN</span>
                  <span className="font-mono text-[10px] font-bold">{apelPagiDoc?.time || '07:15 WITA'}</span>
                </div>
                {apelPagiDoc?.photoUrl ? (
                  <div className="aspect-[4/3] overflow-hidden border border-black flex items-center justify-center">
                    <img src={apelPagiDoc.photoUrl} alt="Apel Pagi" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400">
                    Tidak ada foto apel pagi terlampir
                  </div>
                )}
                <div className="text-[9.5px] space-y-0.5">
                  <p><strong>Pembina:</strong> {apelPagiDoc?.leaderName || config.principalName || '-'}</p>
                  <p><strong>Lokasi:</strong> {apelPagiDoc?.placeName || 'Lapangan Upacara'}</p>
                  <p><strong>Hadir:</strong> {apelPagiDoc?.attendanceCount ?? stats.hadir} Pegawai ASN</p>
                  {apelPagiDoc?.notes && <p className="italic text-slate-700">"{apelPagiDoc.notes}"</p>}
                </div>
              </div>

              {/* Apel Siang Attachment */}
              <div className="border border-black rounded-lg p-2.5 space-y-2">
                <div className="flex justify-between items-center border-b border-black pb-1">
                  <span className="font-bold text-[11px] uppercase">2. Apel Siang ASN (Bukan Apel Sore)</span>
                  <span className="font-mono text-[10px] font-bold">{apelSiangDoc?.time || '13:45 WITA'}</span>
                </div>
                {apelSiangDoc?.photoUrl ? (
                  <div className="aspect-[4/3] overflow-hidden border border-black flex items-center justify-center">
                    <img src={apelSiangDoc.photoUrl} alt="Apel Siang" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400">
                    Tidak ada foto apel siang terlampir
                  </div>
                )}
                <div className="text-[9.5px] space-y-0.5">
                  <p><strong>Pembina:</strong> {apelSiangDoc?.leaderName || config.adminName || '-'}</p>
                  <p><strong>Lokasi:</strong> {apelSiangDoc?.placeName || 'Halaman Kantor Guru'}</p>
                  <p><strong>Hadir:</strong> {apelSiangDoc?.attendanceCount ?? stats.hadir} Pegawai ASN</p>
                  {apelSiangDoc?.notes && <p className="italic text-slate-700">"{apelSiangDoc.notes}"</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tanda Tangan Pengesahan Kepala Sekolah & Piket */}
        <div className="mt-8 grid grid-cols-2 text-xs text-center">
          <div>
            <p>Petugas Piket / Notulis,</p>
            <div className="h-20" />
            <p className="font-bold underline">{config.adminName || 'Hendra Hasan, S.Pd.'}</p>
            <p className="font-mono text-[10px]">NIP. 198711032014021003</p>
          </div>

          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah,</p>
            <div className="h-16" />
            <p className="font-bold underline">{config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
            <p className="font-mono text-[10px]">NIP. {config.principalNip || '197405121999031004'}</p>
          </div>
        </div>
      </div>

      {/* Hidden helper elements */}
      <canvas ref={apelCanvasRef} className="hidden" />
      <input
        type="file"
        ref={apelFileInputRef}
        onChange={handleUploadApelPhoto}
        accept="image/*"
        className="hidden"
      />

      {/* MODAL DOKUMENTASI APEL (KAMERA DENGAN DIAGNOSTIC & WATERMARK RESMI) */}
      {isApelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl ${apelModalType === 'apel_pagi' ? 'bg-indigo-600' : 'bg-amber-600'}`}>
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wide">
                    {apelModalType === 'apel_pagi'
                      ? 'Dokumentasi Apel Pagi ASN'
                      : 'Dokumentasi Apel Siang ASN (Bukan Apel Sore)'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Pengambilan bukti foto resmi ber-watermark kedinasan, GPS, dan waktu WITA
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopApelCamera();
                  setIsApelModalOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Camera Stream / Photo Display Area */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-200 flex items-center justify-center">
                  {/* Live Video Element */}
                  <video
                    ref={apelVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Camera Diagnostic Overlay */}
                  {isCameraActive && (
                    <CameraDiagnosticOverlay
                      diagnostic={cameraDiagnostic}
                      preferredFacing={facingMode}
                      onTriggerSoftReset={handleSoftResetApelCamera}
                      modeTitle="Kamera Dokumentasi Apel"
                    />
                  )}

                  {/* If camera is inactive and photoUrl exists: Show current photo */}
                  {!isCameraActive && apelForm.photoUrl && (
                    <img
                      src={apelForm.photoUrl}
                      alt="Foto Terambil"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* If camera inactive and no photo */}
                  {!isCameraActive && !apelForm.photoUrl && (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                      <Camera className="w-12 h-12 text-slate-500" />
                      <p className="text-xs font-bold text-slate-300">Kamera Belum Dinyalakan</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Klik tombol "Nyalakan Kamera" di bawah atau gunakan tombol unggah berkas foto dari galeri.
                      </p>
                    </div>
                  )}

                  {/* Camera Top HUD Controls */}
                  {isCameraActive && (
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-emerald-400 font-bold border border-emerald-500/40 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>LIVE PREVIEW</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            const nextMode = facingMode === 'user' ? 'environment' : 'user';
                            setFacingMode(nextMode);
                            handleStartApelCamera();
                          }}
                          className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[10px] text-white font-bold border border-white/20 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          🔄 Balik Kamera ({facingMode === 'user' ? 'Depan' : 'Belakang'})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Buttons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    {!isCameraActive ? (
                      <button
                        onClick={handleStartApelCamera}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Nyalakan Kamera</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSnapApelPhoto}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md animate-pulse cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ambil Foto Ber-Watermark</span>
                        </button>
                        <button
                          onClick={stopApelCamera}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Tutup Kamera
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => apelFileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah dari File</span>
                  </button>
                </div>
              </div>

              {/* Form Details Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                  Informasi Berita Acara Pelaksanaan Apel
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Jam Pelaksanaan */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Pelaksanaan ({apelModalType === 'apel_pagi' ? 'Pagi' : 'Siang'})
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={apelForm.time}
                        onChange={(e) => setApelForm((prev) => ({ ...prev, time: e.target.value }))}
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        placeholder="07:15 WITA"
                      />
                    </div>
                  </div>

                  {/* Jumlah ASN Hadir */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jumlah Peserta ASN Hadir
                    </label>
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min="0"
                        value={apelForm.attendanceCount}
                        onChange={(e) =>
                          setApelForm((prev) => ({
                            ...prev,
                            attendanceCount: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        placeholder="24"
                      />
                    </div>
                  </div>
                </div>

                {/* Pembina Apel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pembina / Pemimpin Apel
                  </label>
                  <input
                    type="text"
                    value={apelForm.leaderName}
                    onChange={(e) => setApelForm((prev) => ({ ...prev, leaderName: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    placeholder="Nama Lengkap & Gelar Pembina Apel"
                  />
                </div>

                {/* Titik Lokasi Apel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Titik Lokasi Apel
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={apelForm.placeName}
                      onChange={(e) => setApelForm((prev) => ({ ...prev, placeName: e.target.value }))}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      placeholder="Lapangan Utama Upacara SMPN 4 Satap"
                    />
                  </div>
                </div>

                {/* Catatan / Arahan Apel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Arahan / Catatan Evaluasi Kedisiplinan
                  </label>
                  <textarea
                    rows={2}
                    value={apelForm.notes}
                    onChange={(e) => setApelForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-400"
                    placeholder="Catatan arahan apel, pembinaan KBM, atau evaluasi kepulangan pegawai..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  stopApelCamera();
                  setIsApelModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveApelForm}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Dokumentasi Apel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KIRIM BERKAS PRESENSI & APEL KE WHATSAPP / BKD */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Kirim Bukti Presensi & Dokumentasi Apel</h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Format laporan presensi harian GTK ASN beserta lampiran dokumentasi pelaksanaan Apel Pagi dan Apel Siang telah dirangkum sesuai format standar dinas:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-60 overflow-y-auto">
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {`📋 LAPORAN REKAPITULASI PRESENSI & DOKUMENTASI APEL ASN
Sekolah: ${config.schoolName}
Tanggal: ${formatDateIndo(selectedDate)}
---------------------------------------------
Total Guru ASN : ${filteredRows.length} Orang
• Hadir        : ${stats.hadir}
• Izin         : ${stats.izin}
• Sakit        : ${stats.sakit}
• Cuti         : ${stats.cuti}
• Dinas Luar   : ${stats.dinasLuar}
• Tanpa Ket.   : ${stats.tanpaKeterangan}

STATUS TANDA TANGAN ELEKTRONIK:
• TTD Masuk  : ${stats.signedIn} / ${filteredRows.length}
• TTD Pulang : ${stats.signedOut} / ${filteredRows.length}

LAMPIRAN DOKUMENTASI APEL KEDISIPLINAN ASN:
1. Apel Pagi : ${apelPagiDoc ? `SUDAH TERLAMPIR (${apelPagiDoc.time} - Pembina: ${apelPagiDoc.leaderName || config.principalName})` : 'BELUM TERLAMPIR'}
2. Apel Siang: ${apelSiangDoc ? `SUDAH TERLAMPIR (${apelSiangDoc.time} - Pembina: ${apelSiangDoc.leaderName || config.adminName})` : 'BELUM TERLAMPIR'}
*(Bukan Apel Sore)*

Tembusan Resmi:
1. BKD / BKPSDM
2. Dinas Pendidikan & Kebudayaan`}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const text = `📋 LAPORAN REKAPITULASI PRESENSI & DOKUMENTASI APEL ASN\nSekolah: ${config.schoolName}\nTanggal: ${formatDateIndo(selectedDate)}\n---------------------------------------------\nTotal Guru ASN : ${filteredRows.length} Orang\n• Hadir : ${stats.hadir}\n• Izin : ${stats.izin}\n• Sakit : ${stats.sakit}\n• Cuti : ${stats.cuti}\n• Dinas Luar : ${stats.dinasLuar}\n• Alpa : ${stats.tanpaKeterangan}\n\nSTATUS TANDA TANGAN ASN:\n• TTD Masuk : ${stats.signedIn}\n• TTD Pulang : ${stats.signedOut}\n\nLAMPIRAN DOKUMENTASI APEL:\n1. Apel Pagi : ${apelPagiDoc ? `TERLAMPIR (${apelPagiDoc.time})` : 'BELUM'}\n2. Apel Siang : ${apelSiangDoc ? `TERLAMPIR (${apelSiangDoc.time})` : 'BELUM'}\n(Bukan Apel Sore)`;
                    navigator.clipboard.writeText(text);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  className="w-full sm:w-1/2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>{copyFeedback ? '✓ Berhasil Disalin!' : 'Salin Teks Laporan'}</span>
                </button>

                <button
                  onClick={() => {
                    const text = `📋 LAPORAN REKAPITULASI PRESENSI & DOKUMENTASI APEL ASN\nSekolah: ${config.schoolName}\nTanggal: ${formatDateIndo(selectedDate)}\n---------------------------------------------\nTotal Guru ASN : ${filteredRows.length} Orang\n• Hadir : ${stats.hadir}\n• Izin : ${stats.izin}\n• Sakit : ${stats.sakit}\n• Cuti : ${stats.cuti}\n• Dinas Luar : ${stats.dinasLuar}\n• Alpa : ${stats.tanpaKeterangan}\n\nSTATUS TANDA TANGAN ASN:\n• TTD Masuk : ${stats.signedIn}\n• TTD Pulang : ${stats.signedOut}\n\nLAMPIRAN DOKUMENTASI APEL:\n1. Apel Pagi : ${apelPagiDoc ? `TERLAMPIR (${apelPagiDoc.time})` : 'BELUM'}\n2. Apel Siang : ${apelSiangDoc ? `TERLAMPIR (${apelSiangDoc.time})` : 'BELUM'}\n(Bukan Apel Sore)`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full sm:w-1/2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Buka WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL FOTO DOKUMENTASI APEL */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pratinjau Foto Dokumentasi Resmi Ber-Watermark</span>
              </span>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              <img src={previewPhotoUrl} alt="Pratinjau Penuh" className="w-full h-full object-contain" />
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Watermark kedinasan, koordinat satelit GPS, waktu presensi, dan data pembina tersemat permanen.
              </span>
              <a
                href={previewPhotoUrl}
                download={`Dokumentasi_Apel_${selectedDate}.jpg`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Foto</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
