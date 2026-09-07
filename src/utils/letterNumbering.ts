/**
 * Utility for Standard Educational Institution Letter Numbering
 * SMP Negeri 4 Satu Atap Taliabu Barat
 */

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const generateGtkLetterNumber = (
  format: string = '421.3/{NOMOR}/SMPN4-STB/GTK/{BULAN_ROMAWI}/{TAHUN}',
  currentSeqNumber: number = 46,
  date: Date = new Date()
): string => {
  const padNumber = String(currentSeqNumber).padStart(3, '0');
  const romanMonth = ROMAN_MONTHS[date.getMonth()] || 'I';
  const year = String(date.getFullYear());
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');

  let result = format;
  result = result.replace(/\{NOMOR\}/g, padNumber);
  result = result.replace(/\{BULAN_ROMAWI\}/g, romanMonth);
  result = result.replace(/\{BULAN\}/g, monthNum);
  result = result.replace(/\{TAHUN\}/g, year);
  result = result.replace(/\{KODE\}/g, '421.3');

  return result;
};

/**
 * Trigger Browser Push Notification if supported and permitted
 */
export const triggerBrowserNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        ...options,
      });
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          icon: '/vite.svg',
          badge: '/vite.svg',
          ...options,
        });
        return true;
      }
    }
  } catch (e) {
    console.warn('Browser push notification error:', e);
  }
  return false;
};
