import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Eraser,
  Check,
  Smartphone,
  Laptop,
  PenTool,
  Sparkles,
  Info,
  Undo2,
  Sliders,
} from 'lucide-react';

export interface SignaturePadProps {
  /** Initial base64 data URL to load onto the canvas */
  initialSignature?: string;
  /** Callback triggered when user clicks Save or applies the signature */
  onSave?: (signatureDataUrl: string, timestamp: string) => void;
  /** Reactive callback triggered whenever the signature changes */
  onChange?: (signatureDataUrl: string) => void;
  /** Callback triggered when canvas is cleared */
  onClear?: () => void;
  /** Optional cancel/close callback */
  onCancel?: () => void;
  /** Custom canvas width (defaults to responsive container width) */
  width?: number;
  /** Custom canvas height (defaults to 200px) */
  height?: number;
  /** Default stroke color */
  defaultColor?: string;
  /** Default stroke width */
  defaultLineWidth?: number;
  /** Whether to show header instructions */
  showInstructions?: boolean;
  /** Whether to show toolbar (pen color, width, clear, undo) */
  showToolbar?: boolean;
  /** Whether to show action footer (Batal & Simpan) */
  showFooter?: boolean;
  /** Title or subject label, e.g. "Tanda Tangan Absen Masuk" */
  title?: string;
  /** Subtitle with person's name / NIP */
  subtitle?: string;
  /** Container custom classes */
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
    // Detect mobile vs desktop for optimal initial stroke thickness
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      return 3.2; // Optimized for fingers on mobile touchscreens
    }
    return defaultLineWidth || 2.8; // Optimized for mouse / touchpad
  });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const [history, setHistory] = useState<ImageData[]>([]);
  const [showStrokeSlider, setShowStrokeSlider] = useState<boolean>(false);
  const [clearFlash, setClearFlash] = useState<boolean>(false);

  const pointsRef = useRef<Point[]>([]);
  const isPointerDownRef = useRef<boolean>(false);

  // Resize and initialize canvas with High DPI backing store
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2); // Minimum 2x for sharp signatures

    const displayWidth = customWidth || Math.max(rect.width || 320, 300);
    const displayHeight = customHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasDrawn(true);
        // Save initial snapshot
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([snapshot]);
      };
      img.src = initialSignature;
    } else {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      setHasDrawn(false);
      setHistory([]);
    }
  }, [customWidth, customHeight, strokeColor, lineWidth, initialSignature]);

  // Set up resize observer to keep canvas responsive
  useEffect(() => {
    initCanvas();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Re-init only if dimensions changed significantly and no drawing in progress
      if (!isDrawing && !isPointerDownRef.current) {
        initCanvas();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [initCanvas, isDrawing]);

  // Get coordinates relative to canvas
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
    };
  };

  // Save current canvas state to undo stack
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-10), snapshot]); // keep up to 10 undo steps
  };

  // Pointer Down (Mouse click, Touch start, Stylus contact)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only respond to primary button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent default gesture scrolling on phones
    canvas.setPointerCapture?.(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveSnapshot();

    const pt = getCoordinates(e);
    pointsRef.current = [pt];
    isPointerDownRef.current = true;
    setIsDrawing(true);
    setHasDrawn(true);

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(pt.x, pt.y);
    // Draw initial dot in case of quick tap
    ctx.arc(pt.x, pt.y, lineWidth / 3, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.beginPath();
  };

  // Pointer Move (Mouse move, Touch drag, Touchpad swipe)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCoordinates(e);
    pointsRef.current.push(pt);

    const pts = pointsRef.current;
    if (pts.length < 2) return;

    // Smooth Bézier curve through midpoints
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];
    const midPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  };

  // Finish drawing
  const finishDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDrawing(false);
    pointsRef.current = [];

    if (e && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }

    // Trigger reactive onChange
    if (onChange && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  // Clear Canvas with instant responsiveness
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
    isPointerDownRef.current = false;
    setHasDrawn(false);
    setHistory([]);
    setClearFlash(true);
    setTimeout(() => setClearFlash(false), 500);

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

    const newHistory = [...history];
    const prevSnapshot = newHistory.pop();
    setHistory(newHistory);

    if (newHistory.length > 0) {
      const last = newHistory[newHistory.length - 1];
      ctx.putImageData(last, 0, 0);
      setHasDrawn(true);
      if (onChange) {
        onChange(canvas.toDataURL('image/png'));
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      if (onChange) {
        onChange('');
      }
    }
  };

  // Export current canvas as high-resolution PNG Data URL
  const exportDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return '';
    return canvas.toDataURL('image/png');
  };

  // Handle Save
  const handleSave = () => {
    const dataUrl = exportDataUrl();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    onSave?.(dataUrl, timeStr);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm ${className}`}
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
            <span>Area Tanda Tangan Resmi</span>
            <span className="font-mono">Sensor Responsif 120Hz</span>
          </div>

          {!hasDrawn && (
            <div className="text-center text-slate-400 select-none my-auto">
              <PenTool className="w-8 h-8 mx-auto mb-1 opacity-25 animate-pulse text-indigo-500" />
              <p className="text-xs font-semibold text-slate-500">
                Goreskan tanda tangan di sini
              </p>
              <p className="text-[10px] text-slate-400">
                Gunakan jari di HP / stylus / touchpad atau mouse laptop
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
              disabled={!hasDrawn}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
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
