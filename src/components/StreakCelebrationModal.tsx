import React from 'react';
import {
  Trophy,
  Sparkles,
  Award,
  Download,
  Share2,
  X,
  CheckCircle2,
  Flame,
  School,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { SchoolConfig } from '../types';

interface StreakCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  config: SchoolConfig;
}

export const StreakCelebrationModal: React.FC<StreakCelebrationModalProps> = ({
  isOpen,
  onClose,
  streakDays,
  config,
}) => {
  if (!isOpen) return null;

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-amber-200 dark:border-amber-900/60 shadow-2xl overflow-hidden relative">
        {/* Confetti / Particle Background Accents */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-500/20 via-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-4 left-6 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <div className="absolute top-8 right-12 w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
        <div className="absolute top-16 left-1/4 w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />

        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-100 shadow-inner">
              <Trophy className="w-6 h-6 text-yellow-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-yellow-200 text-[10px] font-black uppercase tracking-wider">
                  Rekor Prestasi Sekolah
                </span>
                <span className="text-amber-100 text-xs font-mono">10+ Days Streak</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">
                Selamat! Rekor Kehadiran &gt; 90% Terlampaui
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate / Award Card Display */}
        <div className="p-6 space-y-5">
          {/* Certificate Container */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-2 border-amber-300 dark:border-amber-700/80 shadow-md relative text-center space-y-4">
            {/* Corner Badge Seals */}
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/80 pb-3">
              <div className="flex items-center space-x-2 text-left">
                <School className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">
                    {config.schoolName}
                  </span>
                  <span className="text-[10px] text-slate-500">NPSN: {config.npsn}</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>GOLD EXCELLENCE</span>
              </div>
            </div>

            {/* Main Trophy Graphic */}
            <div className="py-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-900 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 border-4 border-white dark:border-slate-800">
                <Flame className="w-10 h-10 text-rose-600 fill-rose-500" />
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
                  Piagam Penghargaan Kedisiplinan
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {streakDays} HARI BERTURUT-TURUT &gt; 90%
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Diberikan dengan bangga kepada <strong>Seluruh Siswa, Guru & Tenaga Kependidikan</strong> atas
              konsistensi mempertahankan tingkat kehadiran harian prima di atas batas standar nasional.
            </p>

            {/* Signature & Seal Row */}
            <div className="pt-4 border-t border-amber-200 dark:border-amber-800/80 grid grid-cols-2 gap-4 text-xs">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">Kategori Prestasi:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Kedisiplinan Sekolah Hebat</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Kepala Sekolah:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{config.principalName}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrintCertificate}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md shadow-amber-600/20 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Cetak / Simpan Piagam</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
