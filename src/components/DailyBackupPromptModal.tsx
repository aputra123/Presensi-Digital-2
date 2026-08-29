import React, { useState } from 'react';
import {
  HardDrive,
  Download,
  ShieldCheck,
  AlertTriangle,
  X,
  FileJson,
  Database,
  Cloud,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { AppBackupData, SchoolConfig } from '../types';

interface DailyBackupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  backupData: AppBackupData;
  onDownloadJson: () => void;
  onCloudBackup?: () => Promise<boolean>;
  onDismissToday: () => void;
}

export const DailyBackupPromptModal: React.FC<DailyBackupPromptModalProps> = ({
  isOpen,
  onClose,
  config,
  backupData,
  onDownloadJson,
  onCloudBackup,
  onDismissToday,
}) => {
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);
  const [cloudSuccess, setCloudSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCloud = async () => {
    if (!onCloudBackup) return;
    setIsCloudBackingUp(true);
    try {
      const res = await onCloudBackup();
      if (res) {
        setCloudSuccess(true);
        setTimeout(() => {
          onDismissToday();
          onClose();
        }, 1500);
      }
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  const handleLocalDownload = () => {
    onDownloadJson();
    onDismissToday();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase">
                  Proteksi Data Harian
                </span>
                <span className="text-[10px] text-slate-300 font-mono">{backupData.createdDate}</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-1">
                Pencadangan Otomatis Data Presensi
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start space-x-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-amber-900 dark:text-amber-200">
                Pemberitahuan Keamanan Data Offline
              </span>
              <p className="text-amber-800/90 dark:text-amber-300 leading-relaxed">
                Untuk mencegah kehilangan data akibat cache browser terhapus atau pergantian perangkat di{' '}
                <strong>{config.schoolName}</strong>, sistem menyarankan Anda menyimpan cadangan data (JSON file) hari ini.
              </p>
            </div>
          </div>

          {/* Backup Summary Scope */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Cakupan Data yang Disimpan:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">Format JSON Standar</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Data Presensi</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {backupData.totalRecords} Rekaman
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Siswa Terdaftar</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {backupData.totalStudents} Siswa
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Guru & Tenaga Kependidikan</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {backupData.totalTeachers} GTK
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Log Biometrik & Izin</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {(backupData.biometricLogs?.length || 0) + backupData.totalLeaves} Log
                </span>
              </div>
            </div>
          </div>

          {/* Action Options */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Action: Download JSON */}
            <button
              onClick={handleLocalDownload}
              className="w-full p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <FileJson className="w-4 h-4" />
              <span>Unduh File Cadangan JSON (Disarankan)</span>
            </button>

            {/* Secondary Action: Cloud Backup if provided */}
            {onCloudBackup && (
              <button
                onClick={handleCloud}
                disabled={isCloudBackingUp || cloudSuccess}
                className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {cloudSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Tersimpan di Cloud Firestore!</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-indigo-500" />
                    <span>{isCloudBackingUp ? 'Menghubungkan Cloud...' : 'Sinkronkan ke Cloud Firestore'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onDismissToday();
              onClose();
            }}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer"
          >
            Ingatkan Besok
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
