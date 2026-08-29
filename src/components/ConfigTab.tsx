import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  School,
  Clock,
  MapPin,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  Upload,
  Image as ImageIcon,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Database,
  CloudUpload,
  CloudDownload,
  Download,
  FileJson,
  RefreshCw,
  Palette,
  Check,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import {
  SchoolConfig,
  AppBackupData,
  BackupSummary,
  AttendanceRecord,
  Student,
  Teacher,
  SchoolClass,
  LeaveRequest,
  GtkServiceRequest,
  AcademicEvent,
  ActivityLog,
  BiometricLog,
} from '../types';
import { playBeepSound } from '../utils/soundAndDate';
import {
  saveBackupToFirestore,
  fetchFirestoreBackups,
  restoreBackupFromFirestore,
} from '../lib/firebase';
import { GoogleMapsGeofence } from './GoogleMapsGeofence';
import { LocateFixed, Map as MapIcon } from 'lucide-react';

interface ConfigTabProps {
  config: SchoolConfig;
  records?: AttendanceRecord[];
  students?: Student[];
  teachers?: Teacher[];
  classes?: SchoolClass[];
  leaves?: LeaveRequest[];
  gtkServices?: GtkServiceRequest[];
  events?: AcademicEvent[];
  activityLogs?: ActivityLog[];
  biometricLogs?: BiometricLog[];
  onSaveConfig: (newConfig: SchoolConfig) => void;
  onResetToDefault: () => void;
  onRestoreBackup?: (backupData: AppBackupData) => void;
}

const PRESET_LOGOS = [
  {
    name: 'Kemendikbudristek',
    desc: 'Logo Tut Wuri Handayani',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Indonesia.svg/240px-Logo_of_Ministry_of_Education_and_Culture_of_Indonesia.svg.png',
  },
  {
    name: 'Kementerian Agama (Kemenag)',
    desc: 'Ikhlas Beramal',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Kementerian_Agama_RI.png/240px-Kementerian_Agama_RI.png',
  },
  {
    name: 'Lambang SMAN 1 Unggulan',
    desc: 'Lambang Kebangsaan & Obor',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Modern Academy Shield',
    desc: 'Emblem Prestasi & Buku',
    url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80',
  },
];

const COLOR_PALETTES = [
  { id: 'indigo', name: 'Indigo Modern', primary: '#4F46E5', bg: 'bg-indigo-600', text: 'text-indigo-600', ring: 'ring-indigo-500' },
  { id: 'emerald', name: 'Emerald Madrasah', primary: '#059669', bg: 'bg-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-500' },
  { id: 'crimson', name: 'Crimson Prestasi', primary: '#E11D48', bg: 'bg-rose-600', text: 'text-rose-600', ring: 'ring-rose-500' },
  { id: 'amber', name: 'Amber Mandiri', primary: '#D97706', bg: 'bg-amber-600', text: 'text-amber-600', ring: 'ring-amber-500' },
  { id: 'slate', name: 'Slate Corporate', primary: '#334155', bg: 'bg-slate-800', text: 'text-slate-800', ring: 'ring-slate-500' },
];

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  records = [],
  students = [],
  teachers = [],
  classes = [],
  leaves = [],
  gtkServices = [],
  events = [],
  activityLogs = [],
  biometricLogs = [],
  onSaveConfig,
  onResetToDefault,
  onRestoreBackup,
}) => {
  const [formData, setFormData] = useState<SchoolConfig>({
    ...config,
    principalName: config.principalName || 'Dr. H. Mulyadi, M.Pd.',
    principalNip: config.principalNip || '197103151998021001',
    adminName: config.adminName || 'Siti Aminah, S.Kom. (SIMPEG)',
    logoUrl: config.logoUrl || PRESET_LOGOS[2].url,
  });

  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    return localStorage.getItem('school_presensi_theme_palette') || 'indigo';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupList, setBackupList] = useState<BackupSummary[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonRestoreInputRef = useRef<HTMLInputElement>(null);

  // Fetch Firestore backup list on load
  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await fetchFirestoreBackups();
      setBackupList(list);
    } catch (err) {
      console.warn('Failed to load backup list:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleSelectTheme = (paletteId: string) => {
    setSelectedTheme(paletteId);
    localStorage.setItem('school_presensi_theme_palette', paletteId);
    document.documentElement.setAttribute('data-theme', paletteId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playBeepSound();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Perform Firestore Backup
  const handleBackupToFirestore = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);

    const now = new Date();
    const backupId = `backup_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const backupPayload: AppBackupData = {
      id: backupId,
      timestamp: now.toISOString(),
      createdDate: now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      createdTime: now.toLocaleTimeString('id-ID'),
      source: 'Admin Cloud Backup (Firebase Firestore)',
      totalRecords: records.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      totalLeaves: leaves.length,
      totalGtkServices: gtkServices.length,
      records,
      students,
      teachers,
      classes,
      leaves,
      gtkServices,
      events,
      config: formData,
      activityLogs,
      biometricLogs,
    };

    try {
      const res = await saveBackupToFirestore(backupPayload);
      if (res.success) {
        setBackupMessage({
          type: 'success',
          text: `Pencadangan Berhasil! ID: ${res.id} (${res.message})`,
        });
        loadBackups();
      } else {
        setBackupMessage({
          type: 'error',
          text: res.message || 'Gagal melakukan backup ke Firestore.',
        });
      }
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan sistem saat pencadangan.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Download Local JSON Backup
  const handleDownloadJsonBackup = () => {
    const now = new Date();
    const backupPayload: AppBackupData = {
      id: `backup_offline_${Date.now()}`,
      timestamp: now.toISOString(),
      createdDate: now.toLocaleDateString('id-ID'),
      createdTime: now.toLocaleTimeString('id-ID'),
      source: 'Offline JSON Export',
      totalRecords: records.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      totalLeaves: leaves.length,
      totalGtkServices: gtkServices.length,
      records,
      students,
      teachers,
      classes,
      leaves,
      gtkServices,
      events,
      config: formData,
      activityLogs,
      biometricLogs,
    };

    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Presensi_${formData.schoolName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle JSON File Restore
  const handleJsonFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as AppBackupData;
        if (!parsed.records && !parsed.students && !parsed.teachers) {
          alert('File JSON tidak valid atau struktur tidak sesuai format data presensi sekolah.');
          return;
        }

        if (confirm(`Pulihkan data dari file "${file.name}"? Ini akan memperbarui data presensi, guru, dan siswa.`)) {
          if (onRestoreBackup) {
            onRestoreBackup(parsed);
          } else {
            // Apply directly to localStorage & reload
            if (parsed.config) localStorage.setItem('school_presensi_config', JSON.stringify(parsed.config));
            if (parsed.records) localStorage.setItem('school_presensi_records', JSON.stringify(parsed.records));
            if (parsed.students) localStorage.setItem('school_presensi_students', JSON.stringify(parsed.students));
            if (parsed.teachers) localStorage.setItem('school_presensi_teachers', JSON.stringify(parsed.teachers));
            if (parsed.classes) localStorage.setItem('school_presensi_classes', JSON.stringify(parsed.classes));
            if (parsed.leaves) localStorage.setItem('school_presensi_leaves', JSON.stringify(parsed.leaves));
            if (parsed.gtkServices) localStorage.setItem('school_presensi_gtk_services', JSON.stringify(parsed.gtkServices));
            if (parsed.events) localStorage.setItem('school_presensi_events', JSON.stringify(parsed.events));
            window.location.reload();
          }
        }
      } catch (err) {
        alert('Gagal membaca file JSON cadangan.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Restore from Firestore
  const handleRestoreFromFirestore = async (backupId: string) => {
    if (!confirm(`Apakah Anda yakin ingin memulihkan seluruh data aplikasi dari Snapshot Cloud "${backupId}"?`)) {
      return;
    }

    try {
      const data = await restoreBackupFromFirestore(backupId);
      if (!data) {
        alert('Data snapshot tidak ditemukan di Firestore.');
        return;
      }

      if (onRestoreBackup) {
        onRestoreBackup(data);
      } else {
        if (data.config) localStorage.setItem('school_presensi_config', JSON.stringify(data.config));
        if (data.records) localStorage.setItem('school_presensi_records', JSON.stringify(data.records));
        if (data.students) localStorage.setItem('school_presensi_students', JSON.stringify(data.students));
        if (data.teachers) localStorage.setItem('school_presensi_teachers', JSON.stringify(data.teachers));
        if (data.classes) localStorage.setItem('school_presensi_classes', JSON.stringify(data.classes));
        if (data.leaves) localStorage.setItem('school_presensi_leaves', JSON.stringify(data.leaves));
        if (data.gtkServices) localStorage.setItem('school_presensi_gtk_services', JSON.stringify(data.gtkServices));
        if (data.events) localStorage.setItem('school_presensi_events', JSON.stringify(data.events));
        window.location.reload();
      }
      alert('Pemulihan database Firestore berhasil diterapkan!');
    } catch (err) {
      alert('Gagal memulihkan cadangan dari Firestore.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="font-extrabold text-lg text-slate-900">
              Konfigurasi Sistem, Tema & Cadangan Data
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola identitas resmi sekolah, logo kop surat, verifikator Kepala Sekolah/Admin, pencadangan Cloud Firestore & tema tampilan
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin mengembalikan pengaturan & data ke default?')) {
                onResetToDefault();
              }
            }}
            className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Default</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan dan Logo Sekolah berhasil disimpan secara permanen!</span>
        </div>
      )}

      {/* SEKSI 1: PENCADANGAN DATA CLOUD FIRESTORE & FILE OFFLINE */}
      <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 border border-indigo-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                Pencadangan & Pemulihan Database (Firebase Firestore & JSON)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simpan seluruh snapshot state presensi, siswa, guru, rombel, dan log ke Cloud Firestore sebagai proteksi kehilangan data.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleBackupToFirestore}
              disabled={isBackingUp}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
            >
              {isBackingUp ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>{isBackingUp ? 'Menyimpan...' : 'Backup Data ke Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonRestoreInputRef.current?.click()}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FileJson className="w-4 h-4 text-amber-600" />
              <span>Impor JSON</span>
            </button>
            <input
              ref={jsonRestoreInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonFileRestore}
              className="hidden"
            />
          </div>
        </div>

        {backupMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{backupMessage.text}</span>
          </div>
        )}

        {/* Current State Snapshot Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Log Presensi</span>
            <p className="text-lg font-black text-slate-800 font-mono">{records.length}</p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Siswa</span>
            <p className="text-lg font-black text-slate-800 font-mono">{students.length}</p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Guru & GTK</span>
            <p className="text-lg font-black text-slate-800 font-mono">{teachers.length}</p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Layanan & Izin</span>
            <p className="text-lg font-black text-slate-800 font-mono">{leaves.length + gtkServices.length}</p>
          </div>
        </div>

        {/* Recent Backups List */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Daftar Snapshot Cadangan Cloud Firestore ({backupList.length})</span>
            </h4>
            <button
              onClick={loadBackups}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {backupList.length === 0 ? (
            <div className="p-4 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Belum ada snapshot backup di Cloud Firestore. Klik tombol "Backup Data ke Firestore" di atas untuk membuat cadangan pertama.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {backupList.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 font-mono">{b.id}</div>
                    <div className="text-[10px] text-slate-400">
                      {b.createdDate} • {b.totalRecords} Presensi, {b.totalStudents} Siswa, {b.totalTeachers} Guru ({b.source})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreFromFirestore(b.id)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>Pulihkan</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEKSI 2: COLOR PALETTE THEME SELECTOR */}
      <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-base text-slate-900">
            Palet Warna & Nuansa Tema Aplikasi (Theme Preset)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Pilih tema warna aksen yang sesuai dengan identitas sekolah (Madrasah, Unggulan Negeri, Swasta Modern).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {COLOR_PALETTES.map((p) => {
            const isSelected = selectedTheme === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectTheme(p.id)}
                className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50 shadow-md ring-2 ring-slate-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`w-5 h-5 rounded-full ${p.bg} shadow-xs`} />
                  {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.primary}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEKSI 3: MAIN SCHOOL IDENTITY FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LOGO SEKOLAH INPUT & PREVIEW */}
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>Logo Resmi Sekolah (Kop Surat, Kartu GTK & Siswa)</span>
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Otomatis sinkron ke Kartu & Cetak
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Preview Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-24 h-24 rounded-2xl bg-white p-2 border-2 border-dashed border-indigo-200 flex items-center justify-center shadow-xs overflow-hidden">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Preview Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <School className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800">{formData.schoolName}</p>
                <p className="text-[10px] text-slate-400 font-mono">NPSN: {formData.npsn}</p>
              </div>
            </div>

            {/* Upload Custom & Presets */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Unggah Logo Baru (PNG Transparan / JPG / SVG)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl border border-indigo-200 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Berkas Logo dari Komputer</span>
                  </button>
                  <span className="text-[11px] text-slate-400 truncate">
                    Maks 2MB, format transparan direkomendasikan
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Atau Pilih Preset Lambang Instansi Pendidikan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: preset.url })}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center space-y-1.5 ${
                        formData.logoUrl === preset.url
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 object-contain"
                      />
                      <span className="text-[10px] font-bold text-slate-800 line-clamp-1">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IDENTITAS SEKOLAH & PEJABAT VERIFIKATOR */}
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <School className="w-4 h-4 text-indigo-600" />
            <span>Identitas Sekolah & Verifikator Resmi</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Sekolah Resmi
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                NPSN (Nomor Pokok Sekolah Nasional)
              </label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Kepala Sekolah (Verifikator 1)
              </label>
              <input
                type="text"
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={formData.principalNip}
                onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Admin Kepegawaian / SIMPEG (Verifikator 2)
              </label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Alamat Sekolah Lengkap
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Jadwal Jam Presensi */}
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Jadwal & Batas Toleransi Jam Presensi</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Jam Mulai Presensi Masuk
              </label>
              <input
                type="time"
                value={formData.checkInStart}
                onChange={(e) => setFormData({ ...formData, checkInStart: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Batas Jam Tepat Waktu (Deadline)
              </label>
              <input
                type="time"
                value={formData.checkInDeadline}
                onChange={(e) => setFormData({ ...formData, checkInDeadline: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-amber-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Presensi setelah jam ini otomatis berstatus Terlambat.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Jam Mulai Presensi Pulang
              </label>
              <input
                type="time"
                value={formData.checkOutStart}
                onChange={(e) => setFormData({ ...formData, checkOutStart: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Geofencing Radius & Interactive Google Maps */}
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Lokasi Geofencing & Koordinat Sekolah (Google Maps)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik pada peta atau gunakan deteksi GPS untuk menentukan titik pusat sekolah dan jangkauan radius presensi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setFormData({
                        ...formData,
                        schoolLat: pos.coords.latitude,
                        schoolLng: pos.coords.longitude,
                      });
                    },
                    (err) => alert('Gagal membaca GPS: ' + err.message),
                    { enableHighAccuracy: true }
                  );
                }
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer self-start transition-all"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Gunakan Lokasi GPS Saat Ini</span>
            </button>
          </div>

          {/* Interactive Google Map */}
          <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <GoogleMapsGeofence
              schoolLocation={{
                lat: formData.schoolLat,
                lng: formData.schoolLng,
                name: formData.schoolName,
              }}
              radiusMeters={formData.maxRadiusMeters}
              isInteractive={true}
              showUserMarker={false}
              height="280px"
              onLocationChange={(coords) => {
                setFormData({
                  ...formData,
                  schoolLat: coords.lat,
                  schoolLng: coords.lng,
                });
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Latitude Pusat Sekolah
              </label>
              <input
                type="number"
                step="any"
                value={formData.schoolLat}
                onChange={(e) => setFormData({ ...formData, schoolLat: Number(e.target.value) })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Longitude Pusat Sekolah
              </label>
              <input
                type="number"
                step="any"
                value={formData.schoolLng}
                onChange={(e) => setFormData({ ...formData, schoolLng: Number(e.target.value) })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Radius Maksimal Presensi (Meter)
              </label>
              <div className="space-y-1.5">
                <input
                  type="number"
                  value={formData.maxRadiusMeters}
                  onChange={(e) => setFormData({ ...formData, maxRadiusMeters: Number(e.target.value) })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-indigo-700"
                />
                <div className="flex items-center space-x-1">
                  {[50, 100, 200, 500].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, maxRadiusMeters: r })}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold cursor-pointer transition-all ${
                        formData.maxRadiusMeters === r
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kontak BKD & Notifikasi WhatsApp / Email */}
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Kontak Integrasi BKD & Dinas Pendidikan</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Email Verifikator Presensi BKD / Dinas
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.bkdEmail || 'bkd.presensi@jakarta.go.id'}
                  onChange={(e) => setFormData({ ...formData, bkdEmail: e.target.value })}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nomor WhatsApp Hotline BKD / TU Sekolah
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.bkdWhatsApp || '6281299887766'}
                  onChange={(e) => setFormData({ ...formData, bkdWhatsApp: e.target.value })}
                  placeholder="62812xxxxxxx"
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan & Logo</span>
          </button>
        </div>
      </form>
    </div>
  );
};
