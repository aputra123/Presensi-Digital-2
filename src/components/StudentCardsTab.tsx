import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Printer,
  Download,
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  School,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Student, Teacher, SchoolClass, SchoolConfig } from '../types';

interface StudentCardsTabProps {
  students?: Student[];
  teachers?: Teacher[];
  classes?: SchoolClass[];
  config: SchoolConfig;
}

export const StudentCardsTab: React.FC<StudentCardsTabProps> = ({
  students = [],
  teachers = [],
  classes = [],
  config,
}) => {
  const [cardType, setCardType] = useState<'student' | 'teacher'>('student');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedTeacherStatus, setSelectedTeacherStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const safeStudents = students || [];
  const safeTeachers = teachers || [];
  const safeClasses = classes || [];

  const filteredStudents = safeStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassId === 'ALL' || s.classId === selectedClassId;
    return matchesSearch && matchesClass;
  });

  const filteredTeachers = safeTeachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nip.includes(searchQuery) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedTeacherStatus === 'ALL' || t.employmentStatus === selectedTeacherStatus;
    return matchesSearch && matchesStatus;
  });

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Kartu Identitas Digital (ID Card & QR Presensi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kartu pelajar siswa dan ID Card ASN / PPPK guru siap cetak & scan presensi QR
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Card Type Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setCardType('student')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                cardType === 'student'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kartu Siswa</span>
            </button>
            <button
              onClick={() => setCardType('teacher')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                cardType === 'teacher'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Kartu Guru & GTK</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrintAll}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Semua Kartu</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between print:hidden">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              cardType === 'student'
                ? 'Cari nama siswa, NISN...'
                : 'Cari nama guru, NIP, mapel...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {cardType === 'student' ? (
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedClassId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedClassId === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Kelas
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selectedClassId === c.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'PNS', 'PPPK', 'PPPK_PW', 'HONORER'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedTeacherStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selectedTeacherStatus === st
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cards Grid Render */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardType === 'student' ? (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden relative flex flex-col justify-between hover:shadow-xl transition-all group print:break-inside-avoid"
            >
              {/* ID Card Top Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 text-white flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center space-x-2.5 z-10 min-w-0">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-contain bg-white/90 p-0.5 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                      <School className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider leading-none truncate">
                      {config.schoolName}
                    </h4>
                    <p className="text-[9px] text-blue-200 mt-0.5">KARTU TANDA PELAJAR DIGITAL</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[9px] z-10 shadow-xs">
                  SISWA
                </span>

                {/* Subtle light effect */}
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/30 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* ID Card Body */}
              <div className="p-4 space-y-4">
                <div className="flex items-start space-x-3.5">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-20 h-24 rounded-2xl object-cover border-2 border-indigo-100 shadow-xs shrink-0"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {student.name}
                    </h3>
                    <div className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-100">
                      {student.className}
                    </div>

                    <div className="pt-1 text-[11px] text-slate-600 space-y-0.5 font-medium">
                      <div>
                        <span className="text-slate-400 font-semibold">NISN: </span>
                        <span className="font-mono font-bold text-slate-800">{student.nisn}</span>
                      </div>
                      {student.nik && (
                        <div>
                          <span className="text-slate-400 font-semibold">NIK: </span>
                          <span className="font-mono text-slate-700 text-[10px]">{student.nik}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 font-semibold">Berlaku: </span>
                        <span className="text-slate-700">T.A {config.academicYear}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Barcode Area */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      QR Presensi Mandiri
                    </span>
                    <p className="text-[10px] text-slate-600 font-mono font-bold">
                      STD-{student.nisn}
                    </p>
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Terverifikasi Dapodik</span>
                    </span>
                  </div>

                  {/* QR Code Graphic Mock using SVG */}
                  <div className="w-14 h-14 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                    <QrCode className="w-11 h-11 text-slate-900" />
                  </div>
                </div>
              </div>

              {/* ID Card Footer */}
              <div className="bg-slate-100/70 px-4 py-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/80">
                <span className="truncate">NPSN: {config.npsn}</span>
                <span className="font-bold text-slate-700">Jakarta Selatan</span>
              </div>
            </div>
          ))
        ) : (
          filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden relative flex flex-col justify-between hover:shadow-xl transition-all group print:break-inside-avoid"
            >
              {/* ID Card Top Banner */}
              <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 text-white flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center space-x-2.5 z-10 min-w-0">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-contain bg-white/90 p-0.5 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                      <Briefcase className="w-4 h-4 text-purple-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider leading-none truncate">
                      {config.schoolName}
                    </h4>
                    <p className="text-[9px] text-purple-200 mt-0.5">KARTU IDENTITAS PEGAWAI / GTK</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] z-10 shadow-xs ${
                    teacher.employmentStatus === 'PNS'
                      ? 'bg-emerald-400 text-emerald-950'
                      : teacher.employmentStatus === 'PPPK'
                      ? 'bg-blue-400 text-blue-950'
                      : 'bg-purple-400 text-purple-950'
                  }`}
                >
                  {teacher.employmentStatus}
                </span>

                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-600/30 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* ID Card Body */}
              <div className="p-4 space-y-4">
                <div className="flex items-start space-x-3.5">
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="w-20 h-24 rounded-2xl object-cover border-2 border-purple-100 shadow-xs shrink-0"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {teacher.name}
                    </h3>
                    <div className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-100">
                      {teacher.role}
                    </div>

                    <div className="pt-1 text-[11px] text-slate-600 space-y-0.5 font-medium">
                      <div>
                        <span className="text-slate-400 font-semibold">NIP: </span>
                        <span className="font-mono font-bold text-slate-800 text-[10px]">
                          {teacher.nip}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Bidang: </span>
                        <span className="text-slate-700 truncate block text-[10px]">
                          {teacher.subject}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Barcode Area */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      QR Presensi BKD & Sekolah
                    </span>
                    <p className="text-[10px] text-slate-600 font-mono font-bold">
                      ASN-{teacher.nip}
                    </p>
                    <span className="text-[9px] text-purple-700 font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>SIMPEG & BKD Verified</span>
                    </span>
                  </div>

                  <div className="w-14 h-14 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                    <QrCode className="w-11 h-11 text-purple-950" />
                  </div>
                </div>
              </div>

              {/* ID Card Footer */}
              <div className="bg-purple-50/70 px-4 py-2 text-[10px] text-purple-800 flex items-center justify-between border-t border-purple-100">
                <span className="truncate">NPSN: {config.npsn}</span>
                <span className="font-bold">Badan Kepegawaian Daerah</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty State */}
      {((cardType === 'student' && filteredStudents.length === 0) ||
        (cardType === 'teacher' && filteredTeachers.length === 0)) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Kartu tidak ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Coba gunakan filter atau pencarian lain.</p>
        </div>
      )}
    </div>
  );
};
