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
} from 'lucide-react';
import { AttendanceRecord, SchoolConfig, Student } from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface PrintModalProps {
  onClose: () => void;
  config: SchoolConfig;
  records?: AttendanceRecord[];
  students?: Student[];
  todayDate?: string;
  dateRangeLabel?: string;
  customTitle?: string;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  onClose,
  config,
  records = [],
  students = [],
  todayDate = new Date().toISOString().split('T')[0],
  dateRangeLabel,
  customTitle,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);
  const [includeOfficialStamp, setIncludeOfficialStamp] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'time' | 'status' | 'default'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const safeRecords = records || [];
  const safeStudents = students || [];

  // Filter records by class filter (if dateRangeLabel is not provided, filter by todayDate)
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

  const handleSort = (field: 'name' | 'time' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const presentCount = displayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = displayRecords.filter((r) => r.status === 'terlambat').length;
  const sickCount = displayRecords.filter((r) => r.status === 'sakit').length;
  const leaveCount = displayRecords.filter((r) => r.status === 'izin').length;
  const alphaCount = displayRecords.filter((r) => r.status === 'alpa').length;
  const totalCount = displayRecords.length;

  const handlePrint = () => {
    window.print();
  };

  // Get distinct classes for filter
  const distinctClasses = Array.from(
    new Set(safeStudents.map((s) => s.className).filter(Boolean))
  ).sort();

  const activePeriodText = dateRangeLabel || formatDateIndo(todayDate);

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
                {customTitle || 'Cetak Dokumen Resmi / Ekspor PDF Berita Acara'}
              </h3>
              <p className="text-xs text-slate-500">
                Periode: <strong>{activePeriodText}</strong> • Format Berita Acara Rekapitulasi Presensi Standar Kedinasan (A4)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Class Filter selector for print */}
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
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={showSignatureBlock}
                onChange={(e) => setShowSignatureBlock(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tanda Tangan Kepala Sekolah & Piket</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={includeOfficialStamp}
                onChange={(e) => setIncludeOfficialStamp(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Stempel Resmi & Watermark</span>
            </label>
          </div>

          <div className="text-[11px] text-indigo-700 font-medium flex items-center space-x-2">
            <span>Urutkan:</span>
            <button
              onClick={() => handleSort('name')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                sortField === 'name' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Nama {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('time')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                sortField === 'time' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Waktu {sortField === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('status')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                sortField === 'status' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Printable Paper Content (#printable-area) */}
        <div
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-5 text-slate-900 bg-white"
          id="printable-area"
        >
          {/* Kop Surat Sekolah Resmi */}
          <div className="border-b-4 border-double border-slate-900 pb-4 flex items-center justify-between gap-4 print-avoid-break">
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
                Email: {config.bkdEmail || 'info@sman1nusantara.sch.id'} • Telp: {config.bkdWhatsApp || '021-7890123'}
              </p>
            </div>
          </div>

          {/* Judul Berita Acara */}
          <div className="text-center space-y-1 pt-1 print-avoid-break">
            <h3 className="font-extrabold text-sm uppercase underline tracking-wider">
              {customTitle || 'BERITA ACARA REKAPITULASI PRESENSI DIGITAL'}
            </h3>
            <p className="text-xs text-slate-600">
              Periode: <strong>{activePeriodText}</strong> • Semester {config.semester} TP {config.academicYear}
            </p>
          </div>

          {/* Ringkasan Rekap Angka */}
          <div className="grid grid-cols-6 gap-2 text-center text-xs py-2 print-avoid-break">
            <div className="p-2 rounded-xl border border-slate-300">
              <span className="text-[10px] text-slate-500 block">Total Baris</span>
              <strong className="text-sm">{totalCount}</strong>
            </div>
            <div className="p-2 rounded-xl border border-slate-300 bg-emerald-50">
              <span className="text-[10px] text-emerald-800 block font-bold">Hadir</span>
              <strong className="text-sm text-emerald-900">{presentCount}</strong>
            </div>
            <div className="p-2 rounded-xl border border-slate-300 bg-amber-50">
              <span className="text-[10px] text-amber-800 block font-bold">Terlambat</span>
              <strong className="text-sm text-amber-900">{lateCount}</strong>
            </div>
            <div className="p-2 rounded-xl border border-slate-300 bg-blue-50">
              <span className="text-[10px] text-blue-800 block font-bold">Sakit</span>
              <strong className="text-sm text-blue-900">{sickCount}</strong>
            </div>
            <div className="p-2 rounded-xl border border-slate-300 bg-purple-50">
              <span className="text-[10px] text-purple-800 block font-bold">Izin</span>
              <strong className="text-sm text-purple-900">{leaveCount}</strong>
            </div>
            <div className="p-2 rounded-xl border border-slate-300 bg-rose-50">
              <span className="text-[10px] text-rose-800 block font-bold">Alpa</span>
              <strong className="text-sm text-rose-900">{alphaCount}</strong>
            </div>
          </div>

          {/* Tabel Presensi Clean Table */}
          <div className="overflow-x-auto border border-slate-400 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700">
                  <th className="p-2 text-center w-8 border-r border-slate-300">No</th>
                  <th
                    onClick={() => handleSort('name')}
                    className="p-2 border-r border-slate-300 cursor-pointer hover:bg-slate-200 select-none"
                    title="Klik untuk sortir Nama"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Nama Lengkap</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="p-2 border-r border-slate-300">NIP / NISN</th>
                  <th className="p-2 border-r border-slate-300">Tipe / Kelas</th>
                  <th
                    onClick={() => handleSort('time')}
                    className="p-2 border-r border-slate-300 cursor-pointer hover:bg-slate-200 select-none"
                    title="Klik untuk sortir Waktu"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Waktu Presensi</span>
                      {sortField === 'time' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="p-2 text-center border-r border-slate-300 cursor-pointer hover:bg-slate-200 select-none"
                    title="Klik untuk sortir Status"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="p-2">Verifikasi / Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400">
                      Tidak ada catatan presensi pada tanggal/filter ini.
                    </td>
                  </tr>
                ) : (
                  displayRecords.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center border-r border-slate-200 font-mono">{i + 1}</td>
                      <td className="p-2 font-bold border-r border-slate-200 text-slate-900">{r.personName}</td>
                      <td className="p-2 border-r border-slate-200 font-mono text-[10px]">{r.identifier}</td>
                      <td className="p-2 border-r border-slate-200">{r.classOrSubject}</td>
                      <td className="p-2 border-r border-slate-200 font-mono">{r.date} {r.time} ({r.type})</td>
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
                      <td className="p-2 text-slate-600 text-[10px] truncate max-w-xs">
                        {r.method === 'selfie_gps' ? 'Biometrik Face + GPS' : 'QR Scan'} • {r.note || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Resmi */}
          {showSignatureBlock && (
            <div className="pt-6 grid grid-cols-2 text-center text-xs print-avoid-break">
              <div className="space-y-14">
                <p>
                  Mengetahui,<br />
                  <strong>Kepala Sekolah</strong>
                </p>
                <div>
                  <p className="font-bold underline">{config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">NIP. {config.principalNip || '197405121999031004'}</p>
                </div>
              </div>

              <div className="space-y-14 relative">
                <p>
                  Taliabu Barat, {formatDateIndo(todayDate)}<br />
                  <strong>Petugas Piket Harian</strong>
                </p>
                <div>
                  <p className="font-bold underline">{config.adminName || 'Hendra Hasan, S.Pd.'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Tim Presensi Sekolah</p>
                </div>

                {includeOfficialStamp && (
                  <div className="absolute right-12 top-10 pointer-events-none opacity-30 rotate-[-12deg] border-2 border-indigo-700 rounded-full px-3 py-1 text-[10px] font-black uppercase text-indigo-800 tracking-wider">
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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak ke PDF (Print / PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

