import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  CreditCard,
  Building,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Download,
  ScanFace,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List,
  QrCode,
  Award,
  FileText,
} from 'lucide-react';
import { Teacher, EmploymentStatus, ActiveTab, AttendanceRecord, SchoolConfig } from '../types';
import { formatDriveUrl, downloadCsv } from '../utils/soundAndDate';
import { TeacherQrCodeModal } from './TeacherQrCodeModal';
import { TeacherPerformanceReportModal } from './TeacherPerformanceReportModal';

interface TeacherManagementTabProps {
  teachers?: Teacher[];
  records?: AttendanceRecord[];
  config?: SchoolConfig;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'SMP NEGERI 4 SATU ATAP TALIABU BARAT',
  npsn: '69989028',
  address: 'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara',
  principalName: 'La Ode Aliudin, S.Pd',
  principalNip: '197805122005011008',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  checkInStart: '06:30',
  checkInDeadline: '07:30',
  checkOutStart: '14:00',
  schoolLat: -1.9542,
  schoolLng: 124.3821,
  maxRadiusMeters: 250,
  logoUrl: '',
};

const PRESET_AVATARS = [
  { label: 'ASN Pria 1', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
  { label: 'ASN Wanita 1 (Hijab)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' },
  { label: 'ASN Pria 2', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80' },
  { label: 'ASN Wanita 2', url: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=300&q=80' },
  { label: 'P3K / Honorer Pria', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80' },
  { label: 'P3K / Honorer Wanita', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' },
];

export const TeacherManagementTab: React.FC<TeacherManagementTabProps> = ({
  teachers = [],
  records = [],
  config = DEFAULT_SCHOOL_CONFIG,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  setActiveTab,
}) => {
  const safeTeachers = teachers || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'nip' | 'employmentStatus' | 'subject' | 'role' | 'phone'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrTeacher, setSelectedQrTeacher] = useState<Teacher | null>(null);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    nip: '',
    nuptk: '',
    employmentStatus: 'PNS',
    subject: '',
    role: '',
    gender: 'L',
    phone: '',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    department: 'MIPA',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Instant Sort Handler
  const handleSort = (field: 'name' | 'nip' | 'employmentStatus' | 'subject' | 'role' | 'phone') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reactive Memoized Filter & Sort
  const filteredTeachers = useMemo(() => {
    return safeTeachers
      .filter((t) => {
        const matchesSearch =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.nip.includes(searchQuery) ||
          (t.nuptk && t.nuptk.includes(searchQuery)) ||
          t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.role.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'PPPK_ALL') {
            matchesStatus = t.employmentStatus === 'PPPK' || t.employmentStatus === 'PPPK_PW';
          } else {
            matchesStatus = t.employmentStatus === selectedStatus;
          }
        }

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') {
          cmp = a.name.localeCompare(b.name, 'id');
        } else if (sortField === 'nip') {
          cmp = a.nip.localeCompare(b.nip);
        } else if (sortField === 'employmentStatus') {
          cmp = a.employmentStatus.localeCompare(b.employmentStatus);
        } else if (sortField === 'subject') {
          cmp = a.subject.localeCompare(b.subject, 'id');
        } else if (sortField === 'role') {
          cmp = a.role.localeCompare(b.role, 'id');
        } else if (sortField === 'phone') {
          cmp = a.phone.localeCompare(b.phone);
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [safeTeachers, searchQuery, selectedStatus, sortField, sortDirection]);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      nip: `198${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
      nuptk: `${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`,
      employmentStatus: 'PNS',
      subject: '',
      role: 'Guru Mata Pelajaran',
      gender: 'L',
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      email: '',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      department: 'Kurikulum & Pengajaran',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ ...teacher });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(png|jpeg|jpg|webp)/i)) {
      alert('Mohon pilih file gambar dengan format PNG, JPG, atau WEBP.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran file maksimal 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          avatar: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDriveUrlChange = (url: string) => {
    const formatted = formatDriveUrl(url);
    setFormData((prev) => ({
      ...prev,
      avatar: formatted,
    }));
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nip) {
      alert('Nama dan NIP wajib diisi!');
      return;
    }

    const formattedAvatar = formatDriveUrl(formData.avatar) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80';

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        ...formData,
        avatar: formattedAvatar,
      } as Teacher);
    } else {
      const newTeacher: Teacher = {
        id: `tch_${Date.now()}`,
        name: formData.name || '',
        nip: formData.nip || '',
        nuptk: formData.nuptk || '',
        employmentStatus: (formData.employmentStatus as EmploymentStatus) || 'PNS',
        subject: formData.subject || 'Guru Mata Pelajaran',
        role: formData.role || 'Guru',
        gender: (formData.gender as 'L' | 'P') || 'L',
        phone: formData.phone || '',
        email: formData.email || `${formData.name?.toLowerCase().replace(/\s+/g, '.')}@sekolah.sch.id`,
        avatar: formattedAvatar,
        department: formData.department || 'Tenaga Pendidik',
      };
      onAddTeacher(newTeacher);
    }

    setIsModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Nama Lengkap',
      'NIP',
      'NUPTK',
      'Status Kepegawaian (PNS/PPPK/PPPK_PW/HONORER)',
      'Mata Pelajaran',
      'Tugas / Jabatan',
      'Jenis Kelamin (L/P)',
      'No HP/WhatsApp',
      'Email',
      'Departemen / Unit',
    ];
    const sampleRows = [
      ['Drs. Muhammad Aris, M.Pd', '197508142000031002', '1234567890123456', 'PNS', 'Matematika', 'Wakasek Kurikulum', 'L', '081234567890', 'aris@sekolah.sch.id', 'Kurikulum & Pengajaran'],
      ['Nurul Hidayah, S.Pd', '198810202022212005', '9876543210987654', 'PPPK', 'Bahasa Indonesia', 'Guru Mata Pelajaran', 'P', '081234567891', 'nurul@sekolah.sch.id', 'Bahasa & Sastra'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template GTK');
    XLSX.writeFile(workbook, 'Template_Import_Guru_GTK.xlsx');
  };

  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) {
          alert('File tidak berisi data yang cukup!');
          return;
        }

        let addedCount = 0;
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0] || !row[1]) continue;

          const name = String(row[0]).trim();
          const nip = String(row[1]).trim();
          const nuptk = row[2] ? String(row[2]).trim() : '';
          const rawStatus = row[3] ? String(row[3]).trim().toUpperCase() : 'PNS';
          let employmentStatus: EmploymentStatus = 'PNS';
          if (rawStatus.includes('PPPK_PW') || rawStatus.includes('PW')) employmentStatus = 'PPPK_PW';
          else if (rawStatus.includes('PPPK')) employmentStatus = 'PPPK';
          else if (rawStatus.includes('HONOR')) employmentStatus = 'HONORER';

          const subject = row[4] ? String(row[4]).trim() : 'Guru Mata Pelajaran';
          const role = row[5] ? String(row[5]).trim() : 'Guru';
          const gender = row[6] && String(row[6]).toUpperCase().includes('P') ? 'P' : 'L';
          const phone = row[7] ? String(row[7]).trim() : '';
          const email = row[8] ? String(row[8]).trim() : `${name.toLowerCase().replace(/\s+/g, '.')}@sekolah.sch.id`;
          const department = row[9] ? String(row[9]).trim() : 'Kurikulum & Pengajaran';

          const newTeacher: Teacher = {
            id: `tch_${Date.now()}_${i}`,
            name,
            nip,
            nuptk,
            employmentStatus,
            subject,
            role,
            gender,
            phone,
            email,
            department,
            avatar: gender === 'P'
              ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
              : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
          };

          onAddTeacher(newTeacher);
          addedCount++;
        }

        alert(`Berhasil mengimpor ${addedCount} data guru/GTK dari file Excel!`);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Gagal membaca file Excel/CSV. Pastikan format file sesuai template!');
      } finally {
        if (excelImportRef.current) {
          excelImportRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportCsv = () => {
    const headers = ['No', 'Nama Lengkap', 'NIP', 'NUPTK', 'Status Kepegawaian', 'Mata Pelajaran', 'Tugas / Role', 'JK', 'No HP', 'Email', 'URL Foto Drive/PNG'];
    const rows = filteredTeachers.map((t, idx) => [
      idx + 1,
      `"${t.name.replace(/"/g, '""')}"`,
      `'${t.nip}`,
      `'${t.nuptk || '-'}`,
      `"${t.employmentStatus}"`,
      `"${t.subject.replace(/"/g, '""')}"`,
      `"${t.role.replace(/"/g, '""')}"`,
      t.gender,
      `'${t.phone}`,
      t.email,
      `"${t.avatar}"`,
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsv(`Master_Guru_GTK_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const getStatusBadge = (status: EmploymentStatus) => {
    switch (status) {
      case 'PNS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">PNS</span>;
      case 'PPPK':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">PPPK</span>;
      case 'PPPK_PW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">PPPK PW</span>;
      case 'HONORER':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">Honorer</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">GTT / PTT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Master Data Guru & GTK
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola profil ASN (PNS, PPPK, PPPK PW, Honorer/PTT) dan sinkronisasi biometrik foto wajah
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={excelImportRef}
            onChange={handleImportExcelFile}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            onClick={() => setIsPerformanceModalOpen(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm shadow-amber-500/20"
          >
            <Award className="w-4 h-4" />
            <span>Teacher Performance Report</span>
          </button>

          <button
            onClick={() => {
              setSelectedQrTeacher(safeTeachers[0] || null);
              setIsQrModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Generator QR Guru</span>
          </button>

          <button
            onClick={() => excelImportRef.current?.click()}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Unggah file Excel/CSV untuk batch import data GTK"
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import Excel/CSV</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Unduh template Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Template</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru / GTK</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIP, NUPTK, mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua GTK' },
              { id: 'PNS', label: 'PNS' },
              { id: 'PPPK', label: 'PPPK' },
              { id: 'PPPK_PW', label: 'PPPK PW' },
              { id: 'HONORER', label: 'Honorer/PTT' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedStatus(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStatus === item.id
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Tampilan Tabel Interaktif"
            >
              <List className="w-4 h-4" />
              <span className="text-[11px]">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px]">Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sorting status info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center space-x-2">
          <span>
            Menampilkan <strong>{filteredTeachers.length}</strong> dari <strong>{teachers.length}</strong> guru & GTK
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center space-x-1">
            <span>Diurutkan berdasarkan: <strong>{sortField} ({sortDirection === 'asc' ? 'A-Z / Naik' : 'Z-A / Turun'})</strong></span>
          </span>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Reset Pencarian
          </button>
        )}
      </div>

      {/* Interactive Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold select-none">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Nama Lengkap Guru / GTK</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('nip')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>NIP / NUPTK</span>
                      {sortField === 'nip' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('employmentStatus')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Status Kepegawaian (ASN)</span>
                      {sortField === 'employmentStatus' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('subject')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Mata Pelajaran</span>
                      {sortField === 'subject' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('role')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Tugas / Jabatan</span>
                      {sortField === 'role' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('phone')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>No. WhatsApp</span>
                      {sortField === 'phone' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Foto Biometrik</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredTeachers.map((teacher, idx) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={formatDriveUrl(teacher.avatar) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'}
                          alt={teacher.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80';
                          }}
                          className="w-9 h-9 rounded-xl object-cover border border-indigo-200 dark:border-indigo-900 shadow-xs shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{teacher.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{teacher.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{teacher.nip}</div>
                      {teacher.nuptk && <div className="font-mono text-[10px] text-slate-400">NUPTK: {teacher.nuptk}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(teacher.employmentStatus)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {teacher.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                      {teacher.role}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {teacher.phone}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {teacher.avatar && teacher.avatar.length > 5 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                          <ScanFace className="w-3 h-3" />
                          <span>Tersinkron</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-md text-[10px] font-bold">
                          <span>Belum Ada</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setSelectedQrTeacher(teacher);
                            setIsQrModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Lihat / Cetak QR Code GTK"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(teacher)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Guru"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(teacher.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Teachers Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={formatDriveUrl(teacher.avatar) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'}
                      alt={teacher.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80';
                      }}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900 shadow-xs"
                    />
                    <span
                      title="Biometrik Wajah Tersinkronisasi"
                      className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full text-[9px] shadow-xs"
                    >
                      <ScanFace className="w-3 h-3" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                      {teacher.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      NIP: {teacher.nip}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedQrTeacher(teacher);
                      setIsQrModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Lihat / Cetak QR Code GTK"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(teacher)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Edit Profil"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(teacher.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Guru"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status and Details */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status Kepegawaian:</span>
                  {getStatusBadge(teacher.employmentStatus)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mata Pelajaran:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[170px]">
                    {teacher.subject}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tugas / Role:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[170px]">
                    {teacher.role}
                  </span>
                </div>

                {teacher.nuptk && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">NUPTK:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{teacher.nuptk}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Confirmation Alert if active */}
            {deleteConfirmId === teacher.id && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Hapus data {teacher.name} dari sistem?
                </p>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      onDeleteTeacher(teacher.id);
                      setDeleteConfirmId(null);
                    }}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {filteredTeachers.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada data guru yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">
            Coba gunakan kata kunci pencarian lain atau ubah filter status kepegawaian.
          </p>
        </div>
      )}

      {/* Modal Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{editingTeacher ? 'Edit Profil Guru / GTK' : 'Tambah Guru / GTK Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              {/* Photo Upload & Preview section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Foto Profil Wajah Biometrik (PNG / JPG / Link Google Drive)
                </label>
                
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src={formatDriveUrl(formData.avatar) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'}
                      alt="Preview Foto Guru"
                      referrerPolicy="no-referrer"
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80';
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white">
                      HD Face
                    </span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File (.PNG / .JPG)</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[11px]">
                        <LinkIcon className="w-3 h-3 text-indigo-500" />
                        <span>Atau tempel Link Foto Google Drive:</span>
                      </div>
                      <input
                        type="text"
                        placeholder="https://drive.google.com/file/d/.../view atau direct URL"
                        value={formData.avatar || ''}
                        onChange={(e) => handleDriveUrlChange(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mb-1.5">
                    Pilihan Preset Foto ASN / Guru Resmi:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, avatar: preset.url }))}
                        className={`flex items-center space-x-1.5 p-1 rounded-xl border transition-all ${
                          formData.avatar === preset.url
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-lg object-cover"
                        />
                        <span className="text-[10px] font-medium whitespace-nowrap pr-1">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {/* Status Kepegawaian */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Kepegawaian *</label>
                  <select
                    value={formData.employmentStatus || 'PNS'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employmentStatus: e.target.value as EmploymentStatus,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (P3K Penuh Waktu)</option>
                    <option value="PPPK_PW">PPPK PW (P3K Paruh Waktu)</option>
                    <option value="HONORER">Honorer / Tenaga Kontrak</option>
                    <option value="GTT_PTT">GTT / PTT Sekolah</option>
                  </select>
                </div>

                {/* NIP */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">NIP (Nomor Induk Pegawai) *</label>
                  <input
                    type="text"
                    required
                    placeholder="18 Digit NIP"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* NUPTK */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">NUPTK (Opsional)</label>
                  <input
                    type="text"
                    placeholder="16 Digit NUPTK"
                    value={formData.nuptk || ''}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin *</label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                {/* Jabatan / Mata Pelajaran */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mata Pelajaran / Bidang Tugas *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Matematika Peminatan"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Role / Tugas Tambahan */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tugas Tambahan / Role *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Wali Kelas X MIPA 1, Guru Piket"
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* No WhatsApp */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="Contoh: 081288991122"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Email Resmi / Akun Belajar</label>
                  <input
                    type="email"
                    placeholder="nama@sekolah.sch.id"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  {editingTeacher ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher QR Code Generator Modal */}
      <TeacherQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        selectedTeacher={selectedQrTeacher}
        teachers={safeTeachers}
        config={config}
        onSelectTeacher={(t) => setSelectedQrTeacher(t)}
      />

      {/* Teacher Performance & Attendance Reliability Report Modal */}
      <TeacherPerformanceReportModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        teachers={safeTeachers}
        records={records}
        config={config}
      />
    </div>
  );
};
