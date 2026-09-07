import React from 'react';
import {
  X,
  PenTool,
  Smartphone,
  Laptop,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, timestamp: string) => void;
  initialSignature?: string;
  teacherName: string;
  nip: string;
  sessionType: 'masuk' | 'pulang';
  dateStr?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSignature,
  teacherName,
  nip,
  sessionType,
  dateStr,
}) => {
  if (!isOpen) return null;

  const isMasuk = sessionType === 'masuk';
  const sessionLabel = isMasuk ? 'Absen Masuk' : 'Absen Pulang';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isMasuk
                  ? 'bg-indigo-600/80 text-white shadow-md'
                  : 'bg-amber-500/80 text-white shadow-md'
              }`}
            >
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    isMasuk ? 'bg-indigo-400/20 text-indigo-300' : 'bg-amber-400/20 text-amber-300'
                  }`}
                >
                  Tanda Tangan {sessionLabel}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {dateStr || new Date().toISOString().split('T')[0]}
                </span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-white truncate max-w-sm mt-0.5">
                {teacherName || 'Guru ASN'}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                NIP. {nip || '-'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Reusable Signature Pad */}
        <div className="p-4 sm:p-5 bg-slate-50/50">
          <SignaturePad
            initialSignature={initialSignature}
            onSave={(dataUrl, time) => {
              onSave(dataUrl, time);
              onClose();
            }}
            onCancel={onClose}
            height={240}
            defaultColor={isMasuk ? '#1D4ED8' : '#0F172A'}
            defaultLineWidth={3.2}
            title={undefined}
            subtitle={undefined}
            showInstructions={true}
            showToolbar={true}
            showFooter={true}
            className="border border-slate-200 shadow-xs"
          />
        </div>
      </div>
    </div>
  );
};
