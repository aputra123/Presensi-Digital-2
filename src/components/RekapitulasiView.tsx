import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Layers,
  ExternalLink,
  Table,
} from 'lucide-react';
import { AttendanceRecord, SchoolClass, SchoolConfig } from '../types';
import { formatDateIndo } from '../utils/soundAndDate';
import {
  pairAttendanceByDateAndPerson,
  downloadBkdCsvFile,
} from '../utils/bkdTaliabuExport';

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
  students = [],
  teachers = [],
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
  const [exportMode, setExportMode] = useState<'bkd_separate' | 'standard'>('bkd_separate');

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

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diekspor ke Excel!');
      return;
    }

    // Title and metadata rows
    const metaRows = [
      ['PEMERINTAH KABUPATEN PULAU TALIABU'],
      ['DINAS PENDIDIKAN DAN KEBUDAYAAN'],
      [config.schoolName.toUpperCase()],
      [`NPSN: ${config.npsn} | Alamat: ${config.address}`],
      [''],
      ['LAPORAN REKAPITULASI PRESENSI & KEHADIRAN DIGITAL'],
      [`Periode: ${dateFilterMode === 'today' ? 'Hari Ini (' + todayStr + ')' : dateFilterMode === 'month' ? 'Bulan ' + todayStr.substring(0, 7) : startDate + ' s/d ' + endDate} | Semester: ${config.semester} T.A ${config.academicYear}`],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} Pukul ${new Date().toLocaleTimeString('id-ID')} WIB`],
      [''],
      ['STATISTIK KEHADIRAN:'],
      [`Total Record: ${filteredRecords.length}`, `Hadir: ${countHadir}`, `Terlambat: ${countTerlambat}`, `Izin/Sakit: ${countIzinSakit}`, `Alpa: ${countAlpa}`],
      [''],
    ];

    const tableHeaders = [
      'No',
      'Tanggal',
      'Waktu',
      'Nama Lengkap',
      'Kategori',
      'NISN / NIP',
      'Rombel / Jabatan',
      'Sesi Presensi',
      'Status Kehadiran',
      'Metode Presensi',
      'Titik Lokasi / Koordinat',
      'Link Google Drive Foto',
      'Keterangan / Catatan',
    ];

    const tableRows = filteredRecords.map((r, index) => {
      const driveUrl = r.photoUrl
        ? `https://drive.google.com/file/d/1taliabu_face_${r.id}/view`
        : '-';

      return [
        index + 1,
        r.date,
        `${r.time} WIB`,
        r.personName,
        r.personType === 'teacher' ? 'Guru / GTK' : 'Siswa',
        r.identifier,
        r.employmentStatus || r.classOrSubject,
        r.type === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang',
        r.status.toUpperCase(),
        r.method === 'selfie_gps' ? 'Biometrik Selfie + GPS' : 'QR Code Scanner',
        r.location?.address || 'Area Sekolah',
        driveUrl,
        r.note || '-',
      ];
    });

    const fullSheetData = [...metaRows, tableHeaders, ...tableRows];
    const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 13 },
      { wch: 13 },
      { wch: 28 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 30 },
      { wch: 45 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');

    const cleanSchoolName = config.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rekap_Presensi_${cleanSchoolName}_${startDate}_sd_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to PDF (.pdf) using jsPDF & autoTable
  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diekspor ke PDF!');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Official School Letterhead (Kop Surat)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('PEMERINTAH KABUPATEN PULAU TALIABU', 148.5, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 148.5, 18, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(config.schoolName.toUpperCase(), 148.5, 24, { align: 'center' });
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${config.address} - NPSN: ${config.npsn}`, 148.5, 29, { align: 'center' });

    // Double horizontal separator rule
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.line(14, 32, 283, 32);
    doc.setLineWidth(0.2);
    doc.line(14, 33, 283, 33);

    // Document Title & Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN REKAPITULASI PRESENSI & KEHADIRAN DIGITAL', 148.5, 39, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const periodLabel = dateFilterMode === 'today' ? `Hari Ini (${todayStr})` : dateFilterMode === 'month' ? `Bulan ${todayStr.substring(0, 7)}` : `${startDate} s/d ${endDate}`;
    doc.text(`Periode: ${periodLabel}  |  Semester: ${config.semester} T.A ${config.academicYear}`, 148.5, 44, { align: 'center' });

    // Quick Stats Bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, 47, 269, 8.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Baris: ${filteredRecords.length}   |   Hadir: ${countHadir}   |   Terlambat: ${countTerlambat}   |   Izin & Sakit: ${countIzinSakit}   |   Alpa: ${countAlpa}`, 18, 52.5);

    // Table Content
    const headers = [['No', 'Tanggal', 'Waktu', 'Nama Lengkap', 'Kategori', 'NISN / NIP', 'Rombel / Jabatan', 'Sesi', 'Status', 'Metode']];
    const rows = filteredRecords.map((r, i) => [
      i + 1,
      r.date,
      `${r.time} WIB`,
      r.personName,
      r.personType === 'teacher' ? 'GTK' : 'Siswa',
      r.identifier,
      r.employmentStatus || r.classOrSubject,
      r.type === 'masuk' ? 'Masuk' : 'Pulang',
      r.status.toUpperCase(),
      r.method === 'selfie_gps' ? 'Biometrik' : 'QR Code',
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 58,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 50 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 32 },
        6: { cellWidth: 32 },
        7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 20, halign: 'center' },
        9: { cellWidth: 22, halign: 'center' },
      },
      didDrawPage: (data: any) => {
        // Page footer
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Dicetak resmi melalui SIM Presensi ${config.schoolName} - Halaman ${data.pageNumber}`,
          14,
          doc.internal.pageSize.height - 6
        );
        doc.text(
          `Waktu Cetak: ${new Date().toLocaleString('id-ID')} WIB`,
          doc.internal.pageSize.width - 14,
          doc.internal.pageSize.height - 6,
          { align: 'right' }
        );
      },
    });

    // Signature endorsement block
    const finalY = (doc as any).lastAutoTable?.finalY || 140;
    if (finalY < 155) {
      const signY = finalY + 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text('Mengetahui,', 225, signY);
      doc.text('Kepala Sekolah SMPN 4 Satap Taliabu Barat', 225, signY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(config.headmasterName, 225, signY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. ${config.headmasterNip}`, 225, signY + 24);
    }

    const cleanSchoolName = config.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Laporan_Presensi_${cleanSchoolName}_${startDate}_sd_${endDate}.pdf`);
  };

  // Export Function (Supports both BKD Separate Columns and Standard CSV)
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diekspor!');
      return;
    }

    if (exportMode === 'bkd_separate') {
      // Export using BKD separate Masuk / Pulang columns with Drive Photo links
      const paired = pairAttendanceByDateAndPerson(filteredRecords, teachers, students);
      downloadBkdCsvFile(paired, config, dateFilterMode === 'month' ? 'Bulanan' : dateFilterMode === '7days' ? 'Mingguan' : 'Harian');
      return;
    }

    // Standard CSV Export
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
      'Link Google Drive Foto',
      'Catatan / Keterangan',
    ];

    const rows = filteredRecords.map((r, index) => {
      const driveUrl = r.photoUrl
        ? `https://drive.google.com/file/d/1taliabu_face_${r.id}/view`
        : '-';

      return [
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
        `"${driveUrl}"`,
        `"${(r.note || '').replace(/"/g, '""')}"`,
      ];
    });

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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-xs">
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
                Filter spesifik tanggal, kategori kehadiran, ekspor PDF/Excel resmi, dan cetak berita acara
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Export Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
            <button
              onClick={() => setExportMode('bkd_separate')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                exportMode === 'bkd_separate'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Format BKD
            </button>
            <button
              onClick={() => setExportMode('standard')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                exportMode === 'standard'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standar
            </button>
          </div>

          {/* Export Excel Button */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            title="Unduh format spreadsheet Microsoft Excel (.xlsx) dengan kop surat dan ringkasan"
          >
            <Table className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          {/* Export PDF Button */}
          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-rose-600/20"
            title="Unduh dokumen resmi PDF ber-kop surat Dinas Pendidikan & TTD Kepala Sekolah"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF (.pdf)</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>CSV {exportMode === 'bkd_separate' ? 'BKD' : ''}</span>
          </button>

          {onOpenPrintModal && (
            <button
              onClick={onOpenPrintModal}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Berita Acara</span>
            </button>
          )}
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
