import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  School,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles,
  PenTool,
  Clock,
  ShieldCheck,
  QrCode as QrCodeIcon,
  Filter,
  Users,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  AttendanceRecord,
  SchoolConfig,
  Student,
  Teacher,
  SchoolClass,
  AsnAttendanceRow,
  AsnAttendanceStatus,
  ApelDocumentation,
} from '../types';
import { formatDateIndo } from '../utils/soundAndDate';
import { SignaturePad } from './SignaturePad';

export interface PrintModalProps {
  onClose: () => void;
  config: SchoolConfig;
  records?: AttendanceRecord[];
  allRecords?: AttendanceRecord[];
  students?: Student[];
  teachers?: Teacher[];
  classes?: SchoolClass[];
  asnRows?: AsnAttendanceRow[];
  apelPagiDoc?: ApelDocumentation | null;
  apelSiangDoc?: ApelDocumentation | null;
  todayDate?: string;
  dateRangeLabel?: string;
  customTitle?: string;
  mode?: 'default' | 'asn_table';
}

type DatePreset = 'today' | '3days' | '7days' | 'month' | 'custom' | 'all';
type SignatureType = 'qr_bsre' | 'graphic' | 'canvas';

export const PrintModal: React.FC<PrintModalProps> = ({
  onClose,
  config,
  records = [],
  allRecords,
  students = [],
  teachers: _teachers = [],
  classes = [],
  asnRows = [],
  apelPagiDoc = null,
  apelSiangDoc = null,
  todayDate = new Date().toISOString().split('T')[0],
  dateRangeLabel,
  customTitle,
  mode = 'default',
}) => {
  // Use allRecords if available, fallback to records
  const masterRecords = allRecords && allRecords.length > records.length ? allRecords : records;

  // Customization Tabs
  const [activeSettingsTab, setActiveSettingsTab] = useState<'date' | 'class' | 'sign'>('date');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);

  // 1. DATE RANGE FILTER STATE
  const [datePreset, setDatePreset] = useState<DatePreset>(dateRangeLabel ? 'custom' : 'today');
  const [startDate, setStartDate] = useState<string>(() => {
    return todayDate;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return todayDate;
  });

  // Calculate preset dates
  const handleSelectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date(todayDate);

    if (preset === 'today') {
      setStartDate(todayDate);
      setEndDate(todayDate);
    } else if (preset === '3days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 2);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayDate);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayDate);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayDate);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // 2. CLASS & PERSONNEL FILTER STATE
  const [selectedTargetFilter, setSelectedTargetFilter] = useState<string>('ALL');

  // Distinct classes from classes list, students, and records
  const distinctClasses = useMemo(() => {
    const fromClasses = (classes || []).map((c) => c.name).filter(Boolean);
    const fromStudents = students.map((s) => s.className).filter(Boolean);
    const fromRecords = masterRecords
      .filter((r) => r.personType === 'student' && r.classOrSubject)
      .map((r) => r.classOrSubject);
    return Array.from(new Set([...fromClasses, ...fromStudents, ...fromRecords])).sort();
  }, [classes, students, masterRecords]);

  // 3. DIGITAL SIGNATURE OF LEADERSHIP
  const [includeSignatureBlock, setIncludeSignatureBlock] = useState<boolean>(true);
  const [signatureType, setSignatureType] = useState<SignatureType>('qr_bsre');
  const [includeOfficialStamp, setIncludeOfficialStamp] = useState<boolean>(true);
  const [showCanvasSignModal, setShowCanvasSignModal] = useState<boolean>(false);
  const [customCanvasSignature, setCustomCanvasSignature] = useState<string | null>(null);

  // Leadership Identity & Document Metadata
  const [principalTitle, setPrincipalTitle] = useState<string>('Kepala Sekolah');
  const [principalName, setPrincipalName] = useState<string>(
    config.principalName || 'Drs. Ruslan La Ode, M.Pd.'
  );
  const [principalNip, setPrincipalNip] = useState<string>(
    config.principalNip || '197405121999031004'
  );
  const [documentNumber, setDocumentNumber] = useState<string>(
    `421.3/088/SMPN4-TB/${new Date().getMonth() + 1}/${new Date().getFullYear()}`
  );
  const [verifierName, setVerifierName] = useState<string>(
    config.adminName || 'Hendra Hasan, S.Pd.'
  );

  // QR Code Data URL for BSrE Electronic Verification
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    const payload = [
      'DOKUMEN ELEKTRONIK RESMI DINAS PENDIDIKAN',
      `INSTANSI: ${config.schoolName || 'SMPN 4 SATU ATAP TALIABU BARAT'}`,
      `PEJABAT: ${principalTitle} - ${principalName}`,
      `NIP: ${principalNip}`,
      `NO SURAT: ${documentNumber}`,
      `TANGGAL PENGESAHAN: ${todayDate}`,
      'STATUS: TERTANDATANGANI SECARA ELEKTRONIK (UU ITE NO 11/2008)',
      'VERIFIKASI: BSR-E BSSN & DISDIK KABUPATEN PULAU TALIABU',
    ].join(' | ');

    QRCode.toDataURL(payload, {
      width: 160,
      margin: 1,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [
    config.schoolName,
    principalTitle,
    principalName,
    principalNip,
    documentNumber,
    todayDate,
  ]);

  // View Mode: default or asn_table
  const [viewMode, setViewMode] = useState<'default' | 'asn_table'>(
    asnRows && asnRows.length > 0 ? 'asn_table' : mode
  );
  const [sortField, setSortField] = useState<'name' | 'time' | 'status' | 'default'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCanvasSignatures, setShowCanvasSignatures] = useState<boolean>(true);

  // Dynamic Date Range Filtered Records
  const dateFilteredRecords = useMemo(() => {
    if (!startDate && !endDate) return masterRecords;

    return masterRecords.filter((r) => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [masterRecords, startDate, endDate]);

  // Target Filtered Records (Class / Teacher / Personnel)
  const baseFilteredRecords = useMemo(() => {
    return dateFilteredRecords.filter((r) => {
      if (selectedTargetFilter === 'ALL') return true;
      if (selectedTargetFilter === 'STUDENTS_ALL') return r.personType === 'student';
      if (selectedTargetFilter === 'TEACHERS_ALL') return r.personType === 'teacher';
      if (selectedTargetFilter === 'TEACHERS_ASN') {
        return (
          r.personType === 'teacher' &&
          (r.employmentStatus === 'PNS' || r.employmentStatus === 'PPPK')
        );
      }
      if (selectedTargetFilter === 'TEACHERS_HONORER') {
        return (
          r.personType === 'teacher' &&
          (r.employmentStatus === 'HONORER' ||
            r.employmentStatus === 'GTT_PTT' ||
            (r.employmentStatus as unknown as string) === 'Honorer')
        );
      }

      // Specific Class match
      return (
        (r.classOrSubject &&
          r.classOrSubject.toLowerCase().includes(selectedTargetFilter.toLowerCase())) ||
        (r.personType === 'student' &&
          students.some(
            (s) =>
              s.id === r.personId &&
              s.className.toLowerCase() === selectedTargetFilter.toLowerCase()
          ))
      );
    });
  }, [dateFilteredRecords, selectedTargetFilter, students]);

  // Sort records dynamically
  const displayRecords = useMemo(() => {
    return [...baseFilteredRecords].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.personName.localeCompare(b.personName);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'time') {
        const cmp = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [baseFilteredRecords, sortField, sortDirection]);

  // Sort ASN rows dynamically
  const safeAsnRows = asnRows || [];
  const displayAsnRows = useMemo(() => {
    return [...safeAsnRows].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [safeAsnRows, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'time' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Compute stats
  const presentCount = displayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = displayRecords.filter((r) => r.status === 'terlambat').length;
  const sickCount = displayRecords.filter((r) => r.status === 'sakit').length;
  const leaveCount = displayRecords.filter((r) => r.status === 'izin').length;
  const alphaCount = displayRecords.filter((r) => r.status === 'alpa').length;
  const totalCount = displayRecords.length;

  const handlePrint = () => {
    window.print();
  };

  // Computed Date Range Display Text
  const computedPeriodText = useMemo(() => {
    if (dateRangeLabel && datePreset === 'custom' && !startDate && !endDate) {
      return dateRangeLabel;
    }
    if (!startDate && !endDate) {
      return 'Seluruh Riwayat Presensi';
    }
    if (startDate === endDate) {
      return formatDateIndo(startDate);
    }
    return `${formatDateIndo(startDate)} s.d. ${formatDateIndo(endDate)}`;
  }, [startDate, endDate, dateRangeLabel, datePreset]);

  // Target Filter Label Display Text
  const computedTargetLabel = useMemo(() => {
    if (selectedTargetFilter === 'ALL') return 'Semua Rombel & Tenaga Kependidikan';
    if (selectedTargetFilter === 'STUDENTS_ALL') return 'Seluruh Peserta Didik (Siswa)';
    if (selectedTargetFilter === 'TEACHERS_ALL') return 'Seluruh Guru & GTK';
    if (selectedTargetFilter === 'TEACHERS_ASN') return 'Pegawai ASN (PNS & PPPK)';
    if (selectedTargetFilter === 'TEACHERS_HONORER') return 'Guru & Tenaga Honorer';
    return `Kelas ${selectedTargetFilter}`;
  }, [selectedTargetFilter]);

  const getStatusLabelIndo = (status: AsnAttendanceStatus) => {
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
    <div
      id="print-preview-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 gap-2.5 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  {customTitle || 'Pratinjau & Kustomisasi Cetak Berita Acara Presensi'}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                  A4 Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Periode: <strong className="text-slate-700">{computedPeriodText}</strong> • Sasaran:{' '}
                <strong className="text-slate-700">{computedTargetLabel}</strong> ({totalCount} data)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
            {/* Toggle Customization Settings Panel */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                isSettingsOpen
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Tampilkan / Sembunyikan panel kustomisasi cetak"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isSettingsOpen ? 'Tutup Opsi' : 'Opsi Kustomisasi'}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Quick Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-98"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUSTOMIZATION CONTROLS PANEL (Hidden on Print) */}
        {isSettingsOpen && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 no-print animate-in fade-in duration-150">
            {/* Nav Tabs for Settings */}
            <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2 mb-3">
              <button
                onClick={() => setActiveSettingsTab('date')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeSettingsTab === 'date'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Rentang Tanggal</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeSettingsTab === 'class'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>2. Pemilihan Kelas & GTK</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab('sign')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  activeSettingsTab === 'sign'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>3. Tanda Tangan Digital Pimpinan</span>
              </button>
            </div>

            {/* TAB 1: RENTANG TANGGAL */}
            {activeSettingsTab === 'date' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <span className="text-xs font-bold text-slate-700">Preset Waktu:</span>
                  {(
                    [
                      { id: 'today', label: 'Hari Ini' },
                      { id: '3days', label: '3 Hari Terakhir' },
                      { id: '7days', label: '7 Hari Terakhir' },
                      { id: 'month', label: 'Bulan Berjalan' },
                      { id: 'all', label: 'Semua Riwayat' },
                      { id: 'custom', label: 'Kustom Tanggal' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectDatePreset(preset.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        datePreset === preset.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Date pickers for Start & End Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setDatePreset('custom');
                        setStartDate(e.target.value);
                      }}
                      className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setDatePreset('custom');
                        setEndDate(e.target.value);
                      }}
                      className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Filter aktif: <strong>{computedPeriodText}</strong>. Data presensi akan otomatis
                  disaring dan dirangkum pada lembar berita acara di bawah.
                </p>
              </div>
            )}

            {/* TAB 2: PEMILIHAN KELAS & GTK */}
            {activeSettingsTab === 'class' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    Pilih Target Rombel / Kategori Personel:
                  </span>

                  {/* Format switcher if ASN records available */}
                  {safeAsnRows.length > 0 && (
                    <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setViewMode('default')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          viewMode === 'default'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Format Presensi Lengkap
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('asn_table')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          viewMode === 'asn_table'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Format GTK ASN Kedinasan
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setSelectedTargetFilter('ALL')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedTargetFilter === 'ALL'
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">Semua Personel</div>
                    <div className="text-[10px] text-slate-500">Siswa & Guru GTK</div>
                  </button>

                  <button
                    onClick={() => setSelectedTargetFilter('STUDENTS_ALL')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedTargetFilter === 'STUDENTS_ALL'
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">Seluruh Siswa</div>
                    <div className="text-[10px] text-slate-500">Semua Rombel</div>
                  </button>

                  <button
                    onClick={() => setSelectedTargetFilter('TEACHERS_ALL')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedTargetFilter === 'TEACHERS_ALL'
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">Seluruh Guru & GTK</div>
                    <div className="text-[10px] text-slate-500">PNS, PPPK & Honorer</div>
                  </button>

                  <button
                    onClick={() => setSelectedTargetFilter('TEACHERS_ASN')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedTargetFilter === 'TEACHERS_ASN'
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">Khusus ASN</div>
                    <div className="text-[10px] text-slate-500">PNS & PPPK BKD</div>
                  </button>
                </div>

                {/* Specific Class Buttons */}
                {distinctClasses.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Atau Pilih Kelas Spesifik:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {distinctClasses.map((cls) => (
                        <button
                          key={cls}
                          onClick={() => setSelectedTargetFilter(cls)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            selectedTargetFilter === cls
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kelas {cls}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TANDA TANGAN DIGITAL PIMPINAN */}
            {activeSettingsTab === 'sign' && (
              <div className="space-y-3.5">
                {/* Options toggle */}
                <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-800 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={includeSignatureBlock}
                      onChange={(e) => setIncludeSignatureBlock(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sertakan Kolom Pengesahan Pimpinan</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-800 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={includeOfficialStamp}
                      onChange={(e) => setIncludeOfficialStamp(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Stempel Dinas Resmi</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-800 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={showCanvasSignatures}
                      onChange={(e) => setShowCanvasSignatures(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tampilkan TTD Kanvas GTK di Tabel</span>
                  </label>
                </div>

                {includeSignatureBlock && (
                  <>
                    {/* Signature Style Selector */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        Tipe Tanda Tangan Digital Pimpinan:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Option 1: QR Code BSrE */}
                        <button
                          onClick={() => setSignatureType('qr_bsre')}
                          className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                            signatureType === 'qr_bsre'
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <QrCodeIcon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs">QR Code Sertifikasi BSrE</div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              Standar verifikasi elektronik kedinasan BSSN & Pemkab
                            </div>
                          </div>
                        </button>

                        {/* Option 2: Digital Graphic Signature */}
                        <button
                          onClick={() => setSignatureType('graphic')}
                          className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                            signatureType === 'graphic'
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs">Goresan Grafis Resmi</div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              Grafis tanda tangan digital elegan Kepala Sekolah
                            </div>
                          </div>
                        </button>

                        {/* Option 3: Interactive Canvas Drawing */}
                        <button
                          onClick={() => {
                            setSignatureType('canvas');
                            setShowCanvasSignModal(true);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                            signatureType === 'canvas'
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <PenTool className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs">Toreh TTD Langsung</div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              {customCanvasSignature
                                ? '✓ TTD tersimpan (klik untuk ubah)'
                                : 'Gores pakai layar sentuh / mouse'}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Jabatan Pimpinan
                        </label>
                        <select
                          value={principalTitle}
                          onChange={(e) => setPrincipalTitle(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                        >
                          <option value="Kepala Sekolah">Kepala Sekolah</option>
                          <option value="Plt. Kepala Sekolah">Plt. Kepala Sekolah</option>
                          <option value="Plh. Kepala Sekolah">Plh. Kepala Sekolah</option>
                          <option value="Koordinator Pengawas">Koordinator Pengawas</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Nama Pimpinan
                        </label>
                        <input
                          type="text"
                          value={principalName}
                          onChange={(e) => setPrincipalName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                          placeholder="Nama & Gelar"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          NIP Pimpinan
                        </label>
                        <input
                          type="text"
                          value={principalNip}
                          onChange={(e) => setPrincipalNip(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                          placeholder="NIP. 1974..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Nomor Surat Berita Acara
                        </label>
                        <input
                          type="text"
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                          placeholder="No. Registrasi Dokumen"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* PRINTABLE PAPER CONTENT (A4 Standards) */}
        <div
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-5 text-slate-900 bg-white print:p-0 print:m-0"
          id="printable-area"
        >
          {/* CSS Print Styles */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-area, #printable-area * {
                visibility: visible !important;
              }
              #printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 15mm !important;
                margin: 0 !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          `,
            }}
          />

          {/* KOP SURAT RESMI KEDINASAN */}
          <div className="border-b-4 border-double border-slate-900 pb-3 text-center space-y-0.5">
            <h3 className="text-xs font-bold tracking-widest uppercase text-slate-800">
              PEMERINTAH KABUPATEN PULAU TALIABU
            </h3>
            <h4 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h4>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-tight">
              {config.schoolName || 'SMP NEGERI 4 SATU ATAP TALIABU BARAT'}
            </h2>
            <p className="text-[10px] text-slate-600">
              {config.address ||
                'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara'}{' '}
              • NPSN: {config.npsn || '69989028'} • Akreditasi: B
            </p>
          </div>

          {/* JUDUL DOKUMEN & NOMOR BERITA ACARA */}
          <div className="py-2 text-center space-y-1">
            <h3 className="text-sm sm:text-base font-black uppercase underline tracking-wide text-slate-950">
              BERITA ACARA REKAPITULASI PRESENSI & KEHADIRAN DIGITAL
            </h3>
            {documentNumber && (
              <p className="text-xs font-mono font-semibold text-slate-700">
                Nomor Registrasi: <strong>{documentNumber}</strong>
              </p>
            )}
            <p className="text-xs text-slate-700">
              Periode: <strong>{computedPeriodText}</strong> • Sasaran:{' '}
              <strong>{computedTargetLabel}</strong> • Semester:{' '}
              <strong>{config.semester || 'Ganjil'}</strong> TP{' '}
              <strong>{config.academicYear || '2026/2027'}</strong>
            </p>
          </div>

          {/* STATISTIK RINGKASAN KEHADIRAN */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 grid grid-cols-5 text-center text-xs">
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Hadir</span>
              <span className="font-mono font-black text-sm sm:text-base text-emerald-700">
                {presentCount}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">
                Terlambat
              </span>
              <span className="font-mono font-black text-sm sm:text-base text-amber-700">
                {lateCount}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Sakit</span>
              <span className="font-mono font-black text-sm sm:text-base text-blue-700">
                {sickCount}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Izin</span>
              <span className="font-mono font-black text-sm sm:text-base text-indigo-700">
                {leaveCount}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Alpa</span>
              <span className="font-mono font-black text-sm sm:text-base text-rose-700">
                {alphaCount}
              </span>
            </div>
          </div>

          {/* TABEL PRESENSI */}
          {viewMode === 'asn_table' && safeAsnRows.length > 0 ? (
            /* Format Khusus ASN */
            <div className="space-y-3">
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-2 w-10">No</th>
                    <th className="border border-slate-400 p-2 text-left">Nama Guru & NIP</th>
                    <th className="border border-slate-400 p-2 w-20">Status ASN</th>
                    <th className="border border-slate-400 p-2 w-24">Kehadiran</th>
                    {showCanvasSignatures && (
                      <>
                        <th className="border border-slate-400 p-2 w-28">TTD Masuk</th>
                        <th className="border border-slate-400 p-2 w-28">TTD Pulang</th>
                      </>
                    )}
                    <th className="border border-slate-400 p-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAsnRows.map((row, idx) => (
                    <tr key={row.teacherId} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-1.5 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-400 p-1.5">
                        <div className="font-bold text-slate-900">{row.name}</div>
                        <div className="text-[10px] text-slate-600 font-mono">NIP: {row.nip}</div>
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center font-semibold text-[11px]">
                        {row.employmentStatus}
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold text-[11px]">
                        {getStatusLabelIndo(row.status)}
                      </td>
                      {showCanvasSignatures && (
                        <>
                          <td className="border border-slate-400 p-1 text-center align-middle">
                            {row.signatureIn ? (
                              <img
                                src={row.signatureIn}
                                alt="TTD"
                                className="h-8 object-contain mx-auto"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="border border-slate-400 p-1 text-center align-middle">
                            {row.signatureOut ? (
                              <img
                                src={row.signatureOut}
                                alt="TTD"
                                className="h-8 object-contain mx-auto"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-400 p-1.5 text-[11px] text-slate-700">
                        {row.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Format Presensi Lengkap (Umum / Kelas) */
            <div className="space-y-3">
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-2 w-10">No</th>
                    <th className="border border-slate-400 p-2 w-24">Tanggal</th>
                    <th className="border border-slate-400 p-2 w-20">Waktu</th>
                    <th className="border border-slate-400 p-2 text-left">Nama Lengkap & NISN/NIP</th>
                    <th className="border border-slate-400 p-2 w-20">Kategori</th>
                    <th className="border border-slate-400 p-2 w-24">Rombel / Jabatan</th>
                    <th className="border border-slate-400 p-2 w-20">Sesi</th>
                    <th className="border border-slate-400 p-2 w-20">Status</th>
                    <th className="border border-slate-400 p-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="border border-slate-400 p-6 text-center text-slate-400 italic"
                      >
                        Tidak ada catatan presensi yang sesuai dengan kriteria filter rentang
                        tanggal & kelas ini.
                      </td>
                    </tr>
                  ) : (
                    displayRecords.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-1.5 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono text-[11px]">
                          {r.date}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono text-[11px]">
                          {r.time}
                        </td>
                        <td className="border border-slate-400 p-1.5">
                          <div className="font-bold text-slate-900">{r.personName}</div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            {r.identifier}
                          </div>
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center text-[11px]">
                          {r.personType === 'teacher' ? 'Guru/GTK' : 'Siswa'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center text-[11px]">
                          {r.employmentStatus || r.classOrSubject || '-'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center text-[11px] font-semibold">
                          {r.type === 'masuk' ? 'Masuk' : 'Pulang'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center text-[11px] font-bold">
                          <span
                            className={
                              r.status === 'hadir'
                                ? 'text-emerald-700'
                                : r.status === 'terlambat'
                                ? 'text-amber-700'
                                : r.status === 'alpa'
                                ? 'text-rose-700'
                                : 'text-blue-700'
                            }
                          >
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="border border-slate-400 p-1.5 text-[11px] text-slate-700">
                          {r.note || (r.method === 'selfie_gps' ? 'Biometrik' : 'QR Scan')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* DOKUMENTASI APEL JIKA TERSEDIA */}
          {apelPagiDoc && (
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-1 text-xs">
              <span className="font-bold text-slate-900 block">
                Catatan Lampiran Apel Kedisiplinan:
              </span>
              <p className="text-slate-700">
                Apel Pagi: Pukul {apelPagiDoc.time} WITA • Pembina:{' '}
                {apelPagiDoc.leaderName || principalName} • Peserta:{' '}
                {apelPagiDoc.attendanceCount} Pegawai
              </p>
            </div>
          )}

          {/* BLOK PENGESAHAN & TANDA TANGAN DIGITAL PIMPINAN */}
          {includeSignatureBlock && (
            <div className="pt-6 grid grid-cols-2 text-center text-xs print-avoid-break">
              {/* Kolom Kiri: Tanda Tangan Pimpinan */}
              <div className="space-y-2 relative flex flex-col items-center">
                <p className="text-slate-800">
                  Mengetahui,
                  <br />
                  <strong>{principalTitle}</strong>
                </p>

                {/* Tanda Tangan Digital Area */}
                <div className="h-28 flex items-center justify-center relative w-full">
                  {/* Mode 1: QR Code Sertifikasi Elektronik BSrE */}
                  {signatureType === 'qr_bsre' && (
                    <div className="flex items-center space-x-3 text-left border border-slate-300 rounded-xl p-2 bg-slate-50/80 shadow-2xs max-w-xs">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="QR BSrE"
                          className="w-20 h-20 shrink-0 border border-slate-300 bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-200 flex items-center justify-center text-[9px] text-slate-500">
                          QR Verifikasi
                        </div>
                      )}
                      <div className="text-[8.5px] leading-tight text-slate-700 space-y-0.5 font-sans">
                        <div className="font-black text-indigo-900 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>TERVERIFIKASI RESMI</span>
                        </div>
                        <p className="text-[8px] text-slate-600">
                          Ditandatangani secara elektronik bersertifikat BSrE - BSSN & Pemkab Pulau
                          Taliabu.
                        </p>
                        <p className="font-mono text-[7.5px] text-slate-500">
                          Ref: {documentNumber.substring(0, 18)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Graphic Signature */}
                  {signatureType === 'graphic' && (
                    <div className="relative flex flex-col items-center justify-center">
                      <svg
                        viewBox="0 0 200 65"
                        className="w-44 h-16 text-indigo-950"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M 25 45 Q 40 12, 55 35 T 85 18 Q 100 48, 115 22 T 145 35 Q 165 12, 185 28" />
                        <path d="M 45 52 Q 85 48, 165 52" strokeWidth="1.6" />
                        <path d="M 120 18 Q 130 8, 140 22" strokeWidth="1.8" />
                      </svg>
                      <span className="text-[8.5px] font-mono font-bold text-indigo-800 tracking-wider">
                        [DIGITALLY SIGNED • VALID]
                      </span>
                    </div>
                  )}

                  {/* Mode 3: Interactive Canvas Signature */}
                  {signatureType === 'canvas' && (
                    <div className="flex flex-col items-center justify-center">
                      {customCanvasSignature ? (
                        <img
                          src={customCanvasSignature}
                          alt="Tanda Tangan Pimpinan"
                          className="h-20 object-contain mx-auto"
                        />
                      ) : (
                        <div className="h-16 w-36 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                          Belum ada goresan TTD
                        </div>
                      )}
                    </div>
                  )}

                  {/* Official Government Stamp */}
                  {includeOfficialStamp && (
                    <div className="absolute left-6 top-1 pointer-events-none opacity-40 rotate-[-12deg] border-2 border-indigo-700 rounded-full px-3 py-1 text-[9px] font-black uppercase text-indigo-900 tracking-wider shadow-2xs">
                      <span className="block text-[7.5px]">PEMERINTAH KAB. PULAU TALIABU</span>
                      <span>DINAS PENDIDIKAN</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-bold underline text-slate-950 text-xs sm:text-sm">
                    {principalName}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">NIP. {principalNip}</p>
                </div>
              </div>

              {/* Kolom Kanan: Petugas Verifikator / Piket */}
              <div className="space-y-2 relative flex flex-col items-center">
                <p className="text-slate-800">
                  Taliabu Barat, {formatDateIndo(todayDate)}
                  <br />
                  <strong>Petugas Verifikator / Piket Presensi</strong>
                </p>

                <div className="h-28 flex items-center justify-center relative w-full">
                  <svg
                    viewBox="0 0 160 50"
                    className="w-36 h-12 text-slate-700 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 20 35 Q 35 15, 55 30 T 80 20 Q 95 38, 110 25 T 140 30" />
                    <path d="M 35 40 Q 75 38, 130 42" strokeWidth="1.2" />
                  </svg>

                  {includeOfficialStamp && (
                    <div className="absolute right-4 top-2 pointer-events-none opacity-30 rotate-[-8deg] border border-indigo-700 rounded-full px-2.5 py-0.5 text-[8.5px] font-bold text-indigo-900">
                      TERVERIFIKASI
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-bold underline text-slate-950 text-xs sm:text-sm">
                    {verifierName}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">Tim Operator Presensi</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF Berita Acara</span>
            </button>
          </div>
        </div>
      </div>

      {/* POPUP CANVAS SIGNATURE MODAL FOR LEADERSHIP */}
      {showCanvasSignModal && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCanvasSignModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Tanda Tangan Digital {principalTitle}
                </h4>
                <p className="text-xs text-slate-500">
                  Goreskan tanda tangan pimpinan menggunakan jari atau mouse
                </p>
              </div>
              <button
                onClick={() => setShowCanvasSignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SignaturePad
              initialSignature={customCanvasSignature || undefined}
              onSave={(dataUrl) => {
                setCustomCanvasSignature(dataUrl);
                setSignatureType('canvas');
                setShowCanvasSignModal(false);
              }}
              onCancel={() => setShowCanvasSignModal(false)}
              height={180}
              title={`Tanda Tangan ${principalTitle}`}
              subtitle={`${principalName} - NIP. ${principalNip}`}
              showFooter={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
