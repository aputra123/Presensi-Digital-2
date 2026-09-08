import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Laptop,
  Maximize2,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Video,
  X,
} from 'lucide-react';
import {
  CameraDiagnosticState,
  PreflightHardwareCheckResult,
  runPreflightHardwareCheck,
} from '../utils/cameraStream';
import {
  CameraOrientationMode,
  EffectiveOrientation,
  DeviceCategory,
} from '../utils/cameraOrientation';

interface CameraDiagnosticOverlayProps {
  diagnostic: CameraDiagnosticState;
  onTriggerSoftReset: () => void;
  preferredFacing?: 'user' | 'environment';
  modeTitle?: string;
  isCompact?: boolean;
  orientationMode?: CameraOrientationMode;
  effectiveOrientation?: EffectiveOrientation;
  deviceCategory?: DeviceCategory;
  onCycleOrientation?: () => void;
}

export const CameraDiagnosticOverlay: React.FC<CameraDiagnosticOverlayProps> = ({
  diagnostic,
  onTriggerSoftReset,
  preferredFacing = 'user',
  modeTitle = 'Kamera Presensi',
  isCompact = false,
  orientationMode,
  effectiveOrientation,
  deviceCategory,
  onCycleOrientation,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isTestingHardware, setIsTestingHardware] = useState<boolean>(false);
  const [testReport, setTestReport] = useState<PreflightHardwareCheckResult | null>(null);

  const handleRunManualPreflight = async () => {
    setIsTestingHardware(true);
    try {
      const res = await runPreflightHardwareCheck(preferredFacing);
      setTestReport(res);
    } catch (err: any) {
      setTestReport({
        canAccess: false,
        status: 'prompt',
        message: 'Gagal menjalankan uji pre-flight: ' + (err?.message || String(err)),
        videoDevices: [],
      });
    } finally {
      setIsTestingHardware(false);
    }
  };

  return (
    <div className="text-xs select-none">
      {/* HUD Trigger Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 text-slate-200 shadow-lg">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              diagnostic.isLockedByOtherProcess
                ? 'bg-rose-500 animate-ping'
                : diagnostic.isSimulated
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="font-bold text-[11px] truncate max-w-[130px] sm:max-w-[180px]">
            {diagnostic.isLockedByOtherProcess
              ? 'Kamera Terkunci!'
              : diagnostic.isSimulated
              ? 'Sensor Simulasi'
              : 'Hardware Aktif'}
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-800/80 rounded text-[10px] text-slate-300 font-mono">
            {diagnostic.resolution || 'Mendeteksi...'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {onCycleOrientation && effectiveOrientation && (
            <button
              type="button"
              onClick={onCycleOrientation}
              title={`Rotasi Kamera: ${
                orientationMode === 'auto' ? 'Otomatis' : orientationMode === 'landscape' ? 'Lanskap' : 'Potret'
              } (${effectiveOrientation === 'portrait' ? 'Potret 📱' : 'Lanskap 💻'}). Klik untuk ubah (Auto ➔ Lanskap ➔ Potret)`}
              className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-slate-700/60"
            >
              {effectiveOrientation === 'portrait' ? (
                <Smartphone className="w-3 h-3 text-indigo-400" />
              ) : (
                <Laptop className="w-3 h-3 text-emerald-400" />
              )}
              <span className="hidden xs:inline sm:inline">
                {orientationMode === 'auto' ? 'Auto: ' : ''}
                {effectiveOrientation === 'portrait' ? 'Potret' : 'Lanskap'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onTriggerSoftReset}
            title="Soft-Reset & Pulihkan Kamera Jika Layar Hitam"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Diagnostik</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Warning Banner if Locked by another process */}
      {diagnostic.isLockedByOtherProcess && (
        <div className="mt-2 p-3 bg-rose-950/90 border border-rose-600/60 rounded-2xl text-rose-100 flex items-start space-x-2.5 shadow-md">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="font-black text-white">Perhatian: Sensor Kamera Terkunci</p>
            <p className="text-rose-200">
              Kamera sedang aktif digunakan oleh tab peramban lain, aplikasi Zoom, Google Meet, atau
              aplikasi perekam. Sistem otomatis beralih ke simulasi optik agar tampilan tidak hitam
              pekat.
            </p>
            <button
              type="button"
              onClick={onTriggerSoftReset}
              className="mt-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Coba Hubungkan Ulang (Soft-Reset)</span>
            </button>
          </div>
        </div>
      )}

      {/* Expanded Diagnostic Overlay Box */}
      {isOpen && (
        <div className="mt-2 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl text-slate-200 space-y-3 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-[12px] text-white">
                Diagnostik Perangkat Keras: {modeTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagnostic Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block font-medium">Status Aliran</span>
              <span
                className={`font-bold flex items-center space-x-1 mt-0.5 ${
                  diagnostic.isSimulated ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {diagnostic.isSimulated ? (
                  <>
                    <HelpCircle className="w-3 h-3 shrink-0" />
                    <span>Simulasi Anti-Blank</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>Hardware Asli</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block font-medium">Resolusi Live</span>
              <span className="font-bold font-mono text-cyan-300 mt-0.5 block">
                {diagnostic.resolution || 'Mendeteksi...'}
              </span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block font-medium">Arah Lensa</span>
              <span className="font-bold text-slate-200 mt-0.5 block capitalize">
                {diagnostic.facingMode === 'user'
                  ? 'Kamera Depan (Selfie)'
                  : 'Kamera Belakang (Lingkungan)'}
              </span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block font-medium">Kunci Tab Lain</span>
              <span
                className={`font-bold mt-0.5 block ${
                  diagnostic.isLockedByOtherProcess ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {diagnostic.isLockedByOtherProcess ? 'Terdeteksi Aktif' : 'Bebas Kunci (Aman)'}
              </span>
            </div>

            {effectiveOrientation && (
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Orientasi Kamera (Auto HP & Laptop)</span>
                  <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5 mt-0.5">
                    {effectiveOrientation === 'portrait' ? (
                      <>
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Potret Tegak (9:16 / 3:4)</span>
                      </>
                    ) : (
                      <>
                        <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Lanskap Mendatar (16:9 / 4:3)</span>
                      </>
                    )}
                    <span className="text-[10px] text-slate-400 font-normal">
                      • {orientationMode === 'auto' ? 'Mode Otomatis Sensor' : 'Terkunci Manual'}
                    </span>
                  </span>
                </div>
                {onCycleOrientation && (
                  <button
                    type="button"
                    onClick={onCycleOrientation}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotasi</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Device Hardware Label */}
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] space-y-1">
            <span className="text-slate-400 text-[10px] block">Identitas Modul Sensor</span>
            <span className="font-mono text-slate-300 truncate block">
              {diagnostic.trackLabel || 'Standard Integrated Camera'}
            </span>
          </div>

          {/* Catch Block Error details if any */}
          {diagnostic.lastErrorMessage && (
            <div className="p-2.5 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-200 text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Error Hardware Tertangkap (Catch Block):</span>
              </div>
              <p className="font-mono text-[10px] text-amber-100/90 break-words">
                {diagnostic.lastErrorMessage}
              </p>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={onTriggerSoftReset}
              className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Soft-Reset Kamera</span>
            </button>

            <button
              type="button"
              onClick={handleRunManualPreflight}
              disabled={isTestingHardware}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isTestingHardware ? 'Menguji...' : 'Uji Pre-Flight Hardware'}</span>
            </button>
          </div>

          {/* Manual Preflight Result Report */}
          {testReport && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                testReport.canAccess
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                  : testReport.status === 'in_use'
                  ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                  : 'bg-amber-950/60 border-amber-700 text-amber-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                {testReport.canAccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>Hasil Pre-Flight Hardware Check:</span>
              </div>
              <p>{testReport.message}</p>
              {testReport.actionHint && (
                <p className="text-[10px] opacity-90 font-medium">💡 Saran: {testReport.actionHint}</p>
              )}
              {testReport.videoDevices.length > 0 && (
                <div className="mt-1 pt-1 border-t border-white/10 text-[10px] font-mono">
                  <span>Modul kamera terdaftar ({testReport.videoDevices.length}):</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {testReport.videoDevices.map((d, i) => (
                      <li key={i} className="truncate">
                        {d.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
