import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  ShieldCheck,
  School,
  AlertCircle,
  Clock,
  Layers,
  Cloud,
  CloudOff,
  HardDrive,
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { syncManager, SyncManagerStatus } from '../utils/syncManager';

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
  const [syncStatus, setSyncStatus] = useState<SyncManagerStatus>(syncManager.getStatus());

  // Update clock ticker every 10 seconds to calculate elapsed minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to syncManager state updates
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const displayHandshakeTime = syncStatus.lastSuccessfulSync || lastHandshakeTime;
  const elapsedMs = Math.max(0, now.getTime() - displayHandshakeTime.getTime());
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
    try {
      await syncManager.processQueue(true);
      await onTriggerSync();
    } catch (e) {
      console.warn('Manual sync attempt:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const isCloudActive = syncStatus.isOnline;

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 mt-8 print:hidden transition-colors">
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

        {/* Realtime System Sync Status: Local Mode vs Cloud Sync Indicator */}
        <div className="flex items-center space-x-2.5 flex-wrap justify-center bg-slate-50 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  !isCloudActive
                    ? 'bg-amber-400'
                    : isOlderThan5Min
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  !isCloudActive
                    ? 'bg-amber-500'
                    : isOlderThan5Min
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </span>

            <div className="flex items-center space-x-1.5">
              {isCloudActive ? (
                <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Cloud Sync Active</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-amber-800 dark:text-amber-300 font-bold text-[11px] bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <HardDrive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Local Mode (Offline)</span>
                </div>
              )}

              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {formatHandshakeTime(displayHandshakeTime)} WIB
              </span>

              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  !isCloudActive
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : isOlderThan5Min
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {!isCloudActive
                  ? 'Tersimpan Lokal'
                  : elapsedMinutes === 0
                  ? 'Tersinkronisasi'
                  : `${elapsedMinutes} mnt lalu`}
              </span>
            </div>
          </div>

          {/* Pending Queue Count if offline or pending items exist */}
          {syncStatus.pendingCount > 0 && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-200/60">
              <Layers className="w-3 h-3" />
              <span>{syncStatus.pendingCount} Antrean Sinkron</span>
            </div>
          )}

          {/* Force Sync Action Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || syncStatus.connectionState === 'syncing'}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-xs ${
              isSyncing || syncStatus.connectionState === 'syncing'
                ? 'bg-slate-200 text-slate-500 cursor-wait'
                : !isCloudActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : isOlderThan5Min
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
            title="Paksa sinkronisasi data presensi sekarang (Force Synchronization)"
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isSyncing || syncStatus.connectionState === 'syncing'
                  ? 'animate-spin text-white'
                  : ''
              }`}
            />
            <span>
              {isSyncing || syncStatus.connectionState === 'syncing'
                ? 'Sinkronisasi...'
                : 'Force Sync'}
            </span>
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

