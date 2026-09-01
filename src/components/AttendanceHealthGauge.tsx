import React, { useState } from 'react';
import {
  Activity,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Info,
} from 'lucide-react';
import { Teacher, AttendanceRecord, ActiveTab } from '../types';

interface AttendanceHealthGaugeProps {
  teachers: Teacher[];
  records: AttendanceRecord[];
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const AttendanceHealthGauge: React.FC<AttendanceHealthGaugeProps> = ({
  teachers = [],
  records = [],
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter today's staff records
  const teacherTodayRecords = records.filter(
    (r) => r.personType === 'teacher' && r.date === todayStr
  );

  const totalStaff = Math.max(teachers.length, 1);
  const presentStaff = teacherTodayRecords.filter(
    (r) => r.status === 'hadir'
  ).length;
  const lateStaff = teacherTodayRecords.filter(
    (r) => r.status === 'terlambat'
  ).length;
  const onLeaveStaff = teacherTodayRecords.filter(
    (r) => r.status === 'izin' || r.status === 'sakit'
  ).length;
  const absentOrUnrecorded = Math.max(0, totalStaff - (presentStaff + lateStaff + onLeaveStaff));

  const totalPresentStaff = presentStaff + lateStaff;
  const staffRatio = Math.min(100, Math.max(0, Math.round((totalPresentStaff / totalStaff) * 100)));

  // Health Status determination
  let healthLabel = 'Prima (Optimal)';
  let healthColor = '#10B981'; // Emerald
  let healthBg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  let statusIcon = ShieldCheck;

  if (staffRatio < 70) {
    healthLabel = 'Kritis (Perhatian)';
    healthColor = '#F43F5E'; // Rose
    healthBg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    statusIcon = AlertTriangle;
  } else if (staffRatio < 88) {
    healthLabel = 'Waspada (Pantau)';
    healthColor = '#F59E0B'; // Amber
    healthBg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    statusIcon = Activity;
  }

  const StatusIconComponent = statusIcon;

  // Semicircle calculations for SVG arc
  const arcRadius = 60;
  const arcLength = Math.PI * arcRadius; // ~188.5
  const fillOffset = arcLength * (1 - staffRatio / 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 lg:p-6 shadow-xs flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Attendance Health Guru & Staf</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rasio kehadiran real-time GTK & Pegawai hari ini
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center space-x-1 ${healthBg}`}>
          <StatusIconComponent className="w-3.5 h-3.5" />
          <span>{healthLabel}</span>
        </span>
      </div>

      {/* Gauge Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Pure SVG Semicircle Gauge */}
        <div className="md:col-span-5 relative flex flex-col items-center justify-center">
          <div className="relative w-44 h-28 flex items-center justify-center">
            <svg viewBox="0 0 160 95" className="w-full h-full overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 85 A 60 60 0 0 1 140 85"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
                className="text-slate-100 dark:text-slate-800"
              />

              {/* Progress Arc */}
              <path
                d="M 20 85 A 60 60 0 0 1 140 85"
                fill="none"
                stroke={healthColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={fillOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Gauge Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
              <span
                className="text-3xl font-extrabold font-mono tracking-tight"
                style={{ color: healthColor }}
              >
                {staffRatio}%
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Skor Kehadiran
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-slate-400 mt-2">
            <span>0%</span>
            <span>Target &ge;90%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="md:col-span-7 space-y-2">
          {/* Row 1: Hadir Tepat Waktu */}
          <div
            onMouseEnter={() => setHoveredCategory('hadir')}
            onMouseLeave={() => setHoveredCategory(null)}
            className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Hadir Tepat Waktu</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-extrabold font-mono text-emerald-700 dark:text-emerald-400">{presentStaff}</span>
              <span className="text-[10px] text-slate-400">/ {totalStaff} Guru</span>
            </div>
          </div>

          {/* Row 2: Terlambat */}
          <div
            onMouseEnter={() => setHoveredCategory('terlambat')}
            onMouseLeave={() => setHoveredCategory(null)}
            className="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Terlambat</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-extrabold font-mono text-amber-700 dark:text-amber-400">{lateStaff}</span>
              <span className="text-[10px] text-slate-400">Guru</span>
            </div>
          </div>

          {/* Row 3: Izin / Sakit / Belum Presensi */}
          <div
            onMouseEnter={() => setHoveredCategory('absen')}
            onMouseLeave={() => setHoveredCategory(null)}
            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-2">
              <UserX className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Izin / Sakit / Alpa</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-extrabold font-mono text-rose-600 dark:text-rose-400">{absentOrUnrecorded + onLeaveStaff}</span>
              <span className="text-[10px] text-slate-400">Guru</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px] flex items-center space-x-1">
          <Info className="w-3 h-3 inline text-slate-400 shrink-0" />
          <span>Target SPM Diknas: <strong>&ge; 90%</strong></span>
        </span>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('teachers')}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>Lihat Data GTK</span>
            <span>&rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
};

