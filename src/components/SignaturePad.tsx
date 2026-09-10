import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Eraser,
  Check,
  Undo2,
  PenTool,
  Sliders,
  Sparkles,
  Smartphone,
  Laptop,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export interface SignaturePadProps {
  initialSignature?: string;
  onSave?: (signatureDataUrl: string, timestamp: string) => Promise<void> | void;
  onChange?: (signatureDataUrl: string) => void;
  onClear?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  width?: number;
  height?: number;
  defaultColor?: string;
  defaultLineWidth?: number;
  showInstructions?: boolean;
  showToolbar?: boolean;
  showFooter?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

interface Point {
  x: number;
  y: number;
  time: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  onSave,
  onChange,
  onClear,
  onCancel,
  isSaving: externalIsSaving = false,
  width: customWidth,
  height: customHeight = 240,
  defaultColor = '#1D4ED8', // Biru Resmi Kedinasan ASN
  defaultLineWidth = 3.2,
  showInstructions = true,
  showToolbar = true,
  showFooter = true,
  title,
  subtitle,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [strokeColor, setStrokeColor] = useState<string>(defaultColor);
  const [lineWidth, setLineWidth] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      return 3.4; // Optimal untuk sentuhan jari di smartphone
    }
    return defaultLineWidth || 3.0;
  });
  const [_isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const [history, setHistory] = useState<string[]>([]); // store data URLs for robust high-DPI undo
  const [showStrokeSlider, setShowStrokeSlider] = useState<boolean>(false);
  const [clearFlash, setClearFlash] = useState<boolean>(false);
  const [validationToast, setValidationToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [internalSaving, setInternalSaving] = useState<boolean>(false);

  const isSaving = externalIsSaving || internalSaving;

  // Smooth spline references and high-frequency RAF update loop
  const lastPointRef = useRef<Point | null>(null);
  const lastMidPointRef = useRef<Point | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const currentLineWidthRef = useRef<number>(lineWidth);
  const pendingPointsRef = useRef<Point[]>([]);
  const rafHandleRef = useRef<number | null>(null);

  // Keep currentLineWidthRef in sync
  useEffect(() => {
    currentLineWidthRef.current = lineWidth;
  }, [lineWidth]);

  // Resize and initialize canvas with High DPI backing store
  const initCanvas = useCallback(
    (preserveContent = true) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.max(window.devicePixelRatio || 1, 2.5);

      const displayWidth = customWidth || Math.max(rect.width || 320, 280);
      const displayHeight = customHeight;

      // Capture existing drawing before resizing to prevent accidental clearing
      let prevDataUrl: string | null = null;
      if (preserveContent && canvas.width > 0 && canvas.height > 0 && hasDrawn) {
        try {
          prevDataUrl = canvas.toDataURL('image/png');
        } catch {
          prevDataUrl = null;
        }
      }

      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      if (prevDataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, displayWidth, displayHeight);
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          setHasDrawn(true);
        };
        img.src = prevDataUrl;
      } else if (initialSignature) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, displayWidth, displayHeight);
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          setHasDrawn(true);
          setHistory([initialSignature]);
        };
        img.src = initialSignature;
      } else {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
      }
    },
    [customWidth, customHeight, initialSignature, strokeColor, lineWidth]
  );

  // Update stroke color
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = strokeColor;
    }
  }, [strokeColor]);

  // Update stroke width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = lineWidth;
    }
  }, [lineWidth]);

  // Set up resize observer & orientation change handler
  useEffect(() => {
    initCanvas(Boolean(initialSignature));

    const container = containerRef.current;
    if (!container) return;

    let prevWidth = container.clientWidth;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (Math.abs(newWidth - prevWidth) > 16 && !isPointerDownRef.current) {
          prevWidth = newWidth;
          initCanvas(true);
        }
      }
    });

    resizeObserver.observe(container);

    const handleOrientationChange = () => {
      setTimeout(() => {
        initCanvas(true);
      }, 180);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [initCanvas, initialSignature]);

  // Accurate coordinate calculation taking into account bounding rect and display scaling
  const getCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
    const canvasDisplayWidth = canvas.width / dpr;
    const canvasDisplayHeight = canvas.height / dpr;

    const scaleX = rect.width > 0 ? canvasDisplayWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? canvasDisplayHeight / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      time: Date.now(),
    };
  };

  // Save current canvas state to undo stack
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setHistory((prev) => [...prev.slice(-16), dataUrl]);
    } catch {}
  };

  // Check if canvas has actual drawn content (pixel alpha test)
  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return true;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      // Scan for non-transparent pixels with step to maintain fast performance
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] > 15) return false;
      }
      return true;
    } catch {
      return !hasDrawn;
    }
  };

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, []);

  // Process queued points using requestAnimationFrame for smooth, high-frequency, jitter-free drawing
  const drainPointQueue = useCallback(() => {
    rafHandleRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !isPointerDownRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const queue = pendingPointsRef.current.splice(0, pendingPointsRef.current.length);
    if (queue.length === 0) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < queue.length; i++) {
      const rawPt = queue[i];
      const lastPt = lastPointRef.current;
      if (!lastPt) {
        lastPointRef.current = rawPt;
        lastMidPointRef.current = rawPt;
        continue;
      }

      const dist = Math.hypot(rawPt.x - lastPt.x, rawPt.y - lastPt.y);
      if (dist < 0.4) continue;

      // Low-pass filter for anti-jitter smoothing on mobile touch digitizers
      const pt: Point = {
        x: lastPt.x + (rawPt.x - lastPt.x) * 0.82,
        y: lastPt.y + (rawPt.y - lastPt.y) * 0.82,
        time: rawPt.time,
      };

      // Velocity-based stroke tapering (mimics natural fountain/ballpoint pen)
      const timeDiff = Math.max(pt.time - lastPt.time, 1);
      const velocity = dist / timeDiff;
      const targetWidth = Math.max(
        lineWidth * 0.72,
        Math.min(lineWidth * 1.25, lineWidth * (1.12 - velocity * 0.075))
      );
      currentLineWidthRef.current = currentLineWidthRef.current * 0.6 + targetWidth * 0.4;

      const midPoint: Point = {
        x: (lastPt.x + pt.x) / 2,
        y: (lastPt.y + pt.y) / 2,
        time: pt.time,
      };

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = currentLineWidthRef.current;

      // Draw continuous quadratic Bézier curve
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current ? lastMidPointRef.current.x : lastPt.x, lastMidPointRef.current ? lastMidPointRef.current.y : lastPt.y);
      ctx.quadraticCurveTo(lastPt.x, lastPt.y, midPoint.x, midPoint.y);
      ctx.stroke();

      // Seamless round joint dot to eliminate any jagged/broken line gap
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(midPoint.x, midPoint.y, Math.max(currentLineWidthRef.current / 2, 1.2), 0, Math.PI * 2);
      ctx.fill();

      lastPointRef.current = pt;
      lastMidPointRef.current = midPoint;
    }

    // Continue loop if more touch points arrived during RAF frame
    if (isPointerDownRef.current && pendingPointsRef.current.length > 0) {
      rafHandleRef.current = requestAnimationFrame(drainPointQueue);
    }
  }, [lineWidth, strokeColor]);

  // Pointer Down (Mouse click, Touch start, Stylus contact)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isSaving) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (validationToast) {
      setValidationToast(null);
    }
    if (successToast) {
      setSuccessToast(null);
    }

    saveSnapshot();

    const pt = getCoordinates(e.clientX, e.clientY);
    lastPointRef.current = pt;
    lastMidPointRef.current = pt;
    pendingPointsRef.current = [];
    isPointerDownRef.current = true;
    setIsDrawing(true);
    setHasDrawn(true);
    currentLineWidthRef.current = lineWidth;

    // Increased dot size for smoother interpolation & elimination of start-stroke gaps
    const initialDotSize = Math.max(lineWidth * 0.85, 2.6);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, initialDotSize, 0, Math.PI * 2);
    ctx.fill();
  };

  // Pointer Move with high-frequency RAF update loop (captures high-rate touch events smoothly)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || isSaving) return;

    // Support coalesced events for Apple Pencil, Samsung S-Pen, and high-DPI touch digitizers
    const coalescedEvents =
      typeof (e.nativeEvent as any)?.getCoalescedEvents === 'function'
        ? (e.nativeEvent as any).getCoalescedEvents()
        : [e.nativeEvent || e];

    for (let i = 0; i < coalescedEvents.length; i++) {
      const ev = coalescedEvents[i];
      const rawPt = getCoordinates(ev.clientX, ev.clientY);
      pendingPointsRef.current.push(rawPt);
    }

    // Schedule RAF loop if not already ticking
    if (rafHandleRef.current === null) {
      rafHandleRef.current = requestAnimationFrame(drainPointQueue);
    }
  };

  // Finish drawing
  const finishDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;

    // Cancel pending RAF and drain all queued points immediately
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
    drainPointQueue();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx && lastPointRef.current && lastMidPointRef.current) {
      // Connect final point cleanly with round cap and endpoint dot
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(lastPointRef.current.x, lastPointRef.current.y, Math.max(currentLineWidthRef.current / 2, 1.4), 0, Math.PI * 2);
      ctx.fill();
    }

    isPointerDownRef.current = false;
    setIsDrawing(false);
    lastPointRef.current = null;
    lastMidPointRef.current = null;
    pendingPointsRef.current = [];

    if (e && canvas) {
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {}
    }

    setHasDrawn(true);

    if (onChange && canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  // Clear Canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    isPointerDownRef.current = false;
    lastPointRef.current = null;
    lastMidPointRef.current = null;
    setIsDrawing(false);
    setHasDrawn(false);
    setHistory([]);
    setClearFlash(true);
    setValidationToast(null);
    setSuccessToast(null);
    setTimeout(() => setClearFlash(false), 400);

    onClear?.();
    if (onChange) {
      onChange('');
    }
  };

  // Undo Last Stroke
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    if (newHistory.length > 0) {
      const lastUrl = newHistory[newHistory.length - 1];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasDrawn(true);
        onChange?.(lastUrl);
      };
      img.src = lastUrl;
    } else {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      setHasDrawn(false);
      onChange?.('');
    }
  };

  // Handle Image File Upload (PNG/JPG/WEBP with smart transparency cleaning)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setValidationToast('Format file tidak didukung. Harap pilih gambar PNG, JPG, atau WEBP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setValidationToast('Ukuran gambar maksimal 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        saveSnapshot();

        const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
        const displayWidth = canvas.width / dpr;
        const displayHeight = canvas.height / dpr;

        // Clear canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Offscreen canvas for background removal & contrast enhancement if photo on paper
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
          try {
            const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
            const data = imgData.data;

            // Check if image has solid white/near-white paper background (typical scanned signature)
            let isWhiteBg = false;
            let sampleWhiteCount = 0;
            const samplePoints = [
              [0, 0],
              [offCanvas.width - 1, 0],
              [0, offCanvas.height - 1],
              [offCanvas.width - 1, offCanvas.height - 1],
            ];
            for (const [sx, sy] of samplePoints) {
              const idx = (sy * offCanvas.width + sx) * 4;
              if (data[idx] > 215 && data[idx + 1] > 215 && data[idx + 2] > 215) {
                sampleWhiteCount++;
              }
            }
            if (sampleWhiteCount >= 3) {
              isWhiteBg = true;
            }

            // If background is white paper, turn white pixels transparent
            if (isWhiteBg) {
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // If pixel is near white / light gray, make it transparent
                if (r > 205 && g > 205 && b > 205) {
                  data[i + 3] = 0;
                } else if (r > 175 && g > 175 && b > 175) {
                  // Soft fade out edges
                  data[i + 3] = Math.max(0, 255 - ((r + g + b) / 3 - 175) * 8);
                }
              }
              offCtx.putImageData(imgData, 0, 0);
            }
          } catch {
            // If cross-origin or restricted, proceed with raw image
          }
        }

        // Calculate aspect ratio fit centered with margin
        const padX = 32;
        const padY = 24;
        const availW = displayWidth - padX * 2;
        const availH = displayHeight - padY * 2;

        const imgScale = Math.min(availW / img.width, availH / img.height, 1);
        const targetW = img.width * imgScale;
        const targetH = img.height * imgScale;
        const posX = (displayWidth - targetW) / 2;
        const posY = (displayHeight - targetH) / 2;

        ctx.drawImage(offCanvas || img, posX, posY, targetW, targetH);

        setHasDrawn(true);
        const finalUrl = canvas.toDataURL('image/png');
        setHistory((prev) => [...prev, finalUrl]);
        onChange?.(finalUrl);
        setValidationToast(null);
        setSuccessToast('Tanda tangan dari berkas berhasil dimuat & disesuaikan ke kanvas!');
        setTimeout(() => setSuccessToast(null), 3500);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Export current canvas as high-resolution PNG Data URL
  const exportDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return '';
    return canvas.toDataURL('image/png');
  };

  // Handle Save with Validation & Visual Feedback
  const handleSave = async () => {
    // Validate that canvas is not empty or blank
    if (isCanvasEmpty()) {
      setValidationToast('Tanda tangan masih kosong! Silakan goreskan tanda tangan atau unggah berkas tanda tangan.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 650);
      try {
        navigator.vibrate?.([80, 40, 80]);
      } catch {}
      return;
    }

    const dataUrl = exportDataUrl();
    if (!dataUrl) {
      setValidationToast('Gagal memproses tanda tangan. Silakan goreskan tanda tangan ulang.');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    setValidationToast(null);

    setInternalSaving(true);
    try {
      if (onSave) {
        await Promise.resolve(onSave(dataUrl, timeStr));
      }
      setSavedSuccess(true);
    } catch (err: any) {
      setValidationToast('Gagal menyimpan tanda tangan: ' + (err?.message || 'Kesalahan sistem'));
    } finally {
      setInternalSaving(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white rounded-3xl border overflow-hidden shadow-sm transition-all duration-200 ${
        validationToast
          ? 'border-rose-400 ring-2 ring-rose-200 shadow-rose-100'
          : 'border-slate-200'
      } ${isShaking ? 'translate-x-1 duration-75' : ''} ${className}`}
    >
      {/* Hidden File Input for Signature Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Info */}
      {(title || subtitle || showInstructions) && (
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {title && <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>}
            {subtitle && <p className="text-xs text-slate-500 font-mono">{subtitle}</p>}
          </div>

          {showInstructions && (
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                <Laptop className="w-3 h-3" />
                <span>Touchpad / Mouse</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                <Smartphone className="w-3 h-3" />
                <span>Layar Sentuh HP</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Validation Alert */}
      {validationToast && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 font-bold animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationToast(null)}
            className="text-rose-500 hover:text-rose-800 text-[11px] underline ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 text-[11px] underline ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && (
        <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Color Palettes */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Tinta:</span>
            {[
              { label: 'Biru ASN', color: '#1D4ED8' },
              { label: 'Hitam', color: '#0F172A' },
              { label: 'Biru Tua', color: '#1E3A8A' },
              { label: 'Hijau', color: '#047857' },
            ].map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => setStrokeColor(c.color)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  strokeColor === c.color
                    ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                    : 'hover:scale-105 opacity-80'
                }`}
                style={{ backgroundColor: c.color }}
                title={`Pilih Warna ${c.label}`}
              >
                {strokeColor === c.color && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>

          {/* Line Width, Upload, Undo, Clear */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Upload Signature Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 min-h-[34px] rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Unggah tanda tangan dari file foto / gambar (PNG, JPG)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Unggah TTD</span>
              <span className="sm:hidden">Unggah</span>
            </button>

            {/* Stroke Width Selector */}
            <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLineWidth(2.2)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 2.2 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Halus (2.2px)"
              >
                Halus
              </button>
              <button
                type="button"
                onClick={() => setLineWidth(3.2)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 3.2 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Standar (3.2px - Touchpad/Mouse)"
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => setLineWidth(4.6)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 4.6 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Tebal (4.6px - Layar Sentuh HP)"
              >
                Tebal
              </button>
              <button
                type="button"
                onClick={() => setShowStrokeSlider(!showStrokeSlider)}
                className={`px-1.5 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  showStrokeSlider ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Atur Ukuran Goresan Kustom"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {showStrokeSlider && (
              <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-slate-600 min-w-[28px]">
                  {lineWidth.toFixed(1)}px
                </span>
                <input
                  type="range"
                  min="1.4"
                  max="7.5"
                  step="0.2"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Batalkan goresan terakhir (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[34px] rounded-xl border transition-all cursor-pointer font-bold text-xs flex items-center space-x-1 ${
                clearFlash
                  ? 'bg-rose-600 text-white border-rose-600 scale-95'
                  : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
              }`}
              title="Bersihkan seluruh tanda tangan (Clear Canvas)"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>{clearFlash ? 'Bersih!' : 'Hapus'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawing Canvas Box with touch-action: none */}
      <div className="relative w-full bg-slate-50/40 select-none overflow-hidden touch-none">
        {/* Visual Guideline and Watermark */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Area Tanda Tangan Resmi ASN</span>
            <span className="font-mono text-indigo-500/80 font-bold">Sensitivitas Halus Tanpa Patah-Patah</span>
          </div>

          {!hasDrawn && (
            <div className="text-center text-slate-400 select-none my-auto pointer-events-auto">
              <PenTool className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-indigo-600 animate-pulse" />
              <p className="text-xs font-bold text-slate-600">
                Goreskan tanda tangan atau unggah berkas
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mendukung layar sentuh smartphone, stylus, mouse, atau upload gambar
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 shadow-2xs text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Pilih Foto Tanda Tangan dari Galeri / File</span>
              </button>
            </div>
          )}

          <div className="w-full border-b border-dashed border-slate-300 pb-2 flex justify-between items-center text-[10px] text-slate-400">
            <span>(Tanda Tangan Guru / GTK)</span>
            <span className="font-mono">Resolusi Tinggi • Format Data URL Transparan</span>
          </div>
        </div>

        {/* The HTML5 Canvas with smooth pointer events */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
          onPointerCancel={finishDrawing}
          style={{ touchAction: 'none' }}
          className="relative z-10 w-full block cursor-crosshair active:cursor-crosshair"
        />
      </div>

      {/* Action Footer */}
      {showFooter && (
        <div className="p-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {savedSuccess ? (
              <span className="flex items-center space-x-1.5 text-emerald-600 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tanda tangan berhasil tersimpan!</span>
              </span>
            ) : hasDrawn ? (
              <span className="flex items-center space-x-1 text-emerald-600 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Tanda tangan siap disimpan</span>
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Belum ada tanda tangan</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Tanda Tangan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

