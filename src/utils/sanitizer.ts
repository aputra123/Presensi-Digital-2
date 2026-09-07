/**
 * Centralized Input Sanitation and Validation Utility
 * SMP Negeri 4 Satu Atap Taliabu Barat
 * 
 * Provides rigorous regex-based validations and sanitization against
 * XSS, SQL/NoSQL injection tokens, control characters, and malformed strings
 * before data is processed by Firebase Firestore or backend APIs.
 */

// Strip HTML tags, script elements, javascript: protocols, and null bytes
export function stripMaliciousCharacters(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '') // Null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script blocks
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Style blocks
    .replace(/<[^>]+>/g, '') // All other HTML tags
    .replace(/javascript:/gi, '') // Javascript pseudo-protocol
    .replace(/data:/gi, 'data_') // Prevent inline executable data schemes in text
    .replace(/on\w+\s*=/gi, '') // Event handlers like onload=, onerror=
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters except newline and tab
    .trim();
}

/**
 * Validates and sanitizes personal names (Siswa, Guru, GTK, Orang Tua)
 * Allowed: Alphabets, spaces, dots (for titles/gelar), apostrophes, hyphens
 * Min length: 2, Max length: 100
 */
const NAME_REGEX = /^[a-zA-Z\s.,'’\-()]{2,100}$/;

export function sanitizeName(rawName: string): { value: string; isValid: boolean; error?: string } {
  const cleaned = stripMaliciousCharacters(rawName).replace(/\s+/g, ' ');
  if (!cleaned) {
    return { value: '', isValid: false, error: 'Nama tidak boleh kosong.' };
  }
  if (cleaned.length < 2) {
    return { value: cleaned, isValid: false, error: 'Nama minimal 2 karakter.' };
  }
  if (cleaned.length > 100) {
    return { value: cleaned.slice(0, 100), isValid: false, error: 'Nama maksimal 100 karakter.' };
  }
  const isValid = NAME_REGEX.test(cleaned);
  return {
    value: cleaned,
    isValid,
    error: isValid ? undefined : 'Nama hanya boleh mengandung huruf, spasi, titik gelar, tanda petik, dan tanda hubung.',
  };
}

/**
 * Validates and sanitizes NIP (Nomor Induk Pegawai)
 * Standard BKD / BKN format: 18 digits (YYYYMMDD YYYYYY M XXX) or unformatted 18 digits.
 * Also accommodates 8 digits for legacy format or PPPK identifiers.
 */
const NIP_CLEAN_REGEX = /^\d{8,18}$/;

export function sanitizeNip(rawNip: string): { value: string; isValid: boolean; error?: string } {
  const stripped = stripMaliciousCharacters(rawNip);
  // Keep only digits
  const digitsOnly = stripped.replace(/\D/g, '');

  if (!digitsOnly) {
    return { value: '', isValid: false, error: 'NIP wajib diisi.' };
  }
  if (!NIP_CLEAN_REGEX.test(digitsOnly)) {
    return {
      value: digitsOnly,
      isValid: false,
      error: 'Format NIP tidak valid. NIP harus terdiri dari 8 hingga 18 digit angka.',
    };
  }

  return { value: digitsOnly, isValid: true };
}

/**
 * Validates and sanitizes NISN (Nomor Induk Siswa Nasional)
 * Kemendikbudristek format: exactly 10 digits
 */
const NISN_CLEAN_REGEX = /^\d{10}$/;

export function sanitizeNisn(rawNisn: string): { value: string; isValid: boolean; error?: string } {
  const stripped = stripMaliciousCharacters(rawNisn);
  const digitsOnly = stripped.replace(/\D/g, '');

  if (!digitsOnly) {
    return { value: '', isValid: false, error: 'NISN wajib diisi.' };
  }
  if (!NISN_CLEAN_REGEX.test(digitsOnly)) {
    return {
      value: digitsOnly,
      isValid: false,
      error: 'Format NISN tidak valid. NISN resmi harus terdiri dari 10 digit angka.',
    };
  }

  return { value: digitsOnly, isValid: true };
}

/**
 * Validates and sanitizes reason/alasan perizinan, catatan, deskripsi
 * Strips script/HTML, enforces reasonable length (3 to 500 characters)
 */
export function sanitizeReason(rawReason: string, maxLen = 500): { value: string; isValid: boolean; error?: string } {
  const cleaned = stripMaliciousCharacters(rawReason).replace(/\s+/g, ' ');
  if (!cleaned) {
    return { value: '', isValid: false, error: 'Alasan atau keterangan tidak boleh kosong.' };
  }
  if (cleaned.length < 3) {
    return { value: cleaned, isValid: false, error: 'Alasan minimal 3 karakter.' };
  }
  if (cleaned.length > maxLen) {
    return { value: cleaned.slice(0, maxLen), isValid: true };
  }
  return { value: cleaned, isValid: true };
}

/**
 * Validates geographic coordinates (lat / lng)
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  // Latitude between -90 and 90, Longitude between -180 and 180
  // Pulau Taliabu is around lat -1.8 to -2.0, lng 124.0 to 125.5
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Deep recursive object sanitizer for complex Firebase documents and state backups.
 * Traverses any nested structure and cleans all string properties.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return stripMaliciousCharacters(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key itself to prevent prototype pollution or mongo-style injection
      const safeKey = key.replace(/[$]/g, '').trim();
      if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
        continue;
      }
      result[safeKey] = sanitizeObject(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Validates and sanitizes a complete attendance record before Firebase insertion
 */
export function sanitizeAttendanceRecord(record: any): any {
  if (!record || typeof record !== 'object') return null;

  const safeRecord = sanitizeObject(record);

  // Validate or format personName
  if (safeRecord.personName) {
    const nameCheck = sanitizeName(safeRecord.personName);
    safeRecord.personName = nameCheck.value;
  }

  // Validate or format identifier (NIP or NISN)
  if (safeRecord.identifier) {
    const idDigits = safeRecord.identifier.replace(/\D/g, '');
    safeRecord.identifier = idDigits.slice(0, 18);
  }

  // Sanitize notes
  if (safeRecord.note) {
    safeRecord.note = stripMaliciousCharacters(safeRecord.note).slice(0, 300);
  }

  // Sanitize location
  if (safeRecord.location) {
    if (
      typeof safeRecord.location.lat === 'number' &&
      typeof safeRecord.location.lng === 'number' &&
      validateCoordinates(safeRecord.location.lat, safeRecord.location.lng)
    ) {
      safeRecord.location.address = stripMaliciousCharacters(safeRecord.location.address || '').slice(0, 200);
    } else {
      delete safeRecord.location;
    }
  }

  return safeRecord;
}
