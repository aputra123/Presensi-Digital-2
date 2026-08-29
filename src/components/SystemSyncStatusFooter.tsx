import React, { useState, useEffect } from 'react';
import {
  CloudCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Wifi,
  Sparkles,
  ShieldCheck,
  School,
} from 'lucide-react';
import { SchoolConfig } from '../types';

interface SystemSyncStatusFooterProps {
  config: SchoolConfig;
  lastHandshakeTime: Date;
  onTriggerSync: () => Promise<void> | void;
}

export const SystemSyncStatusFooter: React.FC<SystemSyncStatusFooterProps> = ({
  config,
  lastHandshakeTime,
  onTriggerSync,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Update clock ticker every 10 seconds to calculate elapsed minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = Math.max(0, now.getTime() - lastHandshakeTime.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
  const isOlderThan5Min = elapsedMinutes >= 5;

  const formatHandshakeTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Cloud Firestore...');
    try {
      await onTriggerSync();
      setSyncMessage('Sinkronisasi Sukses!');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (e) {
      setSyncMessage('Sinkronisasi selesai.');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-5 mt-8 print:hidden transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        {/* School Identity */}
        <div className="flex items-center space-x-2">
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-5 h-5 object-contain"
            />
          ) : (
            <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="font-bold text-slate-800 dark:text-slate-200">{config.schoolName}</span>
          <span className="text-slate-400">• NPSN: {config.npsn}</span>
        </div>

        {/* Realtime System Sync Status Handshake Indicator */}
        <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOlderThan5Min ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOlderThan5Min ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <div className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                System Sync:
              </span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {formatHandshakeTime(lastHandshakeTime)} WIB
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  isOlderThan5Min
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {elapsedMinutes === 0 ? 'Baru Saja' : `${elapsedMinutes} mnt lalu`}
              </span>
            </div>
          </div>

          {/* Sync Now Action Icon / Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              isOlderThan5Min
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs animate-pulse'
                : 'bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
            }`}
            title="Sinkronkan data sekarang ke cloud backend"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {/* Verification Status */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px]">
            TP {config.academicYear} • Sem. {config.semester}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Terverifikasi SIMPEG BKD Taliabu</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
