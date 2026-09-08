import React, { useState, useEffect, useCallback } from 'react';

export type CameraOrientationMode = 'auto' | 'portrait' | 'landscape';
export type DetectedOrientation = 'portrait' | 'landscape';
export type EffectiveOrientation = DetectedOrientation;
export type DeviceCategory = 'mobile' | 'tablet' | 'laptop';

export interface DeviceHardwareInfo {
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  platformName: string;
}

/**
 * Accurately detects whether the current client is a smartphone, tablet, or laptop/desktop
 */
export const detectDeviceHardware = (): DeviceHardwareInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isLaptop: true,
      platformName: 'Desktop / Laptop',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isTabletCheck =
    /iPad|Tablet|PlayBook/i.test(ua) ||
    (isAndroid && !/Mobile/i.test(ua)) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth >= 768 && window.innerWidth <= 1024);

  const isMobileCheck =
    (/Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 768)) &&
    !isTabletCheck;

  const isLaptop = !isMobileCheck && !isTabletCheck;

  let platformName = 'Laptop / Komputer PC';
  if (isMobileCheck) {
    platformName = isIos ? 'Smartphone iOS (iPhone)' : 'Smartphone Android';
  } else if (isTabletCheck) {
    platformName = isIos ? 'Tablet iPad' : 'Tablet Android / 2-in-1';
  }

  return {
    isMobile: isMobileCheck,
    isTablet: isTabletCheck,
    isLaptop,
    platformName,
  };
};

/**
 * Determines current display orientation using Screen Orientation API,
 * window.orientation, and window aspect ratio fallback.
 */
export const getDeviceOrientation = (): DetectedOrientation => {
  if (typeof window === 'undefined') return 'landscape';

  // 1. Modern Screen Orientation API
  const screenType = window.screen?.orientation?.type;
  if (screenType) {
    if (screenType.includes('portrait')) return 'portrait';
    if (screenType.includes('landscape')) return 'landscape';
  }

  // 2. Deprecated window.orientation for older iOS Safari
  if (typeof window.orientation === 'number') {
    const angle = Math.abs(window.orientation);
    if (angle === 90 || angle === 270) return 'landscape';
    if (angle === 0 || angle === 180) return 'portrait';
  }

  // 3. Fallback: window inner dimensions
  return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
};

export const detectScreenOrientation = getDeviceOrientation;

export interface UseCameraOrientationReturn {
  mode: CameraOrientationMode;
  detectedOrientation: DetectedOrientation;
  effectiveOrientation: DetectedOrientation;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  deviceCategory: DeviceCategory;
  platformName: string;
  streamDimensions: { width: number; height: number } | null;
  aspectClass: string;
  containerStyle: React.CSSProperties;
  setMode: (mode: CameraOrientationMode) => void;
  toggleMode: () => void;
  cycleOrientation: () => void;
  onStreamLoaded: (videoEl: HTMLVideoElement | null) => void;
  containerClassName: (type?: 'selfie' | 'qr' | 'apel') => string;
}

/**
 * Reactive hook that monitors window, screen, and device orientation events,
 * automatically adapting camera layouts for all smartphones and laptops.
 */
export const useCameraOrientation = (
  initialMode: CameraOrientationMode = 'auto',
  storageKey?: string
): UseCameraOrientationReturn => {
  const [mode, setModeState] = useState<CameraOrientationMode>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved === 'auto' || saved === 'portrait' || saved === 'landscape') {
          return saved;
        }
      } catch (e) {}
    }
    return initialMode;
  });

  const setMode = useCallback((newMode: CameraOrientationMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.setItem(storageKey, newMode);
      } catch (e) {}
    }
  }, [storageKey]);
  const [detectedOrientation, setDetectedOrientation] = useState<DetectedOrientation>(() =>
    getDeviceOrientation()
  );
  const [streamDimensions, setStreamDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [deviceInfo, setDeviceInfo] = useState<DeviceHardwareInfo>(() => detectDeviceHardware());

  // Listen for orientation and resize events
  useEffect(() => {
    const handleOrientationOrResize = () => {
      const detected = getDeviceOrientation();
      setDetectedOrientation(detected);
      setDeviceInfo(detectDeviceHardware());
    };

    // Screen orientation API listener
    const screenOrient = window.screen?.orientation;
    if (screenOrient && typeof screenOrient.addEventListener === 'function') {
      screenOrient.addEventListener('change', handleOrientationOrResize);
    }

    window.addEventListener('orientationchange', handleOrientationOrResize);
    window.addEventListener('resize', handleOrientationOrResize);

    return () => {
      if (screenOrient && typeof screenOrient.removeEventListener === 'function') {
        screenOrient.removeEventListener('change', handleOrientationOrResize);
      }
      window.removeEventListener('orientationchange', handleOrientationOrResize);
      window.removeEventListener('resize', handleOrientationOrResize);
    };
  }, []);

  // Update stream dimensions when video metadata loads
  const onStreamLoaded = useCallback((videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (w > 0 && h > 0) {
      setStreamDimensions({ width: w, height: h });
      // If mode is auto and stream clearly indicates orientation
      if (mode === 'auto') {
        const streamOrient: DetectedOrientation = w < h ? 'portrait' : 'landscape';
        setDetectedOrientation(streamOrient);
      }
    }
  }, [mode]);

  // Compute effective orientation
  const effectiveOrientation: DetectedOrientation =
    mode === 'auto' ? detectedOrientation : mode;

  // Toggle helper: auto -> portrait -> landscape -> auto
  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: CameraOrientationMode =
        prev === 'auto' ? 'portrait' : prev === 'portrait' ? 'landscape' : 'auto';
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(storageKey, next);
        } catch (e) {}
      }
      return next;
    });
  }, [storageKey]);

  // Responsive Tailwind CSS aspect ratio & sizing classes
  const containerClassName = useCallback(
    (type: 'selfie' | 'qr' | 'apel' = 'selfie'): string => {
      const isPort = effectiveOrientation === 'portrait';

      if (type === 'selfie') {
        return isPort
          ? 'relative w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] rounded-3xl overflow-hidden'
          : 'relative w-full max-w-xl sm:max-w-2xl mx-auto aspect-[4/3] sm:aspect-[16/10] rounded-3xl overflow-hidden';
      }

      if (type === 'qr') {
        return isPort
          ? 'relative w-full max-w-md mx-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden'
          : 'relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-[2.5rem] overflow-hidden';
      }

      // type === 'apel'
      return isPort
        ? 'relative w-full max-w-md mx-auto aspect-[3/4] rounded-2xl overflow-hidden'
        : 'relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden';
    },
    [effectiveOrientation]
  );

  const deviceCategory: DeviceCategory = deviceInfo.isMobile
    ? 'mobile'
    : deviceInfo.isTablet
    ? 'tablet'
    : 'laptop';

  const aspectClass =
    effectiveOrientation === 'portrait'
      ? 'aspect-[3/4] max-w-sm sm:max-w-md mx-auto'
      : 'aspect-[4/3] sm:aspect-[16/10] max-w-xl sm:max-w-2xl mx-auto';

  return {
    mode,
    detectedOrientation,
    effectiveOrientation,
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isLaptop: deviceInfo.isLaptop,
    deviceCategory,
    platformName: deviceInfo.platformName,
    streamDimensions,
    aspectClass,
    containerStyle: {},
    setMode,
    toggleMode,
    cycleOrientation: toggleMode,
    onStreamLoaded,
    containerClassName,
  };
};

export { CameraOrientationControls, CameraOrientationControls as CameraOrientationSelector } from '../components/CameraOrientationControls';
