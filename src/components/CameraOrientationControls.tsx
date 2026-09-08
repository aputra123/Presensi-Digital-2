import React from 'react';
import { Smartphone, Laptop, RotateCcw, RotateCw } from 'lucide-react';
import {
  CameraOrientationMode,
  DetectedOrientation,
  DeviceCategory,
} from '../utils/cameraOrientation';

export interface CameraOrientationControlsProps {
  mode: CameraOrientationMode;
  effectiveOrientation: DetectedOrientation;
  isMobile?: boolean;
  isLaptop?: boolean;
  deviceCategory?: DeviceCategory;
  onSetMode?: (mode: CameraOrientationMode) => void;
  onSelect?: (mode: CameraOrientationMode) => void;
  onCycle?: () => void;
  streamResolution?: string;
  className?: string;
  isCompact?: boolean;
}

export const CameraOrientationControls: React.FC<CameraOrientationControlsProps> = ({
  mode,
  effectiveOrientation,
  isMobile,
  isLaptop,
  deviceCategory,
  onSetMode,
  onSelect,
  onCycle,
  streamResolution,
  className = '',
  isCompact = false,
}) => {
  const isMob = isMobile !== undefined ? isMobile : deviceCategory === 'mobile';
  const isLap = isLaptop !== undefined ? isLaptop : deviceCategory === 'laptop';

  const handleSelect = (m: CameraOrientationMode) => {
    if (onSelect) onSelect(m);
    else if (onSetMode) onSetMode(m);
  };

  if (isCompact) {
    return (
      <div
        className={`flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-sm text-xs ${className}`}
      >
        <div className="flex items-center space-x-1.5">
          {isMob ? (
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Laptop className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-bold text-[11px] text-slate-200">
            {effectiveOrientation === 'portrait' ? '📱 Potret (Tegak)' : '💻 Lanskap (Mendatar)'}
          </span>
          <span className="text-[10px] text-amber-300 font-medium font-mono">
            [{mode === 'auto' ? 'Auto' : mode}]
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {onCycle && (
            <button
              type="button"
              onClick={onCycle}
              title="Ganti orientasi kamera (Auto / Potret / Lanskap)"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center space-x-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Rotasi</span>
            </button>
          )}

          <div className="flex items-center space-x-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleSelect('auto')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                mode === 'auto' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => handleSelect('portrait')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                mode === 'portrait' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Potret
            </button>
            <button
              type="button"
              onClick={() => handleSelect('landscape')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                mode === 'landscape' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lanskap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-md text-xs ${className}`}
    >
      {/* Device & Active Orientation Info Badge */}
      <div className="flex items-center space-x-2">
        <div className="p-1.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
          {isMob ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
        </div>
        <div className="leading-tight">
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-[11px] text-slate-200">
              {isMob ? 'Perangkat HP' : isLap ? 'Laptop / PC' : 'Tablet'}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                effectiveOrientation === 'portrait'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {effectiveOrientation === 'portrait' ? '📱 Tegak (Portrait)' : '💻 Mendatar (Landscape)'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
            <span>Mode:</span>
            <span className="font-semibold text-amber-300 capitalize">
              {mode === 'auto' ? 'Otomatis (Adaptif)' : mode}
            </span>
            {streamResolution && (
              <>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-cyan-300">{streamResolution}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Switcher Buttons */}
      <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
        {/* Auto Mode */}
        <button
          type="button"
          onClick={() => handleSelect('auto')}
          title="Orientasi Otomatis: Menyesuaikan rotasi layar HP & webcam laptop secara pintar"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
            mode === 'auto'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <RotateCcw className={`w-3 h-3 ${mode === 'auto' ? 'animate-spin' : ''}`} />
          <span>Otomatis</span>
        </button>

        {/* Portrait Mode */}
        <button
          type="button"
          onClick={() => handleSelect('portrait')}
          title="Kamera Tegak (Portrait) 3:4 / 9:16 - Optimal untuk selfie presensi di HP"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
            mode === 'portrait'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-3 h-3" />
          <span>Portrait</span>
        </button>

        {/* Landscape Mode */}
        <button
          type="button"
          onClick={() => handleSelect('landscape')}
          title="Kamera Mendatar (Landscape) 4:3 / 16:9 - Optimal untuk layar lebar laptop & dokumentasi apel"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
            mode === 'landscape'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Laptop className="w-3 h-3" />
          <span>Landscape</span>
        </button>
      </div>
    </div>
  );
};
