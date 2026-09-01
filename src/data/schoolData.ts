import {
  SchoolClass,
  Student,
  Teacher,
  SchoolConfig,
  AttendanceRecord,
  LeaveRequest,
  GtkServiceRequest,
  ActivityLog,
  BiometricLog,
  DutyAssignment,
  AcademicEvent,
  ToastNotification,
} from '../types';
import { getTodayDateString as getWitaToday } from '../utils/soundAndDate';

export const INITIAL_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'SMP NEGERI 4 SATU ATAP TALIABU BARAT',
  npsn: '60203598',
  logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=200&q=80',
  address: 'Desa Pancoran, Kec. Taliabu Barat, Kab. Pulau Taliabu, Maluku Utara',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  checkInStart: '06:15',
  checkInDeadline: '07:15',
  checkOutStart: '14:30',
  schoolLat: -1.8485,
  schoolLng: 124.4682,
  maxRadiusMeters: 80,
  bkdEmail: 'bkd.taliabu@pulautaliabukab.go.id',
  bkdWhatsApp: '6282291882341',
  bkdDriveUrl: 'https://drive.google.com/drive/folders/1TaliabuBKD_PresensiDigital_Sync2026',
  principalName: 'Drs. Ruslan La Ode, M.Pd.',
  principalNip: '197405121999031004',
  adminName: 'Hendra Hasan, S.Pd. (Admin Dapodik/BKD)',
};

export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_TEACHERS: Teacher[] = [];

export const getTodayDateString = (): string => {
  return getWitaToday();
};

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_ACADEMIC_EVENTS: AcademicEvent[] = [];

export const INITIAL_NOTIFICATIONS: ToastNotification[] = [];

export const INITIAL_GTK_SERVICES: GtkServiceRequest[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

export const INITIAL_BIOMETRIC_LOGS: BiometricLog[] = [];

export const INITIAL_DUTY_ROSTER: DutyAssignment[] = [];



