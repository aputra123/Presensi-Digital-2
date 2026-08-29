import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Search,
  Filter,
  Sparkles,
  Users,
  Briefcase,
  Layers,
  MapPin,
  X,
  Send,
} from 'lucide-react';
import { Teacher, DutyAssignment, DayOfWeek, AttendanceRecord, SchoolConfig } from '../types';

interface TeacherDutyRosterTabProps {
  teachers: Teacher[];
  dutyRoster: DutyAssignment[];
  records: AttendanceRecord[];
  config: SchoolConfig;
  onAddOrUpdateDuty: (duty: DutyAssignment) => void;
  onDeleteDuty: (id: string) => void;
}

const DAYS_OF_WEEK: { id: DayOfWeek; label: string; dayIndex: number }[] = [
  { id: 'senin', label: 'Senin', dayIndex: 1 },
  { id: 'selasa', label: 'Selasa', dayIndex: 2 },
  { id: 'rabu', label: 'Rabu', dayIndex: 3 },
  { id: 'kamis', label: 'Kamis', dayIndex: 4 },
  { id: 'jumat', label: 'Jumat', dayIndex: 5 },
  { id: 'sabtu', label: 'Sabtu', dayIndex: 6 },
];

const PRESET_DUTY_ROLES = [
  'Koordinator Piket Harian',
  'Petugas Gerbang & Presensi Pagi',
  'Pemantau KBM & Ketertiban Kelas',
  'Petugas Terminal IT & Face ID',
  'Koordinator Senam Pagi & Kebersihan',
  'Pendamping Ibadah & Literasi',
  'Petugas Presensi Kepulangan & Evaluasi',
];

export const TeacherDutyRosterTab: React.FC<TeacherDutyRosterTabProps> = ({
  teachers,
  dutyRoster,
  records,
  config,
  onAddOrUpdateDuty,
  onDeleteDuty,
}) => {
  // Determine current day of week (1=Mon, 2=Tue, ..., 6=Sat, 0=Sun defaults to Mon)
  const currentDayIndex = new Date().getDay();
  const currentDayItem = DAYS_OF_WEEK.find((d) => d.dayIndex === currentDayIndex) || DAYS_OF_WEEK[0];

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(currentDayItem.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<DutyAssignment | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<DutyAssignment>>({
    day: selectedDay,
    teacherId: '',
    roleTitle: 'Koordinator Piket Harian',
    shiftTime: '06:15 - 14:30',
    notes: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter((r) => r.date === todayStr);

  const activeRoster = dutyRoster.filter((d) => d.day === selectedDay);

  const filteredRoster = activeRoster.filter(
    (d) =>
      d.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.nip.includes(searchQuery)
  );

  const handleOpenAddModal = (dutyToEdit?: DutyAssignment) => {
    if (dutyToEdit) {
      setEditingDuty(dutyToEdit);
      setFormData({
        ...dutyToEdit,
      });
    } else {
      setEditingDuty(null);
      setFormData({
        day: selectedDay,
        teacherId: teachers[0]?.id || '',
        roleTitle: 'Koordinator Piket Harian',
        shiftTime: '06:15 - 14:30',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.day) return;

    const teacher = teachers.find((t) => t.id === formData.teacherId);
    if (!teacher) return;

    const payload: DutyAssignment = {
      id: editingDuty ? editingDuty.id : `duty_${Date.now()}`,
      day: formData.day as DayOfWeek,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      avatar: teacher.avatar,
      roleTitle: formData.roleTitle || 'Petugas Piket',
      shiftTime: formData.shiftTime || '06:15 - 14:30',
      phone: teacher.phone,
      notes: formData.notes,
      assignedAt: new Date().toISOString(),
    };

    onAddOrUpdateDuty(payload);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-[11px] font-extrabold border border-indigo-400/30 uppercase tracking-wider">
                Jadwal Guru Piket Sekolah
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                TP {config.academicYear}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Teacher Duty Roster &amp; Pengawasan Harian
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl">
              Distribusi tugas piket guru harian di {config.schoolName} untuk memastikan ketertiban gerbang,
              kelancaran KBM, dan pemantauan terminal presensi biometrik.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Duty</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((d) => {
          const isSelected = selectedDay === d.id;
          const isToday = currentDayItem.id === d.id;
          const dutyCount = dutyRoster.filter((item) => item.day === d.id).length;

          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-extrabold text-xs transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{d.label}</span>
              {isToday && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  Hari Ini
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {dutyCount} GTK
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari guru piket, NIP, atau peran..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>
            Shift Standar: <strong className="text-slate-800 dark:text-slate-200">06:15 - 14:30 WIB</strong>
          </span>
        </div>
      </div>

      {/* Duty Cards Grid */}
      {filteredRoster.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">
            Belum ada petugas piket untuk hari {DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.label}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Klik tombol &quot;Assign New Duty&quot; di atas untuk menetapkan guru yang bertugas pada hari ini.
          </p>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tetapkan Petugas Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoster.map((duty) => {
            // Check if this teacher is present today
            const teacherRecord = todayRecords.find((r) => r.personId === duty.teacherId);
            const isPresentToday = !!teacherRecord;

            return (
              <div
                key={duty.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={duty.avatar}
                        alt={duty.teacherName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900"
                      />
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                          {duty.teacherName}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">NIP: {duty.nip}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        isPresentToday
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isPresentToday ? '✓ Hadir Hari Ini' : 'Belum Check-In'}
                    </span>
                  </div>

                  {/* Role Title Badge */}
                  <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Tugas &amp; Tanggung Jawab:
                    </span>
                    <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 mt-0.5 block">
                      {duty.roleTitle}
                    </span>
                  </div>

                  {/* Shift Time & Notes */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">
                        Jam Tugas: <strong className="font-mono text-slate-800 dark:text-slate-200">{duty.shiftTime}</strong>
                      </span>
                    </div>
                    {duty.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                        &quot;{duty.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Contact & Admin Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {duty.phone && (
                      <a
                        href={`https://wa.me/${duty.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center space-x-1 transition-colors"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenAddModal(duty)}
                      className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Tugas Piket"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDuty(duty.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Hapus Tugas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Assign / Edit Duty Roster */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingDuty ? 'Edit Petugas Piket' : 'Assign New Duty (Atur Jadwal Piket)'}
                  </h3>
                  <p className="text-xs text-slate-300">Penetapan guru piket harian sekolah</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {/* Day Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Hari Tugas:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, day: d.id })}
                      className={`py-2 rounded-xl font-bold uppercase transition-all ${
                        formData.day === d.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {d.label.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Guru / Tenaga Kependidikan:
                </label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.subject} ({t.employmentStatus})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Title Preset / Custom */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Tugas Piket:
                </label>
                <input
                  type="text"
                  required
                  value={formData.roleTitle}
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  placeholder="Contoh: Koordinator Piket & Pengawasan Gerbang"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_DUTY_ROLES.slice(0, 4).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, roleTitle: role })}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      + {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Time */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Operasional Shift Piket:
                </label>
                <input
                  type="text"
                  value={formData.shiftTime}
                  onChange={(e) => setFormData({ ...formData, shiftTime: e.target.value })}
                  placeholder="06:15 - 14:30"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Instruksi Khusus (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Mengawasi barisan upacara bendera dan memantau siswa terlambat."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Simpan Jadwal Piket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
