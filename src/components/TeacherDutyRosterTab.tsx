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
  CalendarDays,
  LayoutGrid,
  GripVertical,
  Printer,
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
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTeacher, setDraggedTeacher] = useState<Teacher | null>(null);
  const [dragOverDay, setDragOverDay] = useState<DayOfWeek | null>(null);
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

  const handleOpenAddModal = (dutyToEdit?: DutyAssignment, defaultDay?: DayOfWeek) => {
    if (dutyToEdit) {
      setEditingDuty(dutyToEdit);
      setFormData({
        ...dutyToEdit,
      });
    } else {
      setEditingDuty(null);
      setFormData({
        day: defaultDay || selectedDay,
        teacherId: teachers[0]?.id || '',
        roleTitle: 'Koordinator Piket Harian',
        shiftTime: '06:15 - 14:30',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleDropTeacher = (day: DayOfWeek, teacher: Teacher) => {
    // Check if already assigned for that day
    const existing = dutyRoster.find((d) => d.day === day && d.teacherId === teacher.id);
    if (existing) {
      alert(`${teacher.name} sudah ditugaskan pada hari ${day.toUpperCase()}`);
      return;
    }

    const newDuty: DutyAssignment = {
      id: `duty_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      day: day,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      avatar: teacher.avatar,
      roleTitle: 'Petugas Gerbang & Presensi Pagi',
      shiftTime: '06:15 - 14:30',
      phone: teacher.phone,
      notes: `Ditugaskan melalui Drag & Drop Visual Kalender`,
      assignedAt: new Date().toISOString(),
    };

    onAddOrUpdateDuty(newDuty);
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
              Distribusi tugas piket guru harian di {config.schoolName} dengan visual calendar view &amp; drag-and-drop shift assignment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Visual Kalender</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu Harian</span>
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/20"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Jadwal</span>
            </button>

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

      {/* DRAG & DROP VISUAL CALENDAR VIEW */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          {/* Draggable Teachers Tray */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Daftar Guru Siap Ditugaskan (Tarik &amp; Lepaskan ke Hari Kalender di Bawah)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl font-medium">
                Drag guru ke kolom hari Senin s/d Sabtu
              </span>
            </div>

            {teachers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada data guru. Silakan tambahkan data guru di tab Guru/GTK.
              </p>
            ) : (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {teachers.map((t) => {
                  const assignedDaysCount = dutyRoster.filter((d) => d.teacherId === t.id).length;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedTeacher(t);
                        e.dataTransfer.setData('text/plain', JSON.stringify(t));
                      }}
                      onDragEnd={() => setDraggedTeacher(null)}
                      className="shrink-0 flex items-center space-x-2 p-2 px-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-2xl cursor-grab active:cursor-grabbing transition-all select-none group shadow-2xs"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      <img
                        src={t.avatar}
                        alt={t.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-xl object-cover border border-slate-200"
                      />
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <span>{t.employmentStatus}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-semibold">{assignedDaysCount}x Piket</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6-Day Weekly Calendar Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {DAYS_OF_WEEK.map((d) => {
              const isToday = currentDayItem.id === d.id;
              const isDragTarget = dragOverDay === d.id;
              const dayRoster = dutyRoster.filter((item) => item.day === d.id);

              return (
                <div
                  key={d.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDay(d.id);
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverDay(null);
                    if (draggedTeacher) {
                      handleDropTeacher(d.id, draggedTeacher);
                    }
                  }}
                  className={`flex flex-col rounded-3xl border transition-all duration-200 min-h-[380px] overflow-hidden ${
                    isDragTarget
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500 scale-[1.02]'
                      : isToday
                      ? 'bg-white dark:bg-slate-900 border-emerald-400 dark:border-emerald-700 shadow-md ring-1 ring-emerald-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      isToday
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <h4 className={`font-extrabold text-sm ${isToday ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {d.label}
                      </h4>
                      <p className={`text-[10px] ${isToday ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {dayRoster.length} Guru Ditugaskan
                      </p>
                    </div>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* Drop Target List */}
                  <div className="p-3 flex-1 flex flex-col space-y-2.5 overflow-y-auto">
                    {dayRoster.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 text-slate-400">
                        <Calendar className="w-6 h-6 opacity-40" />
                        <p className="text-[11px] leading-tight font-medium">
                          Tarik guru ke sini atau klik tombol di bawah
                        </p>
                      </div>
                    ) : (
                      dayRoster.map((duty) => {
                        const hasCheckedInToday = isToday && todayRecords.some((r) => r.personId === duty.teacherId);
                        return (
                          <div
                            key={duty.id}
                            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-2 relative group hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center space-x-2">
                              <img
                                src={duty.avatar}
                                alt={duty.teacherName}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {duty.teacherName}
                                </h5>
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                                  {duty.roleTitle}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteDuty(duty.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                                title="Hapus dari jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                              <span className="font-mono">{duty.shiftTime}</span>
                              {hasCheckedInToday && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                  ✓ Hadir
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(undefined, d.id)}
                      className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Guru</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* CARDS / LIST VIEW */
        <div className="space-y-6">
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
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
                          className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Tugas Piket"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteDuty(duty.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
