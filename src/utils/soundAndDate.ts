export const TIMEZONE_WITA = 'Asia/Makassar';

export const formatTimeIndo = (dateObj: Date | string | number): string => {
  const d = typeof dateObj === 'string' || typeof dateObj === 'number' ? new Date(dateObj) : dateObj;
  return d.toLocaleTimeString('id-ID', {
    timeZone: TIMEZONE_WITA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  // Support either YYYY-MM-DD or full timestamp
  if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.includes(':')) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      timeZone: TIMEZONE_WITA,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  return dateObj.toLocaleDateString('id-ID', {
    timeZone: TIMEZONE_WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatDateTimeWita = (dateObj: Date | string | number): string => {
  if (!dateObj) return '-';
  const d = typeof dateObj === 'string' || typeof dateObj === 'number' ? new Date(dateObj) : dateObj;
  return d.toLocaleString('id-ID', {
    timeZone: TIMEZONE_WITA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const getTodayDateString = (d: Date = new Date()): string => {
  // Format YYYY-MM-DD accurately in WITA (Asia/Makassar)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_WITA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

export const getCurrentTimeWita = (d: Date = new Date()): string => {
  return d.toLocaleTimeString('id-ID', {
    timeZone: TIMEZONE_WITA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Format & convert Google Drive sharing URL or direct links to high-quality direct image URL.
 * Handles:
 * - drive.google.com/file/d/{ID}/view
 * - drive.google.com/open?id={ID}
 * - drive.google.com/uc?id={ID}
 * - docs.google.com/uc?export=view&id={ID}
 */
export const formatDriveUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Check if it's a Google Drive link
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    // Extract file ID using regex patterns
    const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
    }

    const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
      return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
    }

    const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile && matchFile[1]) {
      return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
    }
  }

  return trimmed;
};

export const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6 note
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch {
    // ignore if audio context blocked
  }
};

/**
 * Play a double-chime Firebase Cloud Messaging notification sound
 */
export const playFCMNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = audioCtx.currentTime;

    // Chime 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Chime 2 (Higher, melodic)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch {
    // ignore
  }
};

export const playSuccessChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {
    // ignore
  }
};

/**
 * Downloads data as a clean, UTF-8 CSV with Excel BOM
 */
export const downloadCsv = (filename: string, csvContent: string) => {
  const bom = '\uFEFF'; // UTF-8 Byte Order Mark for Excel
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface HolidayCheckResult {
  isHoliday: boolean;
  eventTitle?: string;
  eventName?: string;
  description?: string;
  dateStr?: string;
}

/**
 * Checks if a given YYYY-MM-DD date falls on a holiday or school break
 */
export const checkDateIsHoliday = (
  dateStr: string,
  events: { id: string; title: string; date: string; endDate?: string; type: string; isHoliday: boolean; description?: string }[] = []
): HolidayCheckResult => {
  if (!dateStr || !events || events.length === 0) return { isHoliday: false };

  const matched = events.find((evt) => {
    if (!evt.isHoliday && evt.type !== 'holiday') return false;
    if (evt.date === dateStr) return true;
    if (evt.endDate && dateStr >= evt.date && dateStr <= evt.endDate) return true;
    return false;
  });

  if (matched) {
    return {
      isHoliday: true,
      eventTitle: matched.title,
      eventName: matched.title,
      description: matched.description || 'Libur Nasional / Libur Akademik Terdaftar',
      dateStr: matched.date,
    };
  }

  return { isHoliday: false };
};


