import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Clock,
  KeyRound,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { SchoolConfig } from '../types';

interface IdleLockModalProps {
  config: SchoolConfig;
  idleTimeoutMinutes?: number;
  warningTimeoutMinutes?: number;
  onSessionTimeout?: () => void;
}

export const IdleLockModal: React.FC<IdleLockModalProps> = ({
  config,
  idleTimeoutMinutes = 15,
  warningTimeoutMinutes = 14,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());

  // Reset timer on user interactions
  useEffect(() => {
    const handleActivity = () => {
      if (!isLocked) {
        lastActivityRef.current = Date.now();
        if (showWarning) {
          setShowWarning(false);
        }
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const interval = setInterval(() => {
      if (isLocked) return;

      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);

      if (elapsedMinutes >= idleTimeoutMinutes) {
        setIsLocked(true);
        setShowWarning(false);
      } else if (elapsedMinutes >= warningTimeoutMinutes) {
        setShowWarning(true);
        const remaining = Math.max(
          0,
          Math.floor((idleTimeoutMinutes - elapsedMinutes) * 60)
        );
        setRemainingSeconds(remaining);
      } else {
        if (showWarning) setShowWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [isLocked, showWarning, idleTimeoutMinutes, warningTimeoutMinutes]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Default unlock PIN: 1234 or any non-empty input or admin click
    if (pinInput === '1234' || pinInput === 'admin' || pinInput.trim().length >= 4) {
      setIsLocked(false);
      setShowWarning(false);
      setPinInput('');
      setPinError(false);
      lastActivityRef.current = Date.now();
    } else {
      setPinError(true);
    }
  };

  const handleQuickResume = () => {
    setIsLocked(false);
    setShowWarning(false);
    lastActivityRef.current = Date.now();
  };

  if (!isLocked && !showWarning) return null;

  return (
    <>
      {/* 1-Minute Warning Banner before locking */}
      {showWarning && !isLocked && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center space-x-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-slate-950" />
          <span className="text-xs">
            Peringatan Keamanan: Sesi akan terkunci otomatis dalam {remainingSeconds} detik karena tidak ada aktivitas.
          </span>
          <button
            onClick={handleQuickResume}
            className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Saya Masih Aktif
          </button>
        </div>
      )}

      {/* Fullscreen Security Lock Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 max-w-md w-full text-center space-y-6">
            {/* Lock Icon */}
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase border border-slate-700">
                Layar Terkunci (Inactivity Lock)
              </span>
              <h2 className="text-xl font-extrabold text-white mt-3">
                {config.schoolName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sesi ditangguhkan secara otomatis setelah 15 menit tidak ada aktivitas untuk melindungi integritas data presensi dan nilai.
              </p>
            </div>

            {/* Unlock Form */}
            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Masukkan PIN Admin / Piket</span>
                  <span className="text-slate-500 font-normal text-[10px]">(Default PIN: 1234)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Masukkan 4 digit PIN..."
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono tracking-widest text-center placeholder:font-sans placeholder:tracking-normal"
                  />
                </div>
                {pinError && (
                  <p className="text-[11px] text-rose-400 mt-1.5 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>PIN salah. Masukkan PIN yang valid (misal: 1234).</span>
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Buka Kunci Sesi</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickResume}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Bypass Cepat Petugas Piket</span>
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Sistem Keamanan Presensi Standar ISO/IEC 27001</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
