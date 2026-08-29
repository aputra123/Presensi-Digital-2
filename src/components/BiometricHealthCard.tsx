import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ScanFace,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { BiometricLog, ActiveTab } from '../types';

interface BiometricHealthCardProps {
  logs?: BiometricLog[];
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const BiometricHealthCard: React.FC<BiometricHealthCardProps> = ({
  logs = [],
  onNavigateTab,
}) => {
  // Filter logs for the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const recentLogs = logs.filter((log) => log.date >= sevenDaysAgoStr);
  const effectiveLogs = recentLogs.length > 0 ? recentLogs : logs;

  const totalAttempts = effectiveLogs.length;
  const verifiedCount = effectiveLogs.filter((l) => l.status === 'verified').length;
  const failedCount = effectiveLogs.filter((l) => l.status === 'failed' || l.status === 'flagged').length;

  // Verification Rate %
  const successRate = totalAttempts > 0 ? Math.round((verifiedCount / totalAttempts) * 100) : 100;
  const failRate = totalAttempts > 0 ? Math.round((failedCount / totalAttempts) * 100) : 0;

  // Average Match Score
  const avgMatchScore =
    totalAttempts > 0
      ? (effectiveLogs.reduce((acc, curr) => acc + curr.matchScore, 0) / totalAttempts).toFixed(1)
      : '95.8';

  // Liveness Pass Rate
  const livenessPassedCount = effectiveLogs.filter((l) => l.livenessPassed).length;
  const livenessRate = totalAttempts > 0 ? Math.round((livenessPassedCount / totalAttempts) * 100) : 98;

  // GPS Geofence Compliance
  const gpsPassedCount = effectiveLogs.filter((l) => l.gpsPassed).length;
  const gpsRate = totalAttempts > 0 ? Math.round((gpsPassedCount / totalAttempts) * 100) : 96;

  // SVG Radial Progress Math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (successRate / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 lg:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ScanFace className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Kesehatan Biometrik Wajah (Biometric Health)
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold">
                7 Hari Terakhir
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rasio verifikasi Face ID berhasil vs gagal otentikasi
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('biometric_logs')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>Log Biometrik</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Stats: Circle Graph + Number Counters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: SVG Percentage Circle Graph */}
        <div className="md:col-span-5 flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="9"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  successRate >= 90
                    ? 'stroke-indigo-600 dark:stroke-indigo-500'
                    : successRate >= 75
                    ? 'stroke-amber-500'
                    : 'stroke-rose-500'
                }`}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white leading-none">
                {successRate}%
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Sukses</span>
            </div>
          </div>

          <div className="ml-4 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Terverifikasi: <strong>{verifiedCount}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Gagal/Ditolak: <strong>{failedCount}</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
              Total Uji: <strong>{totalAttempts}</strong> pemindaian
            </div>
          </div>
        </div>

        {/* Right: Key Performance Indicators */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2.5">
          {/* Card A: Average Match Score */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-extrabold uppercase">Skor Wajah</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-mono text-indigo-950 dark:text-indigo-200">
                {avgMatchScore}%
              </div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium block">
                Rerata Kemiripan
              </span>
            </div>
          </div>

          {/* Card B: Liveness Pass Rate */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-extrabold uppercase">Anti-Spoof</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-mono text-emerald-950 dark:text-emerald-200">
                {livenessRate}%
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block">
                Liveness Lolos
              </span>
            </div>
          </div>

          {/* Card C: Geofence Compliance */}
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-extrabold uppercase">Geofence</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-mono text-purple-950 dark:text-purple-200">
                {gpsRate}%
              </div>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium block">
                Radius Sesuai
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
