import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Flame,
  Info,
  Calendar,
} from 'lucide-react';
import { BiometricLog } from '../types';

interface BiometricTimelineScrubberProps {
  logs: BiometricLog[];
  selectedHour: number | null;
  onSelectHour: (hour: number | null) => void;
  onSelectLog: (log: BiometricLog) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

interface HourData {
  hour: number;
  label: string;
  formattedHour: string;
  logs: BiometricLog[];
  total: number;
  verified: number;
  failed: number;
  flagged: number;
  suspicious: number;
  failRate: number;
  isSpike: boolean;
}

export const BiometricTimelineScrubber: React.FC<BiometricTimelineScrubberProps> = ({
  logs,
  selectedHour,
  onSelectHour,
  onSelectLog,
  selectedDate,
}) => {
  // Scrubber time bounds (06:00 to 18:00 WITA standard school operational day)
  const START_HOUR = 6;
  const END_HOUR = 17; // up to 17:59

  // Group logs into hourly buckets
  const hourlyData = useMemo<HourData[]>(() => {
    const buckets: Record<number, BiometricLog[]> = {};
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      buckets[h] = [];
    }

    logs.forEach((log) => {
      // Parse hour from log.time (format HH:mm:ss or HH:mm)
      const parts = log.time.split(':');
      const h = parseInt(parts[0], 10);
      if (!isNaN(h) && h >= START_HOUR && h <= END_HOUR) {
        buckets[h].push(log);
      } else if (!isNaN(h) && (h < START_HOUR || h > END_HOUR)) {
        // Map edge logs to nearest boundary bucket
        if (h < START_HOUR && buckets[START_HOUR]) {
          buckets[START_HOUR].push(log);
        } else if (h > END_HOUR && buckets[END_HOUR]) {
          buckets[END_HOUR].push(log);
        }
      }
    });

    return Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
      const h = START_HOUR + i;
      const hourLogs = buckets[h] || [];
      const total = hourLogs.length;
      const verified = hourLogs.filter((l) => l.status === 'verified').length;
      const failed = hourLogs.filter((l) => l.status === 'failed' || l.severity === 'error').length;
      const flagged = hourLogs.filter((l) => l.status === 'flagged').length;
      const suspicious = hourLogs.filter((l) => l.isSuspicious).length;
      const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;
      // Define a spike: high failure count (>=2) AND failRate >= 30%, or any suspicious group
      const isSpike = (failed >= 2 && failRate >= 30) || suspicious > 0 || (failed >= 3);

      return {
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        formattedHour: `${String(h).padStart(2, '0')}:00 - ${String(h).padStart(2, '0')}:59 WITA`,
        logs: hourLogs,
        total,
        verified,
        failed,
        flagged,
        suspicious,
        failRate,
        isSpike,
      };
    });
  }, [logs]);

  // Find peak failure period
  const spikeHours = useMemo(() => {
    return hourlyData.filter((h) => h.isSpike);
  }, [hourlyData]);

  // Max total in any bucket for relative bar heights
  const maxEventsInHour = useMemo(() => {
    const max = Math.max(...hourlyData.map((h) => h.total), 1);
    return Math.max(max, 5);
  }, [hourlyData]);

  // Selected hour details
  const currentHourData = useMemo(() => {
    if (selectedHour === null) return null;
    return hourlyData.find((h) => h.hour === selectedHour) || null;
  }, [selectedHour, hourlyData]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-4">
      {/* Header with Title and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Scrubber Timeline Jam Kejadian (Horizontal Daily Timeline)
                </h4>
                {spikeHours.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 text-[10px] font-black uppercase flex items-center space-x-1 animate-pulse">
                    <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>{spikeHours.length} Periode Lonjakan Masalah Terdeteksi</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Geser atau klik segmen jam untuk menganalisis kronologi kegagalan & akar penyebab (root-cause analysis)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectHour(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedHour === null
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Jam (06:00 - 18:00)
          </button>

          <button
            onClick={() => onSelectHour(6)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedHour === 6 || selectedHour === 7
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
            title="Jam Presensi Masuk Pagi"
          >
            🌅 Masuk (06:00 - 08:00)
          </button>

          <button
            onClick={() => onSelectHour(14)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedHour === 14 || selectedHour === 15
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
            title="Jam Presensi Pulang"
          >
            🌇 Pulang (14:00 - 16:00)
          </button>

          {spikeHours.length > 0 && (
            <button
              onClick={() => onSelectHour(spikeHours[0].hour)}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Lonjakan Gagal ({spikeHours[0].label})</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Horizontal Timeline Scrubber Track */}
      <div className="space-y-2">
        <div className="relative pt-3 pb-1">
          {/* Hourly Blocks Container */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2">
            {hourlyData.map((item) => {
              const isSelected = selectedHour === item.hour;
              const hasEvents = item.total > 0;
              const heightPercent = Math.min(Math.max((item.total / maxEventsInHour) * 100, 15), 100);

              return (
                <div
                  key={item.hour}
                  onClick={() => onSelectHour(isSelected ? null : item.hour)}
                  className={`group relative flex flex-col items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : item.isSpike
                      ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/70 hover:border-rose-400'
                      : hasEvents
                      ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      : 'bg-slate-50/30 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50'
                  }`}
                >
                  {/* High Frequency Anomaly / Spike Indicator */}
                  {item.isSpike && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black shadow-xs whitespace-nowrap z-10 flex items-center space-x-0.5">
                      <Flame className="w-2.5 h-2.5" />
                      <span>{item.failed} Gagal</span>
                    </span>
                  )}

                  {/* Hour Label */}
                  <span
                    className={`text-[11px] font-mono font-extrabold ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : item.isSpike
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Visual Bar of Event Volume & Composition */}
                  <div className="w-full h-14 flex items-end justify-center my-1.5">
                    {hasEvents ? (
                      <div
                        className="w-full max-w-[28px] rounded-lg overflow-hidden flex flex-col justify-end bg-slate-200 dark:bg-slate-700 shadow-2xs transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {/* Failed Stack (Top) */}
                        {item.failed > 0 && (
                          <div
                            className="w-full bg-rose-500 hover:bg-rose-600 transition-colors"
                            style={{ height: `${(item.failed / item.total) * 100}%` }}
                            title={`${item.failed} Gagal`}
                          />
                        )}
                        {/* Flagged / Suspicious Stack */}
                        {(item.flagged > 0 || item.suspicious > 0) && (
                          <div
                            className="w-full bg-amber-500 hover:bg-amber-600 transition-colors"
                            style={{ height: `${((item.flagged + item.suspicious) / item.total) * 100}%` }}
                            title={`${item.flagged + item.suspicious} Peringatan/Mencurigakan`}
                          />
                        )}
                        {/* Verified Stack (Bottom) */}
                        {item.verified > 0 && (
                          <div
                            className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
                            style={{ height: `${(item.verified / item.total) * 100}%` }}
                            title={`${item.verified} Lolos`}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* Volume Counter & Success Rate */}
                  <div className="text-center w-full">
                    {hasEvents ? (
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 block">
                        {item.total} upaya
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600 block">-</span>
                    )}

                    {item.total > 0 && (
                      <span
                        className={`text-[9px] font-mono font-black block mt-0.5 ${
                          item.failRate > 30
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.failRate > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.failRate > 0 ? `${item.failRate}% Gagal` : '100% Lolos'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium">Lolos Verifikasi</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-[11px] font-medium">Gagal / Error</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[11px] font-medium">Flagged / Geofence Out</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-[11px] font-medium">Suspicious (Mass-Spoof)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="font-mono text-slate-400">Zona Waktu:</span>
            <strong className="text-slate-700 dark:text-slate-200">WITA (UTC+8)</strong>
          </div>
        </div>
      </div>

      {/* Detailed Drill-down Strip when a Specific Hour is Selected */}
      {currentHourData && (
        <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-lg text-xs font-mono font-bold">
                {currentHourData.label}
              </span>
              <div>
                <h5 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                  Rincian Kejadian Rentang {currentHourData.formattedHour}
                </h5>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Ditemukan <strong>{currentHourData.total} rekaman upaya</strong> ({currentHourData.verified} Berhasil,{' '}
                  {currentHourData.failed} Gagal, {currentHourData.suspicious} Anomali Mass-Spoof)
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectHour(null)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Reset Filter Jam ✕
            </button>
          </div>

          {/* Micro Event Bubbles for this Hour */}
          {currentHourData.logs.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1 max-h-44 overflow-y-auto">
              {currentHourData.logs.map((log) => {
                const isFail = log.status === 'failed' || log.severity === 'error';
                const isWarn = log.status === 'flagged' || log.severity === 'warning';
                const isSusp = log.isSuspicious;

                return (
                  <button
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer flex items-center space-x-2.5 shadow-2xs hover:scale-[1.02] ${
                      isSusp
                        ? 'bg-purple-50 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
                        : isFail
                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                        : isWarn
                        ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSusp
                          ? 'bg-purple-600 animate-ping'
                          : isFail
                          ? 'bg-rose-500'
                          : isWarn
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div className="text-left">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] font-bold opacity-75">{log.time}</span>
                        <span className="font-extrabold text-xs truncate max-w-[140px]">{log.personName}</span>
                      </div>
                      <span className="text-[10px] block opacity-80">
                        {isSusp ? '🚨 Mass-Spoof' : isFail ? `✕ Match: ${log.matchScore}%` : isWarn ? `⚠ ${log.distanceMeter}m` : `✓ Match ${log.matchScore}%`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-indigo-400">
              Tidak ada aktivitas otentikasi biometrik tercatat pada jam ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
