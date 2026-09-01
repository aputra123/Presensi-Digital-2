import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Calendar,
  CheckSquare,
  Square,
  Users,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  School,
  FileCheck2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, SchoolConfig, Student, Teacher } from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  config: SchoolConfig;
  students?: Student[];
  teachers?: Teacher[];
}

export const BulkPrintModal: React.FC<BulkPrintModalProps> = ({
  isOpen,
  onClose,
  records = [],
  config,
  students = [],
  teachers = [],
}) => {
  if (!isOpen) return null;

  // Extract all distinct dates in records, sorted descending
  const availableDates = useMemo(() => {
    const datesSet = new Set(records.map((r) => r.date).filter(Boolean));
    const list = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    if (list.length === 0) {
      list.push(new Date().toISOString().split('T')[0]);
    }
    return list;
  }, [records]);

  // Selected dates state - defaults to the latest 3 dates or all if <= 3
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    return availableDates.slice(0, Math.min(5, availableDates.length));
  });

  const [personTypeFilter, setPersonTypeFilter] = useState<'ALL' | 'teacher' | 'student'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [groupBy, setGroupBy] = useState<'date' | 'person' | 'none'>('date');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showOfficialStamp, setShowOfficialStamp] = useState<boolean>(true);

  // Toggle single date
  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort((a, b) => a.localeCompare(b))
    );
  };

  // Select all / clear dates
  const handleSelectAllDates = () => {
    setSelectedDates(availableDates);
  };

  const handleClearDates = () => {
    setSelectedDates([]);
  };

  // Filter records based on selected dates and other filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!selectedDates.includes(r.date)) return false;
      if (personTypeFilter !== 'ALL' && r.personType !== personTypeFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });
  }, [records, selectedDates, personTypeFilter, statusFilter]);

  // Stats calculation
  const totalRecords = filteredRecords.length;
  const hadirCount = filteredRecords.filter((r) => r.status === 'hadir').length;
  const terlambatCount = filteredRecords.filter((r) => r.status === 'terlambat').length;
  const izinCount = filteredRecords.filter((r) => r.status === 'izin').length;
  const sakitCount = filteredRecords.filter((r) => r.status === 'sakit').length;
  const alpaCount = filteredRecords.filter((r) => r.status === 'alpa').length;

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none print:w-full print:p-0">
        
        {/* Non-Printable Header and Control Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 print:hidden shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Bulk Print Laporan Presensi Multi-Tanggal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih rentang atau beberapa tanggal sekaligus untuk dicetak menjadi 1 berkas PDF resmi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerPrint}
              disabled={filteredRecords.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF (window.print())</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Multi-date picker & filters) */}
        <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 print:hidden space-y-3 shrink-0">
          {/* Multi Date Picker Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Pilih Tanggal Presensi ({selectedDates.length} dipilih):</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllDates}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-bold"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearDates}
                  className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-bold"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            {/* Date Badges Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              {availableDates.map((dateStr) => {
                const isSelected = selectedDates.includes(dateStr);
                const countForDate = records.filter((r) => r.date === dateStr).length;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => toggleDate(dateStr)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{isSelected ? '✓ ' : ''}{dateStr}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-indigo-700/80 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {countForDate} rec
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Person Type */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Target:</span>
              <select
                value={personTypeFilter}
                onChange={(e) => setPersonTypeFilter(e.target.value as any)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="ALL">Semua (GTK & Siswa)</option>
                <option value="teacher">Hanya Guru & GTK</option>
                <option value="student">Hanya Siswa</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="ALL">Semua Status</option>
                <option value="hadir">Hadir Saja</option>
                <option value="terlambat">Terlambat Saja</option>
                <option value="izin">Izin Saja</option>
                <option value="sakit">Sakit Saja</option>
                <option value="alpa">Alpa Saja</option>
              </select>
            </div>

            {/* Options Toggle */}
            <label className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tampilkan Kolom Tanda Tangan & Cap</span>
            </label>

            {/* Total Badge */}
            <div className="ml-auto text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
              Total Siap Cetak: {totalRecords} Data
            </div>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white print:p-0 print:overflow-visible print:bg-white text-slate-900 font-sans">
          {/* Print Letterhead / Kop Surat */}
          <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 text-center">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-800">
              Pemerintah Kabupaten Pulau Taliabu
            </div>
            <div className="text-sm uppercase tracking-wider font-extrabold text-slate-900">
              Dinas Pendidikan dan Kebudayaan
            </div>
            <div className="text-lg sm:text-xl font-black uppercase text-slate-950 tracking-tight my-0.5">
              {config.schoolName}
            </div>
            <div className="text-[11px] text-slate-700">
              NPSN: {config.npsn} | Alamat: {config.address}
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center mb-5">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wide underline underline-offset-4 text-slate-900">
              Laporan Rekapitulasi Presensi Multi-Tanggal
            </h1>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Tanggal Terpilih: {selectedDates.join(', ') || 'Belum Ada Tanggal'} | Semester {config.semester} T.A {config.academicYear}
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-6 gap-2 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Record</div>
              <div className="font-extrabold text-slate-900 text-sm">{totalRecords}</div>
            </div>
            <div>
              <div className="text-[10px] text-emerald-700 uppercase font-bold">Hadir</div>
              <div className="font-extrabold text-emerald-800 text-sm">{hadirCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-700 uppercase font-bold">Terlambat</div>
              <div className="font-extrabold text-amber-800 text-sm">{terlambatCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-blue-700 uppercase font-bold">Izin</div>
              <div className="font-extrabold text-blue-800 text-sm">{izinCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-700 uppercase font-bold">Sakit</div>
              <div className="font-extrabold text-purple-800 text-sm">{sakitCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-700 uppercase font-bold">Alpa</div>
              <div className="font-extrabold text-rose-800 text-sm">{alpaCount}</div>
            </div>
          </div>

          {/* Multi-Date Detailed Table */}
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
              Tidak ada catatan presensi pada tanggal yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                    <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">Tanggal</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16">Waktu</th>
                    <th className="border border-slate-300 p-1.5">Nama Lengkap</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16">Tipe</th>
                    <th className="border border-slate-300 p-1.5 w-28">NISN / NIP</th>
                    <th className="border border-slate-300 p-1.5">Rombel / Jabatan</th>
                    <th className="border border-slate-300 p-1.5 text-center w-14">Sesi</th>
                    <th className="border border-slate-300 p-1.5 text-center w-20">Status</th>
                    <th className="border border-slate-300 p-1.5 text-center w-20">Metode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{index + 1}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-medium">{record.date}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{record.time}</td>
                      <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{record.personName}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-[10px]">
                        {record.personType === 'teacher' ? 'GTK' : 'Siswa'}
                      </td>
                      <td className="border border-slate-300 p-1.5 font-mono text-[10px]">{record.identifier}</td>
                      <td className="border border-slate-300 p-1.5">{record.employmentStatus || record.classOrSubject}</td>
                      <td className="border border-slate-300 p-1.5 text-center uppercase font-bold text-[10px]">
                        {record.type}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                            record.status === 'hadir'
                              ? 'text-emerald-800 bg-emerald-100'
                              : record.status === 'terlambat'
                              ? 'text-amber-800 bg-amber-100'
                              : record.status === 'alpa'
                              ? 'text-rose-800 bg-rose-100'
                              : 'text-blue-800 bg-blue-100'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center text-[10px]">
                        {record.method === 'selfie_gps' ? 'Biometrik' : 'QR Scan'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verification & Signature Blocks */}
          {showSignatures && (
            <div className="mt-8 pt-4 border-t border-slate-300 break-inside-avoid">
              <div className="flex justify-between items-start text-xs">
                {/* Operator Signature */}
                <div className="text-center w-60">
                  <p className="text-slate-600 mb-1">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mb-14">Operator Sistem Presensi</p>
                  <p className="font-bold text-slate-900 underline underline-offset-2">ADMINISTRATOR SIM</p>
                  <p className="text-slate-600 text-[10px]">Petugas Validasi Data</p>
                </div>

                {/* Principal Signature */}
                <div className="text-center w-60">
                  <p className="text-slate-600 mb-1">
                    Taliabu Barat, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-900 mb-14">Kepala Sekolah,</p>
                  <p className="font-bold text-slate-900 underline underline-offset-2">
                    {config.principalName || 'La Ode Aliudin, S.Pd'}
                  </p>
                  <p className="text-slate-600 text-[10px]">
                    NIP. {config.principalNip || '197805122005011008'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Official Document Footer */}
          <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
            <span>SIM Presensi Digital © {config.schoolName}</span>
            <span>Dicetak secara elektronik pada: {new Date().toLocaleString('id-ID')} WIB</span>
          </div>
        </div>

      </div>
    </div>
  );
};
