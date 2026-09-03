import React, { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Calendar,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Eye,
  Image as ImageIcon,
  Send,
  MessageCircle,
  Share2,
  Filter,
} from 'lucide-react';
import { LeaveRequest, SchoolConfig, Student, Teacher } from '../types';
import { formatDateIndo, playBeepSound } from '../utils/soundAndDate';
import { DocumentViewer, DocumentItem } from './DocumentViewer';
import { sendWhatsAppNotification, generateLeaveWhatsAppMessage } from '../utils/whatsapp';

interface LeaveRequestsTabProps {
  leaves?: LeaveRequest[];
  students?: Student[];
  teachers?: Teacher[];
  config?: SchoolConfig;
  todayDate: string;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveStatus: (id: string, status: 'approved' | 'rejected', reviewNote?: string) => void;
}

const SAMPLE_DOCTOR_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const SAMPLE_MEDICAL_IMG = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80';

export const LeaveRequestsTab: React.FC<LeaveRequestsTabProps> = ({
  leaves = [],
  students = [],
  teachers = [],
  config,
  todayDate,
  onAddLeaveRequest,
  onUpdateLeaveStatus,
}) => {
  const safeLeaves = leaves || [];
  const safeStudents = students || [];
  const safeTeachers = teachers || [];

  const [personType, setPersonType] = useState<'student' | 'teacher'>('student');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(safeStudents[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'sakit' | 'izin' | 'dispensasi'>('sakit');
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [reason, setReason] = useState('');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Document Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPerson =
    personType === 'student'
      ? safeStudents.find((s) => s.id === selectedPersonId)
      : safeTeachers.find((t) => t.id === selectedPersonId);

  // Handle Real File Upload with PDF & JPG/PNG validation and size checking
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    // Check size limit: 5MB
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setFileError('Ukuran berkas melebihi batas maksimum 5MB.');
      return;
    }

    // Check extension & mime type (PDF, JPG, JPEG, PNG)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const validExtension = /\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name);

    if (!allowedTypes.includes(file.type) && !validExtension) {
      setFileError('Format file tidak didukung. Mohon unggah dokumen PDF atau Gambar (JPG/PNG).');
      return;
    }

    setDocName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDocUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitNewLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !reason.trim()) {
      alert('Harap lengkapi alasan pengajuan izin/sakit.');
      return;
    }

    const isStudent = personType === 'student';
    const newReq: LeaveRequest = {
      id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      personId: selectedPerson.id,
      personType,
      personName: selectedPerson.name,
      classOrSubject: isStudent ? (selectedPerson as Student).className : (selectedPerson as Teacher).subject,
      type: leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      documentName: docName || (leaveType === 'sakit' ? 'surat_keterangan_dokter.pdf' : 'surat_izin_wali.jpg'),
      documentUrl: docUrl || (leaveType === 'sakit' ? SAMPLE_DOCTOR_PDF : SAMPLE_MEDICAL_IMG),
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    playBeepSound();
    onAddLeaveRequest(newReq);
    setReason('');
    setDocName('');
    setDocUrl('');
    setShowAddForm(false);
  };

  // Convert leave requests to DocumentItem list for the Gallery Viewer
  const allAttachedDocuments: DocumentItem[] = safeLeaves
    .filter((l) => l.documentName || l.documentUrl)
    .map((l) => ({
      id: l.id,
      title: `${l.type.toUpperCase()}: ${l.personName} (${l.classOrSubject})`,
      documentName: l.documentName || 'surat_keterangan.pdf',
      documentUrl: l.documentUrl || (l.type === 'sakit' ? SAMPLE_DOCTOR_PDF : SAMPLE_MEDICAL_IMG),
      uploaderName: l.personName,
      uploaderRole: l.personType === 'student' ? `Siswa ${l.classOrSubject}` : `Guru ${l.classOrSubject}`,
      date: `${l.startDate} s/d ${l.endDate}`,
      category: l.type,
    }));

  const openDocumentAt = (leaveId: string) => {
    const idx = allAttachedDocuments.findIndex((d) => d.id === leaveId);
    setViewerInitialIndex(idx >= 0 ? idx : 0);
    setIsViewerOpen(true);
  };

  const handleSendWhatsAppNotification = (item: LeaveRequest) => {
    const student = safeStudents.find((s) => s.id === item.personId);
    const teacher = safeTeachers.find((t) => t.id === item.personId);
    const phone = student?.parentPhone || teacher?.phone || '6281299887766';
    const msg = generateLeaveWhatsAppMessage(item, config?.schoolName);
    sendWhatsAppNotification(phone, msg);
  };

  const filteredLeaves = safeLeaves.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="font-extrabold text-lg text-slate-900">
              Pengajuan Izin, Sakit & Dispensasi Guru/Siswa
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Layanan permohonan ketidakhadiran resmi dengan unggah surat (PDF/JPG), preview galeri dokumen, dan notifikasi WhatsApp
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {allAttachedDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setViewerInitialIndex(0);
                setIsViewerOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Galeri Dokumen ({allAttachedDocuments.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Tutup Formulir' : 'Ajukan Izin / Sakit Baru'}</span>
          </button>
        </div>
      </div>

      {/* Add New Leave Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitNewLeave}
          className="p-6 rounded-[2.5rem] bg-white border border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Formulir Pengajuan Ketidakhadiran & Unggah Surat</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Person Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Kategori Pemohon
              </label>
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setPersonType('student');
                    setSelectedPersonId(students[0]?.id || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    personType === 'student' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Siswa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPersonType('teacher');
                    setSelectedPersonId(teachers[0]?.id || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    personType === 'teacher' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Guru & GTK
                </button>
              </div>
            </div>

            {/* Select Person */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Pemohon
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {personType === 'student'
                  ? students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.className})
                      </option>
                    ))
                  : teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subject}) - [{t.employmentStatus}]
                      </option>
                    ))}
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Jenis Permohonan
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="sakit">Sakit (Dengan Surat Dokter)</option>
                <option value="izin">Izin (Keperluan Keluarga/Mendesak)</option>
                <option value="dispensasi">Dispensasi (Lomba / Tugas Dinas)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Alasan Lengkap
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Mengalami demam dan radang tenggorokan, surat keterangan dokter terlampir."
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Real Document Upload (PDF / JPG / PNG) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block">
              Unggah Surat Keterangan / Bukti (Format PDF, JPG, PNG - Maks 5MB)
            </label>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl border border-indigo-200 flex items-center space-x-2 transition-colors cursor-pointer shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Pilih File PDF / Gambar</span>
              </button>

              <div className="flex-1 min-w-0">
                {docName ? (
                  <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">{docName}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Belum ada file dipilih. Atau sistem akan menyertakan sampel otomatis.
                  </span>
                )}
              </div>
            </div>

            {fileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              Kirim Permohonan
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs for Leave Status */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Semua Permohonan ({leaves.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Menunggu Persetujuan ({leaves.filter((l) => l.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Disetujui ({leaves.filter((l) => l.status === 'approved').length})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Ditolak ({leaves.filter((l) => l.status === 'rejected').length})
        </button>
      </div>

      {/* Leave Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLeaves.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-[2.5rem] bg-white border border-slate-200/90 text-slate-400 text-xs">
            Tidak ada permohonan izin/sakit pada kategori ini.
          </div>
        ) : (
          filteredLeaves.map((item) => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';

            return (
              <div
                key={item.id}
                className="p-5 rounded-[2.5rem] bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        item.type === 'sakit'
                          ? 'bg-blue-100 text-blue-800'
                          : item.type === 'dispensasi'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.type.toUpperCase()}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span>{isApproved ? 'Disetujui' : isPending ? 'Menunggu Review' : 'Ditolak'}</span>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {item.personName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {item.classOrSubject} • Diajukan pukul {item.createdAt} WIB
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {formatDateIndo(item.startDate)}
                        {item.startDate !== item.endDate && ` s/d ${formatDateIndo(item.endDate)}`}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] pt-1 leading-relaxed">
                      "{item.reason}"
                    </p>
                  </div>

                  {/* Document Attachment & Preview Link */}
                  {item.documentName && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs">
                      <div className="flex items-center space-x-2 text-indigo-800 truncate">
                        <Paperclip className="w-4 h-4 shrink-0 text-indigo-600" />
                        <span className="font-semibold truncate">{item.documentName}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDocumentAt(item.id)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold border border-indigo-200 flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Dokumen</span>
                      </button>
                    </div>
                  )}

                  {item.reviewNote && (
                    <p className="text-[11px] text-slate-500 italic">
                      Catatan Verifikasi: {item.reviewNote}
                    </p>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppNotification(item)}
                    className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA Wali</span>
                  </button>

                  {/* Review Action Buttons for Teacher / Admin */}
                  {isPending && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onUpdateLeaveStatus(item.id, 'rejected', 'Ditolak oleh Guru Piket (Dokumen tidak lengkap)')}
                        className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                      <button
                        onClick={() => onUpdateLeaveStatus(item.id, 'approved', 'Disetujui oleh Wali Kelas & Guru Piket')}
                        className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Document Gallery Modal */}
      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documents={allAttachedDocuments}
        initialIndex={viewerInitialIndex}
      />
    </div>
  );
};
