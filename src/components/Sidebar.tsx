import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Camera,
  Users2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Briefcase,
  CreditCard,
  CalendarDays,
  Settings,
  School,
  ShieldCheck,
  Sparkles,
  X,
  Award,
  Cloud,
  FileCheck2,
  History,
} from 'lucide-react';
import { ActiveTab, SchoolConfig, UserRole } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: SchoolConfig;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  pendingLeavesCount: number;
  pendingGtkCount?: number;
  totalTodayCount: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onTriggerSimulation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  config,
  userRole,
  setUserRole,
  pendingLeavesCount,
  pendingGtkCount = 0,
  totalTodayCount,
  isMobileOpen,
  setIsMobileOpen,
  onTriggerSimulation,
}) => {
  const menuGroups = [
    {
      groupTitle: 'UTAMA & MONITORING',
      items: [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Dashboard & Statistik',
          icon: LayoutDashboard,
          badge: `${totalTodayCount} Presensi`,
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
        {
          id: 'calendar' as ActiveTab,
          label: 'Kalender & Jadwal',
          icon: CalendarDays,
          badge: 'TP 2026/27',
          badgeColor: 'bg-indigo-100 text-indigo-700',
        },
      ],
    },
    {
      groupTitle: 'PRESENSI ELEKTRONIK',
      items: [
        {
          id: 'scan' as ActiveTab,
          label: 'Scanner QR Code',
          icon: QrCode,
        },
        {
          id: 'selfie' as ActiveTab,
          label: 'Selfie + GPS & BKD',
          icon: Camera,
          badge: 'BKD DKI',
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'batch_class' as ActiveTab,
          label: 'Absensi Rombel (Kelas)',
          icon: Users2,
        },
        {
          id: 'rekap' as ActiveTab,
          label: 'Rekapitulasi Presensi',
          icon: FileSpreadsheet,
          badge: 'Excel / CSV',
          badgeColor: 'bg-slate-100 text-slate-700',
        },
      ],
    },
    {
      groupTitle: 'LAYANAN & PERIZINAN GTK',
      items: [
        {
          id: 'layanan_gtk' as ActiveTab,
          label: 'Layanan & Izin GTK',
          icon: Award,
          badge: pendingGtkCount > 0 ? `${pendingGtkCount} Verifikasi` : 'Kepsek & Admin',
          badgeColor: pendingGtkCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-700',
        },
        {
          id: 'leaves' as ActiveTab,
          label: 'Izin & Sakit Siswa',
          icon: FileText,
          badge: pendingLeavesCount > 0 ? `${pendingLeavesCount} Baru` : undefined,
          badgeColor: 'bg-rose-500 text-white animate-pulse',
        },
      ],
    },
    {
      groupTitle: 'DATA POKOK PENDIDIKAN',
      items: [
        {
          id: 'teachers' as ActiveTab,
          label: 'Data Guru & Pegawai',
          icon: Briefcase,
          badge: 'PNS/PPPK',
          badgeColor: 'bg-purple-100 text-purple-700',
        },
        {
          id: 'students' as ActiveTab,
          label: 'Data Siswa & Rombel',
          icon: GraduationCap,
        },
        {
          id: 'cards' as ActiveTab,
          label: 'Kartu QR Siswa & GTK',
          icon: CreditCard,
          badge: 'QR Card',
          badgeColor: 'bg-blue-100 text-blue-700',
        },
      ],
    },
    {
      groupTitle: 'CLOUD & INTEGRASI',
      items: [
        {
          id: 'workspace' as ActiveTab,
          label: 'Google Workspace & Cloud',
          icon: Cloud,
          badge: 'Drive/Sheets',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
        {
          id: 'logs' as ActiveTab,
          label: 'Log Aktivitas & Audit',
          icon: History,
          badge: 'Audit Trail',
          badgeColor: 'bg-slate-100 text-slate-700',
        },
        {
          id: 'config' as ActiveTab,
          label: 'Pengaturan & Logo',
          icon: Settings,
        },
      ],
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200/90 shadow-lg lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with School Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-900 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <School className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs text-slate-900 truncate leading-tight tracking-tight">
                {config.schoolName}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-semibold text-slate-500 font-mono truncate">
                  NPSN {config.npsn}
                </span>
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Role Access Selector (Admin vs Guru/GTK Piket) */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Mode Hak Akses (2 Level):
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
              {userRole === 'admin' ? 'Admin' : 'Piket'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setUserRole('admin')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                userRole === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin / SIMPEG</span>
            </button>
            <button
              onClick={() => setUserRole('piket')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                userRole === 'piket'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Guru/GTK Piket</span>
            </button>
          </div>

          <button
            onClick={onTriggerSimulation}
            className="w-full py-1.5 px-2 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-indigo-200/60"
            title="Kirim Simulasi Izin Baru untuk Ditinjau"
          >
            <Sparkles className="w-3 h-3" />
            <span>Simulasi Notifikasi Masuk</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                {group.groupTitle}
              </div>

              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                          : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-indigo-400'
                              : 'text-slate-400 group-hover:text-indigo-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer School Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-[10px] shrink-0">
              {userRole === 'admin' ? 'ADM' : 'PKT'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate text-[11px]">
                {userRole === 'admin'
                  ? (config.adminName || 'Admin SIMPEG / Kepsek')
                  : 'Petugas Piket Harian'}
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                T.A {config.academicYear} • {config.semester}
              </p>
            </div>
          </div>

          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
      </aside>
    </>
  );
};
