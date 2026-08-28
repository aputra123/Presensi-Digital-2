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
} from 'lucide-react';
import { ActiveTab, LeaveRequest, SchoolConfig, ToastNotification, UserRole } from '../types';

interface NotificationBannerProps {
  notifications?: ToastNotification[];
  onDismissToast?: (id: string) => void;
  onReviewLeave?: (leaveId?: string) => void;
  onTriggerSimulation?: () => void;
  pendingLeaves?: LeaveRequest[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
  config: SchoolConfig;
  userRole: UserRole;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications = [],
  onDismissToast = (_id?: string) => {},
  onReviewLeave = (_leaveId?: string) => {},
  onTriggerSimulation = () => {},
  pendingLeaves = [],
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  config,
  userRole,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
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
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-800 tracking-tight">
              {config.schoolName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{currentDateStr}</span>
          </div>
        </div>

        {/* Right: Live Clock & Action Pill & Notification Trigger */}
        <div className="flex items-center space-x-2.5">
          {/* Live Clock Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{currentTime}</span>
          </div>

          {/* Pending Leaves Alert Pill if any */}
          {pendingLeaves.length > 0 && (
            <button
              onClick={() => setActiveTab('leaves')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer animate-pulse"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pendingLeaves.length} Izin Perlu Ditinjau</span>
            </button>
          )}

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
        {notifications.map((toast) => (
          <div
            key={toast.id}
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
