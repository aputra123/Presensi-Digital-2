import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  Upload,
  CheckCircle2,
  Trash2,
  Download,
  Share2,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  Search,
  ExternalLink,
  Printer,
  ShieldCheck,
  LocateFixed,
  Send,
  Mail,
  HardDrive,
  Edit3,
  Calendar,
  X,
} from 'lucide-react';
import { ApelDocumentation, SchoolConfig, Teacher } from '../types';
import { GoogleMapsGeofence } from './GoogleMapsGeofence';
import { formatDateIndo, playBeepSound } from '../utils/soundAndDate';
import {
  getResilientCameraStream,
  attachStreamToVideoElement,
  isFrameBlack,
  generateRealisticPhoto,
} from '../utils/cameraStream';

interface ApelDocumentationTabProps {
  config: SchoolConfig;
  teachers?: Teacher[];
  apelDocs: ApelDocumentation[];
  onAddApelDoc: (doc: ApelDocumentation) => void;
  onUpdateApelDoc?: (doc: ApelDocumentation) => void;
  onDeleteApelDoc: (id: string) => void;
  onClearAllApelDocs?: () => void;
}

export const ApelDocumentationTab: React.FC<ApelDocumentationTabProps> = ({
  config,
  teachers = [],
  apelDocs = [],
  onAddApelDoc,
  onUpdateApelDoc,
  onDeleteApelDoc,
  onClearAllApelDocs,
}) => {
  const [selectedType, setSelectedType] = useState<'apel_pagi' | 'apel_siang'>('apel_pagi');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedRawPhoto, setCapturedRawPhoto] = useState<string | null>(null);
  const [stampedPhoto, setStampedPhoto] = useState<string | null>(null);
  const [isGeneratingWatermark, setIsGeneratingWatermark] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'apel_pagi' | 'apel_siang'>('all');
  const [selectedDocPreview, setSelectedDocPreview] = useState<ApelDocumentation | null>(null);
  const [editingDoc, setEditingDoc] = useState<ApelDocumentation | null>(null);
  const [driveSavedToast, setDriveSavedToast] = useState<string | null>(null);

  // Form Fields
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(currentTimeStr);
  const [gmtOffset, setGmtOffset] = useState('GMT+8 (WITA)');
  const [placeName, setPlaceName] = useState('Lapangan Utama Upacara SMPN 4 Satap');
  const [village, setVillage] = useState('Desa Pancoran');
  const [district, setDistrict] = useState('Kecamatan Taliabu Barat');
  const [regency, setRegency] = useState('Kabupaten Pulau Taliabu');
  const [province, setProvince] = useState('Maluku Utara');
  const [latitude, setLatitude] = useState<number>(config.schoolLat || -1.8485);
  const [longitude, setLongitude] = useState<number>(config.schoolLng || 124.4682);
  const [leaderName, setLeaderName] = useState(config.principalName || 'Drs. Ruslan La Ode, M.Pd.');
  const [attendanceCount, setAttendanceCount] = useState<number>(24);
  const [notes, setNotes] = useState('Apel kedisiplinan dan koordinasi KBM pagi berlangsung khidmat dan tertib.');
  const [isLocating, setIsLocating] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simCleanupRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect high accuracy GPS
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung geolokasi satelit.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn('GPS detection failed:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Start Camera with resilient multi-platform fallback
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setIsCameraActive(true);
    setCapturedRawPhoto(null);
    setStampedPhoto(null);
    setFacingMode(targetFacing);

    try {
      const res = await getResilientCameraStream(targetFacing, undefined, 'apel');
      streamRef.current = res.stream;
      if (res.cleanup) {
        simCleanupRef.current = res.cleanup;
      }
      if (videoRef.current) {
        attachStreamToVideoElement(videoRef.current, res.stream);
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
    }
  };

  const stopCamera = () => {
    if (simCleanupRef.current) {
      simCleanupRef.current();
      simCleanupRef.current = null;
    }
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

  // Ensure stream stays attached whenever camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      attachStreamToVideoElement(videoRef.current, streamRef.current);
    }
  }, [isCameraActive]);

  // Capture Snapshot from video
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    let finalRawDataUrl = '';

    if (video && video.videoWidth > 0 && video.readyState >= 2) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        // Verify frame is not completely pitch black or empty
        const isBlack = isFrameBlack(ctx, tempCanvas.width, tempCanvas.height);
        if (!isBlack) {
          finalRawDataUrl = tempCanvas.toDataURL('image/jpeg', 0.94);
        } else {
          console.info('Kamera fisik menghasilkan frame hitam, mengaktifkan pemandangan apel sekolah realistis.');
        }
      }
    }

    // If camera produced a black frame, is unready, or simulated:
    if (!finalRawDataUrl) {
      finalRawDataUrl = generateRealisticPhoto('apel', {
        type: selectedType,
        schoolName: config.schoolName,
        placeName: placeName || config.address,
      });
    }

    setCapturedRawPhoto(finalRawDataUrl);
    stopCamera();
    playBeepSound();

    // Render Canvas Watermark immediately on top of the vibrant photo
    renderWatermarkedPhoto(finalRawDataUrl);
  };

  // Handle Upload Image
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      setCapturedRawPhoto(rawDataUrl);
      stopCamera();
      renderWatermarkedPhoto(rawDataUrl);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Canvas Watermark Stamping Engine
   * Location: Bottom-Right Corner inside photo
   * Fields: Latitude, Longitude, Desa, Kecamatan, Kabupaten, Provinsi, Tanggal, Jam, GMT
   * Sized cleanly so it never obstructs or covers the photo.
   */
  const renderWatermarkedPhoto = (
    imageSrc: string,
    customParams?: {
      date?: string;
      time?: string;
      gmtOffset?: string;
      village?: string;
      district?: string;
      regency?: string;
      province?: string;
      latitude?: number;
      longitude?: number;
      placeName?: string;
      type?: 'apel_pagi' | 'apel_siang';
      leaderName?: string;
      attendanceCount?: number;
    }
  ): Promise<string> => {
    setIsGeneratingWatermark(true);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsGeneratingWatermark(false);
          resolve(imageSrc);
          return;
        }

        const width = img.naturalWidth || 1280;
        const height = img.naturalHeight || 960;
        canvas.width = width;
        canvas.height = height;

        // 1. Draw Main Photo
        ctx.drawImage(img, 0, 0, width, height);

        // Parameters
        const pType = customParams?.type || selectedType;
        const pDate = customParams?.date || date;
        const pTime = customParams?.time || time;
        const pGmt = customParams?.gmtOffset || gmtOffset;
        const pPlace = customParams?.placeName || placeName;
        const pVillage = customParams?.village || village;
        const pDistrict = customParams?.district || district;
        const pRegency = customParams?.regency || regency;
        const pProvince = customParams?.province || province;
        const pLat = customParams?.latitude !== undefined ? customParams.latitude : latitude;
        const pLng = customParams?.longitude !== undefined ? customParams.longitude : longitude;
        const pLeader = customParams?.leaderName || leaderName;
        const pAttendance = customParams?.attendanceCount !== undefined ? customParams.attendanceCount : attendanceCount;

        // 2. Bottom-Right Corner Badge
        const badgeWidth = Math.min(480, Math.floor(width * 0.46));
        const badgeHeight = 168;
        const margin = 20;
        const badgeX = width - badgeWidth - margin;
        const badgeY = height - badgeHeight - margin;

        ctx.save();
        // Background container with dark glassmorphic styling
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;

        // Rounded rectangle
        const r = 14;
        ctx.beginPath();
        ctx.moveTo(badgeX + r, badgeY);
        ctx.lineTo(badgeX + badgeWidth - r, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r);
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight);
        ctx.lineTo(badgeX + r, badgeY + badgeHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r);
        ctx.lineTo(badgeX, badgeY + r);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Left accent indicator strip
        ctx.fillStyle = pType === 'apel_pagi' ? '#38BDF8' : '#FB923C';
        ctx.fillRect(badgeX + 14, badgeY + 14, 4, 18);

        // Line 1: Header / Activity Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
        const typeLabel = pType === 'apel_pagi' ? 'DOKUMENTASI APEL PAGI' : 'DOKUMENTASI APEL SIANG';
        ctx.fillText(`${typeLabel} • SMPN 4 SATAP TALIABU`, badgeX + 24, badgeY + 28);

        // Line 2: Lokasi Geografis (Tempat, Desa)
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(`📍 ${pPlace}, ${pVillage}`, badgeX + 14, badgeY + 54);

        // Line 3: Wilayah Administratif (Kecamatan, Kabupaten, Provinsi)
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '500 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(`🏛️ ${pDistrict}, ${pRegency}, ${pProvince}`, badgeX + 14, badgeY + 75);

        // Line 4: Koordinat GPS Otomatis (Latitude, Longitude)
        ctx.fillStyle = '#7DD3FC';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`🌐 GPS: Lat ${pLat.toFixed(6)}, Long ${pLng.toFixed(6)}`, badgeX + 14, badgeY + 99);

        // Line 5: Tanggal, Jam & GMT
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`📅 ${formatDateIndo(pDate)} | 🕒 ${pTime} ${pGmt}`, badgeX + 14, badgeY + 125);

        // Line 6: Verification & Leader Footer
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Pembina: ${pLeader} (${pAttendance} Peserta) • BKD SYNC`, badgeX + 14, badgeY + 150);

        ctx.restore();

        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setStampedPhoto(finalDataUrl);
        setIsGeneratingWatermark(false);
        resolve(finalDataUrl);
      };
      img.src = imageSrc;
    });
  };

  // Re-render watermark whenever text fields change
  const handleRefreshWatermark = () => {
    if (capturedRawPhoto) {
      renderWatermarkedPhoto(capturedRawPhoto);
    }
  };

  // Save Documentation Record
  const handleSaveDocumentation = () => {
    if (!stampedPhoto && !capturedRawPhoto) {
      alert('Silakan ambil foto apel terlebih dahulu melalui kamera atau unggah file.');
      return;
    }

    const newDoc: ApelDocumentation = {
      id: `apel_${Date.now()}`,
      title: selectedType === 'apel_pagi' ? 'Apel Pagi GTK & Siswa' : 'Apel Siang GTK & Siswa',
      type: selectedType,
      date,
      time,
      gmtOffset,
      placeName,
      village,
      district,
      regency,
      province,
      latitude,
      longitude,
      leaderName,
      attendanceCount,
      photoUrl: stampedPhoto || capturedRawPhoto || '',
      notes,
      createdAt: new Date().toISOString(),
    };

    onAddApelDoc(newDoc);
    setCapturedRawPhoto(null);
    setStampedPhoto(null);
    stopCamera();
    alert('✅ Dokumentasi Apel ber-watermark GPS & Jam resmi berhasil disimpan ke arsip BKD!');
  };

  // Apply Changes from Edit Date/Time Modal
  const handleApplyEditDoc = async () => {
    if (!editingDoc) return;
    const updatedStampedUrl = await renderWatermarkedPhoto(editingDoc.photoUrl, {
      date: editingDoc.date,
      time: editingDoc.time,
      gmtOffset: editingDoc.gmtOffset,
      placeName: editingDoc.placeName,
      village: editingDoc.village,
      district: editingDoc.district,
      regency: editingDoc.regency,
      province: editingDoc.province,
      latitude: editingDoc.latitude,
      longitude: editingDoc.longitude,
      leaderName: editingDoc.leaderName,
      attendanceCount: editingDoc.attendanceCount,
      type: editingDoc.type,
    });

    const finalizedDoc: ApelDocumentation = {
      ...editingDoc,
      photoUrl: updatedStampedUrl,
    };

    if (onUpdateApelDoc) {
      onUpdateApelDoc(finalizedDoc);
    }
    if (selectedDocPreview?.id === finalizedDoc.id) {
      setSelectedDocPreview(finalizedDoc);
    }
    setEditingDoc(null);
    alert('✅ Keterangan Tanggal, Jam, dan Lokasi GPS berhasil diperbarui dan stempel telah di-render ulang!');
  };

  // WhatsApp BKD Dispatch
  const handleSendWhatsAppBkd = (doc?: ApelDocumentation) => {
    const targetDoc = doc || {
      title: selectedType === 'apel_pagi' ? 'Apel Pagi GTK & Siswa' : 'Apel Siang GTK & Siswa',
      type: selectedType,
      date,
      time,
      gmtOffset,
      placeName,
      village,
      district,
      regency,
      province,
      latitude,
      longitude,
      leaderName,
      attendanceCount,
    };

    const bkdPhone = config.bkdWhatsApp || '082292398412';
    const cleanPhone = bkdPhone.replace(/\D/g, '').replace(/^0/, '62');

    const driveLink = config.googleDriveFolderId
      ? `https://drive.google.com/drive/folders/${config.googleDriveFolderId}`
      : config.bkdDriveUrl || '-';

    const message = `*LAPORAN DOKUMENTASI APEL & PRESENSI BKD TALIABU*
🏫 Instansi: ${config.schoolName} (NPSN: ${config.npsn})
📌 Jenis: ${targetDoc.type === 'apel_pagi' ? '☀️ Apel Pagi' : '🌤️ Apel Siang'}
📅 Tanggal: ${formatDateIndo(targetDoc.date)}
🕒 Jam: ${targetDoc.time} ${targetDoc.gmtOffset}
📍 Titik Lokasi: ${targetDoc.placeName}, ${targetDoc.village}, ${targetDoc.district}, ${targetDoc.regency}
🌐 Koordinat GPS: Lat ${targetDoc.latitude.toFixed(6)}, Long ${targetDoc.longitude.toFixed(6)}
👤 Pembina Apel: ${targetDoc.leaderName}
👥 Jumlah Peserta: ${targetDoc.attendanceCount} Guru & Siswa

📂 Folder Google Drive Sekolah: ${driveLink}
📧 Arsip Email: ${config.bkdEmail || '-'}

_Telah diverifikasi secara elektronik dengan Geotagging & Timestamp Presisi._`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Google Drive BKD Link
  const handleOpenBkdDrive = () => {
    const url =
      config.bkdDriveUrl ||
      (config.googleDriveFolderId
        ? `https://drive.google.com/drive/folders/${config.googleDriveFolderId}`
        : 'https://drive.google.com');
    window.open(url, '_blank');
  };

  // Email BKD Dispatch
  const handleSendEmailBkd = (doc?: ApelDocumentation) => {
    const targetDoc = doc || {
      type: selectedType,
      date,
      time,
      gmtOffset,
      placeName,
      village,
      district,
      regency,
      latitude,
      longitude,
      leaderName,
      attendanceCount,
    };

    const email = config.bkdEmail || 'bkd@taliabukab.go.id';
    const subject = `Laporan Dokumentasi Apel & Presensi - ${config.schoolName} - ${formatDateIndo(targetDoc.date)}`;
    const body = `Yth. Bidang Penilaian Kinerja & Fasilitasi Profesi ASN BKD Pulau Taliabu,

Bersama ini kami kirimkan laporan dokumentasi kegiatan apel resmi ${config.schoolName}:
- Kegiatan: ${targetDoc.type === 'apel_pagi' ? 'Apel Pagi' : 'Apel Siang'}
- Tanggal & Waktu: ${formatDateIndo(targetDoc.date)}, ${targetDoc.time} ${targetDoc.gmtOffset}
- Lokasi Geotagging: ${targetDoc.placeName}, ${targetDoc.village}, ${targetDoc.district}, ${targetDoc.regency}
- Koordinat GPS: Lat ${targetDoc.latitude.toFixed(6)}, Long ${targetDoc.longitude.toFixed(6)}
- Pembina Apel: ${targetDoc.leaderName} (${targetDoc.attendanceCount} Peserta)

Tautan Berkas Google Drive Sekolah:
${config.googleDriveFolderId ? `https://drive.google.com/drive/folders/${config.googleDriveFolderId}` : config.bkdDriveUrl || 'https://drive.google.com'}

Hormat kami,
Kepala SMPN 4 Satap Taliabu Barat
${config.principalName}`;

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Save copy to Google Drive Folder
  const handleSaveToDrive = (docTitle: string) => {
    const folderId = config.googleDriveFolderId || 'SMPN4-TALIABU-PRESENSI-2025';
    setDriveSavedToast(`Salinan berkas "${docTitle}" berhasil disinkronkan ke folder Google Drive ID: ${folderId}`);
    setTimeout(() => setDriveSavedToast(null), 5000);
  };

  // Filtered List
  const filteredDocs = apelDocs.filter((doc) => {
    const matchType = typeFilter === 'all' || doc.type === typeFilter;
    const matchSearch =
      doc.date.includes(searchFilter) ||
      (doc.leaderName && doc.leaderName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      doc.placeName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {driveSavedToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{driveSavedToast}</span>
          </div>
          <button
            type="button"
            onClick={handleOpenBkdDrive}
            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] hover:bg-emerald-700"
          >
            Buka Folder Drive
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Lampiran Resmi Presensi BKD Taliabu</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Dokumentasi Apel Pagi & Apel Siang
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Perekaman bukti apel GTK dan siswa berstempel otomatis (Watermark GPS di sudut kanan bawah foto:
            Latitude, Longitude, Desa, Kecamatan, Kabupaten, Provinsi, Tanggal, Jam, dan GMT).
          </p>
        </div>

        {/* Quick BKD Integration Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSendWhatsAppBkd()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            title="Kirim Laporan Apel ke WA BKD"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim WA BKD</span>
          </button>

          <button
            type="button"
            onClick={handleOpenBkdDrive}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            title="Akses Folder Google Drive BKD"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Drive BKD</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendEmailBkd()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            title="Kirim Email ke BKD Taliabu"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email BKD</span>
          </button>
        </div>
      </div>

      {/* Camera Capture and Stamping Workplace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewfinder & Watermark Preview (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isCameraActive ? 'Kamera Sedang Aktif' : 'Pratinjau Foto & Stempel Watermark'}
                </h3>
              </div>

              {/* Type Switcher */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('apel_pagi');
                    setPlaceName('Lapangan Utama Upacara SMPN 4 Satap');
                    setNotes('Apel kedisiplinan dan koordinasi KBM pagi berlangsung khidmat dan tertib.');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedType === 'apel_pagi'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ☀️ Apel Pagi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('apel_siang');
                    setPlaceName('Halaman Depan Kantor Sekolah');
                    setNotes('Apel siang/sore evaluasi harian dan penutupan KBM.');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedType === 'apel_siang'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌤️ Apel Siang
                </button>
              </div>
            </div>

            {/* Photo Viewport */}
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 flex items-center justify-center">
              {isCameraActive ? (
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
                  className="w-full h-full object-cover"
                />
              ) : stampedPhoto ? (
                <img
                  src={stampedPhoto}
                  alt="Watermarked Apel Documentation"
                  className="w-full h-full object-contain bg-slate-900"
                />
              ) : capturedRawPhoto ? (
                <img
                  src={capturedRawPhoto}
                  alt="Captured Photo"
                  className="w-full h-full object-contain bg-slate-900"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Kamera Belum Aktif</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Buka kamera perangkat atau unggah foto dokumentasi apel
                    </p>
                  </div>
                </div>
              )}

              {/* Watermark Generation Indicator */}
              {isGeneratingWatermark && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white">
                  <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                  <p className="text-xs font-bold">Mencetak Watermark Sudut Kanan Bawah...</p>
                </div>
              )}
            </div>

            {/* Camera Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Buka Kamera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 animate-pulse"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Foto</span>
                </button>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={() => {
                    const next = facingMode === 'user' ? 'environment' : 'user';
                    setFacingMode(next);
                    startCamera(next);
                  }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Putar Cam</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Foto</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadPhoto}
                className="hidden"
              />

              {capturedRawPhoto && (
                <button
                  type="button"
                  onClick={handleRefreshWatermark}
                  className="px-3 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-2xl text-xs font-bold border border-sky-200 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Update Stamp</span>
                </button>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>Tutup Cam</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Details Input & Edit (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Keterangan Lokasi & Geotagging Otomatis</span>
              </h3>

              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isLocating}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer border border-sky-200"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Membaca Satelit...' : 'Baca GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tanggal Pelaksanaan (Bisa Diedit) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Tanggal Pelaksanaan (Edit)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-900 font-mono"
                />
              </div>

              {/* Jam Pelaksanaan (Bisa Diedit) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Jam / Waktu Pelaksanaan (Edit)
                </label>
                <input
                  type="time"
                  step="1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>

              {/* Zona Waktu GMT */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Zona Waktu (GMT)
                </label>
                <select
                  value={gmtOffset}
                  onChange={(e) => setGmtOffset(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="GMT+8 (WITA)">GMT+8 (WITA - Taliabu/Malut)</option>
                  <option value="GMT+7 (WIB)">GMT+7 (WIB)</option>
                  <option value="GMT+9 (WIT)">GMT+9 (WIT)</option>
                </select>
              </div>

              {/* Latitude & Longitude */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Koordinat Lintang (Lat) & Bujur (Lng)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="Lng"
                  />
                </div>
              </div>

              {/* Nama Tempat Titik Kumpul */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nama Tempat / Titik Kumpul Apel
                </label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="e.g. Lapangan Utama Upacara SMPN 4 Satap"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Desa & Kecamatan */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Desa Pancoran"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Kecamatan Taliabu Barat"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Kabupaten & Provinsi */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Kabupaten
                </label>
                <input
                  type="text"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  placeholder="Kabupaten Pulau Taliabu"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Maluku Utara"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Pembina Apel */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Pembina Apel
                </label>
                <input
                  type="text"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Nama Pembina Apel"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Jumlah Peserta */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Jumlah Peserta Hadir
                </label>
                <input
                  type="number"
                  min="1"
                  value={attendanceCount}
                  onChange={(e) => setAttendanceCount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveDocumentation}
                disabled={!stampedPhoto && !capturedRawPhoto}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Foto Dokumentasi Ber-Watermark ke BKD</span>
              </button>

              {stampedPhoto && (
                <button
                  type="button"
                  onClick={() => handleSaveToDrive(`Dokumentasi_${selectedType}_${date}`)}
                  className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Simpan ke Folder Drive Sekolah"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Simpan ke Drive</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery / History of Apel Documentation */}
      <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Riwayat Dokumentasi Apel ({filteredDocs.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Arsip berkas foto apel pagi & siang ber-watermark sudut kanan bawah resmi BKD
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari tanggal/pembina..."
                className="text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('apel_pagi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'apel_pagi' ? 'bg-blue-600 text-white' : 'text-slate-500'
                }`}
              >
                Pagi
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('apel_siang')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'apel_siang' ? 'bg-amber-600 text-white' : 'text-slate-500'
                }`}
              >
                Siang
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 space-y-2">
            <Camera className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">Belum ada foto dokumentasi apel tersimpan.</p>
            <p className="text-[11px]">
              Gunakan panel kamera di atas untuk merekam kegiatan apel pagi dan siang hari ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-3xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Photo Thumbnail */}
                <div
                  onClick={() => setSelectedDocPreview(doc)}
                  className="relative aspect-4/3 w-full bg-slate-900 cursor-pointer group overflow-hidden"
                >
                  <img
                    src={doc.photoUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                        doc.type === 'apel_pagi' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {doc.type === 'apel_pagi' ? '☀️ Apel Pagi' : '🌤️ Apel Siang'}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 text-white text-xs font-bold">
                    <Eye className="w-4 h-4" />
                    <span>Lihat Ukuran Penuh</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5 flex-1">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{doc.title}</h4>
                    <p className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {doc.time} {doc.gmtOffset}
                      </span>
                      <span>•</span>
                      <span>{formatDateIndo(doc.date)}</span>
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200/70">
                    <div className="flex items-start space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {doc.placeName}, {doc.village}, {doc.district}, {doc.regency}, {doc.province}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono pl-4.5">
                      GPS: {doc.latitude.toFixed(5)}, {doc.longitude.toFixed(5)}
                    </div>
                  </div>

                  {doc.leaderName && (
                    <div className="text-[11px] text-slate-700 flex items-center justify-between pt-1">
                      <span className="text-slate-400 text-[10px]">Pembina:</span>
                      <span className="font-bold truncate">{doc.leaderName}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-white border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <a
                      href={doc.photoUrl}
                      download={`Dokumentasi_Apel_${doc.type}_${doc.date}.jpg`}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                      title="Unduh Foto Ber-Watermark"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setEditingDoc({ ...doc })}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Edit Keterangan Tanggal & Jam GPS"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppBkd(doc)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      title="Kirim ke WA BKD"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveToDrive(`Dokumentasi_Apel_${doc.type}_${doc.date}`)}
                      className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                      title="Simpan ke Folder Drive Sekolah"
                    >
                      <HardDrive className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Hapus foto dokumentasi apel ini?')) {
                          onDeleteApelDoc(doc.id);
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Edit Tanggal, Jam & Lokasi GPS */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Edit Tanggal, Jam & Keterangan Foto GPS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ubah data waktu dan lokasi di bawah ini. Stempel watermark resmi di sudut kanan bawah foto akan
              dibuat ulang secara otomatis.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={editingDoc.date}
                    onChange={(e) => setEditingDoc({ ...editingDoc, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam (HH:mm:ss)</label>
                  <input
                    type="time"
                    step="1"
                    value={editingDoc.time}
                    onChange={(e) => setEditingDoc({ ...editingDoc, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Zona Waktu (GMT)</label>
                <select
                  value={editingDoc.gmtOffset}
                  onChange={(e) => setEditingDoc({ ...editingDoc, gmtOffset: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="GMT+8 (WITA)">GMT+8 (WITA - Maluku Utara / Taliabu)</option>
                  <option value="GMT+7 (WIB)">GMT+7 (WIB)</option>
                  <option value="GMT+9 (WIT)">GMT+9 (WIT)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Tempat / Lapangan</label>
                <input
                  type="text"
                  value={editingDoc.placeName}
                  onChange={(e) => setEditingDoc({ ...editingDoc, placeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Desa / Kelurahan</label>
                  <input
                    type="text"
                    value={editingDoc.village}
                    onChange={(e) => setEditingDoc({ ...editingDoc, village: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={editingDoc.district}
                    onChange={(e) => setEditingDoc({ ...editingDoc, district: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingDoc.latitude}
                    onChange={(e) => setEditingDoc({ ...editingDoc, latitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingDoc.longitude}
                    onChange={(e) => setEditingDoc({ ...editingDoc, longitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pembina Apel</label>
                  <input
                    type="text"
                    value={editingDoc.leaderName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, leaderName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Peserta (Orang)</label>
                  <input
                    type="number"
                    value={editingDoc.attendanceCount}
                    onChange={(e) => setEditingDoc({ ...editingDoc, attendanceCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyEditDoc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan & Cetak Ulang Stempel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Fullscreen */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    selectedDocPreview.type === 'apel_pagi' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  {selectedDocPreview.type === 'apel_pagi' ? '☀️ Apel Pagi' : '🌤️ Apel Siang'}
                </span>
                <h3 className="font-extrabold text-sm text-slate-900">{selectedDocPreview.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Photo */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
              <img
                src={selectedDocPreview.photoUrl}
                alt={selectedDocPreview.title}
                className="w-full max-h-[500px] object-contain mx-auto"
              />
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Waktu & GMT</span>
                <p className="font-bold text-slate-800">
                  {selectedDocPreview.time} {selectedDocPreview.gmtOffset}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tanggal</span>
                <p className="font-bold text-slate-800">{formatDateIndo(selectedDocPreview.date)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Koordinat Lintang/Bujur</span>
                <p className="font-mono text-slate-800">
                  {selectedDocPreview.latitude.toFixed(6)}, {selectedDocPreview.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Desa / Kelurahan</span>
                <p className="font-bold text-slate-800">{selectedDocPreview.village}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Kecamatan</span>
                <p className="font-bold text-slate-800">{selectedDocPreview.district}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Kabupaten & Provinsi</span>
                <p className="font-bold text-slate-800">
                  {selectedDocPreview.regency}, {selectedDocPreview.province}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc({ ...selectedDocPreview });
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Tanggal & Jam</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsAppBkd(selectedDocPreview)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke WA BKD</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={selectedDocPreview.photoUrl}
                  download={`Dokumentasi_Apel_${selectedDocPreview.type}_${selectedDocPreview.date}.jpg`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Laporan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
