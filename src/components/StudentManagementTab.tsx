import React, { useState, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Check,
  X,
  AlertCircle,
  Users,
  Download,
  Upload,
  Link as LinkIcon,
  ScanFace,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Student, SchoolClass, ActiveTab, SchoolConfig } from '../types';
import { formatDriveUrl, downloadCsv } from '../utils/soundAndDate';
import { StudentQrCodeModal } from './StudentQrCodeModal';

interface StudentManagementTabProps {
  students?: Student[];
  classes?: SchoolClass[];
  config?: SchoolConfig;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
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

const PRESET_STUDENT_AVATARS = [
  { label: 'Siswa Putra 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80' },
  { label: 'Siswa Putri 1 (Hijab)', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80' },
  { label: 'Siswa Putra 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
  { label: 'Siswa Putri 2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80' },
];

export const StudentManagementTab: React.FC<StudentManagementTabProps> = ({
  students = [],
  classes = [],
  config = DEFAULT_SCHOOL_CONFIG,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  setActiveTab,
}) => {
  const safeStudents = students || [];
  const safeClasses = classes || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'with_photo' | 'no_photo' | 'L' | 'P'>('ALL');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'nisn_asc' | 'class_asc'>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrStudent, setSelectedQrStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    nisn: '',
    nik: '',
    classId: safeClasses[0]?.id || 'c1',
    className: safeClasses[0]?.name || 'X MIPA 1',
    gender: 'L',
    parentPhone: '',
    email: '',
    address: '',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtering and Sorting
  const filteredAndSortedStudents = safeStudents
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery) ||
        (s.nik && s.nik.includes(searchQuery)) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        selectedClassId === 'ALL' || s.classId === selectedClassId;

      let matchesStatus = true;
      if (statusFilter === 'with_photo') {
        matchesStatus = Boolean(s.avatar && s.avatar.length > 5);
      } else if (statusFilter === 'no_photo') {
        matchesStatus = !s.avatar || s.avatar.length <= 5;
      } else if (statusFilter === 'L' || statusFilter === 'P') {
        matchesStatus = s.gender === statusFilter;
      }

      return matchesSearch && matchesClass && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'nisn_asc') return a.nisn.localeCompare(b.nisn);
      if (sortBy === 'class_asc') return a.className.localeCompare(b.className);
      return 0;
    });

  const filteredStudents = filteredAndSortedStudents;

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      nisn: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      nik: `3174${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      classId: safeClasses[0]?.id || 'c1',
      className: safeClasses[0]?.name || 'X MIPA 1',
      gender: 'L',
      parentPhone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      email: '',
      address: 'Jl. Merdeka No. ' + Math.floor(1 + Math.random() * 100) + ', Jakarta',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(png|jpeg|jpg|webp)/i)) {
      alert('Mohon pilih file gambar format PNG, JPG, atau WEBP.');
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

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nisn) {
      alert('Nama dan NISN wajib diisi!');
      return;
    }

    const formattedAvatar = formatDriveUrl(formData.avatar) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80';

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...formData,
        avatar: formattedAvatar,
      } as Student);
    } else {
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        name: formData.name || '',
        nisn: formData.nisn || '',
        nik: formData.nik || '',
        classId: formData.classId || 'c1',
        className: formData.className || 'X MIPA 1',
        gender: (formData.gender as 'L' | 'P') || 'L',
        parentPhone: formData.parentPhone || '',
        email: formData.email || `${formData.name?.toLowerCase().replace(/\s+/g, '.')}@siswa.sch.id`,
        address: formData.address || '',
        avatar: formattedAvatar,
      };
      onAddStudent(newStudent);
    }

    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = ['No', 'Nama Lengkap', 'NISN', 'NIK', 'Kelas / Rombel', 'JK', 'No HP Orang Tua', 'Email Siswa', 'Alamat', 'URL Foto Biometrik'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `'${s.nisn}`,
      `'${s.nik || '-'}`,
      `"${s.className}"`,
      s.gender,
      `'${s.parentPhone || '-'}`,
      s.email || '-',
      `"${(s.address || '-').replace(/"/g, '""')}"`,
      `"${s.avatar}"`,
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsv(`Master_Siswa_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Master Data Peserta Didik (Siswa)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola data profil siswa, NISN, rombel kelas, serta integrasi foto biometrik (PNG, JPG, Drive URL)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedQrStudent(safeStudents[0] || null);
              setIsQrModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Generator QR Siswa</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Cetak Kartu Pelajar</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Real-Time Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, NIK, kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* Dropdown Filters & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filter by Class Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-400">Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Rombel ({students.length})</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({students.filter((s) => s.classId === cls.id).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status/Gender Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="with_photo">Foto Biometrik Ada</option>
                <option value="no_photo">Foto Belum Ada</option>
                <option value="L">Laki-Laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-400">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="nisn_asc">NISN Terurut</option>
                <option value="class_asc">Rombel Kelas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Summary Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
          >
            {/* Top Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={formatDriveUrl(student.avatar) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80'}
                      alt={student.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80';
                      }}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    <span
                      title="Biometrik Wajah Tersinkronisasi"
                      className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full text-[8px]"
                    >
                      <ScanFace className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {student.className}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 leading-tight">
                      {student.name}
                    </h3>
                  </div>
                </div>

                {/* Edit, QR & Delete Action Buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedQrStudent(student);
                      setIsQrModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Tampilkan QR Presensi Siswa"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(student)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Edit Data Siswa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(student.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Hapus Siswa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Fields */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NISN:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.nisn}</span>
                </div>
                {student.nik && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">NIK:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{student.nik}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Jenis Kelamin:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                  </span>
                </div>
                {student.parentPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">WhatsApp Ortu:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{student.parentPhone}</span>
                  </div>
                )}
              </div>

              {/* Quick QR & Actions Row */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedQrStudent(student);
                    setIsQrModalOpen(true);
                  }}
                  className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Lihat QR Presensi</span>
                </button>
              </div>
            </div>

            {/* Delete Alert Modal */}
            {deleteConfirmId === student.id && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Hapus data siswa {student.name}?
                </p>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      onDeleteStudent(student.id);
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

      {filteredStudents.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada data siswa yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">
            Coba gunakan kata kunci pencarian lain atau pilih kelas yang berbeda.
          </p>
        </div>
      )}

      {/* Modal Add / Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              {/* Photo Upload & Preview */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Foto Profil Siswa (PNG / JPG / Link Google Drive)
                </label>

                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src={formatDriveUrl(formData.avatar) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80'}
                      alt="Preview Foto Siswa"
                      referrerPolicy="no-referrer"
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80';
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white">
                      Face Scan
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
                        <span>Atau tempel Link Google Drive:</span>
                      </div>
                      <input
                        type="text"
                        placeholder="https://drive.google.com/file/d/.../view"
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
                    Preset Foto Profil Siswa:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_STUDENT_AVATARS.map((preset, idx) => (
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Rizky Pratama"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {/* NISN */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">NISN (10 Digit) *</label>
                  <input
                    type="text"
                    required
                    placeholder="0078129001"
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* NIK */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">NIK (16 Digit)</label>
                  <input
                    type="text"
                    placeholder="317401..."
                    value={formData.nik || ''}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Kelas / Rombel */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Rombongan Belajar (Kelas) *</label>
                  <select
                    value={formData.classId || 'c1'}
                    onChange={(e) => {
                      const selected = classes.find((c) => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        classId: e.target.value,
                        className: selected ? selected.name : 'X MIPA 1',
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.major}
                      </option>
                    ))}
                  </select>
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

                {/* No HP Orang Tua */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">No. WhatsApp / HP Orang Tua</label>
                  <input
                    type="text"
                    placeholder="081288991001"
                    value={formData.parentPhone || ''}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Email Siswa */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Email Akun Belajar Siswa</label>
                  <input
                    type="email"
                    placeholder="nama@siswa.belajar.id"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Alamat */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Alamat Tempat Tinggal</label>
                  <input
                    type="text"
                    placeholder="Jl. Melawai Raya No. 45, Kebayoran Baru, Jakarta Selatan"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student QR Code Generator & Viewer Modal */}
      <StudentQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        selectedStudent={selectedQrStudent}
        students={safeStudents}
        config={config}
        onSelectStudent={(s) => setSelectedQrStudent(s)}
      />
    </div>
  );
};
