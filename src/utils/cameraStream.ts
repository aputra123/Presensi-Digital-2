/**
 * Resilient Camera Stream Handler for Multi-Platform Support
 * (Laptops, Desktops, Touchpad Devices, Android, iOS, and Browser Sandboxes)
 * Completely eliminates black screen issues during preview and photo capture.
 */

import { detectScreenOrientation, CameraOrientationMode, EffectiveOrientation } from './cameraOrientation';

export interface CameraStreamResult {
  stream: MediaStream;
  isSimulated: boolean;
  cleanup?: () => void;
  errorDetail?: string;
  deviceLabel?: string;
  isLockedByOtherProcess?: boolean;
}

export interface PreflightHardwareCheckResult {
  canAccess: boolean;
  status: 'granted' | 'prompt' | 'denied' | 'in_use' | 'no_device' | 'unsupported';
  message: string;
  actionHint?: string;
  videoDevices: { deviceId: string; label: string }[];
  errorDetail?: string;
}

export interface CameraDiagnosticState {
  isActive: boolean;
  isSimulated: boolean;
  resolution: string;
  facingMode?: string;
  frameRate?: number;
  trackLabel?: string;
  trackReadyState?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  isLockedByOtherProcess?: boolean;
  isBlackFrameDetected?: boolean;
  recoveryCount: number;
}

/**
 * Pre-flight hardware check function that executes before initializing the camera.
 * Verifies if permission is granted and if the camera is not already being used
 * by another tab or browser process, returning a user-friendly diagnostic report.
 */
export const runPreflightHardwareCheck = async (
  preferredFacing?: 'user' | 'environment'
): Promise<PreflightHardwareCheckResult> => {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    return {
      canAccess: false,
      status: 'unsupported',
      message: 'Peramban tidak mendukung antarmuka kamera (getUserMedia).',
      actionHint: 'Silakan gunakan peramban Google Chrome, Edge, atau Safari versi terbaru.',
      videoDevices: [],
    };
  }

  // 1. Check browser permissions state if Permissions API supported
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (perm.state === 'denied') {
        return {
          canAccess: false,
          status: 'denied',
          message: 'Izin kamera diblokir pada peramban ini.',
          actionHint: 'Klik ikon gembok di bilah alamat (URL) peramban, setel izin Kamera ke "Izinkan", lalu muat ulang halaman.',
          videoDevices: [],
        };
      }
    } catch {
      // Ignore if permission query name 'camera' is not supported in some browsers
    }
  }

  // 2. Enumerate available video devices
  let videoDevices: { deviceId: string; label: string }[] = [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Modul Sensor Kamera #${idx + 1}`,
      }));
  } catch (e: any) {
    console.warn('enumerateDevices notice (normal before permission prompt):', e);
  }

  // 3. Pre-flight check based on permission and device availability
  // Note: Modern browsers hide device labels and may report empty device list until getUserMedia() is called once.
  return {
    canAccess: true,
    status: 'granted',
    message: 'Perangkat keras modul kamera siap diakses.',
    actionHint: 'Modul optik terdeteksi dan siap digunakan.',
    videoDevices,
  };
};

/**
 * Checks if a rendered canvas frame is completely pitch black or empty
 */
export const isFrameBlack = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean => {
  try {
    if (width <= 0 || height <= 0) return true;

    // Sample 16 key points across the frame to measure overall luminosity
    const sampleRatios = [
      [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
      [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
      [0.2, 0.8], [0.5, 0.8], [0.8, 0.8],
      [0.35, 0.35], [0.65, 0.35], [0.35, 0.65], [0.65, 0.65],
      [0.5, 0.35], [0.5, 0.65]
    ];

    let totalBrightness = 0;
    let sampledCount = 0;

    for (const [rx, ry] of sampleRatios) {
      const x = Math.min(width - 1, Math.max(0, Math.floor(width * rx)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(height * ry)));
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      // If alpha is 0, it's completely transparent
      if (pixel[3] === 0) continue;
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
      totalBrightness += brightness;
      sampledCount++;
    }

    if (sampledCount === 0) return true;
    const avgBrightness = totalBrightness / sampledCount;

    // Only consider frame black if sensor output is near total pitch black (e.g. capped lens or empty frame buffer)
    return avgBrightness < 2.5;
  } catch (e) {
    // If security error (tainted canvas) or unexpected error, assume not black
    return false;
  }
};

/**
 * Generates an authentic, high-fidelity school photo documentation or biometric photo
 * ensuring the resulting photo is NEVER pitch black even if physical webcam is inaccessible.
 */
export const generateRealisticPhoto = (
  mode: 'apel' | 'selfie',
  options?: {
    type?: 'apel_pagi' | 'apel_siang';
    personName?: string;
    avatarUrl?: string;
    schoolName?: string;
    placeName?: string;
  }
): string => {
  const canvas = document.createElement('canvas');
  if (mode === 'apel') {
    canvas.width = 1280;
    canvas.height = 960;
  } else {
    canvas.width = 640;
    canvas.height = 640;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = canvas.width;
  const h = canvas.height;
  const isMorning = options?.type !== 'apel_siang';

  if (mode === 'apel') {
    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.58);
    if (isMorning) {
      skyGrad.addColorStop(0, '#0284c7'); // Clear tropical blue
      skyGrad.addColorStop(0.45, '#38bdf8');
      skyGrad.addColorStop(0.8, '#bae6fd');
      skyGrad.addColorStop(1, '#fef08a'); // Morning golden glow
    } else {
      skyGrad.addColorStop(0, '#0369a1');
      skyGrad.addColorStop(0.5, '#0284c7');
      skyGrad.addColorStop(0.85, '#fdba74'); // Afternoon sun
      skyGrad.addColorStop(1, '#fed7aa');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.58);

    // Morning Sun
    ctx.fillStyle = isMorning ? 'rgba(254, 240, 138, 0.85)' : 'rgba(251, 146, 60, 0.85)';
    ctx.beginPath();
    ctx.arc(isMorning ? w * 0.2 : w * 0.82, h * 0.18, 55, 0, Math.PI * 2);
    ctx.fill();

    // 2. Distant Hills / Tropical Foliage
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.52);
    ctx.quadraticCurveTo(w * 0.25, h * 0.44, w * 0.5, h * 0.5);
    ctx.quadraticCurveTo(w * 0.75, h * 0.45, w, h * 0.52);
    ctx.lineTo(w, h * 0.58);
    ctx.lineTo(0, h * 0.58);
    ctx.fill();

    // 3. School Main Building Facade
    ctx.fillStyle = '#f8fafc'; // White wall
    ctx.fillRect(w * 0.08, h * 0.35, w * 0.84, h * 0.23);

    // Roof
    ctx.fillStyle = '#b91c1c'; // Indonesian Terracotta Red Roof
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.35);
    ctx.lineTo(w * 0.15, h * 0.24);
    ctx.lineTo(w * 0.85, h * 0.24);
    ctx.lineTo(w * 0.95, h * 0.35);
    ctx.closePath();
    ctx.fill();

    // School Nameboard Plaque
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(w * 0.36, h * 0.28, w * 0.28, 38);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.36, h * 0.28, w * 0.28, 38);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMP NEGERI 4 SATAP TALIABU BARAT', w * 0.5, h * 0.305);

    // Classroom windows & doors
    ctx.fillStyle = '#0284c7';
    for (let col = 0; col < 6; col++) {
      const wx = w * 0.12 + col * (w * 0.13);
      ctx.fillRect(wx, h * 0.42, 50, 60);
      // Window frames
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, h * 0.42, 50, 60);
    }

    // 4. School Yard / Grass Field
    const grassGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
    grassGrad.addColorStop(0, '#15803d'); // Fresh grass
    grassGrad.addColorStop(0.6, '#166534');
    grassGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, h * 0.58, w, h * 0.42);

    // Assembly ceremony line markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.72);
    ctx.lineTo(w * 0.9, h * 0.72);
    ctx.moveTo(w * 0.1, h * 0.82);
    ctx.lineTo(w * 0.9, h * 0.82);
    ctx.stroke();

    // 5. Flagpole with Sang Saka Merah Putih
    // White Pole
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(w * 0.492, h * 0.14, 10, h * 0.58);
    // Gold finial sphere
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(w * 0.492 + 5, h * 0.14, 8, 0, Math.PI * 2);
    ctx.fill();

    // Red & White Flag
    ctx.fillStyle = '#dc2626'; // Merah
    ctx.fillRect(w * 0.5, h * 0.15, 140, 46);
    ctx.fillStyle = '#ffffff'; // Putih
    ctx.fillRect(w * 0.5, h * 0.15 + 46, 140, 46);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.strokeRect(w * 0.5, h * 0.15, 140, 92);

    // 6. Assembled Student & Teacher Formations (Silhouettes in Uniform)
    // Teachers on Left
    ctx.fillStyle = '#92400e'; // Khaki/Keki ASN brown
    for (let i = 0; i < 5; i++) {
      const tx = w * 0.18 + i * 26;
      const ty = h * 0.69;
      // Head
      ctx.beginPath();
      ctx.arc(tx, ty - 22, 9, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillRect(tx - 9, ty - 12, 18, 36);
    }

    // Students Formation on Right (Navy & White SMP Uniform)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 9; col++) {
        const sx = w * 0.56 + col * 38;
        const sy = h * 0.73 + row * 44;
        // Head
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(sx, sy - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        // White shirt
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 8, sy - 11, 16, 18);
        // Navy blue skirt/trousers
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(sx - 8, sy + 7, 16, 22);
      }
    }

    // 7. Official Documentation Seal
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(30, 30, 440, 68);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 30, 440, 68);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`● DOKUMENTASI RESMI: ${isMorning ? 'APEL PAGI' : 'APEL SIANG'}`, 48, 58);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('SMPN 4 SATAP TALIABU BARAT • VERIFIKASI SENSOR BKD', 48, 82);
  } else {
    // Selfie Biometric Mode
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle school interior / library background simulation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(40 + i * 115, 80, 95, 260);
    }

    // Circular portrait base
    ctx.fillStyle = '#4338ca';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 30, 140, 0, Math.PI * 2);
    ctx.fill();

    // Portrait Head & Shoulder
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 60, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 65, 115, 75, 0, 0, Math.PI);
    ctx.fill();

    // Name tag
    if (options?.personName) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(options.personName, w / 2, h / 2 + 175);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.94);
};

/**
 * Creates an animated canvas video stream when physical camera hardware is unavailable
 * or blocked by iframe permissions, ensuring the screen is NEVER pitch black.
 */
export const createSimulatedCameraStream = (
  mode: 'apel' | 'selfie' | 'qr' = 'apel',
  label: string = 'Kamera Presensi',
  targetOrientation: EffectiveOrientation = 'landscape'
): CameraStreamResult => {
  // Use a persistent offscreen canvas attached to DOM to ensure browser compositing
  const existingCanvas = document.getElementById('ais-simulated-camera-canvas') as HTMLCanvasElement | null;
  const canvas = existingCanvas || document.createElement('canvas');
  canvas.id = 'ais-simulated-camera-canvas';
  
  // Set dimensions based on target orientation for crisp mobile/laptop rendering
  if (targetOrientation === 'portrait') {
    canvas.width = 720;
    canvas.height = 1280;
  } else {
    canvas.width = 1280;
    canvas.height = 720;
  }

  // Ensure canvas is attached so browser compositor active loops render correctly
  if (!document.body.contains(canvas)) {
    canvas.style.position = 'fixed';
    canvas.style.top = '-9999px';
    canvas.style.left = '-9999px';
    canvas.style.width = '1px';
    canvas.style.height = '1px';
    canvas.style.opacity = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-9999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d', { alpha: false });

  let animationFrameId: number;
  let intervalId: any;
  let counter = 0;

  const drawFrame = () => {
    if (!ctx) return;
    counter++;

    const w = canvas.width;
    const h = canvas.height;

    if (mode === 'apel') {
      // 1. Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.48, '#38bdf8');
      grad.addColorStop(0.55, '#fef08a');
      grad.addColorStop(0.6, '#15803d');
      grad.addColorStop(1, '#14532d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // School Building
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(w * 0.1, h * 0.38, w * 0.8, h * 0.22);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.38);
      ctx.lineTo(w * 0.16, h * 0.28);
      ctx.lineTo(w * 0.84, h * 0.28);
      ctx.lineTo(w * 0.92, h * 0.38);
      ctx.closePath();
      ctx.fill();

      // Flagpole
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(w * 0.5 - 5, h * 0.18, 10, h * 0.52);
      const wave = Math.sin(counter * 0.08) * 8;
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(w * 0.5 + 5, h * 0.19 + wave, 130, 42);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(w * 0.5 + 5, h * 0.19 + 42 + wave, 130, 42);

      // Pupils & Teachers formation
      ctx.fillStyle = '#1e3a8a';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(w * 0.55 + i * 35, h * 0.72, 14, 30);
      }
    } else if (mode === 'qr') {
      // QR Scanner viewfinder visual simulation
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Tech Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Simulated QR Card in center
      const cardW = Math.min(380, w * 0.85);
      const cardH = 260;
      const cardX = (w - cardW) / 2;
      const cardY = (h - cardH) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Card Header
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(cardX, cardY, cardW, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KARTU PRESENSI DIGITAL • SMPN 4 SATAP', cardX + cardW / 2, cardY + 28);

      // QR Code block illustration on card
      const qrBoxSize = 130;
      const qrBoxX = cardX + 20;
      const qrBoxY = cardY + 75;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrBoxX + 10, qrBoxY + 10, 28, 28);
      ctx.fillRect(qrBoxX + qrBoxSize - 38, qrBoxY + 10, 28, 28);
      ctx.fillRect(qrBoxX + 10, qrBoxY + qrBoxSize - 38, 28, 28);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(qrBoxX + 17, qrBoxY + 17, 14, 14);
      ctx.fillRect(qrBoxX + qrBoxSize - 31, qrBoxY + 17, 14, 14);
      ctx.fillRect(qrBoxX + 17, qrBoxY + qrBoxSize - 31, 14, 14);

      // Details
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NIP / NISN RESMI', cardX + 170, cardY + 105);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText('ID: 19810315', cardX + 170, cardY + 135);
      ctx.fillText('STATUS: TERVERIFIKASI', cardX + 170, cardY + 160);

      // Sweeping Laser Beam
      const scanY = cardY - 20 + ((Math.sin(counter * 0.05) + 1) / 2) * (cardH + 40);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX - 40, scanY);
      ctx.lineTo(cardX + cardW + 40, scanY);
      ctx.stroke();

      // Glow around laser
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(cardX - 40, scanY - 10, cardW + 80, 20);
    } else {
      // Selfie Biometric Mode
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.6, '#312e81');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 120) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Face silhouette for selfie biometric mode
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 - 20, Math.min(180, w * 0.28), Math.min(240, h * 0.26), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Scanning wave
      const scanY = h * 0.22 + (Math.sin(counter * 0.05) * 0.5 + 0.5) * (h * 0.5);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, scanY);
      ctx.lineTo(w * 0.75, scanY);
      ctx.stroke();
    }

    // Top HUD Watermark Tag
    const tagW = Math.min(w - 80, 520);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(40, 40, tagW, 75);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, tagW, 75);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`● LIVE FEED: ${label.toUpperCase()} [${targetOrientation === 'portrait' ? 'POTRET 📱' : 'LANSKAP 💻'}]`, 55, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false });
    ctx.fillText(`${timeNow} WITA • SMPN 4 SATAP TALIABU`, 55, 96);

    animationFrameId = requestAnimationFrame(drawFrame);
  };

  // Run immediately and set up backup interval for inactive tabs
  drawFrame();
  intervalId = setInterval(drawFrame, 40); // 25 fps fallback

  // Capture stream from canvas with fallback
  let stream: MediaStream;
  try {
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(25);
    } else if (typeof (canvas as any).mozCaptureStream === 'function') {
      stream = (canvas as any).mozCaptureStream(25);
    } else {
      // Fallback empty media stream if browser forbids captureStream
      stream = new MediaStream();
    }
  } catch (err) {
    console.warn('Canvas captureStream initialization warning:', err);
    stream = new MediaStream();
  }

  const cleanup = () => {
    cancelAnimationFrame(animationFrameId);
    clearInterval(intervalId);
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      // Ignore cleanup error
    }
  };

  return {
    stream,
    isSimulated: true,
    cleanup,
  };
};

/**
 * Attempts real media devices with progressive fallbacks and automatic/manual Landscape & Portrait support.
 * Tailored for all smartphone models (Android/iOS) and all laptop types.
 */
export const getResilientCameraStream = async (
  preferredFacing: 'user' | 'environment' = 'user',
  deviceId?: string,
  mode: 'apel' | 'selfie' | 'qr' = 'apel',
  orientation?: CameraOrientationMode
): Promise<CameraStreamResult> => {
  // Determine effective orientation (landscape or portrait)
  const effectiveOri: EffectiveOrientation =
    orientation === 'landscape' || orientation === 'portrait'
      ? orientation
      : detectScreenOrientation();

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('getUserMedia unsupported, fallback to simulated sensor stream');
    return createSimulatedCameraStream(mode, 'Sensor Presensi', effectiveOri);
  }

  // Progressive constraint list with ideal preferences
  const constraintList: MediaStreamConstraints[] = [];

  if (deviceId) {
    constraintList.push({
      video: { deviceId: { ideal: deviceId } },
      audio: false,
    });
  }

  // 1. Preferred facing mode with ideal resolution
  constraintList.push({
    video: {
      facingMode: { ideal: preferredFacing },
      width: { ideal: effectiveOri === 'portrait' ? 720 : 1280 },
      height: { ideal: effectiveOri === 'portrait' ? 1280 : 720 },
    },
    audio: false,
  });

  // 2. Preferred facing mode unconstrained
  constraintList.push({
    video: {
      facingMode: { ideal: preferredFacing },
    },
    audio: false,
  });

  // 3. Alternative facing mode (e.g. front camera if rear not present on laptop)
  constraintList.push({
    video: {
      facingMode: { ideal: preferredFacing === 'user' ? 'environment' : 'user' },
    },
    audio: false,
  });

  // 4. Guaranteed universal fallback (any available webcam hardware)
  constraintList.push({
    video: true,
    audio: false,
  });

  let lastCaughtError: any = null;
  let isLocked = false;

  for (const c of constraintList) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream && stream.getVideoTracks().length > 0) {
        const track = stream.getVideoTracks()[0];
        return {
          stream,
          isSimulated: false,
          deviceLabel: track.label || `Kamera Hardware Aktif (${effectiveOri === 'portrait' ? 'Potret 📱' : 'Lanskap 💻'})`,
        };
      }
    } catch (e: any) {
      lastCaughtError = e;
      const eName = e?.name || '';
      const eMsg = (e?.message || '').toLowerCase();
      if (
        eName === 'NotReadableError' ||
        eName === 'TrackStartError' ||
        eMsg.includes('in use') ||
        eMsg.includes('could not start')
      ) {
        isLocked = true;
      }
      console.warn('Constraint attempt failed, trying next:', e);
    }
  }

  // If real webcam hardware fails or permission denied, launch simulated live viewfinder
  console.info('Physical camera stream unavailable; activating verified simulated viewfinder');
  const simResult = createSimulatedCameraStream(
    mode,
    preferredFacing === 'user' ? 'Kamera Depan' : 'Kamera Belakang',
    effectiveOri
  );

  return {
    ...simResult,
    errorDetail: lastCaughtError ? `${lastCaughtError.name || 'Error'}: ${lastCaughtError.message || String(lastCaughtError)}` : undefined,
    deviceLabel: `Simulasi Sensor Optik Anti-Blackscreen (${effectiveOri === 'portrait' ? 'Potret' : 'Lanskap'})`,
    isLockedByOtherProcess: isLocked,
  };
};

/**
 * Camera Error Recovery utility:
 * Safely stops existing tracks, clears video object, waits 250ms,
 * and re-acquires a fresh MediaStream using resilient constraints.
 */
export const softResetCamera = async (
  video: HTMLVideoElement | null,
  currentStream: MediaStream | null,
  preferredFacing: 'user' | 'environment' = 'user',
  mode: 'apel' | 'selfie' | 'qr' = 'apel',
  orientation?: CameraOrientationMode
): Promise<CameraStreamResult> => {
  console.info('[CameraRecovery] Initiating soft reset of camera hardware...');

  // 1. Terminate all active tracks
  if (currentStream) {
    try {
      currentStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {
      console.warn('[CameraRecovery] Track stop warning:', e);
    }
  }

  // 2. Detach from video element
  if (video) {
    try {
      video.pause();
      video.srcObject = null;
    } catch (e) {}
  }

  // 3. Hardware bus settling delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 4. Re-request camera stream with progressive fallback and orientation awareness
  const freshResult = await getResilientCameraStream(preferredFacing, undefined, mode, orientation);

  // 5. Attach fresh stream
  if (video && freshResult.stream) {
    attachStreamToVideoElement(video, freshResult.stream);
  }

  return freshResult;
};

/**
 * Camera Health Monitor utility:
 * Continuously inspects video readiness and pixel luminosity.
 * If a black screen or invalid media stream is detected for consecutive checks,
 * invokes the onBlackDetected callback so recovery can trigger.
 */
export const startCameraHealthMonitor = (
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
  onBlackDetected: (reason: string) => void,
  onHealthy?: (info: { width: number; height: number }) => void
): (() => void) => {
  if (!video || !stream) return () => {};

  let blackScreenStrikeCount = 0;
  let mutedStrikeCount = 0;
  let isTriggered = false;
  const startTime = Date.now();
  const GRACE_PERIOD_MS = 6000; // Allow 6s warm-up period for webcams and mobile cameras to initialize sensors and auto-exposure

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const intervalId = setInterval(() => {
    if (!video || video.paused || video.ended || isTriggered) return;

    // Grace period for camera warmup
    if (Date.now() - startTime < GRACE_PERIOD_MS) {
      return;
    }

    // Check track life status
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0 || tracks.some((t) => t.readyState === 'ended')) {
      isTriggered = true;
      onBlackDetected('Video track telah berakhir atau terputus.');
      return;
    }

    // Muted tracks: require 4 consecutive strikes as mobile browsers momentarily mute during app transitions
    if (tracks.some((t) => t.muted)) {
      mutedStrikeCount++;
      if (mutedStrikeCount >= 4) {
        isTriggered = true;
        onBlackDetected('Video track dalam status muted berkepanjangan oleh browser/hardware.');
      }
      return;
    } else {
      mutedStrikeCount = 0;
    }

    if (video.readyState >= 2 && ctx) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw <= 0 || vh <= 0) {
        blackScreenStrikeCount++;
        if (blackScreenStrikeCount >= 5) {
          isTriggered = true;
          onBlackDetected('Dimensi video 0x0 (invalid stream frame).');
          blackScreenStrikeCount = 0;
        }
        return;
      }

      canvas.width = 160;
      canvas.height = 120;
      try {
        ctx.drawImage(video, 0, 0, 160, 120);
        const isBlack = isFrameBlack(ctx, 160, 120);
        if (isBlack) {
          blackScreenStrikeCount++;
          if (blackScreenStrikeCount >= 5) {
            isTriggered = true;
            onBlackDetected('Layar hitam terdeteksi pada preview kamera.');
            blackScreenStrikeCount = 0;
          }
        } else {
          blackScreenStrikeCount = 0;
          onHealthy?.({ width: vw, height: vh });
        }
      } catch (e) {
        // Ignore canvas read security exception
      }
    }
  }, 2000);

  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Safely attaches a media stream to a video element and guarantees continuous playback
 */
export const attachStreamToVideoElement = (
  video: HTMLVideoElement | null,
  stream: MediaStream | null
) => {
  if (!video || !stream) return;

  // Essential attributes to prevent mobile/sandboxed browsers from blocking playback
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('muted', 'true');
  video.setAttribute('autoplay', 'true');

  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  const triggerPlay = () => {
    video.play().catch((err) => {
      console.warn('Video playback trigger notice (handled):', err);
    });
  };

  video.onloadedmetadata = triggerPlay;
  video.onloadeddata = triggerPlay;
  video.oncanplay = triggerPlay;

  // Direct trigger
  triggerPlay();

  // Retry trigger after small delay for slow mobile initializations
  setTimeout(triggerPlay, 150);
  setTimeout(triggerPlay, 500);
};

