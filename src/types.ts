export type UserRole = 'admin' | 'kepala_sekolah' | 'teacher' | 'bkd_staff' | 'piket' | 'bkd';

export type EmploymentStatus = 'PNS' | 'PPPK' | 'PPPK_PW' | 'HONORER' | 'GTT_PTT';

export type AttendanceStatus = 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa';

export type AttendanceType = 'masuk' | 'pulang';

export type AttendanceMethod = 'qrcode' | 'selfie_gps' | 'manual' | 'rfid';

export interface Student {
  id: string;
  nisn: string;
  nik?: string;
  name: string;
  classId: string;
  className: string;
  gender: 'L' | 'P';
  avatar: string;
  email: string;
  parentPhone: string;
  address?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  nuptk?: string;
  name: string;
  employmentStatus: EmploymentStatus;
  subject: string;
  role: string;
  gender: 'L' | 'P';
  avatar: string;
  phone: string;
  email: string;
  department?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: '10' | '11' | '12';
  major: string;
  homeroomTeacher: string;
  totalStudents: number;
}

export interface AttendanceLocation {
  lat: number;
  lng: number;
  address: string;
  inRadius: boolean;
  distanceMeter: number;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  personType: 'student' | 'teacher';
  personName: string;
  identifier: string; // NISN or NIP
  classOrSubject: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  type: AttendanceType;
  status: AttendanceStatus;
  method: AttendanceMethod;
  note?: string;
  photoUrl?: string;
  signature?: string; // base64 PNG dataUrl
  signatureIn?: string;
  signatureOut?: string;
  signatureInTime?: string;
  signatureOutTime?: string;
  location?: AttendanceLocation;
  employmentStatus?: EmploymentStatus;
  syncStatus?: 'pending_sync' | 'synced';
  isOfflineRecord?: boolean;
  syncedAt?: string;
}

export interface LeaveRequest {
  id: string;
  personId: string;
  personType: 'student' | 'teacher';
  personName: string;
  classOrSubject: string;
  type: 'sakit' | 'izin' | 'dispensasi';
  startDate: string;
  endDate: string;
  reason: string;
  documentName?: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewNote?: string;
}

// Layanan & Perizinan Khusus Guru / GTK dengan Persetujuan Ganda (Kepala Sekolah & Admin)
export type GtkServiceCategory = 
  | 'izin_cuti'            // Cuti Sakit / Cuti Tahunan / Alasan Penting
  | 'surat_tugas'          // Surat Tugas Dinas Luar / MGMP / Workshop / Bimtek
  | 'rekomendasi_akademik' // Rekomendasi PPG / Beasiswa / Studi Lanjut
  | 'tukar_jadwal'         // Dispensasi / Tukar Jadwal Piket & Jam Mengajar
  | 'keterangan_aktif';    // Surat Keterangan Aktif Mengajar

export interface GtkApprovalDetail {
  approvedBy: string; // Nama Pejabat / Admin
  role: 'kepala_sekolah' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  timestamp?: string;
  signatureStamp?: string; // Tanda Tangan / Stempel Digital
  note?: string;
}

export interface GtkServiceRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  nip: string;
  employmentStatus: EmploymentStatus;
  category: GtkServiceCategory;
  title: string;
  purpose: string;
  startDate: string;
  endDate: string;
  destinationOrLocation?: string; // Lokasi tugas dinas / instansi tujuan
  attachmentName?: string;
  attachmentUrl?: string;
  status: 'pending' | 'approved_by_kepsek' | 'approved_by_admin' | 'approved' | 'rejected' | 'returned';
  kepsekApproval: GtkApprovalDetail;
  adminApproval: GtkApprovalDetail;
  createdAt: string;
  officialLetterNumber?: string; // e.g. "421.3/088/SMAN1-DISDIK/2026"
}

export interface AcademicEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: 'holiday' | 'academic' | 'exam' | 'meeting' | 'ceremony';
  description: string;
  isHoliday: boolean;
  color?: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'leave_request' | 'attendance' | 'system' | 'gtk_service';
  timestamp: string;
  leaveId?: string;
  serviceId?: string;
  read: boolean;
}

export interface SchoolConfig {
  schoolName: string;
  npsn: string;
  logoUrl?: string; // Logo Sekolah Custom / Presets
  address: string;
  academicYear: string;
  semester: string;
  checkInStart: string; // e.g. "06:15"
  checkInDeadline: string; // e.g. "07:15"
  checkOutStart: string; // e.g. "14:30"
  schoolLat: number;
  schoolLng: number;
  maxRadiusMeters: number;
  bkdEmail?: string;
  bkdWhatsApp?: string;
  bkdDriveUrl?: string;
  principalName?: string;
  principalNip?: string;
  adminName?: string;
  faceRecognitionMode?: boolean; // Real-time facial feature detection on/off for older devices
  livenessThreshold?: number; // Biometric sensitivity threshold (0.0 to 1.0)
  googleMapsApiKey?: string; // Optional custom Google Maps API key
  defaultMapEngine?: 'google_maps' | 'leaflet';
  gtkLetterNumberFormat?: string;
  gtkLetterLastNumber?: number;
  googleDriveFolderId?: string;
}

export interface SignatureAuditLog {
  id: string;
  tableDate: string;
  teacherId: string;
  teacherName: string;
  nip: string;
  sessionType: 'masuk' | 'pulang' | 'keterangan';
  action: 'create_signature' | 'update_signature' | 'clear_signature' | 'update_status';
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  performer: string;
  notes?: string;
}

export interface ApelDocumentation {
  id: string;
  type: 'apel_pagi' | 'apel_siang';
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  gmtOffset: string; // e.g. "GMT+8 (WITA)"
  latitude: number;
  longitude: number;
  placeName: string; // Nama tempat e.g. "Lapangan Upacara SMPN 4 Satap Taliabu Barat"
  village: string; // Desa/Kelurahan e.g. "Desa Pancoran"
  district: string; // Kecamatan e.g. "Kecamatan Taliabu Barat"
  regency: string; // Kabupaten e.g. "Kabupaten Pulau Taliabu"
  province: string; // Provinsi e.g. "Maluku Utara"
  photoUrl: string; // Captured photo / watermark base64
  leaderName?: string; // Pembina Apel
  attendanceCount?: number; // Jumlah Peserta Apel
  notes?: string;
  createdAt: string;
}

export type ActivityLogCategory =
  | 'attendance'
  | 'apel_doc'
  | 'gtk_service'
  | 'leave'
  | 'master_data'
  | 'config'
  | 'bkd_automation'
  | 'workspace'
  | 'auth'
  | 'system';

export interface ActivityLog {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  category: ActivityLogCategory;
  actor: {
    name: string;
    role: string;
    email?: string;
  };
  action: string;
  description: string;
  targetId?: string;
  targetName?: string;
  status: 'success' | 'warning' | 'info' | 'error';
  deviceInfo?: string;
}

export interface BiometricLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  personId: string;
  personName: string;
  identifier: string; // NISN or NIP
  personType: 'student' | 'teacher';
  classOrSubject: string;
  status: 'verified' | 'failed' | 'flagged';
  severity?: 'info' | 'warning' | 'error';
  matchScore: number; // 0 - 100%
  threshold: number; // e.g. 80%
  livenessPassed: boolean;
  gpsPassed: boolean;
  distanceMeter: number;
  latitude?: number;
  longitude?: number;
  cameraFacing: 'user' | 'environment';
  deviceId?: string;
  failureReason?: string; // e.g., "Skor kemiripan 64% di bawah ambang batas (80%)"
  photoThumbnail?: string;
  ipOrDevice?: string;
  ipAddress?: string;
  userAgent?: string;
  archived?: boolean;
  isSuspicious?: boolean;
  suspiciousReason?: string;
  suspiciousGroupId?: string;
}

export interface AppBackupData {
  id: string;
  timestamp: string;
  createdDate: string;
  createdTime: string;
  source: string;
  totalRecords: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalLeaves: number;
  totalGtkServices: number;
  records: AttendanceRecord[];
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  leaves: LeaveRequest[];
  gtkServices: GtkServiceRequest[];
  events: AcademicEvent[];
  config: SchoolConfig;
  biometricLogs?: BiometricLog[];
  activityLogs?: ActivityLog[];
  dutyRoster?: DutyAssignment[];
  apelDocs?: ApelDocumentation[];
}

export type DayOfWeek = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu';

export interface DutyAssignment {
  id: string;
  day: DayOfWeek;
  teacherId: string;
  teacherName: string;
  nip: string;
  avatar: string;
  roleTitle: string; // e.g. "Koordinator Piket", "Petugas Gerbang & Presensi", "Pemantau KBM & Kelas", "Piket Kebersihan & Ketertiban"
  shiftTime: string; // e.g. "06:15 - 14:30"
  phone: string;
  notes?: string;
  assignedAt?: string;
}

export interface BackupSummary {
  id: string;
  timestamp: string;
  createdDate: string;
  totalRecords: number;
  totalStudents: number;
  totalTeachers: number;
  totalGtkServices: number;
  source: string;
}

export interface GoogleSheetsImportResult {
  success: boolean;
  message: string;
  importedStudentsCount?: number;
  importedTeachersCount?: number;
  students?: Student[];
  teachers?: Teacher[];
  details?: string;
}

export type AsnAttendanceStatus =
  | 'hadir'
  | 'izin'
  | 'sakit'
  | 'cuti'
  | 'dinas_luar'
  | 'tanpa_keterangan';

export interface AsnAttendanceRow {
  teacherId: string;
  name: string;
  nip: string;
  employmentStatus: EmploymentStatus;
  subjectOrRole: string;
  signatureIn?: string; // base64 PNG dataUrl
  signatureInTime?: string; // e.g. "06:45:12"
  signatureOut?: string; // base64 PNG dataUrl
  signatureOutTime?: string; // e.g. "15:30:22"
  status: AsnAttendanceStatus;
  notes?: string;
  updatedAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'scan'
  | 'selfie'
  | 'apel_documentation'
  | 'biometric_logs'
  | 'duty_roster'
  | 'tabel_absensi_asn'
  | 'batch_class'
  | 'rekap'
  | 'bkd_automation'
  | 'layanan_gtk'
  | 'leaves'
  | 'teachers'
  | 'students'
  | 'cards'
  | 'calendar'
  | 'workspace'
  | 'logs'
  | 'config';
