import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  Printer,
  ChevronDown,
  Camera,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { AttendanceRecord, SchoolClass, SchoolConfig } from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface RekapitulasiViewProps {
  records?: AttendanceRecord[];
  classes?: SchoolClass[];
  config: SchoolConfig;
  onOpenPrintModal?: () => void;
  onDeleteRecord?: (id: string) => void;
  todayDate?: string;
  students?: any[];
  teachers?: any[];
}

export const RekapitulasiView: React.FC<RekapitulasiViewProps> = ({
  records = [],
  classes = [],
  config,
  onOpenPrintModal,
}) => {
  const safeRecords = records || [];
  const safeClasses = classes || [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | '7days' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedSessionType, setSelectedSessionType] = useState<string>('ALL'); // 'ALL' | 'masuk' | 'pulang'
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL'); // 'ALL' | 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa'
  const [selectedPersonType, setSelectedPersonType] = useState<string>('ALL'); // 'ALL' | 'student' | 'teacher' | 'PNS' | 'PPPK'
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  // Filter calculation
  const filteredRecords = safeRecords.filter((rec) => {
    // 1. Search Query
    const matchesSearch =
      rec.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.identifier.includes(searchQuery) ||
      rec.classOrSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.note && rec.note.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Date Filter
    let matchesDate = true;
    if (dateFilterMode === 'today') {
      matchesDate = rec.date === todayStr;
    } else if (dateFilterMode === '7days') {
      const recDate = new Date(rec.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - recDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesDate = diffDays <= 7;
    } else if (dateFilterMode === 'month') {
      const recMonth = rec.date.substring(0, 7);
      const currentMonth = todayStr.substring(0, 7);
      matchesDate = recMonth === currentMonth;
    } else if (dateFilterMode === 'custom') {
      matchesDate = rec.date >= startDate && rec.date <= endDate;
    }

    // 3. Session Type
    const matchesSession =
      selectedSessionType === 'ALL' || rec.type === selectedSessionType;

    // 4. Status Filter (Hadir, Terlambat, Izin, Sakit, Alpa)
    const matchesStatus =
      selectedStatus === 'ALL' || rec.status === selectedStatus;

    // 5. Person & Employment Category
    let matchesPerson = true;
    if (selectedPersonType === 'student') {
      matchesPerson = rec.personType === 'student';
    } else if (selectedPersonType === 'teacher') {
      matchesPerson = rec.personType === 'teacher';
    } else if (selectedPersonType === 'PNS') {
      matchesPerson = rec.employmentStatus === 'PNS';
    } else if (selectedPersonType === 'PPPK') {
      matchesPerson = rec.employmentStatus === 'PPPK';
    } else if (selectedPersonType === 'PPPK_PW') {
      matchesPerson = rec.employmentStatus === 'PPPK_PW';
    } else if (selectedPersonType === 'HONORER') {
      matchesPerson = rec.employmentStatus === 'HONORER' || rec.employmentStatus === 'GTT_PTT';
    }

    // 6. Class Filter
    const matchesClass =
      selectedClass === 'ALL' || rec.classOrSubject === selectedClass;

    return (
      matchesSearch &&
      matchesDate &&
      matchesSession &&
      matchesStatus &&
      matchesPerson &&
      matchesClass
    );
  });

  // Calculate Summary metrics for the filtered view
  const countHadir = filteredRecords.filter((r) => r.status === 'hadir').length;
  const countTerlambat = filteredRecords.filter((r) => r.status === 'terlambat').length;
  const countIzinSakit = filteredRecords.filter((r) => r.status === 'izin' || r.status === 'sakit').length;
  const countAlpa = filteredRecords.filter((r) => r.status === 'alpa').length;

  // Export to CSV Function
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diekspor!');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Waktu',
      'Nama Lengkap',
      'Tipe Personil',
      'NISN / NIP',
      'Status Kepegawaian / Rombel',
      'Sesi Presensi',
      'Status Kehadiran',
      'Metode Presensi',
      'Lokasi & Koordinat',
      'Catatan / Keterangan',
    ];

    const rows = filteredRecords.map((r, index) => [
      index + 1,
      r.date,
      `${r.time} WIB`,
      `"${r.personName.replace(/"/g, '""')}"`,
      r.personType === 'teacher' ? 'Guru/GTK' : 'Siswa',
      `'${r.identifier}`,
      `"${(r.employmentStatus || r.classOrSubject).replace(/"/g, '""')}"`,
      r.type === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang',
      r.status.toUpperCase(),
      r.method === 'selfie_gps' ? 'Selfie + GPS' : 'QR Code',
      `"${(r.location?.address || 'Sekolah').replace(/"/g, '""')}"`,
      `"${(r.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Excel support
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `rekap_presensi_${config.schoolName.toLowerCase().replace(/\s+/g, '_')}_${startDate}_sd_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Rekapitulasi & Log Presensi Digital
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filter spesifik tanggal, kategori kehadiran, ekspor CSV, dan cetak berita acara
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {onOpenPrintModal && (
            <button
              onClick={onOpenPrintModal}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Berita Acara</span>
            </button>
          )}

          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Matrix Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Search & Quick Date Presets */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama personil, NISN, NIP, kelas, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">
              Rentang:
            </span>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'custom', label: 'Kustom Tanggal' },
              { id: 'all', label: 'Semua Waktu' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilterMode(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  dateFilterMode === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Custom Date Pickers if 'custom' is active */}
        {dateFilterMode === 'custom' && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pilih Tanggal:</span>
            </span>
            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-semibold">Dari:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-semibold">Sampai:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Row 3: Dropdown Category Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Kehadiran Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 text-[11px]">Kategori Status Kehadiran</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="hadir">Hadir Tepat Waktu</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa / Tanpa Keterangan</option>
            </select>
          </div>

          {/* Sesi Presensi: Masuk / Pulang */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 text-[11px]">Sesi Presensi</label>
            <select
              value={selectedSessionType}
              onChange={(e) => setSelectedSessionType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Sesi (Masuk & Pulang)</option>
              <option value="masuk">Presensi Masuk</option>
              <option value="pulang">Presensi Pulang</option>
            </select>
          </div>

          {/* Kategori Personil / ASN */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 text-[11px]">Kategori Personil</label>
            <select
              value={selectedPersonType}
              onChange={(e) => setSelectedPersonType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Personil (Siswa & Guru)</option>
              <option value="student">Hanya Siswa</option>
              <option value="teacher">Semua Guru & GTK</option>
              <option value="PNS">Guru/GTK PNS</option>
              <option value="PPPK">Guru/GTK PPPK</option>
              <option value="PPPK_PW">Guru/GTK PPPK PW (Paruh Waktu)</option>
              <option value="HONORER">Guru/GTK Honorer & PTT</option>
            </select>
          </div>

          {/* Kelas / Rombel */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 text-[11px]">Rombel / Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kelas / Mapel</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Metric Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-bold">Hadir Tepat</span>
            <span className="font-mono font-extrabold text-emerald-900 text-sm">{countHadir}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-bold">Terlambat</span>
            <span className="font-mono font-extrabold text-amber-900 text-sm">{countTerlambat}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
            <span className="text-indigo-700 font-bold">Izin / Sakit</span>
            <span className="font-mono font-extrabold text-indigo-900 text-sm">{countIzinSakit}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-bold">Alpa / Nihil</span>
            <span className="font-mono font-extrabold text-rose-900 text-sm">{countAlpa}</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="py-3.5 pl-5">Personil & NIP/NISN</th>
                <th className="py-3.5">Kategori</th>
                <th className="py-3.5">Rombel / Jabatan</th>
                <th className="py-3.5">Tanggal & Jam</th>
                <th className="py-3.5">Sesi</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Metode & Lokasi</th>
                <th className="py-3.5 pr-5">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-5">
                    <div className="font-bold text-slate-900 text-xs">{rec.personName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {rec.personType === 'teacher' ? `NIP: ${rec.identifier}` : `NISN: ${rec.identifier}`}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        rec.personType === 'teacher'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {rec.personType === 'teacher' ? rec.employmentStatus || 'Guru/GTK' : 'Siswa'}
                    </span>
                  </td>
                  <td className="py-3.5 font-medium text-slate-700">{rec.classOrSubject}</td>
                  <td className="py-3.5">
                    <div className="font-semibold text-slate-800 text-[11px]">{rec.date}</div>
                    <div className="font-mono text-slate-500 text-[10px]">{rec.time} WIB</div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        rec.type === 'masuk'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {rec.type === 'masuk' ? 'Masuk' : 'Pulang'}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                        rec.status === 'hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'terlambat'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'sakit' || rec.status === 'izin'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center space-x-1.5 text-slate-600">
                      {rec.method === 'selfie_gps' ? (
                        <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span className="truncate max-w-[140px] text-[11px]">
                        {rec.location?.address || 'Terverifikasi'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-5 text-slate-500 text-[11px] max-w-[180px] truncate">
                    {rec.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Tidak ada rekaman presensi yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan filter rentang tanggal, sesi, atau kategori personil.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
