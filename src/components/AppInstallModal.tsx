import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  Chrome,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  X,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { SchoolConfig } from '../types';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  deferredPrompt: any;
  onInstallPwa: () => void;
  onChangeIconClick?: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
  config,
  deferredPrompt,
  onInstallPwa,
  onChangeIconClick,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header with App Logo & Title */}
        <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo Aplikasi"
                className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-1.5 border border-white/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 shadow-md">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Aplikasi Resmi PWA
                </span>
                <span className="text-xs text-indigo-200">v2.4 Pro</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1 truncate">
                {config.schoolName}
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Pasang di Semua HP (Android / iPhone) & Laptop (Windows / Mac)
              </p>
            </div>
          </div>

          {/* Quick Direct Install Action Button if browser prompt is available */}
          {deferredPrompt && (
            <div className="mt-5 pt-4 border-t border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-indigo-100 font-medium">
                ⚡ Browser Anda mendukung pemasangan instan 1-klik!
              </div>
              <button
                onClick={onInstallPwa}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Aplikasi Sekarang</span>
              </button>
            </div>
          )}
        </div>

        {/* Device Selection Tabs */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 max-w-[180px] py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Chrome)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 max-w-[180px] py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 max-w-[180px] py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Laptop / PC</span>
          </button>
        </div>

        {/* Tab Instructions Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Petunjuk Pemasangan di HP Android (Google Chrome / Samsung Internet)</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Buka Menu Browser (Titik Tiga ⋮)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Klik ikon titik tiga di sudut kanan atas layar Chrome.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pilih "Tambahkan ke Layar Utama" atau "Instal Aplikasi"
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih opsi <strong>"Install app"</strong> / <strong>"Add to Home screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Aplikasi Siap Digunakan Secara Mandiri
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ikon aplikasi SMPN 4 Satap Taliabu Barat akan muncul di layar utama HP Anda dan berjalan full-screen tanpa address bar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Apple className="w-4 h-4 text-indigo-600" />
                <span>Petunjuk Pemasangan di iPhone / iPad (Safari)</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <span>Buka di Safari & Klik Tombol Bagikan</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ketuk ikon <strong>Share</strong> (kotak dengan panah ke atas) di bagian bawah layar Safari.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <span>Pilih "Tambah ke Layar Utama"</span>
                      <PlusSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Gulir ke bawah dan ketuk opsi <strong>"Add to Home Screen"</strong> (+).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Ketuk "Tambah" (Add) di Kanan Atas
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ikon aplikasi resmi akan langsung terpasang di homescreen iOS Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>Petunjuk Pemasangan di Laptop / PC (Google Chrome & Microsoft Edge)</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik Ikon Pasang di Address Bar (Omnibox)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lihat ke ujung kanan bilah alamat (URL bar) browser Anda, klik ikon monitor dengan panah bawah (<strong>Install App</strong>).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik "Install" & Buat Pintasan Desktop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Aplikasi akan terbuka dalam jendela tersendiri layaknya software desktop mandiri (Windows Taskbar / MacOS Dock).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Icon Customizer Banner */}
          <div className="p-4 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                  Ingin Mengganti Ikon & Logo Aplikasi?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Admin dapat mengunggah logo sekolah baru atau memilih logo preset di menu Pengaturan.
                </p>
              </div>
            </div>

            {onChangeIconClick && (
              <button
                onClick={() => {
                  onClose();
                  onChangeIconClick();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                Ganti Ikon Sekarang
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mendukung Offline Cache & Update Otomatis</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
