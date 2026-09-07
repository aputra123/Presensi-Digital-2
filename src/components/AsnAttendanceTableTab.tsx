import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PenTool,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Smartphone,
  Laptop,
  Check,
  Building2,
  ShieldCheck,
  Users,
  Award,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  Teacher,
  AttendanceRecord,
  SchoolConfig,
  EmploymentStatus,
  AsnAttendanceStatus,
  AsnAttendanceRow,
  UserRole,
} from '../types';
import { SignaturePad } from './SignaturePad';
import { SignaturePadModal } from './SignaturePadModal';
import { PrintModal } from './PrintModal';
import { formatDateIndo, downloadCsv } from '../utils/soundAndDate';

interface AsnAttendanceTableTabProps {
  teachers: Teacher[];
  records: AttendanceRecord[];
  config: SchoolConfig;
  userRole?: UserRole;
  todayDate: string;
  onAddTeacher?: (teacher: Teacher) => void;
  onRecordAttendance?: (record: AttendanceRecord) => void;
}

// Default ASN Teachers list if database is empty, to provide instantaneous automation
const SAMPLE_ASN_TEACHERS: Teacher[] = [
  {
    id: 't_asn_1',
    nip: '197405121999031004',
    name: 'Drs. Ruslan La Ode, M.Pd.',
    employmentStatus: 'PNS',
    subject: 'Kepala Sekolah / Matematika',
    role: 'Kepala Sekolah',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    phone: '081245678901',
    email: 'ruslan.laode@guru.smp.belajar.id',
  },
  {
    id: 't_asn_2',
    nip: '197808152005012011',
    name: 'Dra. Hj. Siti Aminah, M.Pd.',
    employmentStatus: 'PNS',
    subject: 'Bahasa Indonesia',
    role: 'Wakil Kepala Sekolah',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    phone: '081245678902',
    email: 'siti.aminah@guru.smp.belajar.id',
  },
  {
    id: 't_asn_3',
    nip: '198203202008011009',
    name: 'Budi Santoso, S.Pd., M.Si.',
    employmentStatus: 'PNS',
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    role: 'Guru Madya',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    phone: '081245678903',
    email: 'budi.santoso@guru.smp.belajar.id',
  },
  {
    id: 't_asn_4',
    nip: '198506142010012025',
    name: 'Sri Wahyuni, S.Pd.',
    employmentStatus: 'PNS',
    subject: 'Matematika',
    role: 'Guru Muda',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=300&q=80',
    phone: '081245678904',
    email: 'sri.wahyuni@guru.smp.belajar.id',
  },
  {
    id: 't_asn_5',
    nip: '199001182022211005',
    name: 'Ahmad Fauzi, S.Kom.',
    employmentStatus: 'PPPK',
    subject: 'Informatika / TIK',
    role: 'Guru Ahli Pertama',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    phone: '081245678905',
    email: 'ahmad.fauzi@guru.smp.belajar.id',
  },
  {
    id: 't_asn_6',
    nip: '199209252022212008',
    name: 'Nurul Hidayah, S.Pd.',
    employmentStatus: 'PPPK',
    subject: 'Bahasa Inggris',
    role: 'Guru Ahli Pertama',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    phone: '081245678906',
    email: 'nurul.hidayah@guru.smp.belajar.id',
  },
  {
    id: 't_asn_7',
    nip: '198711032014021003',
    name: 'Hendra Hasan, S.Pd.',
    employmentStatus: 'PNS',
    subject: 'Pendidikan Jasmani (PJOK)',
    role: 'Guru Muda / Admin BKD',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    phone: '081245678907',
    email: 'hendra.hasan@guru.smp.belajar.id',
  },
  {
    id: 't_asn_8',
    nip: '199404102023212014',
    name: 'Dewi Lestari, S.Pd.Gr.',
    employmentStatus: 'PPPK',
    subject: 'Ilmu Pengetahuan Sosial (IPS)',
    role: 'Guru Ahli Pertama',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    phone: '081245678908',
    email: 'dewi.lestari@guru.smp.belajar.id',
  },
];

export const AsnAttendanceTableTab: React.FC<AsnAttendanceTableTabProps> = ({
  teachers,
  records,
  config,
  userRole = 'admin',
  todayDate,
  onAddTeacher,
  onRecordAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [filterAsnMode, setFilterAsnMode] = useState<'asn_only' | 'all'>('asn_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterNip, setFilterNip] = useState<string>('all');
  const [isDateRangeActive, setIsDateRangeActive] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(todayDate || new Date().toISOString().split('T')[0]);
  const [tableRows, setTableRows] = useState<AsnAttendanceRow[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Active Signature Pad Modal state
  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    teacherId: string;
    teacherName: string;
    nip: string;
    sessionType: 'masuk' | 'pulang';
    initialSignature?: string;
  }>({
    isOpen: false,
    teacherId: '',
    teacherName: '',
    nip: '',
    sessionType: 'masuk',
  });

  const effectiveTeachers = useMemo(() => {
    if (teachers && teachers.length > 0) return teachers;
    return SAMPLE_ASN_TEACHERS;
  }, [teachers]);

  // Storage key for this specific date
  const storageKey = `school_asn_attendance_table_${selectedDate}`;

  // Initialize or Load Table rows for the selected date
  const generateTableData = () => {
    // 1. Try loading saved rows from localStorage for this date
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: AsnAttendanceRow[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTableRows(parsed);
          return;
        }
      }
    } catch {}

    // 2. Otherwise, auto-build format from teachers and match with attendance records
    const initialRows: AsnAttendanceRow[] = effectiveTeachers.map((t) => {
      // Find today's check-in / check-out records if available
      const recIn = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          (r.type === 'masuk' || !r.type)
      );
      const recOut = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          r.type === 'pulang'
      );

      let initialStatus: AsnAttendanceStatus = 'tanpa_keterangan';
      if (recIn) {
        if (recIn.status === 'hadir' || recIn.status === 'terlambat') {
          initialStatus = 'hadir';
        } else if (recIn.status === 'sakit') {
          initialStatus = 'sakit';
        } else if (recIn.status === 'izin') {
          initialStatus = 'izin';
        } else if (recIn.status === 'alpa') {
          initialStatus = 'tanpa_keterangan';
        }
      }

      return {
        teacherId: t.id,
        name: t.name,
        nip: t.nip,
        employmentStatus: t.employmentStatus,
        subjectOrRole: t.subject || t.role || 'Tenaga Kependidikan',
        signatureIn: undefined,
        signatureInTime: recIn ? recIn.time : undefined,
        signatureOut: undefined,
        signatureOutTime: recOut ? recOut.time : undefined,
        status: initialStatus,
        notes: recIn?.note || '',
        updatedAt: new Date().toISOString(),
      };
    });

    setTableRows(initialRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialRows));
    } catch {}
  };

  useEffect(() => {
    generateTableData();
  }, [selectedDate, effectiveTeachers]);

  // Persist whenever tableRows change
  const updateTableRows = (newRows: AsnAttendanceRow[]) => {
    setTableRows(newRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newRows));
    } catch {}
  };

  // Filter rows based on ASN status, NIP, status, & search query
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // ASN Filter
      if (filterAsnMode === 'asn_only') {
        const isAsn =
          row.employmentStatus === 'PNS' ||
          row.employmentStatus === 'PPPK' ||
          row.employmentStatus === 'PPPK_PW';
        if (!isAsn) return false;
      }

      // Status Filter
      if (filterStatus !== 'all' && row.status !== filterStatus) {
        return false;
      }

      // NIP Filter
      if (filterNip !== 'all' && row.nip !== filterNip) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.name.toLowerCase().includes(q);
        const matchNip = row.nip.toLowerCase().includes(q);
        const matchSubj = row.subjectOrRole.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchSubj) return false;
      }

      return true;
    });
  }, [tableRows, filterAsnMode, searchQuery, filterStatus, filterNip]);

  // Real-time Summary Statistics
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const hadir = filteredRows.filter((r) => r.status === 'hadir').length;
    const izin = filteredRows.filter((r) => r.status === 'izin').length;
    const sakit = filteredRows.filter((r) => r.status === 'sakit').length;
    const cuti = filteredRows.filter((r) => r.status === 'cuti').length;
    const dinasLuar = filteredRows.filter((r) => r.status === 'dinas_luar').length;
    const tanpaKeterangan = filteredRows.filter((r) => r.status === 'tanpa_keterangan').length;
    const signedIn = filteredRows.filter((r) => !!r.signatureIn).length;
    const signedOut = filteredRows.filter((r) => !!r.signatureOut).length;

    return {
      total,
      hadir,
      izin,
      sakit,
      cuti,
      dinasLuar,
      tanpaKeterangan,
      signedIn,
      signedOut,
    };
  }, [filteredRows]);

  // Handle open signature pad
  const handleOpenSignatureModal = (
    row: AsnAttendanceRow,
    sessionType: 'masuk' | 'pulang'
  ) => {
    setActiveModal({
      isOpen: true,
      teacherId: row.teacherId,
      teacherName: row.name,
      nip: row.nip,
      sessionType,
      initialSignature: sessionType === 'masuk' ? row.signatureIn : row.signatureOut,
    });
  };

  // Handle save signature from modal
  const handleSaveSignature = (signatureDataUrl: string, timestamp: string) => {
    const { teacherId, sessionType } = activeModal;
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        if (sessionType === 'masuk') {
          return {
            ...row,
            signatureIn: signatureDataUrl,
            signatureInTime: timestamp,
            status: row.status === 'tanpa_keterangan' ? 'hadir' : row.status,
            updatedAt: new Date().toISOString(),
          };
        } else {
          return {
            ...row,
            signatureOut: signatureDataUrl,
            signatureOutTime: timestamp,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return row;
    });

    updateTableRows(updated);

    // Sync with app-wide attendance records
    if (onRecordAttendance) {
      const targetRow = updated.find((r) => r.teacherId === teacherId);
      if (targetRow) {
        const newRecord: AttendanceRecord = {
          id: `att_asn_${teacherId}_${selectedDate}_${sessionType}`,
          personId: teacherId,
          personType: 'teacher',
          personName: targetRow.name,
          identifier: targetRow.nip,
          classOrSubject: targetRow.subjectOrRole,
          date: selectedDate,
          time: timestamp,
          type: sessionType,
          status:
            targetRow.status === 'tanpa_keterangan'
              ? 'hadir'
              : (targetRow.status as any),
          method: 'manual',
          signature: signatureDataUrl,
          signatureIn: sessionType === 'masuk' ? signatureDataUrl : targetRow.signatureIn,
          signatureOut: sessionType === 'pulang' ? signatureDataUrl : targetRow.signatureOut,
          signatureInTime: sessionType === 'masuk' ? timestamp : targetRow.signatureInTime,
          signatureOutTime: sessionType === 'pulang' ? timestamp : targetRow.signatureOutTime,
          employmentStatus: targetRow.employmentStatus,
          note: targetRow.notes,
        };
        onRecordAttendance(newRecord);
      }
    }
  };

  // Re-build format from scratch based on current teachers & records
  const handleForceRegenerate = () => {
    const initialRows: AsnAttendanceRow[] = effectiveTeachers.map((t) => {
      const recIn = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          (r.type === 'masuk' || !r.type)
      );
      const recOut = records.find(
        (r) =>
          r.identifier === t.nip &&
          r.date === selectedDate &&
          r.type === 'pulang'
      );

      let initialStatus: AsnAttendanceStatus = 'tanpa_keterangan';
      if (recIn) {
        if (recIn.status === 'hadir' || recIn.status === 'terlambat') {
          initialStatus = 'hadir';
        } else if (recIn.status === 'sakit') {
          initialStatus = 'sakit';
        } else if (recIn.status === 'izin') {
          initialStatus = 'izin';
        } else if (recIn.status === 'alpa') {
          initialStatus = 'tanpa_keterangan';
        }
      }

      return {
        teacherId: t.id,
        name: t.name,
        nip: t.nip,
        employmentStatus: t.employmentStatus,
        subjectOrRole: t.subject || t.role || 'Tenaga Kependidikan',
        signatureIn: recIn?.signatureIn || recIn?.signature,
        signatureInTime: recIn ? recIn.time : undefined,
        signatureOut: recOut?.signatureOut || recOut?.signature,
        signatureOutTime: recOut ? recOut.time : undefined,
        status: initialStatus,
        notes: recIn?.note || '',
        updatedAt: new Date().toISOString(),
      };
    });

    setTableRows(initialRows);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialRows));
    } catch {}
  };

  // Handle delete signature
  const handleDeleteSignature = (
    teacherId: string,
    sessionType: 'masuk' | 'pulang',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Hapus tanda tangan ${sessionType === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'}?`)) {
      return;
    }

    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        if (sessionType === 'masuk') {
          return {
            ...row,
            signatureIn: undefined,
            signatureInTime: undefined,
          };
        } else {
          return {
            ...row,
            signatureOut: undefined,
            signatureOutTime: undefined,
          };
        }
      }
      return row;
    });

    updateTableRows(updated);
  };

  // Handle change status
  const handleChangeStatus = (teacherId: string, status: AsnAttendanceStatus) => {
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        return {
          ...row,
          status,
          updatedAt: new Date().toISOString(),
        };
      }
      return row;
    });
    updateTableRows(updated);
  };

  // Handle change notes
  const handleChangeNotes = (teacherId: string, notes: string) => {
    const updated = tableRows.map((row) => {
      if (row.teacherId === teacherId) {
        return { ...row, notes };
      }
      return row;
    });
    updateTableRows(updated);
  };

  // Quick Action: Mark all present
  const handleMarkAllPresent = () => {
    if (confirm('Set status semua guru yang tampil ke "Hadir"?')) {
      const updated = tableRows.map((row) => {
        const isMatched = filteredRows.some((fr) => fr.teacherId === row.teacherId);
        if (isMatched && row.status === 'tanpa_keterangan') {
          return { ...row, status: 'hadir' as AsnAttendanceStatus };
        }
        return row;
      });
      updateTableRows(updated);
    }
  };

  // Export to CSV / Excel
  const handleExportCsv = () => {
    const headers = [
      'No',
      'Nama Guru/GTK',
      'NIP',
      'Status Kepegawaian',
      'Mata Pelajaran / Jabatan',
      'Jam Masuk',
      'TTD Masuk',
      'Jam Pulang',
      'TTD Pulang',
      'Keterangan',
      'Catatan Rinci',
    ];

    const data = filteredRows.map((row, idx) => [
      String(idx + 1),
      row.name,
      row.nip,
      row.employmentStatus,
      row.subjectOrRole,
      row.signatureInTime || '-',
      row.signatureIn ? 'Sudah Ditandatangani' : 'Belum',
      row.signatureOutTime || '-',
      row.signatureOut ? 'Sudah Ditandatangani' : 'Belum',
      row.status.toUpperCase().replace('_', ' '),
      row.notes || '-',
    ]);

    downloadCsv(
      headers,
      data,
      `Tabel_Absensi_Guru_ASN_${selectedDate}_${config.schoolName.replace(/\s+/g, '_')}.csv`
    );
  };

  // Export Custom Printable Manual Attendance Sheet (PDF/Cetak Format Blangko)
  const handlePrintManualSheetPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up peramban untuk mencetak Lembar Absensi Manual.');
      return;
    }

    const rowsHtml = filteredRows
      .map(
        (r, idx) => `
        <tr style="height: 38px;">
          <td style="border: 1px solid #475569; text-align: center; font-size: 11px; padding: 4px;">${idx + 1}</td>
          <td style="border: 1px solid #475569; font-size: 11px; font-weight: bold; padding: 4px 6px;">${r.name}</td>
          <td style="border: 1px solid #475569; font-size: 10px; font-family: monospace; text-align: center; padding: 4px;">${r.nip}</td>
          <td style="border: 1px solid #475569; font-size: 10px; text-align: center; padding: 4px;">${r.employmentStatus}</td>
          <td style="border: 1px solid #475569; font-size: 10px; padding: 4px 6px;">${r.subjectOrRole}</td>
          <td style="border: 1px solid #475569; width: 120px; text-align: center; vertical-align: middle;">
            ${r.signatureIn ? `<img src="${r.signatureIn}" style="max-height: 28px; max-width: 90px;" />` : `<span style="color: #94a3b8; font-size: 9px;">${idx % 2 === 0 ? '1. ....................' : ''}</span>`}
          </td>
          <td style="border: 1px solid #475569; width: 120px; text-align: center; vertical-align: middle;">
            ${r.signatureOut ? `<img src="${r.signatureOut}" style="max-height: 28px; max-width: 90px;" />` : `<span style="color: #94a3b8; font-size: 9px;">${idx % 2 === 1 ? '2. ....................' : ''}</span>`}
          </td>
          <td style="border: 1px solid #475569; font-size: 10px; text-align: center; padding: 4px;">
            ${r.status.toUpperCase().replace('_', ' ')}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daftar Hadir Manual Guru & Pegawai - ${config.schoolName}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 6px; margin-bottom: 10px; }
          .header h2 { margin: 0; font-size: 14pt; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h3 { margin: 2px 0; font-size: 12pt; text-transform: uppercase; }
          .header p { margin: 0; font-size: 9.5pt; font-style: italic; }
          .meta { font-size: 10.5pt; margin-bottom: 8px; display: flex; justify-content: space-between; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { border: 1px solid #000; background-color: #f1f5f9; font-size: 10pt; padding: 6px 4px; text-align: center; }
          .signature-section { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10.5pt; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 280px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PEMERINTAH KABUPATEN PULAU TALIABU</h2>
          <h3>DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
          <h2>${config.schoolName.toUpperCase()}</h2>
          <p>${config.address} • NPSN: ${config.npsn}</p>
        </div>
        <div class="meta">
          <div>DAFTAR HADIR MANUAL GURU & TENAGA KEPENDIDIKAN (LEMBAR KERJA FISIK)</div>
          <div>Tanggal: ${formatDateIndo(selectedDate)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">NO</th>
              <th>NAMA LENGKAP</th>
              <th style="width: 140px;">NIP</th>
              <th style="width: 70px;">STATUS</th>
              <th>JABATAN / MAPEL</th>
              <th style="width: 130px;">TTD MASUK</th>
              <th style="width: 130px;">TTD PULANG</th>
              <th style="width: 90px;">KET.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="signature-section">
          <div class="sign-box">
            <p style="margin-bottom: 55px;">Mengetahui,<br/>Guru Piket Harian</p>
            <p style="font-weight: bold; text-decoration: underline;">( .................................................. )</p>
            <p style="font-size: 9pt; margin: 0;">NIP. -</p>
          </div>
          <div class="sign-box">
            <p style="margin-bottom: 55px;">Taliabu Barat, ${formatDateIndo(selectedDate)}<br/>Kepala Sekolah,</p>
            <p style="font-weight: bold; text-decoration: underline;">${config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
            <p style="font-size: 9pt; margin: 0;">NIP. ${config.principalNip || '197405121999031004'}</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Status Badge Helper
  const getStatusBadge = (status: AsnAttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'izin':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'sakit':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cuti':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'dinas_luar':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'tanpa_keterangan':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const getStatusLabel = (status: AsnAttendanceStatus) => {
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
    <div id="asn-attendance-table-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-sky-950 text-white rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                <PenTool className="w-3.5 h-3.5" />
                <span>Format Otomatis GTK ASN</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center space-x-1">
                <Smartphone className="w-3 h-3" />
                <span>Touchpad & HP</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tabel Absensi & Tanda Tangan Guru ASN
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Format daftar hadir resmi terbagi dua kolom tanda tangan (Absen Masuk & Absen Pulang) dengan dukungan goresan sentuh touchpad/mouse semua jenis laptop serta layar HP.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="print-asn-table-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Buka pratinjau resmi PrintModal & cetak ke PDF dengan tanda tangan kanvas"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Pratinjau & Cetak Resmi</span>
            </button>

            <button
              id="print-manual-sheet-btn"
              onClick={handlePrintManualSheetPdf}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Cetak Blangko Lembar Absensi Manual Resmi (PDF)"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak Blangko Manual PDF</span>
            </button>

            <button
              id="auto-generate-table-btn"
              onClick={handleForceRegenerate}
              className="px-3.5 py-2.5 bg-indigo-800/90 hover:bg-indigo-700 text-indigo-100 border border-indigo-600/40 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Otomatis susun & segarkan format tabel absensi guru ASN"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Format Otomatis ASN</span>
            </button>

            <button
              id="export-csv-asn-table-btn"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Unduh data tabel dalam format spreadsheet"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel/CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Guru ASN
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[10px] font-bold text-slate-400">Personil</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Hadir
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-700">{stats.hadir}</span>
            <span className="text-[10px] font-bold text-emerald-600">
              {stats.signedIn} TTD Masuk
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Izin
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-700">{stats.izin}</span>
            <span className="text-[10px] font-bold text-amber-600">Surat Izin</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Sakit
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-700">{stats.sakit}</span>
            <span className="text-[10px] font-bold text-blue-600">Surat Dokter</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            Cuti
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-700">{stats.cuti}</span>
            <span className="text-[10px] font-bold text-purple-600">Resmi BKD</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-sky-200 bg-sky-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Dinas Luar
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-sky-700">{stats.dinasLuar}</span>
            <span className="text-[10px] font-bold text-sky-600">Surat Tugas</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Tanpa Keterangan
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-700">{stats.tanpaKeterangan}</span>
            <span className="text-[10px] font-bold text-rose-600">Alpa</span>
          </div>
        </div>
      </div>

      {/* Filter and Configuration Toolbar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Picker & Quick Days */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-600 ml-1.5" />
              <input
                id="asn-table-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden pr-2 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setSelectedDate(todayDate || new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedDate === todayDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>

            {/* Filter ASN vs All GTK */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setFilterAsnMode('asn_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterAsnMode === 'asn_only'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khusus Guru ASN (PNS & PPPK)
              </button>
              <button
                onClick={() => setFilterAsnMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterAsnMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Guru & GTK
              </button>
            </div>
          </div>

          {/* Search Input & Fast Utilities */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, mapel..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
              title="Tandai seluruh guru hadir otomatis"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Set Semua Hadir</span>
            </button>

            <button
              onClick={generateTableData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
              title="Segarkan / Buat Ulang Format Tabel"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row: Specific Filters for NIP, Attendance Status, & Date Range */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="cuti">Cuti</option>
              <option value="dinas_luar">Dinas Luar</option>
              <option value="tanpa_keterangan">Tanpa Keterangan / Alpa</option>
            </select>
          </div>

          {/* NIP Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500">Pilih Guru / NIP:</span>
            <select
              id="filter-nip-select"
              value={filterNip}
              onChange={(e) => setFilterNip(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 max-w-[220px] truncate cursor-pointer"
            >
              <option value="all">Semua Guru ASN (Semua NIP)</option>
              {effectiveTeachers.map((t) => (
                <option key={t.id} value={t.nip}>
                  {t.nip} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Rentang Tanggal */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDateRangeActive(!isDateRangeActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                isDateRangeActive
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Rentang Tanggal</span>
            </button>

            {isDateRangeActive && (
              <div className="flex items-center space-x-1.5 animate-in fade-in text-xs font-bold">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {(filterStatus !== 'all' || filterNip !== 'all' || isDateRangeActive || searchQuery) && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterNip('all');
                setIsDateRangeActive(false);
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Device instruction tip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-sky-50/80 rounded-2xl border border-sky-100 text-sky-900 text-xs">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="leading-snug">
              <strong>Panduan Tanda Tangan:</strong> Klik tombol <strong>Tanda Tangan Masuk</strong> atau <strong>Tanda Tangan Pulang</strong> pada baris guru yang bersangkutan. Anda dapat mencoret tanda tangan menggunakan <strong>touchpad/mouse laptop</strong> maupun <strong>layar sentuh HP</strong>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-700 font-bold shrink-0">
            {formatDateIndo(selectedDate)}
          </span>
        </div>
      </div>

      {/* Main Table Container: Formatted strictly according to user's specification */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]" id="asn-attendance-printable-table">
            <thead>
              {/* Top Grouped Header */}
              <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                <th rowSpan={2} className="py-3.5 px-4 text-center border-r border-slate-800 w-12">
                  No
                </th>
                <th rowSpan={2} className="py-3.5 px-4 border-r border-slate-800 min-w-[220px]">
                  Nama Guru / GTK & NIP
                </th>
                {/* Parent Signature Column spanning 2 sub-columns as requested */}
                <th colSpan={2} className="py-2.5 px-4 text-center border-r border-slate-800 bg-indigo-950/70">
                  <div className="flex items-center justify-center space-x-2">
                    <PenTool className="w-4 h-4 text-indigo-400" />
                    <span>Tanda Tangan</span>
                  </div>
                </th>
                {/* Final Column: Keterangan as requested */}
                <th rowSpan={2} className="py-3.5 px-4 min-w-[200px] text-center">
                  Keterangan
                </th>
              </tr>

              {/* Sub-header for the 2 Signature Sub-columns */}
              <tr className="bg-slate-800 text-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2 px-3 text-center border-r border-slate-700 w-44 bg-slate-800/90">
                  Absen Masuk
                </th>
                <th className="py-2 px-3 text-center border-r border-slate-700 w-44 bg-slate-800/90">
                  Absen Pulang
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Tidak ada data guru yang sesuai filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti kata kunci pencarian atau ubah filter ke "Semua Guru & GTK".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={row.teacherId}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        isEven ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* 1. Nomor Urut */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600 border-r border-slate-100">
                        {index + 1}
                      </td>

                      {/* 2. Nama Guru / GTK & NIP */}
                      <td className="py-3.5 px-4 border-r border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm leading-snug">
                              {row.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                row.employmentStatus === 'PNS'
                                  ? 'bg-purple-100 text-purple-800'
                                  : row.employmentStatus === 'PPPK' || row.employmentStatus === 'PPPK_PW'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.employmentStatus}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 font-mono">
                            <span>NIP: {row.nip || '-'}</span>
                            <span>•</span>
                            <span className="font-sans text-slate-600">{row.subjectOrRole}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Sub-kolom Tanda Tangan: ABSEN MASUK */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center align-middle">
                        {row.signatureIn ? (
                          <div className="flex flex-col items-center space-y-1 group relative">
                            <div className="w-36 h-16 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center p-1 relative overflow-hidden">
                              <img
                                src={row.signatureIn}
                                alt={`TTD Masuk ${row.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                              {/* Hover quick action overlay */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSignatureModal(row, 'masuk')}
                                  className="p-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  title="Ubah Tanda Tangan"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSignature(row.teacherId, 'masuk', e)}
                                  className="p-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Tanda Tangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{row.signatureInTime || 'Hadir'}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSignatureModal(row, 'masuk')}
                            className="w-full py-2.5 px-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group active:scale-98"
                            title="Klik untuk tanda tangan via touchpad laptop atau layar sentuh HP"
                          >
                            <PenTool className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold">TTD Masuk</span>
                          </button>
                        )}
                      </td>

                      {/* 4. Sub-kolom Tanda Tangan: ABSEN PULANG */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center align-middle">
                        {row.signatureOut ? (
                          <div className="flex flex-col items-center space-y-1 group relative">
                            <div className="w-36 h-16 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center p-1 relative overflow-hidden">
                              <img
                                src={row.signatureOut}
                                alt={`TTD Pulang ${row.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                              {/* Hover quick action overlay */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSignatureModal(row, 'pulang')}
                                  className="p-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                                  title="Ubah Tanda Tangan"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSignature(row.teacherId, 'pulang', e)}
                                  className="p-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Tanda Tangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-amber-700 font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{row.signatureOutTime || 'Pulang'}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSignatureModal(row, 'pulang')}
                            className="w-full py-2.5 px-2 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-100/60 text-amber-800 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group active:scale-98"
                            title="Klik untuk tanda tangan via touchpad laptop atau layar sentuh HP"
                          >
                            <PenTool className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold">TTD Pulang</span>
                          </button>
                        )}
                      </td>

                      {/* 5. Kolom Terakhir: KETERANGAN */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {/* Status Dropdown Selector */}
                          <div className="relative">
                            <select
                              value={row.status}
                              onChange={(e) =>
                                handleChangeStatus(row.teacherId, e.target.value as AsnAttendanceStatus)
                              }
                              className={`w-full py-1.5 px-2.5 text-xs font-bold rounded-xl border appearance-none focus:outline-hidden cursor-pointer shadow-2xs pr-7 ${getStatusBadge(
                                row.status
                              )}`}
                            >
                              <option value="hadir">Hadir</option>
                              <option value="izin">Izin</option>
                              <option value="sakit">Sakit</option>
                              <option value="cuti">Cuti</option>
                              <option value="dinas_luar">Dinas Luar</option>
                              <option value="tanpa_keterangan">Tanpa Keterangan (Alpa)</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Detail Note input */}
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => handleChangeNotes(row.teacherId, e.target.value)}
                            placeholder={
                              row.status === 'dinas_luar'
                                ? 'No. Surat Tugas / Lokasi...'
                                : row.status === 'cuti'
                                ? 'Jenis Cuti (Tahunan/Melahirkan)...'
                                : row.status === 'sakit'
                                ? 'Ket. Dokter / RS...'
                                : 'Catatan opsional...'
                            }
                            className="w-full text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-400 placeholder:text-slate-400 text-slate-700"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Summary & Validation notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Format Berita Acara Presensi GTK ASN resmi terintegrasi dengan Peraturan BKN & BKD.
            </span>
          </div>
          <span className="font-mono text-slate-500 font-semibold">
            Total {filteredRows.length} Guru • {stats.signedIn} TTD Masuk • {stats.signedOut} TTD Pulang
          </span>
        </div>
      </div>

      {/* Signature Pad Modal (for touchpads, mouse, stylus & all smartphones) */}
      <SignaturePadModal
        isOpen={activeModal.isOpen}
        onClose={() => setActiveModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSignature}
        initialSignature={activeModal.initialSignature}
        teacherName={activeModal.teacherName}
        nip={activeModal.nip}
        sessionType={activeModal.sessionType}
        dateStr={selectedDate}
      />

      {/* Official Print & PDF Export Modal with serialized Canvas Signatures */}
      {isPrintModalOpen && (
        <PrintModal
          onClose={() => setIsPrintModalOpen(false)}
          config={config}
          asnRows={filteredRows}
          records={records}
          todayDate={selectedDate}
          customTitle="DAFTAR HADIR & TANDA TANGAN GURU / GTK ASN"
          mode="asn_table"
        />
      )}

      {/* Printable Sheet View for Official Kedinasan / Arsip Sekolah (Hidden on screen, visible during window.print) */}
      <div id="asn-print-container" className="hidden print:block text-black bg-white p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #asn-print-container, #asn-print-container * {
              visibility: visible;
            }
            #asn-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20mm;
            }
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
          }
        `}} />

        {/* Kop Surat Sekolah */}
        <div className="border-b-4 border-double border-black pb-4 text-center space-y-1">
          <h3 className="text-sm font-bold tracking-widest uppercase">
            PEMERINTAH KABUPATEN PULAU TALIABU
          </h3>
          <h4 className="text-xs font-bold uppercase">
            DINAS PENDIDIKAN DAN KEBUDAYAAN
          </h4>
          <h2 className="text-base font-black uppercase">
            {config.schoolName || 'SMP NEGERI 4 SATU ATAP TALIABU BARAT'}
          </h2>
          <p className="text-[10px]">
            {config.address || 'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara'} • NPSN: {config.npsn || '69989028'}
          </p>
        </div>

        {/* Document Title */}
        <div className="py-4 text-center space-y-1">
          <h3 className="text-sm font-black underline uppercase">
            DAFTAR HADIR DAN TANDA TANGAN ELEKTRONIK GURU / GTK ASN
          </h3>
          <p className="text-xs">
            Hari / Tanggal: <strong>{formatDateIndo(selectedDate)}</strong> • Semester: {config.semester || 'Ganjil'} TP {config.academicYear || '2026/2027'}
          </p>
        </div>

        {/* Print Table */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black p-2 w-10">No</th>
              <th className="border border-black p-2 text-left">Nama Guru / GTK & NIP</th>
              <th className="border border-black p-2 w-16">Status</th>
              <th className="border border-black p-2 w-32">TTD Absen Masuk</th>
              <th className="border border-black p-2 w-32">TTD Absen Pulang</th>
              <th className="border border-black p-2 w-36">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.teacherId}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2">
                  <div className="font-bold">{row.name}</div>
                  <div className="text-[10px] font-mono">NIP: {row.nip}</div>
                  <div className="text-[10px] italic">{row.subjectOrRole}</div>
                </td>
                <td className="border border-black p-2 text-center font-bold">{row.employmentStatus}</td>
                <td className="border border-black p-2 text-center align-middle">
                  {row.signatureIn ? (
                    <div className="flex flex-col items-center">
                      <img src={row.signatureIn} alt="TTD Masuk" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] font-mono">{row.signatureInTime}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">-</span>
                  )}
                </td>
                <td className="border border-black p-2 text-center align-middle">
                  {row.signatureOut ? (
                    <div className="flex flex-col items-center">
                      <img src={row.signatureOut} alt="TTD Pulang" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] font-mono">{row.signatureOutTime}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">-</span>
                  )}
                </td>
                <td className="border border-black p-2">
                  <span className="font-bold">{getStatusLabel(row.status)}</span>
                  {row.notes && <div className="text-[10px] text-slate-600 mt-0.5">{row.notes}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan Pengesahan Kepala Sekolah & Piket */}
        <div className="mt-8 grid grid-cols-2 text-xs text-center">
          <div>
            <p>Petugas Piket / Notulis,</p>
            <div className="h-20" />
            <p className="font-bold underline">{config.adminName || 'Hendra Hasan, S.Pd.'}</p>
            <p className="font-mono text-[10px]">NIP. 198711032014021003</p>
          </div>

          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah,</p>
            <div className="h-16" />
            <p className="font-bold underline">{config.principalName || 'Drs. Ruslan La Ode, M.Pd.'}</p>
            <p className="font-mono text-[10px]">NIP. {config.principalNip || '197405121999031004'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
