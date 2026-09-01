import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppBackupData, BackupSummary } from '../types';

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Provider with Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

let cachedAccessToken: string | null = null;

export const signInWithGoogleWorkspace = async (): Promise<{ user: User; token: string }> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';
    cachedAccessToken = token;
    return { user: result.user, token };
  } catch (err) {
    console.error('Google Sign In Error:', err);
    throw err;
  }
};

export const getCachedAccessToken = () => cachedAccessToken;

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// ==========================================
// FIRESTORE BACKUP & RESTORE UTILITIES
// ==========================================

// Helper to timeout long-hanging network calls in low-connectivity environments (Pulau Taliabu)
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 8000, fallbackVal?: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Koneksi Firestore timeout (${timeoutMs}ms)`)), timeoutMs)
    ),
  ]).catch((err) => {
    if (fallbackVal !== undefined) return fallbackVal;
    throw err;
  });
};

export const saveBackupToFirestore = async (
  backupData: AppBackupData
): Promise<{ success: boolean; id: string; timestamp: string; message: string }> => {
  try {
    const backupId = backupData.id || `backup_${Date.now()}`;
    const cleanId = backupId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const backupRef = doc(db, 'backups', cleanId);

    // Save full snapshot
    const payload = {
      id: cleanId,
      timestamp: backupData.timestamp,
      createdDate: backupData.createdDate,
      createdTime: backupData.createdTime || new Date().toLocaleTimeString('id-ID'),
      source: backupData.source || 'Manual Web Admin Backup',
      totalRecords: backupData.totalRecords || backupData.records?.length || 0,
      totalStudents: backupData.totalStudents || backupData.students?.length || 0,
      totalTeachers: backupData.totalTeachers || backupData.teachers?.length || 0,
      totalClasses: backupData.totalClasses || backupData.classes?.length || 0,
      totalLeaves: backupData.totalLeaves || backupData.leaves?.length || 0,
      totalGtkServices: backupData.totalGtkServices || backupData.gtkServices?.length || 0,
      backupData: JSON.stringify(backupData),
    };

    await withTimeout(setDoc(backupRef, payload), 7000);

    // Save summary in localStorage as well
    try {
      const localBackups = JSON.parse(localStorage.getItem('school_presensi_backup_list') || '[]');
      const newSummary: BackupSummary = {
        id: cleanId,
        timestamp: backupData.timestamp,
        createdDate: backupData.createdDate,
        totalRecords: payload.totalRecords,
        totalStudents: payload.totalStudents,
        totalTeachers: payload.totalTeachers,
        totalGtkServices: payload.totalGtkServices,
        source: payload.source,
      };
      localStorage.setItem(
        'school_presensi_backup_list',
        JSON.stringify([newSummary, ...localBackups.filter((b: BackupSummary) => b.id !== cleanId)])
      );
      localStorage.setItem('school_presensi_last_backup_meta', JSON.stringify(newSummary));
    } catch (e) {
      console.warn('Local backup cache update failed:', e);
    }

    return {
      success: true,
      id: cleanId,
      timestamp: backupData.timestamp,
      message: `Pencadangan Firestore berhasil! Disimpan di koleksi 'backups/${cleanId}'.`,
    };
  } catch (error: any) {
    console.warn('Firestore Backup Error / Offline:', error);
    // Fallback to local storage if network or offline
    try {
      const cleanId = `local_backup_${Date.now()}`;
      localStorage.setItem(`school_backup_${cleanId}`, JSON.stringify(backupData));
      return {
        success: true,
        id: cleanId,
        timestamp: backupData.timestamp,
        message: `Tersimpan secara lokal (Penyimpanan Cadangan Offline: ${cleanId}).`,
      };
    } catch (localErr: any) {
      return {
        success: false,
        id: '',
        timestamp: backupData.timestamp,
        message: error.message || 'Gagal menyimpan cadangan ke Firestore.',
      };
    }
  }
};

export const fetchFirestoreBackups = async (): Promise<BackupSummary[]> => {
  try {
    const backupsCol = collection(db, 'backups');
    const snapshot = await withTimeout(getDocs(backupsCol), 6000);
    const results: BackupSummary[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        timestamp: data.timestamp || '',
        createdDate: data.createdDate || '',
        totalRecords: Number(data.totalRecords) || 0,
        totalStudents: Number(data.totalStudents) || 0,
        totalTeachers: Number(data.totalTeachers) || 0,
        totalGtkServices: Number(data.totalGtkServices) || 0,
        source: data.source || 'Cloud Firestore',
      });
    });

    // Merge with any offline backup summaries
    try {
      const localList: BackupSummary[] = JSON.parse(localStorage.getItem('school_presensi_backup_list') || '[]');
      localList.forEach((localB) => {
        if (!results.some((r) => r.id === localB.id)) {
          results.push(localB);
        }
      });
    } catch (e) {
      // ignore
    }

    // Sort descending by timestamp / id
    return results.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    console.warn('Failed to fetch from Firestore, checking local backups:', error);
    try {
      return JSON.parse(localStorage.getItem('school_presensi_backup_list') || '[]');
    } catch {
      return [];
    }
  }
};

export const restoreBackupFromFirestore = async (backupId: string): Promise<AppBackupData | null> => {
  try {
    const docRef = doc(db, 'backups', backupId);
    const snap = await withTimeout(getDoc(docRef), 6000);
    if (snap.exists()) {
      const data = snap.data();
      if (data.backupData) {
        return JSON.parse(data.backupData) as AppBackupData;
      }
      return data as unknown as AppBackupData;
    }

    // Check local fallback
    const localData = localStorage.getItem(`school_backup_${backupId}`);
    if (localData) {
      return JSON.parse(localData) as AppBackupData;
    }
    return null;
  } catch (error) {
    console.warn('Failed to restore backup from Firestore, checking local fallback:', error);
    // Check local fallback
    try {
      const localData = localStorage.getItem(`school_backup_${backupId}`);
      if (localData) {
        return JSON.parse(localData) as AppBackupData;
      }
    } catch {
      // ignore
    }
    return null;
  }
};

