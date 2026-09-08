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
  FileCode,
  Copy,
  Check,
  MessageSquare,
  Globe,
  HardDrive,
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
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop' | 'download_files'>('android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
  }, []);

  const getAppUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  const handleCopyLink = () => {
    const url = getAppUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    const url = getAppUrl();
    const text = encodeURIComponent(
      `*Aplikasi Presensi Resmi ${config.schoolName}*\n\nSilakan klik tautan berikut untuk membuka dan memasang aplikasi presensi digital di HP/Laptop:\n${url}\n\n_Sistem Informasi Presensi Biometrik & Kepegawaian GTK_`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Download 1: Offline HTML Self-Launcher
  const handleDownloadHtmlLauncher = () => {
    const appUrl = getAppUrl();
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buka Presensi - ${config.schoolName}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      padding: 32px;
      border-radius: 24px;
      border: 1px solid #334155;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 { font-size: 18px; margin: 16px 0 8px; color: #ffffff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: #ffffff;
      text-decoration: none;
      font-weight: bold;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 14px;
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
      transition: transform 0.1s;
    }
    .btn:active { transform: scale(0.98); }
    .loader {
      width: 24px;
      height: 24px;
      border: 3px solid #334155;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="loader"></div>
    <h1>${config.schoolName}</h1>
    <p>Membuka portal presensi resmi...</p>
    <a href="${appUrl}" class="btn" id="openBtn">Buka Aplikasi Presensi</a>
  </div>
  <script>
    // Automatic redirection
    setTimeout(function() {
      window.location.replace("${appUrl}");
    }, 600);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presensi-${config.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}-Launcher.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess('Launcher HTML');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Download 2: Windows Desktop Shortcut (.url)
  const handleDownloadWindowsShortcut = () => {
    const appUrl = getAppUrl();
    const urlContent = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
HotKey=0
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,0
`;

    const blob = new Blob([urlContent], { type: 'application/internet-shortcut;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presensi-${config.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.url`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess('Shortcut Windows (.url)');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Download 3: PWA Configuration Bundle (.json)
  const handleDownloadPwaConfig = () => {
    const payload = {
      name: config.schoolName,
      npsn: config.npsn,
      appUrl: getAppUrl(),
      manifestUrl: `${window.location.origin}/manifest.json`,
      academicYear: config.academicYear,
      semester: config.semester,
      pwaVersion: '2.4.0',
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presensi-App-Config-${config.npsn}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess('Berkas Konfigurasi PWA');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Header with App Logo & Title */}
        <div className="p-6 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white relative">
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
                  {isStandalone ? 'PWA Terpasang' : 'Pusat Download & Pasang PWA'}
                </span>
                <span className="text-xs text-indigo-200">v2.4 Pro</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1 truncate">
                {config.schoolName}
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Download & Pasang di Semua HP (Android / iOS) & Komputer / Laptop (Windows / Mac)
              </p>
            </div>
          </div>

          {/* Quick 1-Click Install Button or Standalone Indicator */}
          {isStandalone ? (
            <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center space-x-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Aplikasi sedang berjalan dalam mode aplikasi mandiri (PWA Standalone).</span>
            </div>
          ) : deferredPrompt ? (
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
          ) : null}
        </div>

        {/* Quick Share & Link Copy Bar */}
        <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-600 font-medium truncate max-w-[240px] sm:max-w-md">
              {getAppUrl()}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Salin Tautan Aplikasi"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Tersalin!' : 'Salin Tautan'}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Kirim ke Grup WhatsApp Guru"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Bagikan WA</span>
            </button>
          </div>
        </div>

        {/* Device Selection Tabs */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'android'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Chrome)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ios'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'desktop'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Laptop / PC</span>
          </button>
          <button
            onClick={() => setActiveTab('download_files')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'download_files'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Unduh File Pintasan</span>
          </button>
        </div>

        {/* Tab Instructions Content */}
        <div className="p-6 space-y-5">
          {/* Download Notification if triggered */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Berhasil mengunduh berkas {downloadSuccess}. Silakan buka dari folder Unduhan (Downloads) Anda.</span>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Petunjuk Pemasangan di HP Android (Google Chrome / Samsung Internet)</span>
                </div>
                {deferredPrompt && (
                  <button
                    onClick={onInstallPwa}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pasang Sekarang</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Buka Menu Browser (Titik Tiga ⋮)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik ikon titik tiga di sudut kanan atas layar peramban Google Chrome di HP Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Pilih "Tambahkan ke Layar Utama" atau "Instal Aplikasi"
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih opsi <strong>"Install app"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Aplikasi Siap Digunakan Secara Mandiri
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ikon aplikasi <strong>{config.schoolName}</strong> akan muncul di beranda HP Anda, berjalan layar penuh (full-screen) tanpa address bar dan mendukung presensi offline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                <Apple className="w-4 h-4 text-indigo-600" />
                <span>Petunjuk Pemasangan di iPhone / iPad (Safari)</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <span>Buka di Safari & Klik Tombol Bagikan</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ketuk ikon <strong>Share</strong> (kotak dengan panah mengarah ke atas) di bilah bawah Safari.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <span>Pilih "Tambah ke Layar Utama"</span>
                      <PlusSquare className="w-3.5 h-3.5 text-slate-700" />
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gulir ke bawah pada menu aksi dan ketuk opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Ketuk "Tambah" (Add) di Sudut Kanan Atas
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ikon aplikasi resmi akan tersemat di beranda iOS Anda dan siap digunakan seperti aplikasi App Store.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>Petunjuk Pemasangan di Laptop / PC (Google Chrome & Microsoft Edge)</span>
                </div>
                {deferredPrompt && (
                  <button
                    onClick={onInstallPwa}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pasang di Laptop</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik Ikon Pasang di Address Bar (Omnibox)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Perhatikan sudut kanan bilah alamat (URL bar) browser Anda, klik ikon monitor/panah bawah (<strong>Install App</strong>).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik "Install" & Buat Pintasan Desktop
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aplikasi akan terbuka dalam jendela tersendiri layaknya software desktop mandiri dan dapat disematkan ke Taskbar Windows atau Dock macOS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'download_files' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Unduh File Pintasan Aplikasi Langsung (Offline Launcher & Shortcuts)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unduh berkas peluncur mandiri untuk disimpan di folder komputer atau HP Anda agar dapat membuka aplikasi secara instan kapan saja:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: HTML Launcher */}
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                      <FileCode className="w-4 h-4 text-indigo-600" />
                      <span>Peluncur Aplikasi Web (.html)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      File pintasan HTML yang dapat diklik 2x di laptop (Windows / Mac / Linux) atau disimpan di HP untuk membuka aplikasi secara otomatis.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadHtmlLauncher}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Peluncur .HTML</span>
                  </button>
                </div>

                {/* Option 2: Windows Shortcut .url */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                      <Laptop className="w-4 h-4 text-slate-700" />
                      <span>Pintasan Windows Desktop (.url)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      File shortcut resmi Windows. Cukup seret ke Desktop komputer kantor untuk membuka presensi langsung dalam browser default.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadWindowsShortcut}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Shortcut .URL</span>
                  </button>
                </div>

                {/* Option 3: PWA Config & Manifest JSON */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      <span>Paket Konfigurasi PWA (.json)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Berkas metadata profil aplikasi lengkap dengan URL manifest, identitas sekolah, dan endpoint sinkronisasi untuk admin IT.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPwaConfig}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Paket .JSON</span>
                  </button>
                </div>

                {/* Option 4: Direct Share */}
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Kirim ke WhatsApp Guru</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Kirimkan tautan instalasi langsung dengan format pesan kedinasan resmi ke nomor atau grup WhatsApp dewan guru.
                    </p>
                  </div>
                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Bagikan ke WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Icon Customizer Banner */}
          <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">
                  Ingin Mengganti Ikon & Logo Aplikasi?
                </h4>
                <p className="text-[11px] text-slate-500">
                  Admin dapat mengunggah logo sekolah baru atau memilih logo instansi di menu Pengaturan.
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mendukung Offline Cache & Pembaruan Otomatis</span>
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
