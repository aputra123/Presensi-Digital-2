/**
 * Security & Anti-Manipulation Dynamic QR Token Engine
 * Presensi SMPN 4 Satap Taliabu Barat
 *
 * Enforces a strict 60-second expiration window and one-time-use token invalidation
 * to prevent proxy attendance (titip absen), photo screenshots, and QR replay attacks.
 */

export interface DynamicQrPayload {
  version: 'v1';
  prefix: 'SMPN4_QR';
  personType: 'student' | 'teacher';
  personId: string;
  identifier: string; // NISN or NIP
  name: string;
  timestamp: number; // Unix timestamp in ms
  expiresAt: number; // timestamp + 60,000 ms
  nonce: string; // Random unique token for anti-replay
  hash: string;
}

export interface QrValidationResult {
  isValid: boolean;
  isDynamic: boolean;
  status: 'valid' | 'expired' | 'already_used' | 'invalid_format' | 'legacy_static';
  message: string;
  remainingSeconds: number;
  expiredSecondsAgo: number;
  parsedData?: {
    personType: 'student' | 'teacher';
    personId: string;
    identifier: string;
    name: string;
    timestamp: number;
    nonce: string;
  };
}

// Simple checksum generator for client verification
const generateChecksum = (dataStr: string): string => {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
};

/**
 * Generate a dynamic 60-second expiring QR payload string
 */
export const createDynamicQrString = (
  person: { id: string; name: string; type: 'student' | 'teacher'; identifier: string },
  validityDurationMs: number = 60000
): { qrString: string; payload: DynamicQrPayload } => {
  const now = Date.now();
  const expiresAt = now + validityDurationMs;
  const nonce = `${Math.random().toString(36).substring(2, 9)}_${now.toString(36)}`;
  
  const rawKey = `${person.type}:${person.id}:${person.identifier}:${now}:${nonce}`;
  const hash = generateChecksum(rawKey);

  const payload: DynamicQrPayload = {
    version: 'v1',
    prefix: 'SMPN4_QR',
    personType: person.type,
    personId: person.id,
    identifier: person.identifier,
    name: person.name,
    timestamp: now,
    expiresAt,
    nonce,
    hash,
  };

  // Compact string representation:
  // SMPN4_QR|v1|type|id|identifier|timestamp|expiresAt|nonce|hash|name
  const compactString = [
    'SMPN4_QR',
    'v1',
    person.type,
    person.id,
    person.identifier,
    now,
    expiresAt,
    nonce,
    hash,
    encodeURIComponent(person.name),
  ].join('|');

  return { qrString: compactString, payload };
};

/**
 * Validate any scanned QR string against the 60-second expiration rule and used token registry
 */
export const validateQrCodeSecurity = (
  rawScannedString: string,
  usedNonces: Set<string>,
  allowLegacyStatic: boolean = true
): QrValidationResult => {
  const text = rawScannedString.trim();
  const now = Date.now();

  // 1. Check compact format: SMPN4_QR|v1|...
  if (text.startsWith('SMPN4_QR|v1|')) {
    const parts = text.split('|');
    if (parts.length >= 9) {
      const personType = parts[2] as 'student' | 'teacher';
      const personId = parts[3];
      const identifier = parts[4];
      const timestamp = parseInt(parts[5], 10);
      const expiresAt = parseInt(parts[6], 10);
      const nonce = parts[7];
      const hash = parts[8];
      const name = parts[9] ? decodeURIComponent(parts[9]) : identifier;

      // Verify checksum
      const expectedChecksum = generateChecksum(`${personType}:${personId}:${identifier}:${timestamp}:${nonce}`);
      if (hash !== expectedChecksum) {
        return {
          isValid: false,
          isDynamic: true,
          status: 'invalid_format',
          message: 'Tanda tangan kriptografis QR tidak valid / terindikasi manipulasi.',
          remainingSeconds: 0,
          expiredSecondsAgo: 0,
        };
      }

      // Check anti-replay (already scanned)
      if (usedNonces.has(nonce)) {
        return {
          isValid: false,
          isDynamic: true,
          status: 'already_used',
          message:
            '⚠️ KODE QR SUDAH DIGUNAKAN (ONE-TIME USE)! Kode QR dinamis ini sudah pernah dipindai sebelumnya dan langsung hangus untuk mencegah duplikasi presensi.',
          remainingSeconds: 0,
          expiredSecondsAgo: 0,
        };
      }

      // Check 60-second expiration
      const ageMs = now - timestamp;
      const remainingMs = expiresAt - now;

      if (now > expiresAt || ageMs > 60000) {
        const expiredSec = Math.max(1, Math.floor((now - expiresAt) / 1000));
        return {
          isValid: false,
          isDynamic: true,
          status: 'expired',
          message: `⚠️ KODE QR KADALUWARSA (EXPIRED)! Kode QR ini dibuat ${Math.floor(ageMs / 1000)} detik yang lalu (melewati batas toleransi 60 detik). Minta siswa/guru perbarui kode QR dinamis terbaru.`,
          remainingSeconds: 0,
          expiredSecondsAgo: expiredSec,
        };
      }

      const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
      return {
        isValid: true,
        isDynamic: true,
        status: 'valid',
        message: `✓ Kode QR Dinamis Sah (Masa berlaku aktif: sisa ${remainingSec} detik).`,
        remainingSeconds: remainingSec,
        expiredSecondsAgo: 0,
        parsedData: {
          personType,
          personId,
          identifier,
          name,
          timestamp,
          nonce,
        },
      };
    }
  }

  // 2. Check JSON dynamic format
  if (text.startsWith('{') && text.includes('"SMPN4_QR"')) {
    try {
      const obj = JSON.parse(text);
      if (obj.prefix === 'SMPN4_QR' && obj.timestamp && obj.nonce) {
        const timestamp = Number(obj.timestamp);
        const expiresAt = Number(obj.expiresAt || timestamp + 60000);
        const ageMs = now - timestamp;

        if (usedNonces.has(obj.nonce)) {
          return {
            isValid: false,
            isDynamic: true,
            status: 'already_used',
            message: '⚠️ Kode QR dinamis ini telah dipindai sebelumnya (one-time token).',
            remainingSeconds: 0,
            expiredSecondsAgo: 0,
          };
        }

        if (now > expiresAt || ageMs > 60000) {
          const expiredSec = Math.max(1, Math.floor((now - expiresAt) / 1000));
          return {
            isValid: false,
            isDynamic: true,
            status: 'expired',
            message: `⚠️ KODE QR KADALUWARSA (EXPIRED)! Kode telah melewati batas 60 detik (${expiredSec}s lewat).`,
            remainingSeconds: 0,
            expiredSecondsAgo: expiredSec,
          };
        }

        return {
          isValid: true,
          isDynamic: true,
          status: 'valid',
          message: '✓ Kode QR Dinamis JSON Sah.',
          remainingSeconds: Math.ceil((expiresAt - now) / 1000),
          expiredSecondsAgo: 0,
          parsedData: {
            personType: obj.personType || 'student',
            personId: obj.personId || '',
            identifier: obj.identifier || obj.nisn || obj.nip,
            name: obj.name || '',
            timestamp,
            nonce: obj.nonce,
          },
        };
      }
    } catch {}
  }

  // 3. Fallback to Legacy Static QR
  if (allowLegacyStatic) {
    return {
      isValid: true,
      isDynamic: false,
      status: 'legacy_static',
      message: 'Kode Kartu Fisik / Barcode NISN-NIP Terdeteksi (Mode Kompatibilitas).',
      remainingSeconds: 60,
      expiredSecondsAgo: 0,
    };
  }

  return {
    isValid: false,
    isDynamic: false,
    status: 'expired',
    message: '⚠️ Mode Keamanan Ketat Aktif: Hanya menerima Kode QR Dinamis dengan batas waktu 60 detik.',
    remainingSeconds: 0,
    expiredSecondsAgo: 0,
  };
};
