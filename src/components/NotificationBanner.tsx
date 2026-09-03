import React, { useState, useEffect } from 'react';
import {
  Bell,
  Menu,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  X,
  ArrowRight,
  Shield,
  Send,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Building2,
  ShieldCheck,
  FileCheck2,
  Trash2,
  Info,
} from 'lucide-react';
import { ActiveTab, LeaveRequest, SchoolConfig, ToastNotification, UserRole } from '../types';

interface NotificationBannerProps {
  notifications?: ToastNotification[];
  onDismissToast?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onReviewLeave?: (leaveId?: string) => void;
  onTriggerSimulation?: () => void;
  onOpenBackupPrompt?: () => void;
  onOpenInstallModal?: () => void;
  pendingLeaves?: LeaveRequest[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  config: SchoolConfig;
  userRole: UserRole;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications = [],
  onDismissToast = (_id?: string) => {},
  onClearAllNotifications,
  onReviewLeave = (_leaveId?: string) => {},
  onTriggerSimulation = () => {},
  onOpenBackupPrompt,
  onOpenInstallModal,
  pendingLeaves = [],
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebar,
  isFullScreen = false,
  onToggleFullScreen,
  config,
  userRole,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WITA'
      );
      setCurrentDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top Fixed Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        {/* Left: Sidebar Toggle & Breadcrumb */}
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop/Laptop Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-all cursor-pointer text-xs font-bold shadow-2xs"
              title={isSidebarCollapsed ? 'Buka Sidebar Menu (Tampilkan)' : 'Sembunyikan Sidebar (Layar Penuh / Lebar)'}
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
                  <span>Menu</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="hidden xl:inline">Sembunyikan Sidebar</span>
                </>
              )}
            </button>
          )}

          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-800 tracking-tight">
              {config.schoolName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{currentDateStr}</span>
          </div>
        </div>

        {/* Right: Live Clock & Action Pill & Notification Trigger */}
        <div className="flex items-center space-x-2">
          {/* Full Screen Mode Toggle for Laptop/Projector */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center justify-center ${
                isFullScreen
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
              title={isFullScreen ? 'Keluar dari Mode Layar Penuh' : 'Mode Layar Penuh (F11 Fullscreen)'}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Role Indicator Badge */}
          <div
            className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
              userRole === 'kepala_sekolah'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : userRole === 'admin'
                ? 'bg-blue-600 text-white border-blue-700'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-indigo-600 text-white border-indigo-700'
            }`}
          >
            {userRole === 'kepala_sekolah' ? (
              <Building2 className="w-3.5 h-3.5 text-slate-950" />
            ) : userRole === 'bkd_staff' || userRole === 'bkd' ? (
              <Building2 className="w-3.5 h-3.5 text-white" />
            ) : userRole === 'admin' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            ) : (
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-200" />
            )}
            <span>
              {userRole === 'kepala_sekolah'
                ? 'Mode: Kepala Sekolah'
                : userRole === 'admin'
                ? 'Mode: Admin SIMPEG'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'Mode: Auditor BKD'
                : 'Mode: Guru / GTK'}
            </span>
          </div>

          {/* Live Clock Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{currentTime}</span>
          </div>

          {/* Install / Download App Button */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
              title="Unduh & Pasang Aplikasi di HP atau Laptop (PWA)"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden sm:inline">Unduh / Pasang App</span>
              <span className="sm:hidden">App</span>
            </button>
          )}

          {/* Pending Leaves Alert Pill if any */}
          {pendingLeaves.length > 0 && (
            <button
              onClick={() => setActiveTab('layanan_gtk')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer animate-pulse"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pendingLeaves.length} Izin GTK Perlu Ditinjau</span>
            </button>
          )}

          {/* Quick Daily Backup Button */}
          {onOpenBackupPrompt && (
            <button
              onClick={onOpenBackupPrompt}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
              title="Cadangkan seluruh data presensi harian ke file JSON"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              <span>Backup Harian</span>
            </button>
          )}

          {/* Notification Center Trigger Bell */}
          <div className="relative">
            <button
              id="header-notification-center-btn"
              onClick={() => setIsNotifDropdownOpen((prev) => !prev)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center justify-center ${
                notifications.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
              }`}
              title="Pusat Notifikasi Presensi & Izin"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300" />
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {isNotifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn">
                <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold tracking-wide uppercase">
                      Pusat Notifikasi ({notifications.length})
                    </h4>
                  </div>
                  <div className="flex items-center space-x-1">
                    {notifications.length > 0 && onClearAllNotifications && (
                      <button
                        onClick={() => {
                          onClearAllNotifications();
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors"
                        title="Kosongkan semua notifikasi"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Bersihkan</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotifDropdownOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        Belum Pernah Melakukan Absensi / Tidak Ada Notifikasi
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                        Data notifikasi saat ini kosong. Notifikasi kehadiran atau permohonan izin akan muncul secara otomatis ketika presensi dilakukan.
                      </p>
                    </div>
                  ) : (
                    notifications.map((toast) => (
                      <div key={toast.id} className="p-3 hover:bg-slate-50 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{toast.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{toast.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{toast.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          {toast.leaveId && (
                            <button
                              onClick={() => {
                                onReviewLeave(toast.leaveId);
                                onDismissToast(toast.id);
                                setIsNotifDropdownOpen(false);
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                            >
                              <span>Tinjau Izin</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => onDismissToast(toast.id)}
                            className="text-[11px] text-slate-400 hover:text-slate-700 ml-auto"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Simulate Notification Button */}
          <button
            onClick={onTriggerSimulation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Klik untuk memicu simulasi notifikasi izin baru dari siswa/guru"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulasi Notifikasi Izin</span>
            <span className="sm:hidden">+Notifikasi</span>
          </button>
        </div>
      </header>

      {/* Floating Active Toasts / Banners */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-md w-[calc(100vw-2.5rem)] pointer-events-none">
        {notifications.map((toast, index) => (
          <div
            key={`${toast.id || 'notif'}_${index}`}
            className="pointer-events-auto bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-start space-x-3.5 animate-bounce-short"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-swing" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {toast.title}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {toast.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                {toast.message}
              </p>

              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={() => {
                    onReviewLeave(toast.leaveId);
                    onDismissToast(toast.id);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tinjau Pengajuan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onDismissToast(toast.id)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            <button
              onClick={() => onDismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
