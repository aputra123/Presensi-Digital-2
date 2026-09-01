import React, { useState } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  UserCheck,
  Building2,
  Calendar,
  MapPin,
  Printer,
  Sparkles,
  ShieldCheck,
  Send,
  Download,
  AlertCircle,
  ChevronRight,
  FileCheck,
  School,
} from 'lucide-react';
import {
  GtkServiceRequest,
  GtkServiceCategory,
  Teacher,
  SchoolConfig,
  UserRole,
} from '../types';
import { formatDateIndo, playBeepSound } from '../utils/soundAndDate';

interface GtkServicesTabProps {
  services: GtkServiceRequest[];
  teachers: Teacher[];
  config: SchoolConfig;
  userRole: UserRole;
  onAddService: (service: GtkServiceRequest) => void;
  onApproveKepsek: (serviceId: string, note?: string) => void;
  onApproveAdmin: (serviceId: string, letterNumber?: string, note?: string) => void;
  onRejectService: (serviceId: string, reason: string) => void;
}

const CATEGORY_LABELS: Record<GtkServiceCategory, { label: string; color: string }> = {
  izin_cuti: { label: 'Cuti & Izin Sakit', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  surat_tugas: { label: 'Surat Tugas Dinas Luar', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  rekomendasi_akademik: { label: 'Rekomendasi PPG & Studi', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  tukar_jadwal: { label: 'Tukar Jadwal Mengajar / Piket', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  keterangan_aktif: { label: 'Surat Keterangan Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const GtkServicesTab: React.FC<GtkServicesTabProps> = ({
  services = [],
  teachers = [],
  config,
  userRole,
  onAddService,
  onApproveKepsek,
  onApproveAdmin,
  onRejectService,
}) => {
  const safeServices = services || [];
  const safeTeachers = teachers || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<GtkServiceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State for new GTK Request
  const [teacherId, setTeacherId] = useState('');
  const [category, setCategory] = useState<GtkServiceCategory>('surat_tugas');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [destination, setDestination] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Approval review note
  const [reviewNote, setReviewNote] = useState('');
  const [letterNumberInput, setLetterNumberInput] = useState('');

  const filteredServices = safeServices.filter((s) => {
    const matchQuery =
      s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.officialLetterNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchQuery && matchCategory && matchStatus;
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !title || !purpose) {
      alert('Mohon lengkapi guru pemohon, perihal, dan maksud layanan.');
      return;
    }

    const selectedTeacher = safeTeachers.find((t) => t.id === teacherId);
    if (!selectedTeacher) return;

    const newReq: GtkServiceRequest = {
      id: `gtk_srv_${Date.now()}`,
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      nip: selectedTeacher.nip,
      employmentStatus: selectedTeacher.employmentStatus,
      category,
      title,
      purpose,
      startDate,
      endDate,
      destinationOrLocation: destination,
      attachmentName: attachmentName || 'dokumen_pendukung_gtk.pdf',
      status: 'pending',
      kepsekApproval: {
        approvedBy: config.principalName || 'Dr. H. Mulyadi, M.Pd.',
        role: 'kepala_sekolah',
        status: 'pending',
      },
      adminApproval: {
        approvedBy: config.adminName || 'Siti Aminah, S.Kom. (SIMPEG)',
        role: 'admin',
        status: 'pending',
      },
      createdAt: `${formatDateIndo(new Date().toISOString().split('T')[0])} 08:00 WIB`,
    };

    onAddService(newReq);
    playBeepSound();
    setIsModalOpen(false);
    // Reset
    setTitle('');
    setPurpose('');
    setDestination('');
  };

  const getStatusBadge = (s: GtkServiceRequest) => {
    if (s.status === 'approved') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Disetujui Kepsek & Admin (Resmi)</span>
        </span>
      );
    }
    if (s.status === 'approved_by_kepsek') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600" />
          <span>Disetujui Kepsek (Menunggu Admin)</span>
        </span>
      );
    }
    if (s.status === 'approved_by_admin') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Clock className="w-3 h-3 text-indigo-600" />
          <span>Disetujui Admin (Menunggu Kepsek)</span>
        </span>
      );
    }
    if (s.status === 'rejected') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak / Dikembalikan</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Menunggu Persetujuan Ganda</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900">
                Layanan & Perizinan Resmi Guru/GTK
              </h2>
              <p className="text-xs text-slate-500">
                Alur verifikasi & persetujuan ganda oleh <strong className="text-slate-700">Kepala Sekolah ({config.principalName || 'Kepsek'})</strong> dan <strong className="text-slate-700">Administrator SIMPEG</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Layanan / Izin GTK</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500">Total Pengajuan</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{safeServices.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700">Menunggu Verifikasi</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            {safeServices.filter((s) => s.status !== 'approved' && s.status !== 'rejected').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700">Disetujui Lengkap (Resmi)</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {safeServices.filter((s) => s.status === 'approved').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-xs bg-indigo-50/20">
          <span className="text-[11px] font-bold text-indigo-700">Surat Tugas Diterbitkan</span>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1">
            {safeServices.filter((s) => s.officialLetterNumber).length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama guru, NIP, atau no surat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold text-slate-700"
          >
            <option value="all">Semua Kategori Layanan</option>
            <option value="surat_tugas">Surat Tugas Dinas Luar</option>
            <option value="izin_cuti">Cuti & Izin Sakit</option>
            <option value="rekomendasi_akademik">Rekomendasi PPG / Beasiswa</option>
            <option value="tukar_jadwal">Tukar Jam / Piket</option>
            <option value="keterangan_aktif">Surat Keterangan Aktif</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved_by_kepsek">Disetujui Kepsek Saja</option>
            <option value="approved">Disetujui Penuh (Resmi)</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Services List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Kategori & Tanggal</th>
                <th className="px-5 py-3.5">Guru / GTK Pemohon</th>
                <th className="px-5 py-3.5">Perihal & Tujuan</th>
                <th className="px-5 py-3.5 text-center">Persetujuan Kepsek</th>
                <th className="px-5 py-3.5 text-center">Persetujuan Admin</th>
                <th className="px-5 py-3.5 text-center">Status Akhir</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Tidak ada pengajuan layanan GTK yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredServices.map((req) => {
                  const cat = CATEGORY_LABELS[req.category] || CATEGORY_LABELS.surat_tugas;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${cat.color}`}>
                          {cat.label}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {formatDateIndo(req.startDate)} {req.startDate !== req.endDate ? `s.d ${formatDateIndo(req.endDate)}` : ''}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="font-extrabold text-slate-900">{req.teacherName}</p>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">NIP {req.nip}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-700 font-bold rounded">
                            {req.employmentStatus}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top max-w-xs">
                        <p className="font-bold text-slate-800 leading-snug">{req.title}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{req.purpose}</p>
                        {req.officialLetterNumber && (
                          <span className="inline-block mt-1 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            No: {req.officialLetterNumber}
                          </span>
                        )}
                      </td>

                      {/* Kepsek Status */}
                      <td className="px-5 py-4 align-top text-center">
                        {req.kepsekApproval?.status === 'approved' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 mt-1">Disetujui</span>
                          </div>
                        ) : req.kepsekApproval?.status === 'rejected' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-rose-100 text-rose-700">
                              <XCircle className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-rose-700 mt-1">Ditolak</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-amber-100 text-amber-700">
                              <Clock className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-amber-700 mt-1">Menunggu</span>
                          </div>
                        )}
                      </td>

                      {/* Admin Status */}
                      <td className="px-5 py-4 align-top text-center">
                        {req.adminApproval?.status === 'approved' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 mt-1">Disetujui</span>
                          </div>
                        ) : req.adminApproval?.status === 'rejected' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-rose-100 text-rose-700">
                              <XCircle className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-rose-700 mt-1">Ditolak</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="p-1 rounded-full bg-amber-100 text-amber-700">
                              <Clock className="w-4 h-4" />
                            </span>
                            <span className="text-[9px] font-bold text-amber-700 mt-1">Menunggu</span>
                          </div>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="px-5 py-4 align-top text-center">
                        {getStatusBadge(req)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-right space-x-1">
                        <button
                          onClick={() => setSelectedService(req)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-bold text-[11px] transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Tinjau</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL / APPROVAL MODAL */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                  Detail Layanan & Verifikasi GTK
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {selectedService.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Nama Guru / GTK:</span>
                <span className="font-extrabold text-slate-900">{selectedService.teacherName}</span>
                <p className="text-[10px] font-mono text-slate-500">NIP: {selectedService.nip}</p>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Kategori Layanan:</span>
                <span className="font-bold text-indigo-700">
                  {CATEGORY_LABELS[selectedService.category]?.label}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Periode Pelaksanaan:</span>
                <span className="font-bold text-slate-800">
                  {formatDateIndo(selectedService.startDate)} s.d {formatDateIndo(selectedService.endDate)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Lokasi / Instansi Tujuan:</span>
                <span className="font-bold text-slate-800">
                  {selectedService.destinationOrLocation || 'SMAN 1 Nusantara'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 font-bold block text-[10px]">Maksud / Uraian Tugas:</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{selectedService.purpose}</p>
              </div>

              {selectedService.officialLetterNumber && (
                <div className="col-span-2 bg-indigo-100/50 p-2.5 rounded-xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-800 block">Nomor Surat Resmi Sekolah:</span>
                  <span className="font-mono font-extrabold text-indigo-950 text-xs">
                    {selectedService.officialLetterNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Persetujuan Ganda Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box Persetujuan Kepala Sekolah */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-900">Kepala Sekolah</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedService.kepsekApproval?.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedService.kepsekApproval?.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  {selectedService.kepsekApproval?.approvedBy || config.principalName}
                </p>
                {selectedService.kepsekApproval?.note && (
                  <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg">
                    "{selectedService.kepsekApproval.note}"
                  </p>
                )}
                {selectedService.kepsekApproval?.signatureStamp && (
                  <div className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    ✓ {selectedService.kepsekApproval.signatureStamp}
                  </div>
                )}
              </div>

              {/* Box Persetujuan Admin SIMPEG */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-extrabold text-slate-900">Admin SIMPEG / TU</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedService.adminApproval?.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedService.adminApproval?.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  {selectedService.adminApproval?.approvedBy || config.adminName}
                </p>
                {selectedService.adminApproval?.note && (
                  <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg">
                    "{selectedService.adminApproval.note}"
                  </p>
                )}
                {selectedService.adminApproval?.signatureStamp && (
                  <div className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                    ✓ {selectedService.adminApproval.signatureStamp}
                  </div>
                )}
              </div>
            </div>

            {/* Approval Action Form (for Admin or Piket) */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Panel Verifikasi & Persetujuan Pejabat</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Catatan / Disposisi Pejabat..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Nomor Surat (cth: 800/099/SMAN1/2026)"
                  value={letterNumberInput}
                  onChange={(e) => setLetterNumberInput(e.target.value)}
                  className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {userRole === 'bkd' && (
                  <button
                    onClick={() => {
                      onApproveAdmin(
                        selectedService.id,
                        letterNumberInput || `BKD-AUDIT/800/${Math.floor(100 + Math.random() * 900)}/${new Date().getFullYear()}`,
                        reviewNote || 'Diverifikasi & Disahkan oleh Auditor BKD Kab. Pulau Taliabu untuk TPP.'
                      );
                      setSelectedService(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Verifikasi & Sahkan sbg Auditor BKD</span>
                  </button>
                )}

                {selectedService.kepsekApproval?.status !== 'approved' && userRole !== 'bkd' && (
                  <button
                    onClick={() => {
                      onApproveKepsek(
                        selectedService.id,
                        reviewNote || 'Disetujui Kepala Sekolah untuk kelancaran tugas dinas/pengembangan profesi.'
                      );
                      setSelectedService(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Setujui sbg Kepala Sekolah</span>
                  </button>
                )}

                {selectedService.adminApproval?.status !== 'approved' && userRole !== 'bkd' && (
                  <button
                    onClick={() => {
                      onApproveAdmin(
                        selectedService.id,
                        letterNumberInput || `800/${Math.floor(100 + Math.random() * 900)}/SMAN1-DISDIK/${new Date().getFullYear()}`,
                        reviewNote || 'Diverifikasi oleh SIMPEG dan dicatat ke data presensi resmi.'
                      );
                      setSelectedService(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Setujui sbg Admin SIMPEG</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const reason = prompt('Masukkan alasan penolakan / pengembalian berkas:');
                    if (reason) {
                      onRejectService(selectedService.id, reason);
                      setSelectedService(null);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer"
                >
                  Tolak / Kembalikan
                </button>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsPrintModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Dokumen Resmi (Surat Tugas)</span>
              </button>

              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT OFFICIAL SURAT TUGAS / IZIN GTK MODAL */}
      {isPrintModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 space-y-6 text-slate-900 border border-slate-200 shadow-2xl">
            {/* Header Kop Surat Resmi dengan Logo Sekolah */}
            <div className="flex items-center space-x-4 border-b-2 border-slate-900 pb-4">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Logo Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <School className="w-14 h-14 text-indigo-700" />
              )}
              <div className="text-center flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  PEMERINTAH PROVINSI DAERAH KHUSUS JAKARTA • DINAS PENDIDIKAN
                </p>
                <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  {config.schoolName}
                </h2>
                <p className="text-[11px] text-slate-600">{config.address}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NPSN: {config.npsn} • Website: https://sman1nusantara.sch.id
                </p>
              </div>
            </div>

            {/* Judul Surat Resmi */}
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-sm uppercase underline decoration-2">
                {selectedService.category === 'surat_tugas'
                  ? 'SURAT PERINTAH TUGAS (SPT)'
                  : selectedService.category === 'izin_cuti'
                  ? 'SURAT IZIN / CUTI GTK'
                  : 'SURAT KETERANGAN / REKOMENDASI'}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-700">
                Nomor: {selectedService.officialLetterNumber || '800/042/SMAN1-DISDIK/VIII/2026'}
              </p>
            </div>

            {/* Isi Surat */}
            <div className="text-xs leading-relaxed space-y-3">
              <p>
                Kepala {config.schoolName} dengan ini memberikan tugas / izin resmi kepada:
              </p>
              <table className="w-full text-xs font-medium ml-4">
                <tbody>
                  <tr>
                    <td className="w-36 py-1 font-bold">Nama</td>
                    <td>: {selectedService.teacherName}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">NIP</td>
                    <td className="font-mono">: {selectedService.nip}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">Status Kepegawaian</td>
                    <td>: {selectedService.employmentStatus}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">Untuk Keperluan</td>
                    <td>: {selectedService.purpose}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">Waktu Pelaksanaan</td>
                    <td>: {formatDateIndo(selectedService.startDate)} s.d {formatDateIndo(selectedService.endDate)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">Tempat / Tujuan</td>
                    <td>: {selectedService.destinationOrLocation || 'SMAN 1 Nusantara'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="pt-2">
                Demikian surat perizinan ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dilaporkan hasilnya kepada Kepala Sekolah.
              </p>
            </div>

            {/* Tanda Tangan Ganda (Kepsek & Admin) */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
              <div className="space-y-1">
                <p className="font-medium text-slate-500">Mengetahui Admin SIMPEG / TU,</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-extrabold text-purple-700 border border-purple-300 bg-purple-50 px-2 py-1 rounded">
                    TERVERIFIKASI SISTEM SIMPEG
                  </span>
                </div>
                <p className="font-bold underline">{config.adminName || 'Siti Aminah, S.Kom.'}</p>
                <p className="text-[10px] text-slate-500">Administrator Data Presensi</p>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-slate-500">
                  Jakarta, {formatDateIndo(new Date().toISOString().split('T')[0])}
                </p>
                <p className="font-bold">Kepala Sekolah,</p>
                <div className="h-16 flex items-center justify-center">
                  <div className="border-2 border-indigo-600 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase rotate-[-2deg]">
                    ★ TTD & STEMPEL RESMI DIGITAL ★
                  </div>
                </div>
                <p className="font-bold underline">{config.principalName || 'Dr. H. Mulyadi, M.Pd.'}</p>
                <p className="text-[10px] font-mono text-slate-500">NIP. {config.principalNip || '197103151998021001'}</p>
              </div>
            </div>

            {/* Print Dialog Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW GTK SERVICE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Formulir Layanan & Perizinan Guru/GTK</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Guru / GTK Pemohon</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-medium"
                >
                  <option value="">-- Pilih Guru / GTK --</option>
                  {safeTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employmentStatus} - {t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis / Kategori Layanan</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GtkServiceCategory)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold text-indigo-700"
                >
                  <option value="surat_tugas">Surat Tugas Dinas Luar / Workshop / MGMP</option>
                  <option value="izin_cuti">Cuti Sakit / Cuti Tahunan / Alasan Penting</option>
                  <option value="rekomendasi_akademik">Surat Rekomendasi PPG / Beasiswa / Studi Lanjut</option>
                  <option value="tukar_jadwal">Dispensasi / Tukar Jadwal Piket & Jam Mengajar</option>
                  <option value="keterangan_aktif">Surat Keterangan Aktif Mengajar</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perihal / Judul Permohonan</label>
                <input
                  type="text"
                  placeholder="Contoh: Surat Tugas Narasumber Bimtek Kurikulum Merdeka"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Maksud & Uraian Lengkap</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan alasan, dasar surat undangan, atau keperluan dinas..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instansi / Lokasi Tujuan</label>
                <input
                  type="text"
                  placeholder="Contoh: Balai Guru Penggerak (BGP) DKI Jakarta"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
