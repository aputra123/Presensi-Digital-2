import React from 'react';
import { Printer, X, School, FileText, CheckCircle2 } from 'lucide-react';
import { AttendanceRecord, SchoolConfig, Student } from '../types';
import { formatDateIndo } from '../utils/soundAndDate';

interface PrintModalProps {
  onClose: () => void;
  config: SchoolConfig;
  records?: AttendanceRecord[];
  students?: Student[];
  todayDate: string;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  onClose,
  config,
  records = [],
  students = [],
  todayDate,
}) => {
  const safeRecords = records || [];
  const safeStudents = students || [];
  const todayRecords = safeRecords.filter((r) => r.date === todayDate && r.personType === 'student');
  const presentCount = todayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = todayRecords.filter((r) => r.status === 'terlambat').length;
  const sickCount = todayRecords.filter((r) => r.status === 'sakit').length;
  const leaveCount = todayRecords.filter((r) => r.status === 'izin').length;
  const alphaCount = todayRecords.filter((r) => r.status === 'alpa').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">
              Pratinjau Dokumen Berita Acara Presensi Harian
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Paper Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-slate-900 bg-white" id="printable-area">
          {/* Kop Surat Sekolah Resmi */}
          <div className="border-b-4 border-double border-slate-900 pb-4 flex items-center justify-between gap-4">
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
                PEMERINTAH PROVINSI DAERAH KHUSUS JAKARTA • DINAS PENDIDIKAN
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
          <div className="text-center space-y-1 pt-2">
            <h3 className="font-extrabold text-sm uppercase underline tracking-wider">
              BERITA ACARA REKAPITULASI PRESENSI HARIAN
            </h3>
            <p className="text-xs text-slate-600">
              Hari/Tanggal: <strong>{formatDateIndo(todayDate)}</strong> • Semester {config.semester} TP {config.academicYear}
            </p>
          </div>

          {/* Ringkasan Rekap Angka */}
          <div className="grid grid-cols-6 gap-2 text-center text-xs py-2">
            <div className="p-2.5 rounded-xl border border-slate-300">
              <span className="text-[10px] text-slate-500 block">Total Siswa</span>
              <strong className="text-base">{students.length}</strong>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-emerald-50">
              <span className="text-[10px] text-emerald-800 block font-bold">Hadir</span>
              <strong className="text-base text-emerald-900">{presentCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-amber-50">
              <span className="text-[10px] text-amber-800 block font-bold">Terlambat</span>
              <strong className="text-base text-amber-900">{lateCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-blue-50">
              <span className="text-[10px] text-blue-800 block font-bold">Sakit</span>
              <strong className="text-base text-blue-900">{sickCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-purple-50">
              <span className="text-[10px] text-purple-800 block font-bold">Izin</span>
              <strong className="text-base text-purple-900">{leaveCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-rose-50">
              <span className="text-[10px] text-rose-800 block font-bold">Alpa</span>
              <strong className="text-base text-rose-900">{alphaCount}</strong>
            </div>
          </div>

          {/* Tabel Presensi */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700">
                  <th className="p-2 text-center w-10 border-r border-slate-300">No</th>
                  <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                  <th className="p-2 border-r border-slate-300">NISN</th>
                  <th className="p-2 border-r border-slate-300">Kelas</th>
                  <th className="p-2 border-r border-slate-300">Waktu Masuk</th>
                  <th className="p-2 text-center border-r border-slate-300">Status</th>
                  <th className="p-2">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {todayRecords.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-2 text-center border-r border-slate-200 font-mono">{i + 1}</td>
                    <td className="p-2 font-bold border-r border-slate-200">{r.personName}</td>
                    <td className="p-2 border-r border-slate-200 font-mono">{r.identifier}</td>
                    <td className="p-2 border-r border-slate-200">{r.classOrSubject}</td>
                    <td className="p-2 border-r border-slate-200 font-mono">{r.time} WIB</td>
                    <td className="p-2 text-center border-r border-slate-200 font-bold uppercase">{r.status}</td>
                    <td className="p-2 text-slate-600">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Resmi */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs">
            <div className="space-y-16">
              <p>Mengetahui,<br /><strong>Kepala Sekolah</strong></p>
              <div>
                <p className="font-bold underline">{config.principalName || 'Dr. H. Mulyadi, M.Pd.'}</p>
                <p className="text-[11px] text-slate-500 font-mono">NIP. {config.principalNip || '197103151998021001'}</p>
              </div>
            </div>

            <div className="space-y-16">
              <p>Jakarta, {formatDateIndo(todayDate)}<br /><strong>Petugas Piket Harian</strong></p>
              <div>
                <p className="font-bold underline">{config.adminName || 'Dra. Sri Wahyuni, M.Pd.'}</p>
                <p className="text-[11px] text-slate-500 font-mono">Tim Presensi Sekolah</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-full shadow-md flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (Print / PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
