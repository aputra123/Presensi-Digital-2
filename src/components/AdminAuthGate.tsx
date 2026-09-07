import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, CheckCircle2, ArrowLeft, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { UserRole, ActiveTab } from '../types';
import { authenticateSession, UserSession, ROLE_CLAIMS_MAP } from '../utils/authSession';
import { stripMaliciousCharacters } from '../utils/sanitizer';

interface AdminAuthGateProps {
  requiredClaim: string;
  tabTitle: string;
  onSuccess: (session: UserSession) => void;
  onCancel: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  requiredClaim,
  tabTitle,
  onSuccess,
  onCancel,
  currentRole,
  onRoleChange,
}) => {
  const [targetRole, setTargetRole] = useState<UserRole>(currentRole === 'kepala_sekolah' ? 'kepala_sekolah' : 'admin');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = stripMaliciousCharacters(passcode).trim();
    if (!cleanPass) {
      setError('Silakan masukkan kode PIN atau kata sandi otorisasi.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateSession(targetRole, cleanPass);
      if (result.success && result.session) {
        onRoleChange(targetRole);
        onSuccess(result.session);
      } else {
        setError(result.error || 'Otorisasi gagal. Pastikan PIN atau sandi administratif sesuai.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem otorisasi token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoUnlock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Default school administrator PIN: 123456
      const result = await authenticateSession(targetRole, '123456');
      if (result.success && result.session) {
        onRoleChange(targetRole);
        onSuccess(result.session);
      } else {
        setError('Otorisasi cepat gagal.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Otorisasi Akses Administratif
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Halaman <span className="font-medium text-slate-800">{tabTitle}</span> memerlukan klaim token keamanan khusus.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
          klaim: {requiredClaim}
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center space-x-2 text-slate-700 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sistem Sesi Berbasis Token & Validasi Klaim (Claims-Based RBAC)</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Untuk mencegah akses tidak sah ke konfigurasi database, kunci darurat, dan log audit, silakan verifikasi identitas Anda sebagai <strong>Administrator SIMPEG</strong> atau <strong>Kepala Sekolah</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Pilih Peran Otoritas
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetRole('admin')}
              className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                targetRole === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Administrator SIMPEG
            </button>
            <button
              type="button"
              onClick={() => setTargetRole('kepala_sekolah')}
              className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                targetRole === 'kepala_sekolah'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Kepala Sekolah
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-700">
              PIN / Sandi Administratif
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Default: 123456
            </span>
          </div>
          <div className="relative">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Masukkan PIN (contoh: 123456)"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tracking-widest"
              autoFocus
            />
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
          >
            {isLoading ? (
              <span>Memverifikasi Token...</span>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Buka Akses & Terbitkan Sesi Token</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Uji coba cepat otorisasi lokal?
        </span>
        <button
          type="button"
          onClick={handleQuickDemoUnlock}
          disabled={isLoading}
          className="text-[11px] text-slate-700 hover:text-slate-900 font-medium underline underline-offset-2 cursor-pointer inline-flex items-center space-x-1"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Otorisasi Cepat (PIN Standar 123456)</span>
        </button>
      </div>
    </div>
  );
};
