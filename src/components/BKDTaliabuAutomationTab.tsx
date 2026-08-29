import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  Send,
  Download,
  Share2,
  CheckCircle2,
  FileSpreadsheet,
  HardDrive,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Camera,
  Layers,
  FileText,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  AttendanceRecord,
  SchoolConfig,
  Teacher,
  Student,
} from '../types';
import {
  pairAttendanceByDateAndPerson,
  downloadBkdCsvFile,
  formatBkdWhatsAppMessage,
  PairedDailyAttendance,
} from '../utils/bkdTaliabuExport';

interface BKDTaliabuAutomationTabProps {
  records?: AttendanceRecord[];
  teachers?: Teacher[];
  students?: Student[];
  config: SchoolConfig;
}

export const BKDTaliabuAutomationTab: React.FC<BKDTaliabuAutomationTabProps> = ({
  records = [],
  teachers = [],
  students = [],
  config,
}) => {
  const [reportType, setReportType] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Harian');
  const [copiedWA, setCopiedWA] = useState(false);
  const [isSimulatingSend, setIsSimulatingSend] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'teacher' | 'student'>('all');

  // Pair records into distinct Sesi Masuk and Sesi Pulang columns
  const pairedData = pairAttendanceByDateAndPerson(records, teachers, students);

  const filteredPaired = pairedData.filter((item) => {
    const matchesSearch =
      item.personName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.identifier.includes(searchFilter) ||
      item.unitOrClass.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType =
      previewFilter === 'all' || item.personType === previewFilter;

    return matchesSearch && matchesType;
  });

  // Calculate live countdown to next 15:00 WIT
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // WIT is UTC+9. Calculate target today 15:00
      const target = new Date();
      target.setHours(15, 0, 0, 0);

      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdownText(`${hours}j ${mins}m ${secs}d`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = () => {
    downloadBkdCsvFile(filteredPaired, config, reportType);
  };

  const handleCopyWhatsApp = () => {
    const text = formatBkdWhatsAppMessage(filteredPaired, config, reportType);
    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handleSimulateAutoSend = () => {
    setIsSimulatingSend(true);
    setSendSuccessMsg(null);

    setTimeout(() => {
      setIsSimulatingSend(false);
      setSendSuccessMsg(
        `Berhasil disinkronkan dan dikirim ke BKD Kab. Pulau Taliabu (Jadwal 15.00 WIT): Format Google Sheets & CSV (Kolom Masuk/Pulang Terpisah) + Drive Foto terlampir.`
      );
      setTimeout(() => setSendSuccessMsg(null), 6000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sistem Otomatisasi BKD Terintegrasi</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs border border-indigo-500/30">
                Kabupaten Pulau Taliabu
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Sinkronisasi Presensi & Foto Wajah BKD Pulau Taliabu
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Foto selfie/scan wajah otomatis tersimpan di Google Drive dalam format link terverifikasi.
              Laporan Google Sheet / CSV diformat dengan <strong>Kolom Sesi Masuk dan Pulang terpisah</strong> serta
              dijadwalkan otomatis setiap <strong>pukul 15.00 WIT</strong> (Harian, Mingguan Sabtu-Minggu, dan Bulanan tanggal 30/31).
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-slate-700 space-y-2 text-xs min-w-[240px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pengiriman 15:00 WIT</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">Aktif</span>
            </div>
            <div className="text-xl font-extrabold font-mono text-amber-300">
              {countdownText}
            </div>
            <div className="text-[10px] text-slate-400">
              Menuju jadwal dispatch otomatis berikutnya (Pukul 15.00 WIT)
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {sendSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{sendSuccessMsg}</span>
        </div>
      )}

      {/* Scheduler Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Harian */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            reportType === 'Harian'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-800 text-[11px] font-extrabold">
              Jadwal Harian
            </span>
            <span className="text-xs font-bold text-slate-500">15.00 WIT</span>
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">Rekap Presensi Harian</h3>
          <p className="text-xs text-slate-500 mt-1">
            Terkirim otomatis setiap hari pukul 15.00 WIT ke WhatsApp BKD, Drive, dan Email.
          </p>
          <button
            onClick={() => setReportType('Harian')}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'Harian'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {reportType === 'Harian' ? '✓ Format Terpilih' : 'Pilih Format Harian'}
          </button>
        </div>

        {/* Card 2: Mingguan */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            reportType === 'Mingguan'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-extrabold">
              Jadwal Mingguan
            </span>
            <span className="text-xs font-bold text-slate-500">Sabtu & Minggu 15.00 WIT</span>
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">Rekapitulasi Perminggu</h3>
          <p className="text-xs text-slate-500 mt-1">
            Otomatis terakumulasi dan dikirim setiap hari Sabtu & Minggu pukul 15.00 WIT.
          </p>
          <button
            onClick={() => setReportType('Mingguan')}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'Mingguan'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {reportType === 'Mingguan' ? '✓ Format Terpilih' : 'Pilih Format Mingguan'}
          </button>
        </div>

        {/* Card 3: Bulanan */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            reportType === 'Bulanan'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 text-[11px] font-extrabold">
              Jadwal Bulanan
            </span>
            <span className="text-xs font-bold text-slate-500">Tgl 30/31 15.00 WIT</span>
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">Rekapitulasi Perbulan</h3>
          <p className="text-xs text-slate-500 mt-1">
            Otomatis terkirim setiap akhir bulan (tanggal 30 dan 31) tepat pada pukul 15.00 WIT.
          </p>
          <button
            onClick={() => setReportType('Bulanan')}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'Bulanan'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {reportType === 'Bulanan' ? '✓ Format Terpilih' : 'Pilih Format Bulanan'}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Kolom Masuk & Pulang Terpisah</span>
          </button>

          <button
            onClick={handleCopyWhatsApp}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4 text-slate-600" />
            <span>{copiedWA ? 'Tersalin!' : 'Salin Laporan WhatsApp BKD'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateAutoSend}
            disabled={isSimulatingSend}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSimulatingSend ? 'Mengirim...' : 'Kirim Sekarang (Simulasi 15.00 WIT)'}</span>
          </button>
        </div>
      </div>

      {/* Table Preview (Kolom Sesi Masuk & Sesi Pulang Terpisah) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Preview Format Google Sheets / CSV (Kolom Masuk & Pulang Terpisah)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan struktur format terpisah sesuai standar BKD Kab. Pulau Taliabu ({filteredPaired.length} Baris Data)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cari nama, NIP/NISN..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={previewFilter}
              onChange={(e) => setPreviewFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Tipe</option>
              <option value="teacher">Guru & ASN</option>
              <option value="student">Siswa</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                <th className="p-3 border-r border-slate-200">No</th>
                <th className="p-3 border-r border-slate-200">Tanggal</th>
                <th className="p-3 border-r border-slate-200">NIP / Identitas</th>
                <th className="p-3 border-r border-slate-200 min-w-[140px]">Nama Lengkap</th>
                <th className="p-3 border-r border-slate-200">Status</th>
                {/* SESI MASUK (KOLOM TERPISAH) */}
                <th className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">
                  Jam Masuk
                </th>
                <th className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">
                  Foto Masuk (Drive Link)
                </th>
                <th className="p-3 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">
                  Lokasi Masuk
                </th>
                {/* SESI PULANG (KOLOM TERPISAH) */}
                <th className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black">
                  Jam Pulang
                </th>
                <th className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black">
                  Foto Pulang (Drive Link)
                </th>
                <th className="p-3 border-r border-slate-200 bg-indigo-50 text-indigo-950 font-black">
                  Lokasi Pulang
                </th>
                {/* SUMMARY */}
                <th className="p-3 border-r border-slate-200">Durasi Kerja</th>
                <th className="p-3">Status Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPaired.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-slate-400">
                    Belum ada data presensi yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredPaired.slice(0, 15).map((row, idx) => (
                  <tr key={`${row.date}-${row.personId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-slate-100 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px]">{row.date}</td>
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px] text-slate-600">
                      {row.identifier}
                    </td>
                    <td className="p-3 border-r border-slate-100 font-bold text-slate-900">
                      {row.personName}
                    </td>
                    <td className="p-3 border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {row.employmentStatus || (row.personType === 'teacher' ? 'ASN' : 'Siswa')}
                      </span>
                    </td>
                    {/* Sesi Masuk Columns */}
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 font-mono font-bold text-emerald-800">
                      {row.jamMasuk}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 text-[11px]">
                      {row.fotoMasukDriveUrl !== '-' ? (
                        <a
                          href={row.fotoMasukDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline font-mono flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link Drive Foto</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-emerald-50/40 text-[10px] text-slate-600 max-w-xs truncate">
                      {row.lokasiMasuk}
                    </td>
                    {/* Sesi Pulang Columns */}
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 font-mono font-bold text-indigo-800">
                      {row.jamPulang}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 text-[11px]">
                      {row.fotoPulangDriveUrl !== '-' ? (
                        <a
                          href={row.fotoPulangDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline font-mono flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Link Drive Foto</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 bg-indigo-50/40 text-[10px] text-slate-600 max-w-xs truncate">
                      {row.lokasiPulang}
                    </td>
                    {/* Summary */}
                    <td className="p-3 border-r border-slate-100 font-mono text-[11px] text-slate-700">
                      {row.totalJamKerja}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          row.statusAkhir === 'HADIR LENGKAP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.statusAkhir === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800'
                            : row.statusAkhir === 'BELUM PULANG'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.statusAkhir}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
