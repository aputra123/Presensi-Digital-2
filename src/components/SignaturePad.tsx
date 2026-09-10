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
} from 'lucide-react';

export interface SignaturePadProps {
  initialSignature?: string;
  onSave?: (signatureDataUrl: string, timestamp: string) => void;
  onChange?: (signatureDataUrl: string) => void;
  onClear?: () => void;
  onCancel?: () => void;
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
  width: customWidth,
  height: customHeight = 220,
  defaultColor = '#1D4ED8', // Biru Resmi Kedinasan ASN
  defaultLineWidth = 3,
  showInstructions = true,
  showToolbar = true,
  showFooter = true,
  title,
  subtitle,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokeColor, setStrokeColor] = useState<string>(defaultColor);
  const [lineWidth, setLineWidth] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      return 3.4; // Optimal untuk sentuhan jari di smartphone
    }
    return defaultLineWidth || 2.8;
  });
  const [_isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const [history, setHistory] = useState<string[]>([]); // store data URLs for robust high-DPI undo
  const [showStrokeSlider, setShowStrokeSlider] = useState<boolean>(false);
  const [clearFlash, setClearFlash] = useState<boolean>(false);
  const [validationToast, setValidationToast] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Smooth spline references to prevent jagged or broken lines
  const lastPointRef = useRef<Point | null>(null);
  const lastMidPointRef = useRef<Point | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  // Resize and initialize canvas with High DPI backing store
  const initCanvas = useCallback(
    (preserveContent = true) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.max(window.devicePixelRatio || 1, 2);

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

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.scale(dpr, dpr);
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
        setHasDrawn(false);
        setHistory([]);
      }
    },
    [customWidth, customHeight, initialSignature, hasDrawn, strokeColor, lineWidth]
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
    initCanvas(false);

    const container = containerRef.current;
    if (!container) return;

    let prevWidth = container.clientWidth;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (Math.abs(newWidth - prevWidth) > 12 && !isPointerDownRef.current) {
          prevWidth = newWidth;
          initCanvas(true);
        }
      }
    });

    resizeObserver.observe(container);

    const handleOrientationChange = () => {
      setTimeout(() => {
        initCanvas(true);
      }, 150);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [initCanvas]);

  // Get coordinates relative to canvas display size
  const getCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      time: Date.now(),
    };
  };

  // Save current canvas state to undo stack
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setHistory((prev) => [...prev.slice(-12), dataUrl]);
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
      // Scan for non-transparent pixels
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] > 10) return false;
      }
      return true;
    } catch {
      return !hasDrawn;
    }
  };

  // Pointer Down (Mouse click, Touch start, Stylus contact)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset validation error if user starts drawing
    if (validationToast) {
      setValidationToast(null);
    }

    saveSnapshot();

    const pt = getCoordinates(e.clientX, e.clientY);
    lastPointRef.current = pt;
    lastMidPointRef.current = pt;
    isPointerDownRef.current = true;
    setIsDrawing(true);
    setHasDrawn(true);

    // Initial dot point with round cap
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(lineWidth / 2, 1.2), 0, Math.PI * 2);
    ctx.fill();
  };

  // Pointer Move with continuous quadratic Bézier interpolation (zero gaps, silky smooth)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || !lastPointRef.current || !lastMidPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Support coalesced events for high-rate digitizers and styluses
    const coalescedEvents =
      typeof (e.nativeEvent as any)?.getCoalescedEvents === 'function'
        ? (e.nativeEvent as any).getCoalescedEvents()
        : [e.nativeEvent || e];

    for (let i = 0; i < coalescedEvents.length; i++) {
      const ev = coalescedEvents[i];
      const pt = getCoordinates(ev.clientX, ev.clientY);

      // Avoid redundant tiny noise
      const dist = Math.hypot(pt.x - lastPointRef.current.x, pt.y - lastPointRef.current.y);
      if (dist < 0.8) continue;

      const midPoint: Point = {
        x: (lastPointRef.current.x + pt.x) / 2,
        y: (lastPointRef.current.y + pt.y) / 2,
        time: pt.time,
      };

      // Draw contiguous curve from lastMidPoint to current midPoint using lastPoint as control
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPoint.x, midPoint.y);
      ctx.stroke();

      lastPointRef.current = pt;
      lastMidPointRef.current = midPoint;
    }
  };

  // Finish drawing
  const finishDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx && lastPointRef.current && lastMidPointRef.current) {
      // Connect final point cleanly
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.stroke();
    }

    isPointerDownRef.current = false;
    setIsDrawing(false);
    lastPointRef.current = null;
    lastMidPointRef.current = null;

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

    const rect = containerRef.current?.getBoundingClientRect();
    const displayWidth = customWidth || Math.max(rect?.width || 320, 280);
    const displayHeight = customHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    isPointerDownRef.current = false;
    lastPointRef.current = null;
    lastMidPointRef.current = null;
    setIsDrawing(false);
    setHasDrawn(false);
    setHistory([]);
    setClearFlash(true);
    setValidationToast(null);
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

    const rect = containerRef.current?.getBoundingClientRect();
    const displayWidth = customWidth || Math.max(rect?.width || 320, 280);
    const displayHeight = customHeight;

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

  // Export current canvas as high-resolution PNG Data URL
  const exportDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return '';
    return canvas.toDataURL('image/png');
  };

  // Handle Save with Validation & Visual Feedback
  const handleSave = () => {
    // Validate that canvas is not empty or blank
    if (isCanvasEmpty()) {
      setValidationToast('Tanda tangan masih kosong! Silakan goreskan tanda tangan Anda pada kanvas terlebih dahulu sebelum menyimpan.');
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

    // Call onSave handler
    onSave?.(dataUrl, timeStr);

    // Clear canvas after successful save as required
    handleClear();
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

      {/* Validation Toast Feedback Alert */}
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

      {/* Toolbar */}
      {showToolbar && (
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
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

          {/* Line Width and Undo/Clear */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLineWidth(1.8)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 1.8 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Halus (1.8px)"
              >
                Tipis
              </button>
              <button
                type="button"
                onClick={() => setLineWidth(2.8)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 2.8 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Standar (2.8px - Touchpad/Mouse)"
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => setLineWidth(4.2)}
                className={`px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 4.2 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Tebal (4.2px - Layar Sentuh HP)"
              >
                Tebal
              </button>
              <button
                type="button"
                onClick={() => setLineWidth(6.0)}
                className={`hidden sm:inline-block px-2 py-1 min-h-[30px] rounded-lg transition-colors cursor-pointer ${
                  lineWidth === 6.0 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
                title="Goresan Ekstra (6.0px)"
              >
                Ekstra
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
                  min="1.2"
                  max="7.0"
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
              className="p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Batalkan goresan terakhir (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`px-3 py-1.5 min-h-[34px] rounded-xl border transition-all cursor-pointer font-bold text-xs flex items-center space-x-1 ${
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
            <span className="font-mono">Sensor Presisi Bebas Patah-Patah</span>
          </div>

          {!hasDrawn && (
            <div className="text-center text-slate-400 select-none my-auto">
              <PenTool className="w-8 h-8 mx-auto mb-1 opacity-25 animate-pulse text-indigo-500" />
              <p className="text-xs font-semibold text-slate-500">
                Goreskan tanda tangan di sini
              </p>
              <p className="text-[10px] text-slate-400">
                Layar sentuh HP / stylus / touchpad / mouse laptop
              </p>
            </div>
          )}

          <div className="w-full border-b border-dashed border-slate-300 pb-2 flex justify-between items-center text-[10px] text-slate-400">
            <span>(Tanda Tangan Guru / GTK)</span>
            <span>Tersimpan sebagai format Data URL</span>
          </div>
        </div>

        {/* The HTML5 Canvas */}
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
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            {hasDrawn ? (
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
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Tanda Tangan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
