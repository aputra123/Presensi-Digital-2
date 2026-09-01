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
      groupTitle: 'PRESENSI ELEKTRONIK GTK',
      items: [
        {
          id: 'scan' as ActiveTab,
          label: 'Scanner QR Code Guru/GTK',
          icon: QrCode,
        },
        {
          id: 'selfie' as ActiveTab,
          label: 'Selfie + GPS & BKD',
          icon: Camera,
          badge: 'BKD ASN',
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'biometric_logs' as ActiveTab,
          label: 'Log Biometrik Wajah',
          icon: ShieldCheck,
          badge: 'Face ID',
          badgeColor: 'bg-indigo-100 text-indigo-700',
        },
        {
          id: 'bkd_automation' as ActiveTab,
          label: 'Otomasi BKD Taliabu',
          icon: FileCheck2,
          badge: isAutomationAdmin ? '15:00 Otomatis' : 'Mode Baca',
          badgeColor: isAutomationAdmin
            ? 'bg-emerald-100 text-emerald-800 font-extrabold'
            : 'bg-slate-100 text-slate-600',
        },
        {
          id: 'rekap' as ActiveTab,
          label: 'Rekapitulasi Presensi GTK',
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
          badge: pendingGtkCount > 0 ? `${pendingGtkCount} Verifikasi` : 'Persetujuan Ganda',
          badgeColor: pendingGtkCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-700',
        },
      ],
    },
    {
      groupTitle: 'DATA KEPEGAWAIAN & GTK',
      items: [
        {
          id: 'teachers' as ActiveTab,
          label: 'Data Guru & Pegawai ASN',
          icon: Briefcase,
          badge: 'PNS/PPPK',
          badgeColor: 'bg-purple-100 text-purple-700',
        },
        {
          id: 'duty_roster' as ActiveTab,
          label: 'Jadwal & Roster Guru Piket',
          icon: UserCheck,
          badge: 'Piket Harian',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
      ],
    },
    {
      groupTitle: 'CLOUD & SISTEM AUDIT',
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
          label: 'Log Aktivitas & Jejak Audit',
          icon: History,
          badge: 'Audit Trail',
          badgeColor: 'bg-slate-100 text-slate-700',
        },
        {
          id: 'config' as ActiveTab,
          label: 'Pengaturan & SIMPEG',
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
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200/90 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
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

          <div className="flex items-center space-x-1">
            {/* Desktop Lock / Pinned Toggle Button */}
            {setIsLocked && (
              <button
                onClick={() => setIsLocked((prev) => !prev)}
                className={`hidden lg:flex p-1.5 rounded-xl transition-all cursor-pointer ${
                  isLocked
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={
                  isLocked
                    ? 'Sidebar Terkunci Terbuka (Pinned) - Klik untuk Buka Kunci (Auto-Hide)'
                    : 'Sidebar Bebas (Auto-Hide saat memilih menu) - Klik untuk Kunci Terbuka (Pinned)'
                }
              >
                {isLocked ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>
            )}

            {/* Desktop collapse button */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                title="Sembunyikan Sidebar / Tampilan Lebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4-Role Access Selector (Admin, Kepsek, Guru/GTK, Auditor BKD) */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Hak Akses Role:
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                userRole === 'kepala_sekolah'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : userRole === 'admin'
                  ? 'bg-blue-600 text-white'
                  : userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {userRole === 'kepala_sekolah'
                ? 'Kepala Sekolah'
                : userRole === 'admin'
                ? 'Admin SIMPEG'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'Auditor BKD'
                : 'Guru / GTK'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => {
                setUserRole('admin');
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-bold rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer text-center ${
                userRole === 'admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
              title="Administrator SIMPEG & Presensi"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate w-full">Admin</span>
            </button>
            <button
              onClick={() => {
                setUserRole('kepala_sekolah');
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-bold rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer text-center ${
                userRole === 'kepala_sekolah'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
              title="Kepala Sekolah / Pejabat Penilai Kinerja"
            >
              <Award className="w-3.5 h-3.5" />
              <span className="truncate w-full">Kepsek</span>
            </button>
            <button
              onClick={() => {
                setUserRole('bkd_staff');
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-bold rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer text-center ${
                userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
              title="Auditor / Staf BKD Pulau Taliabu"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate w-full">BKD</span>
            </button>
            <button
              onClick={() => {
                setUserRole('teacher');
                setIsMobileOpen(false);
              }}
              className={`py-1.5 px-0.5 text-[9px] font-bold rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer text-center ${
                userRole === 'teacher' || userRole === 'piket'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
              }`}
              title="Guru / Tenaga Kependidikan"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span className="truncate w-full">Guru</span>
            </button>
          </div>

          <button
            onClick={() => {
              onTriggerSimulation();
              setIsMobileOpen(false);
            }}
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

        {/* PWA & Install App Widget */}
        <div className="px-3 py-2 space-y-1.5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              if (onOpenInstallModal) onOpenInstallModal();
              setIsMobileOpen(false);
            }}
            className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-between shadow-xs cursor-pointer group"
          >
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-indigo-200 group-hover:animate-bounce" />
              <span>Pasang / Unduh App</span>
            </div>
            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-white/20 rounded-md font-bold">
              PWA
            </span>
          </button>

          <button
            onClick={() => handleNavClick('config')}
            className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ganti Ikon & Logo Sekolah</span>
          </button>
        </div>

        {/* Footer School Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                userRole === 'kepala_sekolah'
                  ? 'bg-amber-100 text-amber-950 border border-amber-400'
                  : userRole === 'admin'
                  ? 'bg-blue-100 text-blue-800'
                  : userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {userRole === 'kepala_sekolah'
                ? 'KS'
                : userRole === 'admin'
                ? 'ADM'
                : userRole === 'bkd_staff' || userRole === 'bkd'
                ? 'BKD'
                : 'GTK'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate text-[11px]">
                {userRole === 'kepala_sekolah'
                  ? (config.principalName || 'Kepala Sekolah')
                  : userRole === 'admin'
                  ? (config.adminName || 'Admin SIMPEG')
                  : userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'Auditor BKD Pulau Taliabu'
                  : 'Guru / Tenaga Pendidik'}
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                {userRole === 'kepala_sekolah'
                  ? 'Otoritas Pengesahan Eksekutif'
                  : userRole === 'bkd_staff' || userRole === 'bkd'
                  ? 'Pengawasan Disiplin & TPP ASN'
                  : userRole === 'admin'
                  ? 'Manajemen Sistem SIMPEG'
                  : `T.A ${config.academicYear} • ${config.semester}`}
              </p>
            </div>
          </div>

          {userRole === 'kepala_sekolah' ? (
            <Award className="w-4 h-4 text-amber-600 shrink-0" />
          ) : userRole === 'bkd_staff' || userRole === 'bkd' ? (
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          )}
        </div>
      </aside>
    </>
  );
};
