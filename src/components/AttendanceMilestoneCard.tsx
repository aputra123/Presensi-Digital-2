import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  PartyPopper,
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { StreakCelebrationModal } from './StreakCelebrationModal';

interface AttendanceMilestoneCardProps {
  currentStreak?: number;
  config: SchoolConfig;
}

export const AttendanceMilestoneCard: React.FC<AttendanceMilestoneCardProps> = ({
  currentStreak = 14,
  config,
}) => {
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // Milestone Tiers: 5 Days, 10 Days (Gold), 20 Days (Diamond), 30 Days (Legendary)
  const nextTarget = currentStreak >= 30 ? 50 : currentStreak >= 20 ? 30 : currentStreak >= 10 ? 20 : 10;
  const progressPct = Math.min(Math.round((currentStreak / nextTarget) * 100), 100);

  return (
    <>
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-5 lg:p-6 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Flame className="w-6 h-6 fill-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                  Milestone Kedisiplinan
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold">
                  &gt; 90% Attendance
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                {currentStreak} Hari Beruntun Di Atas 90%
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsCelebrationOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Buka Sertifikat & Rayakan Prestasi"
          >
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Rayakan</span>
          </button>
        </div>

        {/* Progress Toward Next Streak Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Target Tier Berikutnya ({nextTarget} Hari):
            </span>
            <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono">
              {currentStreak} / {nextTarget} Hari ({progressPct}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 relative"
              style={{ width: `${progressPct}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-0.5">
            <span>Tier 1 (5d)</span>
            <span className={currentStreak >= 10 ? 'text-amber-600 font-extrabold' : ''}>Tier 2 (10d) ★</span>
            <span className={currentStreak >= 20 ? 'text-amber-600 font-extrabold' : ''}>Tier 3 (20d)</span>
            <span>Tier 4 (30d)</span>
          </div>
        </div>

        {/* Bottom Reward Callout */}
        <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold">
              Keluarga Besar {config.schoolName} berhak atas Piagam Emas 10 Hari!
            </span>
          </div>
          <button
            onClick={() => setIsCelebrationOpen(true)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 font-extrabold text-[11px] flex items-center space-x-1 cursor-pointer shrink-0 ml-2"
          >
            <span>Lihat Piagam</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Celebrate Modal */}
      <StreakCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        streakDays={currentStreak}
        config={config}
      />
    </>
  );
};
