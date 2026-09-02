import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  Globe,
  Upload,
  CheckCircle2,
  Trash2,
  Download,
  Share2,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  UserCheck,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Printer,
  ShieldCheck,
  LocateFixed,
  Map,
} from 'lucide-react';
import { ApelDocumentation, SchoolConfig, Teacher } from '../types';
import { GoogleMapsGeofence } from './GoogleMapsGeofence';
import { formatDateIndo, playBeepSound } from '../utils/soundAndDate';

interface ApelDocumentationTabProps {
  config: SchoolConfig;
  teachers?: Teacher[];
  apelDocs: ApelDocumentation[];
  onAddApelDoc: (doc: ApelDocumentation) => void;
  onDeleteApelDoc: (id: string) => void;
  onClearAllApelDocs?: () => void;
}

export const ApelDocumentationTab: React.FC<ApelDocumentationTabProps> = ({
  config,
  teachers = [],
  apelDocs = [],
  onAddApelDoc,
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

  // Form Fields
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

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

  // Start Camera
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setIsCameraActive(true);
    setCapturedRawPhoto(null);
    setStampedPhoto(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setIsCameraActive(false);
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

  // Capture Snapshot from video
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 1280;
    tempCanvas.height = video.videoHeight || 960;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    const rawDataUrl = tempCanvas.toDataURL('image/jpeg', 0.92);
    setCapturedRawPhoto(rawDataUrl);
    stopCamera();
    playBeepSound();

    // Render Canvas Watermark
    renderWatermarkedPhoto(rawDataUrl);
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

  // Canvas Watermark Stamping Engine (Location, Desa, Kecamatan, Kabupaten, Provinsi, Jam, GMT)
  const renderWatermarkedPhoto = (imageSrc: string) => {
    setIsGeneratingWatermark(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsGeneratingWatermark(false);
        return;
      }

      // Output size: standard high-res 1280x960 or proportional
      const width = 1280;
      const height = 960;
      canvas.width = width;
      canvas.height = height;

      // Draw Main Photo
      ctx.drawImage(img, 0, 0, width, height);

      // Gradient overlay at bottom for maximum readability
      const gradient = ctx.createLinearGradient(0, height - 260, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
      gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.85)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - 260, width, 260);

      // Top Header Badge
      ctx.fillStyle = selectedType === 'apel_pagi' ? 'rgba(30, 58, 138, 0.9)' : 'rgba(124, 45, 18, 0.9)';
      ctx.fillRect(24, 24, 380, 54);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(
        selectedType === 'apel_pagi' ? '☀️ DOKUMENTASI APEL PAGI' : '🌤️ DOKUMENTASI APEL SIANG',
        40,
        58
      );

      // School Name Header
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(config.schoolName || 'SMP NEGERI 4 SATU ATAP TALIABU BARAT', 40, height - 200);

      // Sub-header / Place details
      ctx.font = '500 20px system-ui, sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`📍 ${placeName}, ${village}`, 40, height - 165);
      ctx.fillText(`🏛️ ${district}, ${regency}, ${province}`, 40, height - 135);

      // Coordinates & Time & GMT Bar
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(
        `🌐 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}  |  🕒 ${time} ${gmtOffset}`,
        40,
        height - 100
      );

      // Date & Verification Stamp
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(
        `📅 ${formatDateIndo(date)}  •  Pembina: ${leaderName}  •  Peserta: ${attendanceCount} Orang`,
        40,
        height - 65
      );

      // Government / BKD Security watermark tag on bottom right
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(width - 360, height - 75, 330, 48);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`BKD TALIABU DIGITAL SYNC`, width - 340, height - 52);
      ctx.font = '11px monospace';
      ctx.fillText(`NPSN:${config.npsn} • VERIFIED`, width - 340, height - 36);

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setStampedPhoto(finalDataUrl);
      setIsGeneratingWatermark(false);
    };
    img.src = imageSrc;
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
      alert('Silakan ambil foto apel terlebih dahulu.');
      return;
    }

    const newDoc: ApelDocumentation = {
      id: `apel_${Date.now()}`,
      type: selectedType,
      title: selectedType === 'apel_pagi' ? `Dokumentasi Apel Pagi - ${formatDateIndo(date)}` : `Dokumentasi Apel Siang - ${formatDateIndo(date)}`,
      date,
      time,
      gmtOffset,
      latitude,
      longitude,
      placeName,
      village,
      district,
      regency,
      province,
      photoUrl: stampedPhoto || capturedRawPhoto || '',
      leaderName,
      attendanceCount,
      notes,
      createdAt: new Date().toISOString(),
    };

    onAddApelDoc(newDoc);
    playBeepSound();

    // Reset capture
    setCapturedRawPhoto(null);
    setStampedPhoto(null);
    alert('✓ Foto Dokumentasi Apel berhasil disimpan dan terintegrasi ke rekapitulasi BKD!');
  };

  // Filtered list of docs
  const filteredDocs = apelDocs.filter((doc) => {
    const matchType = typeFilter === 'all' || doc.type === typeFilter;
    const matchSearch =
      doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.placeName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.date.includes(searchFilter) ||
      (doc.leaderName && doc.leaderName.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Hidden Canvas for Watermark Generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-sky-300">
              <Camera className="w-3.5 h-3.5" />
              <span>Dokumentasi Kedisiplinan ASN & GTK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Foto Dokumentasi Apel Pagi & Apel Siang BKD
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Perekaman foto resmi kegiatan Apel Pagi dan Apel Siang yang dilengkapi penandaan otomatis (watermark) Lintang, Bujur, Nama Tempat, Desa, Kecamatan, Kabupaten, Provinsi, Waktu, dan GMT untuk pelaporan SIMPEG/BKD Kab. Pulau Taliabu.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15 text-xs font-mono font-bold text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{apelDocs.length} Dokumentasi Tersimpan</span>
            </span>
          </div>
        </div>
      </div>

      {/* Form Input & Camera Capture Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Photo Capture & Watermark Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Pengambilan Foto Dokumentasi Apel</span>
              </h3>

              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('apel_pagi');
                    setPlaceName('Lapangan Upacara SMPN 4 Satap');
                    setNotes('Apel pagi kedisiplinan dan pengarahan KBM berjalan tertib.');
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
                  ref={videoRef}
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
                  <p className="text-xs font-bold">Mencetak Watermark Lokasi & Waktu...</p>
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

        {/* Right Column: Metadata Details Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Keterangan Lokasi & Geotagging Resmi</span>
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
              {/* Latitude & Longitude */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lintang (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Bujur (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* Nama Tempat */}
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

              {/* Waktu & GMT */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Jam / Waktu Pelaksanaan
                </label>
                <input
                  type="time"
                  step="1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Zona Waktu (GMT Offset)
                </label>
                <select
                  value={gmtOffset}
                  onChange={(e) => setGmtOffset(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700"
                >
                  <option value="GMT+8 (WITA)">GMT+8 (WITA - Waktu Indonesia Tengah)</option>
                  <option value="GMT+9 (WIT)">GMT+9 (WIT - Waktu Indonesia Timur)</option>
                  <option value="GMT+7 (WIB)">GMT+7 (WIB - Waktu Indonesia Barat)</option>
                </select>
              </div>

              {/* Pembina Apel & Jumlah Peserta */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Pembina / Pemimpin Apel
                </label>
                <input
                  type="text"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Nama Pembina Apel"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Jumlah Peserta Apel (Orang)
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
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveDocumentation}
                disabled={!stampedPhoto && !capturedRawPhoto}
                className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Foto Dokumentasi Apel ke BKD</span>
              </button>
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
              Arsip berkas foto apel pagi & siang yang siap diekspor untuk laporan resmi BKD
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
            <p className="text-[11px]">Gunakan panel kamera di atas untuk merekam kegiatan apel pagi dan siang hari ini.</p>
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
                        doc.type === 'apel_pagi'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white'
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
                      <span>{doc.time} {doc.gmtOffset}</span>
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
                  <a
                    href={doc.photoUrl}
                    download={`Dokumentasi_Apel_${doc.type}_${doc.date}.jpg`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDocPreview(doc)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title="Lihat Detail"
                    >
                      <Eye className="w-4 h-4" />
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

      {/* Modal Preview Fullscreen */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    selectedDocPreview.type === 'apel_pagi'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-600 text-white'
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
                <p className="font-bold text-slate-800">{selectedDocPreview.time} {selectedDocPreview.gmtOffset}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tanggal</span>
                <p className="font-bold text-slate-800">{formatDateIndo(selectedDocPreview.date)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Koordinat Lintang/Bujur</span>
                <p className="font-mono text-slate-800">{selectedDocPreview.latitude.toFixed(6)}, {selectedDocPreview.longitude.toFixed(6)}</p>
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
                <p className="font-bold text-slate-800">{selectedDocPreview.regency}, {selectedDocPreview.province}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <a
                href={selectedDocPreview.photoUrl}
                download={`Dokumentasi_Apel_${selectedDocPreview.type}_${selectedDocPreview.date}.jpg`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Foto Resolusi Penuh</span>
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
      )}
    </div>
  );
};
