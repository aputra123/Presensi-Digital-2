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
  UserCheck,
  Download,
  Smartphone,
  Palette,
  PanelLeftClose,
  Pin,
  PinOff,
  Building2,
  PenTool,
  Lock,
} from 'lucide-react';
import { ActiveTab, SchoolConfig, UserRole } from '../types';
import { UserSession, hasClaim, ADMIN_ONLY_TABS } from '../utils/authSession';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: SchoolConfig;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  session?: UserSession | null;
  onRequestRoleChange?: (role: UserRole) => void;
  pendingLeavesCount: number;
  pendingGtkCount?: number;
  totalTodayCount: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isLocked?: boolean;
  setIsLocked?: (locked: boolean | ((prev: boolean) => boolean)) => void;
  onTriggerSimulation: () => void;
  onOpenInstallModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  config,
  userRole,
  setUserRole,
  session,
  onRequestRoleChange,
  pendingLeavesCount,
  pendingGtkCount = 0,
  totalTodayCount,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed = false,
  setIsCollapsed,
  isLocked = false,
  setIsLocked,
  onTriggerSimulation,
  onOpenInstallModal,
}) => {
  const isAutomationAdmin = userRole === 'admin' || userRole === 'bkd_staff' || userRole === 'bkd';

  const menuGroups = [
    {
      groupTitle: 'PRESENSI',
      items: [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'scan' as ActiveTab,
          label: 'Scanner QR Presensi',
          icon: QrCode,
        },
        {
          id: 'selfie' as ActiveTab,
          label: 'Selfie & Lokasi GPS',
          icon: Camera,
        },
        {
          id: 'tabel_absensi_asn' as ActiveTab,
          label: 'Tabel Tanda Tangan ASN',
          icon: PenTool,
        },
        {
          id: 'rekap' as ActiveTab,
          label: 'Rekapitulasi Presensi',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      groupTitle: 'MANAJEMEN & LAYANAN',
      items: [
        {
          id: 'layanan_gtk' as ActiveTab,
          label: 'Layanan & Izin GTK',
          icon: Award,
          badge: pendingGtkCount > 0 ? `${pendingGtkCount}` : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'teachers' as ActiveTab,
          label: 'Data Guru & Pegawai',
          icon: Briefcase,
        },
        {
          id: 'duty_roster' as ActiveTab,
          label: 'Jadwal Guru Piket',
          icon: UserCheck,
        },
        {
          id: 'calendar' as ActiveTab,
          label: 'Kalender & Jadwal',
          icon: CalendarDays,
        },
      ],
    },
    {
      groupTitle: 'BKD & SISTEM',
      items: [
        {
          id: 'apel_documentation' as ActiveTab,
          label: 'Dokumentasi Apel BKD',
          icon: Building2,
        },
        {
          id: 'bkd_automation' as ActiveTab,
          label: 'Sinkronisasi BKD',
          icon: FileCheck2,
        },
        {
          id: 'logs' as ActiveTab,
          label: 'Log Aktivitas & Audit',
          icon: History,
        },
        {
          id: 'config' as ActiveTab,
          label: 'Pengaturan Sistem',
          icon: Settings,
        },
      ],
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
    // Auto-hide / collapse sidebar on navigation if sidebar is not locked
    if (!isLocked && setIsCollapsed) {
      setIsCollapsed(true);
    }
  };

  return (
    <>
      {/* Mobile Backdrop & Overlay when opened */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileOpen
            ? 'translate-x-0'
            : isCollapsed
            ? '-translate-x-full'
            : '-translate-x-full lg:translate-x-0'
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
                className="w-9 h-9 rounded-lg object-contain bg-slate-50 p-1 border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                <School className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-semibold text-xs text-slate-900 truncate tracking-tight">
                {config.schoolName}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  NPSN {config.npsn}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-0.5">
            {/* Desktop Lock / Pinned Toggle Button */}
            {setIsLocked && (
              <button
                onClick={() => setIsLocked((prev) => !prev)}
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLocked
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
                title={
                  isLocked
                    ? 'Sidebar Terkunci (Pinned) - Klik untuk Buka Kunci (Auto-Hide)'
                    : 'Sidebar Bebas (Auto-Hide saat memilih menu) - Klik untuk Kunci Terbuka'
                }
              >
                {isLocked ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Desktop collapse button */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Role Selector */}
        <div className="p-3 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <span>Akses Role</span>
              {hasClaim('admin_access', session) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Sesi Berbasis Token Aktif" />
              )}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
              hasClaim('admin_access', session)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-700 border-slate-200'
            }`}>
              {userRole === 'kepala_sekolah'
                ? 'Kepala Sekolah'
                : userRole === 'admin'
                ? 'Admin SIMPEG'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'Auditor BKD'
                : 'Guru / GTK'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-200/50 rounded-lg">
            <button
              onClick={() => {
                if (onRequestRoleChange) {
                  onRequestRoleChange('admin');
                } else {
                  setUserRole('admin');
                }
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-medium rounded-md transition-all cursor-pointer text-center ${
                userRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Administrator SIMPEG & Presensi"
            >
              Admin
            </button>
            <button
              onClick={() => {
                if (onRequestRoleChange) {
                  onRequestRoleChange('kepala_sekolah');
                } else {
                  setUserRole('kepala_sekolah');
                }
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-medium rounded-md transition-all cursor-pointer text-center ${
                userRole === 'kepala_sekolah'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kepala Sekolah / Pejabat Penilai Kinerja"
            >
              Kepsek
            </button>
            <button
              onClick={() => {
                if (onRequestRoleChange) {
                  onRequestRoleChange('bkd_staff');
                } else {
                  setUserRole('bkd_staff');
                }
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-medium rounded-md transition-all cursor-pointer text-center ${
                userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Auditor / Staf BKD Pulau Taliabu"
            >
              BKD
            </button>
            <button
              onClick={() => {
                if (onRequestRoleChange) {
                  onRequestRoleChange('teacher');
                } else {
                  setUserRole('teacher');
                }
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-medium rounded-md transition-all cursor-pointer text-center ${
                userRole === 'teacher' || userRole === 'piket'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Guru / Tenaga Kependidikan"
            >
              Guru
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {group.groupTitle}
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isLockedTab = ADMIN_ONLY_TABS.includes(item.id) && !hasClaim('admin_access', session);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer group ${
                        isActive
                          ? 'bg-slate-900 text-white font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                        {isLockedTab && (
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
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
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-700 shrink-0">
              {userRole === 'kepala_sekolah'
                ? 'KS'
                : userRole === 'admin'
                ? 'AD'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'BK'
                : 'GT'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-800 truncate text-[11px]">
                {userRole === 'kepala_sekolah'
                  ? (config.principalName || 'Kepala Sekolah')
                  : userRole === 'admin'
                  ? (config.adminName || 'Admin SIMPEG')
                  : userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'Auditor BKD Pulau Taliabu'
                  : 'Guru / Tenaga Pendidik'}
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                T.A {config.academicYear} • {config.semester}
              </p>
            </div>
          </div>

          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </aside>
    </>
  );
};
