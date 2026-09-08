import React, { useState } from 'react';
import {
  Printer,
  X,
  School,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PenTool,
  Clock,
} from 'lucide-react';
import {
  AttendanceRecord,
  SchoolConfig,
  Student,
  Teacher,
  AsnAttendanceRow,
  AsnAttendanceStatus,
  ApelDocumentation,
} from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface PrintModalProps {
  onClose: () => void;
  config: SchoolConfig;
  records?: AttendanceRecord[];
  students?: Student[];
  teachers?: Teacher[];
  asnRows?: AsnAttendanceRow[];
  apelPagiDoc?: ApelDocumentation | null;
  apelSiangDoc?: ApelDocumentation | null;
  todayDate?: string;
  dateRangeLabel?: string;
  customTitle?: string;
  mode?: 'default' | 'asn_table';
}

export const PrintModal: React.FC<PrintModalProps> = ({
  onClose,
  config,
  records = [],
  students = [],
  teachers: _teachers = [],
  asnRows = [],
  apelPagiDoc = null,
  apelSiangDoc = null,
  todayDate = new Date().toISOString().split('T')[0],
  dateRangeLabel,
  customTitle,
  mode = 'default',
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);
  const [includeOfficialStamp, setIncludeOfficialStamp] = useState(true);
  const [showCanvasSignatures, setShowCanvasSignatures] = useState(true);
  const [viewMode, setViewMode] = useState<'default' | 'asn_table'>(
    asnRows && asnRows.length > 0 ? 'asn_table' : mode
  );
  const [sortField, setSortField] = useState<'name' | 'time' | 'status' | 'default'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const safeRecords = records || [];
  const safeStudents = students || [];
  const safeAsnRows = asnRows || [];

  // Filter records by class filter
  const baseFilteredRecords = safeRecords.filter((r) => {
    const matchesClass =
      selectedClassFilter === 'ALL' ||
      (r.classOrSubject && r.classOrSubject.toLowerCase().includes(selectedClassFilter.toLowerCase()));

    if (dateRangeLabel) {
      return matchesClass;
    }
    return r.date === todayDate && matchesClass;
  });

  // Sort records dynamically
  const displayRecords = [...baseFilteredRecords].sort((a, b) => {
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

  // Sort ASN rows dynamically
  const displayAsnRows = [...safeAsnRows].sort((a, b) => {
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

  const handleSort = (field: 'name' | 'time' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ASN Stats
  const asnTotal = displayAsnRows.length;
  const asnHadir = displayAsnRows.filter((r) => r.status === 'hadir').length;
  const asnIzin = displayAsnRows.filter((r) => r.status === 'izin').length;
  const asnSakit = displayAsnRows.filter((r) => r.status === 'sakit').length;
  const asnCuti = displayAsnRows.filter((r) => r.status === 'cuti').length;
  const asnDinasLuar = displayAsnRows.filter((r) => r.status === 'dinas_luar').length;
  const asnTanpaKet = displayAsnRows.filter((r) => r.status === 'tanpa_keterangan').length;

  // General Stats
  const presentCount = displayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = displayRecords.filter((r) => r.status === 'terlambat').length;
  const sickCount = displayRecords.filter((r) => r.status === 'sakit').length;
  const leaveCount = displayRecords.filter((r) => r.status === 'izin').length;
  const alphaCount = displayRecords.filter((r) => r.status === 'alpa').length;
  const totalCount = displayRecords.length;

  const handlePrint = () => {
    window.print();
  };

  const distinctClasses = Array.from(
    new Set(safeStudents.map((s) => s.className).filter(Boolean))
  ).sort();

  const activePeriodText = dateRangeLabel || formatDateIndo(todayDate);

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 gap-3 no-print">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {customTitle ||
                  (viewMode === 'asn_table'
                    ? 'Cetak Berita Acara Presensi GTK ASN (Tanda Tangan Touchpad/HP)'
                    : 'Cetak Dokumen Resmi / Ekspor PDF Berita Acara')}
              </h3>
              <p className="text-xs text-slate-500">
                Periode: <strong>{activePeriodText}</strong> • Standar Resmi Kedinasan BKD & Dikbud (A4)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Switcher if both or ASN available */}
            {safeAsnRows.length > 0 && (
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('asn_table')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'asn_table'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Format GTK ASN
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('default')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'default'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Presensi Umum
                </button>
              </div>
            )}

            {viewMode === 'default' && (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Rombel & GTK ({safeRecords.length})</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Settings Toolbar (Hidden on Print) */}
        <div className="px-6 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between text-xs gap-3 no-print">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={showCanvasSignatures}
                onChange={(e) => setShowCanvasSignatures(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center space-x-1">
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tampilkan Tanda Tangan Digital Kanvas</span>
              </span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={showSignatureBlock}
                onChange={(e) => setShowSignatureBlock(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tanda Tangan Kepala Sekolah & Petugas</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={includeOfficialStamp}
                onChange={(e) => setIncludeOfficialStamp(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Stempel Resmi</span>
            </label>
          </div>

          <div className="text-[11px] text-indigo-700 font-medium flex items-center space-x-2">
            <span>Urutkan:</span>
            <button
              onClick={() => handleSort('name')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                sortField === 'name'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Nama {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('status')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                sortField === 'status'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Printable Paper Content (#printable-area) */}
        <div
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-5 text-slate-900 bg-white print:p-0 print:m-0"
          id="printable-area"
        >
          {/* Print Style Injector */}
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
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          `,
            }}
          />

          {/* Kop Surat Sekolah Resmi */}
          <div className="border-b-4 border-double border-slate-900 pb-3 flex items-center justify-between gap-4 print-avoid-break">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-16 h-16 object-contain shrink-0"
              />
            ) : (
              <School className="w-14 h-14 text-slate-800 shrink-0" />
            )}
            <div className="text-center flex-1 space-y-0.5">
              <h2 className="font-bold text-xs uppercase tracking-widest text-slate-600">
                PEMERINTAH KABUPATEN PULAU TALIABU • DINAS PENDIDIKAN
              </h2>
              <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                {config.schoolName}
              </h1>
              <p className="text-xs text-slate-600">
                {config.address} • NPSN: {config.npsn}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Email: {config.bkdEmail || 'info@sman1nusantara.sch.id'} • Telp:{' '}
                {config.bkdWhatsApp || '021-7890123'}
              </p>
            </div>
          </div>

          {/* Judul Berita Acara */}
          <div className="text-center space-y-1 pt-1 print-avoid-break">
            <h3 className="font-extrabold text-sm uppercase underline tracking-wider">
              {customTitle ||
                (viewMode === 'asn_table'
                  ? 'DAFTAR HADIR & TANDA TANGAN GURU / GTK ASN'
                  : 'BERITA ACARA REKAPITULASI PRESENSI DIGITAL')}
            </h3>
            <p className="text-xs text-slate-600">
              Hari/Tanggal: <strong>{activePeriodText}</strong> • Semester {config.semester} TP{' '}
              {config.academicYear}
            </p>
          </div>

          {/* Ringkasan Angka Rekapitulasi */}
          {viewMode === 'asn_table' ? (
            <div className="grid grid-cols-6 gap-2 text-center text-xs py-1 print-avoid-break">
              <div className="p-1.5 rounded-lg border border-slate-300">
                <span className="text-[10px] text-slate-500 block">Total Guru</span>
                <strong className="text-xs">{asnTotal}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-emerald-50/70">
                <span className="text-[10px] text-emerald-800 block font-bold">Hadir</span>
                <strong className="text-xs text-emerald-900">{asnHadir}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-amber-50/70">
                <span className="text-[10px] text-amber-800 block font-bold">Izin</span>
                <strong className="text-xs text-amber-900">{asnIzin}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-blue-50/70">
                <span className="text-[10px] text-blue-800 block font-bold">Sakit</span>
                <strong className="text-xs text-blue-900">{asnSakit}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-purple-50/70">
                <span className="text-[10px] text-purple-800 block font-bold">Cuti / DL</span>
                <strong className="text-xs text-purple-900">{asnCuti + asnDinasLuar}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-rose-50/70">
                <span className="text-[10px] text-rose-800 block font-bold">Alpa</span>
                <strong className="text-xs text-rose-900">{asnTanpaKet}</strong>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 text-center text-xs py-1 print-avoid-break">
              <div className="p-1.5 rounded-lg border border-slate-300">
                <span className="text-[10px] text-slate-500 block">Total Baris</span>
                <strong className="text-xs">{totalCount}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-emerald-50">
                <span className="text-[10px] text-emerald-800 block font-bold">Hadir</span>
                <strong className="text-xs text-emerald-900">{presentCount}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-amber-50">
                <span className="text-[10px] text-amber-800 block font-bold">Terlambat</span>
                <strong className="text-xs text-amber-900">{lateCount}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-blue-50">
                <span className="text-[10px] text-blue-800 block font-bold">Sakit</span>
                <strong className="text-xs text-blue-900">{sickCount}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-purple-50">
                <span className="text-[10px] text-purple-800 block font-bold">Izin</span>
                <strong className="text-xs text-purple-900">{leaveCount}</strong>
              </div>
              <div className="p-1.5 rounded-lg border border-slate-300 bg-rose-50">
                <span className="text-[10px] text-rose-800 block font-bold">Alpa</span>
                <strong className="text-xs text-rose-900">{alphaCount}</strong>
              </div>
            </div>
          )}

          {/* TABEL FORMAT ASN GTK RESMI: With 2 Sub-columns Tanda Tangan & Keterangan */}
          {viewMode === 'asn_table' ? (
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-900 text-[10px] font-bold text-slate-900 uppercase">
                    <th rowSpan={2} className="p-2 text-center w-8 border-r border-slate-900">
                      No
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-900 min-w-[180px]">
                      Nama Guru / GTK & NIP
                    </th>
                    {/* Header Utama Tanda Tangan spanning 2 sub-columns */}
                    <th colSpan={2} className="p-1.5 text-center border-r border-slate-900 bg-slate-300">
                      Tanda Tangan
                    </th>
                    {/* Kolom Terakhir: Keterangan */}
                    <th rowSpan={2} className="p-2 text-center min-w-[140px]">
                      Keterangan
                    </th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-900 text-[9px] font-bold text-slate-800 uppercase">
                    <th className="p-1.5 text-center border-r border-slate-900 w-36">
                      Absen Masuk
                    </th>
                    <th className="p-1.5 text-center border-r border-slate-900 w-36">
                      Absen Pulang
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {displayAsnRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        Tidak ada catatan guru ASN pada format ini.
                      </td>
                    </tr>
                  ) : (
                    displayAsnRows.map((row, i) => (
                      <tr key={row.teacherId} className="hover:bg-slate-50 print-avoid-break">
                        <td className="p-2 text-center border-r border-slate-400 font-mono text-slate-700">
                          {i + 1}
                        </td>
                        <td className="p-2 border-r border-slate-400">
                          <div className="font-bold text-slate-900 leading-snug">{row.name}</div>
                          <div className="text-[10px] font-mono text-slate-600">
                            NIP. {row.nip || '-'} • {row.employmentStatus}
                          </div>
                          <div className="text-[10px] text-slate-500">{row.subjectOrRole}</div>
                        </td>

                        {/* 1. Tanda Tangan Masuk */}
                        <td className="p-1.5 text-center border-r border-slate-400 align-middle">
                          {row.signatureIn && showCanvasSignatures ? (
                            <div className="flex flex-col items-center justify-center">
                              <img
                                src={row.signatureIn}
                                alt={`TTD Masuk ${row.name}`}
                                className="h-10 max-h-10 max-w-[120px] object-contain mx-auto"
                              />
                              <span className="text-[9px] font-mono text-slate-600 font-semibold block mt-0.5">
                                {row.signatureInTime || 'Hadir'}
                              </span>
                            </div>
                          ) : (
                            <div className="h-10 flex flex-col items-center justify-center">
                              <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-300 w-24 inline-block mb-1"></span>
                              <span className="text-[8px] text-slate-400 font-mono">
                                {row.status === 'hadir' ? '(Belum TTD)' : '-'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 2. Tanda Tangan Pulang */}
                        <td className="p-1.5 text-center border-r border-slate-400 align-middle">
                          {row.signatureOut && showCanvasSignatures ? (
                            <div className="flex flex-col items-center justify-center">
                              <img
                                src={row.signatureOut}
                                alt={`TTD Pulang ${row.name}`}
                                className="h-10 max-h-10 max-w-[120px] object-contain mx-auto"
                              />
                              <span className="text-[9px] font-mono text-slate-600 font-semibold block mt-0.5">
                                {row.signatureOutTime || 'Pulang'}
                              </span>
                            </div>
                          ) : (
                            <div className="h-10 flex flex-col items-center justify-center">
                              <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-300 w-24 inline-block mb-1"></span>
                              <span className="text-[8px] text-slate-400 font-mono">
                                {row.status === 'hadir' ? '(Belum TTD)' : '-'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Kolom Keterangan */}
                        <td className="p-2 align-middle text-slate-800">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : row.status === 'izin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : row.status === 'sakit'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : row.status === 'cuti'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : row.status === 'dinas_luar'
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {getStatusLabelIndo(row.status)}
                          </span>
                          {row.notes && (
                            <div className="text-[10px] text-slate-600 mt-1 italic leading-tight">
                              {row.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* TABEL PRESENSI UMUM */
            <div className="overflow-x-auto border border-slate-400 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="p-2 text-center w-8 border-r border-slate-300">No</th>
                    <th className="p-2 border-r border-slate-300">Nama Lengkap</th>
                    <th className="p-2 border-r border-slate-300">NIP / NISN</th>
                    <th className="p-2 border-r border-slate-300">Tipe / Kelas</th>
                    <th className="p-2 border-r border-slate-300">Waktu Presensi</th>
                    <th className="p-2 text-center border-r border-slate-300">Status</th>
                    {showCanvasSignatures && (
                      <th className="p-2 text-center border-r border-slate-300 w-28">Tanda Tangan</th>
                    )}
                    <th className="p-2">Keterangan / Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayRecords.length === 0 ? (
                    <tr>
                      <td colSpan={showCanvasSignatures ? 8 : 7} className="p-4 text-center text-slate-400">
                        Tidak ada catatan presensi pada tanggal/filter ini.
                      </td>
                    </tr>
                  ) : (
                    displayRecords.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 print-avoid-break">
                        <td className="p-2 text-center border-r border-slate-200 font-mono">{i + 1}</td>
                        <td className="p-2 font-bold border-r border-slate-200 text-slate-900">
                          {r.personName}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-[10px]">
                          {r.identifier}
                        </td>
                        <td className="p-2 border-r border-slate-200">{r.classOrSubject}</td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {r.date} {r.time} ({r.type})
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 font-bold uppercase text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              r.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'izin'
                                ? 'bg-purple-100 text-purple-800'
                                : r.status === 'sakit'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        {showCanvasSignatures && (
                          <td className="p-1.5 text-center border-r border-slate-200 align-middle">
                            {r.signature || r.signatureIn ? (
                              <img
                                src={r.signature || r.signatureIn}
                                alt={`TTD ${r.personName}`}
                                className="h-8 max-h-8 max-w-[90px] object-contain mx-auto"
                              />
                            ) : (
                              <span className="text-[9px] text-slate-400 font-mono">-</span>
                            )}
                          </td>
                        )}
                        <td className="p-2 text-slate-600 text-[10px]">
                          {r.method === 'selfie_gps' ? 'Biometrik Face + GPS' : 'QR Scan'} •{' '}
                          {r.note || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* LAMPIRAN DOKUMENTASI APEL PAGI & APEL SIANG ASN (UNTUK PENGIRIMAN BUKTI TERPADU) */}
          {(apelPagiDoc || apelSiangDoc) && (
            <div className="mt-6 pt-4 border-t-2 border-slate-800 print-avoid-break">
              <div className="text-center mb-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  LAMPIRAN DOKUMENTASI RESMI APEL PAGI DAN APEL SIANG ASN
                </h4>
                <p className="text-[10px] text-slate-600 italic">
                  Bukti Fisik Pelaksanaan Apel Kedisiplinan Pegawai ASN (PNS & PPPK) — Dinas Pendidikan & Kebudayaan
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 1. Dokumentasi Apel Pagi */}
                <div className="border border-slate-400 rounded-xl p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-black text-[11px] text-slate-900 uppercase tracking-wide">
                      1. Dokumentasi Apel Pagi ASN
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {apelPagiDoc?.time || '07:15 WITA'}
                    </span>
                  </div>

                  {apelPagiDoc?.photoUrl ? (
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center">
                      <img
                        src={apelPagiDoc.photoUrl}
                        alt="Bukti Apel Pagi"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] text-center p-4">
                      Belum ada foto dokumentasi apel pagi terlampir.
                    </div>
                  )}

                  <div className="text-[10px] space-y-1 text-slate-700 font-sans">
                    <p>
                      <strong>Pembina Apel:</strong> {apelPagiDoc?.leaderName || config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}
                    </p>
                    <p>
                      <strong>Lokasi / Titik:</strong> {apelPagiDoc?.placeName || 'Lapangan Utama Upacara Sekolah'}
                    </p>
                    <p>
                      <strong>Peserta ASN Hadir:</strong> {apelPagiDoc?.attendanceCount ?? 'Lengkap'} Pegawai
                    </p>
                    {apelPagiDoc?.notes && (
                      <p className="italic text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 text-[9.5px]">
                        "{apelPagiDoc.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Dokumentasi Apel Siang */}
                <div className="border border-slate-400 rounded-xl p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-black text-[11px] text-slate-900 uppercase tracking-wide">
                      2. Dokumentasi Apel Siang ASN
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {apelSiangDoc?.time || '13:45 WITA'}
                    </span>
                  </div>

                  {apelSiangDoc?.photoUrl ? (
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center">
                      <img
                        src={apelSiangDoc.photoUrl}
                        alt="Bukti Apel Siang"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] text-center p-4">
                      Belum ada foto dokumentasi apel siang terlampir.
                    </div>
                  )}

                  <div className="text-[10px] space-y-1 text-slate-700 font-sans">
                    <p>
                      <strong>Pembina Apel:</strong> {apelSiangDoc?.leaderName || config.adminName || 'Dra. Hj. Siti Aminah, M.Pd.'}
                    </p>
                    <p>
                      <strong>Lokasi / Titik:</strong> {apelSiangDoc?.placeName || 'Halaman Depan Kantor Guru'}
                    </p>
                    <p>
                      <strong>Peserta ASN Hadir:</strong> {apelSiangDoc?.attendanceCount ?? 'Lengkap'} Pegawai
                    </p>
                    {apelSiangDoc?.notes && (
                      <p className="italic text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 text-[9.5px]">
                        "{apelSiangDoc.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tanda Tangan Resmi Pengesahan */}
          {showSignatureBlock && (
            <div className="pt-6 grid grid-cols-2 text-center text-xs print-avoid-break">
              <div className="space-y-12">
                <p>
                  Mengetahui,
                  <br />
                  <strong>Kepala Sekolah</strong>
                </p>
                <div>
                  <p className="font-bold underline">{config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    NIP. {config.principalNip || '197405121999031004'}
                  </p>
                </div>
              </div>

              <div className="space-y-12 relative">
                <p>
                  Taliabu Barat, {formatDateIndo(todayDate)}
                  <br />
                  <strong>Petugas Piket Harian</strong>
                </p>
                <div>
                  <p className="font-bold underline">{config.adminName || 'Hendra Hasan, S.Pd.'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Tim Presensi GTK</p>
                </div>

                {includeOfficialStamp && (
                  <div className="absolute right-10 top-8 pointer-events-none opacity-30 rotate-[-12deg] border-2 border-indigo-700 rounded-full px-3 py-1 text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                    TERVERIFIKASI SISTEM
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden on Print) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Ekspor PDF Resmi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
