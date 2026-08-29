import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  AttendanceRecord,
  LeaveRequest,
  SchoolClass,
  SchoolConfig,
  Student,
  Teacher,
  UserRole,
  AcademicEvent,
  ToastNotification,
  GtkServiceRequest,
  ActivityLog,
  BiometricLog,
  AppBackupData,
  DutyAssignment,
} from './types';
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_CLASSES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_SCHOOL_CONFIG,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_ACADEMIC_EVENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_GTK_SERVICES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_BIOMETRIC_LOGS,
  INITIAL_DUTY_ROSTER,
  getTodayDateString,
} from './data/schoolData';
import { Sidebar } from './components/Sidebar';
import { NotificationBanner } from './components/NotificationBanner';
import { DashboardStats } from './components/DashboardStats';
import { QrScannerTab } from './components/QrScannerTab';
import { SelfieGpsTab } from './components/SelfieGpsTab';
import { BiometricLogsTab } from './components/BiometricLogsTab';
import { DailyBackupPromptModal } from './components/DailyBackupPromptModal';
import { BatchClassAttendance } from './components/BatchClassAttendance';
import { RekapitulasiView } from './components/RekapitulasiView';
import { BKDTaliabuAutomationTab } from './components/BKDTaliabuAutomationTab';
import { LeaveRequestsTab } from './components/LeaveRequestsTab';
import { GtkServicesTab } from './components/GtkServicesTab';
import { GoogleWorkspaceTab } from './components/GoogleWorkspaceTab';
import { ActivityLogsTab } from './components/ActivityLogsTab';
import { StudentManagementTab } from './components/StudentManagementTab';
import { TeacherManagementTab } from './components/TeacherManagementTab';
import { TeacherDutyRosterTab } from './components/TeacherDutyRosterTab';
import { StudentCardsTab } from './components/StudentCardsTab';
import { AcademicCalendarTab } from './components/AcademicCalendarTab';
import { ConfigTab } from './components/ConfigTab';
import { PrintModal } from './components/PrintModal';
import { QuickActionsFab } from './components/QuickActionsFab';
import { SystemSyncStatusFooter } from './components/SystemSyncStatusFooter';
import { School, ShieldCheck, Sparkles, HardDrive, AlertOctagon, Lock } from 'lucide-react';
import { playBeepSound, formatDateIndo } from './utils/soundAndDate';
import { saveBackupToFirestore } from './lib/firebase';

export default function App() {
  const todayDate = getTodayDateString();

  // State initialization with localStorage persistence
  const [config, setConfig] = useState<SchoolConfig>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_config');
      return saved ? JSON.parse(saved) : INITIAL_SCHOOL_CONFIG;
    } catch {
      return INITIAL_SCHOOL_CONFIG;
    }
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_classes');
      return saved ? JSON.parse(saved) : INITIAL_CLASSES;
    } catch {
      return INITIAL_CLASSES;
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_students');
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_teachers');
      return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
    } catch {
      return INITIAL_TEACHERS;
    }
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_records');
      return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_RECORDS;
    } catch {
      return INITIAL_ATTENDANCE_RECORDS;
    }
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_leaves');
      return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
    } catch {
      return INITIAL_LEAVE_REQUESTS;
    }
  });

  const [gtkServices, setGtkServices] = useState<GtkServiceRequest[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_gtk_services');
      return saved ? JSON.parse(saved) : INITIAL_GTK_SERVICES;
    } catch {
      return INITIAL_GTK_SERVICES;
    }
  });

  const [events, setEvents] = useState<AcademicEvent[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_events');
      return saved ? JSON.parse(saved) : INITIAL_ACADEMIC_EVENTS;
    } catch {
      return INITIAL_ACADEMIC_EVENTS;
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_activity_logs');
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
    } catch {
      return INITIAL_ACTIVITY_LOGS;
    }
  });

  const [biometricLogs, setBiometricLogs] = useState<BiometricLog[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_biometric_logs');
      return saved ? JSON.parse(saved) : INITIAL_BIOMETRIC_LOGS;
    } catch {
      return INITIAL_BIOMETRIC_LOGS;
    }
  });

  const [dutyRoster, setDutyRoster] = useState<DutyAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_duty_roster');
      return saved ? JSON.parse(saved) : INITIAL_DUTY_ROSTER;
    } catch {
      return INITIAL_DUTY_ROSTER;
    }
  });

  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('school_presensi_is_system_locked') === 'true';
    } catch {
      return false;
    }
  });

  const [lastHandshakeTime, setLastHandshakeTime] = useState<Date>(() => new Date());

  const [notifications, setNotifications] = useState<ToastNotification[]>(() => {
    try {
      const saved = localStorage.getItem('school_presensi_notifs');
      const loaded: ToastNotification[] = saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
      const seen = new Set<string>();
      return loaded.filter((n) => {
        if (!n || !n.id || seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDailyBackupModalOpen, setIsDailyBackupModalOpen] = useState(false);

  // Automated Daily Backup Check: If no backup prompted today, prompt user to safeguard data
  useEffect(() => {
    try {
      const lastBackupDate = localStorage.getItem('school_presensi_last_backup_prompt_date');
      if (lastBackupDate !== todayDate) {
        // Set a gentle 1.2s delay after page boot so user sees the interface first
        const timer = setTimeout(() => {
          setIsDailyBackupModalOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error('Backup check error:', e);
    }
  }, [todayDate]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_config', JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_classes', JSON.stringify(classes));
    } catch (e) {
      console.error(e);
    }
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_students', JSON.stringify(students));
    } catch (e) {
      console.error(e);
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_teachers', JSON.stringify(teachers));
    } catch (e) {
      console.error(e);
    }
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_records', JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_leaves', JSON.stringify(leaves));
    } catch (e) {
      console.error(e);
    }
  }, [leaves]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_gtk_services', JSON.stringify(gtkServices));
    } catch (e) {
      console.error(e);
    }
  }, [gtkServices]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_events', JSON.stringify(events));
    } catch (e) {
      console.error(e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_activity_logs', JSON.stringify(activityLogs));
    } catch (e) {
      console.error(e);
    }
  }, [activityLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_biometric_logs', JSON.stringify(biometricLogs));
    } catch (e) {
      console.error(e);
    }
  }, [biometricLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_duty_roster', JSON.stringify(dutyRoster));
    } catch (e) {
      console.error(e);
    }
  }, [dutyRoster]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_is_system_locked', String(isSystemLocked));
    } catch (e) {
      console.error(e);
    }
  }, [isSystemLocked]);

  useEffect(() => {
    try {
      localStorage.setItem('school_presensi_notifs', JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  // Biometric Logs Handler
  const handleAddBiometricLog = (newLog: BiometricLog) => {
    setBiometricLogs((prev) => [newLog, ...prev]);
  };

  // Duty Roster Handlers
  const handleAddOrUpdateDuty = (duty: DutyAssignment) => {
    setDutyRoster((prev) => {
      const idx = prev.findIndex((d) => d.id === duty.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = duty;
        return copy;
      }
      return [duty, ...prev];
    });

    const notif: ToastNotification = {
      id: `notif_duty_${Date.now()}`,
      title: 'Jadwal Piket Diperbarui',
      message: `${duty.teacherName} ditugaskan sebagai ${duty.roleTitle} pada hari ${duty.day.toUpperCase()}.`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
  };

  const handleDeleteDuty = (id: string) => {
    setDutyRoster((prev) => prev.filter((d) => d.id !== id));
  };

  // Emergency System Lockdown Toggle
  const handleToggleSystemLock = (locked: boolean) => {
    setIsSystemLocked(locked);
    const notif: ToastNotification = {
      id: `notif_lock_${Date.now()}`,
      title: locked ? 'Emergency System Lockdown Diaktifkan' : 'Sistem Dibuka Kembali (Unlocked)',
      message: locked
        ? 'Input presensi manual ditangguhkan demi integritas data presensi.'
        : 'Input presensi manual telah kembali dibuka secara normal.',
      type: locked ? 'system' : 'system',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
  };

  // Emergency Absence from Quick Actions
  const handleAddEmergencyAbsence = (leave: LeaveRequest, newRecord?: AttendanceRecord) => {
    setLeaves((prev) => [leave, ...prev]);
    if (newRecord) {
      setRecords((prev) => [newRecord, ...prev]);
    }
    const notif: ToastNotification = {
      id: `notif_emg_${Date.now()}`,
      title: 'Izin Darurat Berhasil Dicatat',
      message: `Izin/Sakit darurat untuk ${leave.personName} telah disahkan dan dicatat langsung ke buku presensi.`,
      type: 'leave_request',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
  };

  // Realtime Cloud Handshake Sync Trigger
  const handleTriggerHandshakeSync = async () => {
    try {
      const payload = generateBackupPayload();
      await saveBackupToFirestore(payload);
      setLastHandshakeTime(new Date());
    } catch (e) {
      setLastHandshakeTime(new Date());
    }
  };

  // Full System Backup Payload Generator
  const generateBackupPayload = useCallback((): AppBackupData => {
    const now = new Date();
    return {
      id: `backup_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`,
      timestamp: now.toISOString(),
      createdDate: now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      createdTime: now.toLocaleTimeString('id-ID'),
      source: 'Automated Daily Backup System',
      totalRecords: records.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      totalLeaves: leaves.length,
      totalGtkServices: gtkServices.length,
      records,
      students,
      teachers,
      classes,
      leaves,
      gtkServices,
      events,
      config,
      activityLogs,
      biometricLogs,
    };
  }, [records, students, teachers, classes, leaves, gtkServices, events, config, activityLogs, biometricLogs]);

  // Download Local JSON Backup file
  const handleDownloadBackupJson = useCallback(() => {
    const payload = generateBackupPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanSchool = config.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Backup_Presensi_${cleanSchool}_${todayDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      localStorage.setItem('school_presensi_last_backup_prompt_date', todayDate);
    } catch (e) {
      console.error(e);
    }

    const notif: ToastNotification = {
      id: `notif_bk_${Date.now()}`,
      title: 'Pencadangan Data Berhasil',
      message: `File cadangan JSON (${payload.totalRecords} presensi, ${payload.totalStudents} siswa, ${payload.totalTeachers} GTK) telah berhasil diunduh ke perangkat Anda.`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
  }, [generateBackupPayload, config.schoolName, todayDate]);

  // Cloud Firestore Backup Integration
  const handleCloudBackup = useCallback(async (): Promise<boolean> => {
    const payload = generateBackupPayload();
    try {
      const res = await saveBackupToFirestore(payload);
      if (res.success) {
        localStorage.setItem('school_presensi_last_backup_prompt_date', todayDate);
        const notif: ToastNotification = {
          id: `notif_cloud_${Date.now()}`,
          title: 'Cloud Firestore Sync Sukses',
          message: `Data presensi SMPN 4 Satap Taliabu Barat tersinkronisasi aman ke Cloud Firestore (${res.id}).`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          read: false,
        };
        setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Cloud backup error:', err);
      return false;
    }
  }, [generateBackupPayload, todayDate]);

  // Restore Full System Backup
  const handleRestoreBackup = (backupData: AppBackupData) => {
    if (backupData.config) setConfig(backupData.config);
    if (backupData.classes) setClasses(backupData.classes);
    if (backupData.students) setStudents(backupData.students);
    if (backupData.teachers) setTeachers(backupData.teachers);
    if (backupData.records) setRecords(backupData.records);
    if (backupData.leaves) setLeaves(backupData.leaves);
    if (backupData.gtkServices) setGtkServices(backupData.gtkServices);
    if (backupData.events) setEvents(backupData.events);
    if (backupData.activityLogs) setActivityLogs(backupData.activityLogs);
    if (backupData.biometricLogs) setBiometricLogs(backupData.biometricLogs);

    const notif: ToastNotification = {
      id: `notif_rst_${Date.now()}`,
      title: 'Pemulihan Cadangan Berhasil',
      message: `Data presensi sekolah berhasil dipulihkan dari cadangan tanggal ${backupData.createdDate || 'sebelumnya'}.`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 8)]);
  };

  // Attendance Handlers
  const handleRecordAttendance = (newRecord: AttendanceRecord) => {
    setRecords((prev) => {
      const existsIndex = prev.findIndex(
        (r) =>
          r.personId === newRecord.personId &&
          r.date === newRecord.date &&
          r.type === newRecord.type
      );
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = newRecord;
        return updated;
      }
      return [newRecord, ...prev];
    });

    const newNotif: ToastNotification = {
      id: `notif_${Date.now()}`,
      title: `Presensi ${newRecord.personType === 'student' ? 'Siswa' : 'Guru'} Berhasil`,
      message: `${newRecord.personName} (${newRecord.classOrSubject}) status: ${newRecord.status.toUpperCase()} pada ${newRecord.time} WIB.`,
      type: 'attendance',
      timestamp: newRecord.time + ' WIB',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 8)]);
  };

  const handleSaveBatchAttendance = (newRecords: AttendanceRecord[]) => {
    setRecords((prev) => {
      const newIds = newRecords.map((r) => r.personId);
      const filteredOld = prev.filter(
        (r) => !(r.date === todayDate && newIds.includes(r.personId) && r.type === 'masuk')
      );
      return [...newRecords, ...filteredOld];
    });
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Handlers for Student & Teacher Leaves
  const handleAddLeaveRequest = (newLeave: LeaveRequest) => {
    setLeaves((prev) => [newLeave, ...prev]);
    const newNotif: ToastNotification = {
      id: `notif_${Date.now()}`,
      title: `Pengajuan ${newLeave.type.toUpperCase()} Baru`,
      message: `${newLeave.personName} (${newLeave.classOrSubject}) mengajukan permohonan izin/sakit.`,
      type: 'leave_request',
      timestamp: newLeave.createdAt + ' WIB',
      leaveId: newLeave.id,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleUpdateLeaveStatus = (id: string, status: 'approved' | 'rejected', reviewNote?: string) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status, reviewNote } : l))
    );
  };

  // Handlers for GTK Services & Dual Approval
  const handleAddGtkService = (newService: GtkServiceRequest) => {
    setGtkServices((prev) => [newService, ...prev]);
    const newNotif: ToastNotification = {
      id: `notif_${Date.now()}`,
      title: 'Permohonan Layanan GTK Baru',
      message: `${newService.teacherName} mengajukan ${newService.title}. Menunggu verifikasi Kepsek & Admin.`,
      type: 'leave_request',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleApproveGtkKepsek = (serviceId: string, note?: string) => {
    const todayStr = formatDateIndo(new Date().toISOString().split('T')[0]);
    setGtkServices((prev) =>
      prev.map((item) => {
        if (item.id !== serviceId) return item;
        const updatedKepsek = {
          approvedBy: config.principalName || 'Dr. H. Mulyadi, M.Pd.',
          approvedAt: `${todayStr} 09:30 WIB`,
          signatureStamp: `DIGITAL-SIGN-KEPSEK-${config.npsn}-${Date.now().toString().slice(-6)}`,
          status: 'approved' as const,
          role: 'kepala_sekolah' as const,
          note: note || 'Disetujui Kepala Sekolah untuk kelancaran tugas dinas/pengembangan profesi.',
        };

        const finalStatus = item.adminApproval?.status === 'approved' ? 'approved' : 'approved_by_kepsek';
        return {
          ...item,
          kepsekApproval: updatedKepsek,
          status: finalStatus,
        };
      })
    );
  };

  const handleApproveGtkAdmin = (serviceId: string, letterNumber?: string, note?: string) => {
    const todayStr = formatDateIndo(new Date().toISOString().split('T')[0]);
    setGtkServices((prev) =>
      prev.map((item) => {
        if (item.id !== serviceId) return item;
        const updatedAdmin = {
          approvedBy: config.adminName || 'Siti Aminah, S.Kom. (SIMPEG)',
          approvedAt: `${todayStr} 10:15 WIB`,
          signatureStamp: `SIMPEG-VERIFIED-${config.npsn}-${Date.now().toString().slice(-6)}`,
          status: 'approved' as const,
          role: 'admin' as const,
          note: note || 'Diverifikasi oleh SIMPEG dan dicatat ke sistem presensi resmi.',
        };

        const finalLetterNumber =
          letterNumber ||
          item.officialLetterNumber ||
          `800/${Math.floor(100 + Math.random() * 900)}/SMAN1-DISDIK/${new Date().getFullYear()}`;

        const finalStatus = item.kepsekApproval?.status === 'approved' ? 'approved' : 'approved_by_admin';
        return {
          ...item,
          adminApproval: updatedAdmin,
          officialLetterNumber: finalLetterNumber,
          status: finalStatus,
        };
      })
    );
  };

  const handleRejectGtkService = (serviceId: string, reason: string) => {
    setGtkServices((prev) =>
      prev.map((item) => {
        if (item.id !== serviceId) return item;
        return {
          ...item,
          status: 'rejected',
          kepsekApproval: {
            ...item.kepsekApproval,
            status: 'rejected',
            note: reason,
          },
          adminApproval: {
            ...item.adminApproval,
            status: 'rejected',
            note: reason,
          },
        };
      })
    );
  };

  // Student CRUD
  const handleAddStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
  };

  const handleBatchAddStudents = (newStudents: Student[], newClasses?: SchoolClass[]) => {
    if (newClasses && newClasses.length > 0) {
      setClasses((prev) => {
        const existingClassNames = new Set(prev.map((c) => c.name.toLowerCase()));
        const uniqueNew = newClasses.filter((c) => !existingClassNames.has(c.name.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
    }
    setStudents((prev) => {
      const existingNisns = new Set(prev.map((s) => s.nisn));
      const filteredNew = newStudents.filter((s) => !existingNisns.has(s.nisn));
      return [...filteredNew, ...prev];
    });
  };

  const handleUpdateStudent = (student: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // Teacher CRUD
  const handleAddTeacher = (teacher: Teacher) => {
    setTeachers((prev) => [teacher, ...prev]);
  };

  const handleBatchAddTeachers = (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const existingNips = new Set(prev.map((t) => t.nip));
      const filteredNew = newTeachers.filter((t) => !existingNips.has(t.nip));
      return [...filteredNew, ...prev];
    });
  };

  const handleUpdateTeacher = (teacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  // Academic Events
  const handleAddEvent = (event: AcademicEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  // Notification handlers
  const handleAddNotification = useCallback((notif: ToastNotification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev.slice(0, 8)];
    });
  }, []);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleReviewLeave = (_leaveId?: string) => {
    setActiveTab('leaves');
  };

  // Simulation Trigger: simulate realistic incoming attendance / leave request
  const handleTriggerSimulation = () => {
    playBeepSound();
    const isLeave = Math.random() > 0.5;
    if (isLeave && students.length > 0) {
      const randStudent = students[Math.floor(Math.random() * students.length)];
      const simLeave: LeaveRequest = {
        id: `sim_leave_${Date.now()}`,
        personId: randStudent.id,
        personName: randStudent.name,
        personType: 'student',
        classOrSubject: randStudent.className,
        type: 'sakit',
        startDate: todayDate,
        endDate: todayDate,
        reason: 'Demam dan flu, sedang beristirahat di rumah (Simulasi Otomatis).',
        documentName: 'surat_keterangan_dokter_simulasi.pdf',
        status: 'pending',
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      handleAddLeaveRequest(simLeave);
    } else if (teachers.length > 0) {
      const randTeacher = teachers[Math.floor(Math.random() * teachers.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const simRecord: AttendanceRecord = {
        id: `sim_rec_${Date.now()}`,
        personId: randTeacher.id,
        personType: 'teacher',
        personName: randTeacher.name,
        identifier: randTeacher.nip,
        classOrSubject: randTeacher.subject,
        date: todayDate,
        time: timeStr,
        type: 'masuk',
        status: 'hadir',
        method: 'selfie_gps',
        employmentStatus: randTeacher.employmentStatus,
        location: {
          lat: config.schoolLat,
          lng: config.schoolLng,
          address: 'Lobby Gedung Utama (Verifikasi GPS Sukses)',
          inRadius: true,
          distanceMeter: 8,
        },
        photoUrl: randTeacher.avatar,
        note: 'Presensi Selfie + GPS Terverifikasi BKD (Simulasi)',
      };
      handleRecordAttendance(simRecord);
    }
  };

  // Reset to default factory settings
  const handleResetToDefault = () => {
    setConfig(INITIAL_SCHOOL_CONFIG);
    setClasses(INITIAL_CLASSES);
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setRecords(INITIAL_ATTENDANCE_RECORDS);
    setLeaves(INITIAL_LEAVE_REQUESTS);
    setGtkServices(INITIAL_GTK_SERVICES);
    setEvents(INITIAL_ACADEMIC_EVENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    localStorage.clear();
    alert('Seluruh data presensi, GTK, siswa, kalender dan konfigurasi sekolah berhasil dikembalikan ke pengaturan awal!');
  };

  const safeLeaves = leaves || [];
  const safeRecords = records || [];
  const safeGtkServices = gtkServices || [];
  const pendingLeavesCount = safeLeaves.filter((l) => l.status === 'pending').length;
  const pendingGtkCount = safeGtkServices.filter((s) => s.status !== 'approved' && s.status !== 'rejected').length;
  const todayRecordsCount = safeRecords.filter((r) => r.date === todayDate).length;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 selection:bg-indigo-600 selection:text-white font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        userRole={userRole}
        setUserRole={setUserRole}
        pendingLeavesCount={pendingLeavesCount + pendingGtkCount}
        totalTodayCount={todayRecordsCount}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onTriggerSimulation={handleTriggerSimulation}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header & Notification Banner */}
        <NotificationBanner
          notifications={notifications}
          onDismissToast={handleDismissNotification}
          onReviewLeave={handleReviewLeave}
          onTriggerSimulation={handleTriggerSimulation}
          onOpenBackupPrompt={() => setIsDailyBackupModalOpen(true)}
          pendingLeaves={safeLeaves}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          config={config}
          userRole={userRole}
        />

        {/* Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Emergency System Lockdown Banner */}
          {isSystemLocked && (
            <div className="bg-rose-500 text-white rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4 animate-in fade-in duration-300 border-2 border-rose-400">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    Sistem dalam Status Emergency Lockdown
                  </h4>
                  <p className="text-xs text-rose-100">
                    Penginputan presensi manual disuspend sementara oleh Administrator untuk menjaga integritas data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleSystemLock(false)}
                className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-black shrink-0 transition-colors shadow-xs"
              >
                Buka Kunci (Unlock)
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardStats
              records={records}
              students={students}
              teachers={teachers}
              classes={classes}
              leaveRequests={leaves}
              leaves={leaves}
              config={config}
              biometricLogs={biometricLogs}
              currentStreak={14}
              setActiveTab={setActiveTab}
              onNavigateTab={setActiveTab}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
              onAddNotification={handleAddNotification}
            />
          )}

          {activeTab === 'scan' && (
            <QrScannerTab
              todayDate={todayDate}
              students={students}
              teachers={teachers}
              config={config}
              onRecordAttendance={handleRecordAttendance}
              existingRecords={records}
            />
          )}

          {activeTab === 'selfie' && (
            <SelfieGpsTab
              todayDate={todayDate}
              students={students}
              teachers={teachers}
              config={config}
              events={events}
              onRecordAttendance={handleRecordAttendance}
              existingRecords={records}
            />
          )}

          {activeTab === 'batch_class' && (
            <BatchClassAttendance
              todayDate={todayDate}
              classes={classes}
              students={students}
              config={config}
              events={events}
              existingRecords={records}
              onSaveBatchAttendance={handleSaveBatchAttendance}
            />
          )}

          {activeTab === 'duty_roster' && (
            <TeacherDutyRosterTab
              teachers={teachers}
              dutyRoster={dutyRoster}
              records={records}
              config={config}
              onAddOrUpdateDuty={handleAddOrUpdateDuty}
              onDeleteDuty={handleDeleteDuty}
            />
          )}

          {activeTab === 'rekap' && (
            <RekapitulasiView
              records={records}
              classes={classes}
              students={students}
              teachers={teachers}
              config={config}
              todayDate={todayDate}
              onDeleteRecord={handleDeleteRecord}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
            />
          )}

          {activeTab === 'bkd_automation' && (
            <BKDTaliabuAutomationTab
              records={records}
              teachers={teachers}
              students={students}
              config={config}
            />
          )}

          {activeTab === 'layanan_gtk' && (
            <GtkServicesTab
              services={gtkServices}
              teachers={teachers}
              config={config}
              userRole={userRole}
              onAddService={handleAddGtkService}
              onApproveKepsek={handleApproveGtkKepsek}
              onApproveAdmin={handleApproveGtkAdmin}
              onRejectService={handleRejectGtkService}
            />
          )}

          {activeTab === 'workspace' && (
            <GoogleWorkspaceTab
              records={records}
              config={config}
              events={events}
              gtkServices={gtkServices}
              userRole={userRole}
              students={students}
              teachers={teachers}
              classes={classes}
              onBatchAddStudents={handleBatchAddStudents}
              onBatchAddTeachers={handleBatchAddTeachers}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsTab
              logs={activityLogs}
              onClearLogs={() => setActivityLogs([])}
              onAddLog={(newLog) => setActivityLogs((prev) => [newLog, ...prev])}
            />
          )}

          {activeTab === 'leaves' && (
            <LeaveRequestsTab
              leaves={leaves}
              students={students}
              teachers={teachers}
              todayDate={todayDate}
              onAddLeaveRequest={handleAddLeaveRequest}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
            />
          )}

          {activeTab === 'teachers' && (
            <TeacherManagementTab
              teachers={teachers}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagementTab
              students={students}
              classes={classes}
              config={config}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'cards' && (
            <StudentCardsTab
              students={students}
              teachers={teachers}
              classes={classes}
              config={config}
            />
          )}

          {activeTab === 'biometric_logs' && (
            <BiometricLogsTab
              logs={biometricLogs}
              onAddLog={handleAddBiometricLog}
              onClearLogs={() => setBiometricLogs([])}
            />
          )}

          {activeTab === 'calendar' && (
            <AcademicCalendarTab
              events={events}
              onAddEvent={handleAddEvent}
              config={config}
            />
          )}

          {activeTab === 'config' && (
            <ConfigTab
              config={config}
              records={records}
              students={students}
              teachers={teachers}
              classes={classes}
              leaves={leaves}
              gtkServices={gtkServices}
              events={events}
              activityLogs={activityLogs}
              biometricLogs={biometricLogs}
              onSaveConfig={setConfig}
              onResetToDefault={handleResetToDefault}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>

        {/* Global Daily Backup Safety Prompt Modal */}
        <DailyBackupPromptModal
          isOpen={isDailyBackupModalOpen}
          onClose={() => setIsDailyBackupModalOpen(false)}
          config={config}
          backupData={generateBackupPayload()}
          onDownloadJson={handleDownloadBackupJson}
          onCloudBackup={handleCloudBackup}
          onDismissToday={() => {
            try {
              localStorage.setItem('school_presensi_last_backup_prompt_date', todayDate);
            } catch (e) {
              console.error(e);
            }
          }}
        />

        {/* Floating Quick Actions Speed-Dial Menu */}
        <QuickActionsFab
          students={students}
          teachers={teachers}
          records={records}
          config={config}
          isSystemLocked={isSystemLocked}
          onToggleSystemLock={handleToggleSystemLock}
          onAddEmergencyAbsence={handleAddEmergencyAbsence}
          onNavigateTab={setActiveTab}
        />

        {/* Global Modal for Document Print Preview */}
        {isPrintModalOpen && (
          <PrintModal
            onClose={() => setIsPrintModalOpen(false)}
            config={config}
            records={records}
            students={students}
            todayDate={todayDate}
          />
        )}

        {/* Real-time System Sync Status Footer */}
        <SystemSyncStatusFooter
          config={config}
          lastHandshakeTime={lastHandshakeTime}
          onTriggerSync={handleTriggerHandshakeSync}
        />
      </div>
    </div>
  );
}
