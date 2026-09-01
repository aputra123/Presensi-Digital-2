import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  X,
  Briefcase,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Teacher, SchoolConfig } from '../types';

interface TeacherQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeacher: Teacher | null;
  teachers: Teacher[];
  config: SchoolConfig;
  onSelectTeacher?: (teacher: Teacher) => void;
}

export const TeacherQrCodeModal: React.FC<TeacherQrCodeModalProps> = ({
  isOpen,
  onClose,
  selectedTeacher,
  teachers = [],
  config,
  onSelectTeacher,
}) => {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(selectedTeacher);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('ALL');
  const [allQrs, setAllQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTeacher) {
      setCurrentTeacher(selectedTeacher);
    } else if (teachers.length > 0 && !currentTeacher) {
      setCurrentTeacher(teachers[0]);
    }
  }, [selectedTeacher, teachers]);

  // Generate Single QR
  useEffect(() => {
    if (!currentTeacher) return;

    QRCode.toDataURL(currentTeacher.nip, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Teacher QR Generation error:', err);
      });
  }, [currentTeacher]);

  // Generate batch QRs for all teachers
  useEffect(() => {
    if (activeTab !== 'batch') return;

    const qrMap: Record<string, string> = {};
    const promises = teachers.map((t) =>
      QRCode.toDataURL(t.nip, {
        width: 250,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then((url) => {
        qrMap[t.id] = url;
      })
    );

    Promise.all(promises).then(() => {
      setAllQrs(qrMap);
    });
  }, [activeTab, teachers]);

  if (!isOpen || !currentTeacher) return null;

  const currentIndex = teachers.findIndex((t) => t.id === currentTeacher.id);

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = teachers[currentIndex - 1];
      setCurrentTeacher(prev);
      if (onSelectTeacher) onSelectTeacher(prev);
    }
  };

  const handleNext = () => {
    if (currentIndex < teachers.length - 1) {
      const next = teachers[currentIndex + 1];
      setCurrentTeacher(next);
      if (onSelectTeacher) onSelectTeacher(next);
    }
  };

  const handleCopyNip = () => {
    navigator.clipboard.writeText(currentTeacher.nip);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${currentTeacher.name.replace(/\s+/g, '_')}_${currentTeacher.nip}.png`;
    a.click();
  };

  const filteredTeachersForBatch = teachers.filter((t) => {
    if (batchStatusFilter === 'ALL') return true;
    return t.employmentStatus === batchStatusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">QR Code Presensi Guru / GTK</h3>
              <p className="text-xs text-slate-300">
                Kartu QR ID resmi untuk scan scanner terminal presensi sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20">
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'single' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Individu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('batch')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'batch' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Cetak Massal
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'single' ? (
            <div className="flex flex-col items-center text-center space-y-5">
              {/* Teacher Info Card with QR */}
              <div className="w-full max-w-sm bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      {config.schoolName}
                    </span>
                    <span className="text-[9px] text-slate-400">KARTU PRESENSI GTK</span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="flex items-center space-x-3 text-left">
                  <img
                    src={currentTeacher.avatar}
                    alt={currentTeacher.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-200"
                  />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {currentTeacher.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500">NIP: {currentTeacher.nip}</p>
                    <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold">
                      {currentTeacher.employmentStatus} • {currentTeacher.role}
                    </span>
                  </div>
                </div>

                {/* QR Display */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex justify-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-mono">
                  Arahkan QR ke Terminal Scanner Presensi Sekolah
                </p>
              </div>

              {/* Navigation and Actions */}
              <div className="flex items-center justify-between w-full max-w-sm">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="text-xs font-mono text-slate-500">
                  {currentIndex + 1} dari {teachers.length} Guru
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex >= teachers.length - 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center space-x-1"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyNip}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'NIP Tersalin' : 'Salin NIP'}</span>
                </button>
                <button
                  onClick={handleDownloadQr}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PNG</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu</span>
                </button>
              </div>
            </div>
          ) : (
            /* BATCH PRINT */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Filter Status:</span>
                  <select
                    value={batchStatusFilter}
                    onChange={(e) => setBatchStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="ALL">Semua Status ({teachers.length})</option>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="HONORER">Honorer</option>
                  </select>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar Massal ({filteredTeachersForBatch.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredTeachersForBatch.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2"
                  >
                    <div className="w-24 h-24 mx-auto bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center">
                      {allQrs[t.id] ? (
                        <img src={allQrs[t.id]} alt={t.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400">...</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      {t.nip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
