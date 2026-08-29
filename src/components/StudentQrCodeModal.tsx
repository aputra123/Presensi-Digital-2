import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  X,
  GraduationCap,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Share2,
  ShieldCheck,
  UserCheck,
  Eye,
  Layers,
  School,
} from 'lucide-react';
import { Student, SchoolConfig } from '../types';

interface StudentQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: Student | null;
  students: Student[];
  config: SchoolConfig;
  onSelectStudent?: (student: Student) => void;
}

export const StudentQrCodeModal: React.FC<StudentQrCodeModalProps> = ({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  config,
  onSelectStudent,
}) => {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(selectedStudent);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrPayloadType, setQrPayloadType] = useState<'nisn' | 'std_code' | 'json'>('nisn');
  const [qrColor, setQrColor] = useState<string>('#0f172a');
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [batchClassFilter, setBatchClassFilter] = useState<string>('ALL');
  const [isPrinting, setIsPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStudent) {
      setCurrentStudent(selectedStudent);
    } else if (students.length > 0 && !currentStudent) {
      setCurrentStudent(students[0]);
    }
  }, [selectedStudent, students]);

  // Generate QR Code data URL when student or payload type changes
  useEffect(() => {
    if (!currentStudent) return;

    let payload = currentStudent.nisn;
    if (qrPayloadType === 'std_code') {
      payload = `STD-${currentStudent.nisn}`;
    } else if (qrPayloadType === 'json') {
      payload = JSON.stringify({
        id: currentStudent.id,
        nisn: currentStudent.nisn,
        name: currentStudent.name,
        class: currentStudent.className,
        school: config.schoolName,
      });
    }

    QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      color: {
        dark: qrColor,
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR Generation error:', err);
      });
  }, [currentStudent, qrPayloadType, qrColor, config.schoolName]);

  if (!isOpen || !currentStudent) return null;

  const currentIndex = students.findIndex((s) => s.id === currentStudent.id);

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = students[currentIndex - 1];
      setCurrentStudent(prev);
      if (onSelectStudent) onSelectStudent(prev);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      const next = students[currentIndex + 1];
      setCurrentStudent(next);
      if (onSelectStudent) onSelectStudent(next);
    }
  };

  const handleCopyNisn = () => {
    navigator.clipboard.writeText(currentStudent.nisn);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Presensi_${currentStudent.name.replace(/\s+/g, '_')}_${currentStudent.nisn}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const filteredBatchStudents = students.filter((s) => {
    if (batchClassFilter === 'ALL') return true;
    return s.classId === batchClassFilter || s.className === batchClassFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'max-w-4xl h-[90vh]' : 'max-w-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>QR Code Presensi Siswa</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Siap Scan Kiosk
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {config.schoolName} • Desa Pancoran, Taliabu Barat
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'single'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'batch'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Cetak Massal
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Kecilkan' : 'Perbesar Tampilan'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'single' ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Student Digital QR Card Display */}
              <div
                id="student-qr-card-print"
                className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center space-y-4 border border-slate-700/60 shrink-0"
              >
                {/* School Header Badge */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2 text-left min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center border border-indigo-400/30 shrink-0">
                      <School className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-200 truncate">
                        {config.schoolName}
                      </p>
                      <p className="text-[8px] text-slate-400">NPSN: {config.npsn}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[9px] shrink-0">
                    QR SISWA
                  </span>
                </div>

                {/* Student Photo & Name */}
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={currentStudent.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80'}
                      alt={currentStudent.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400/50 shadow-md mx-auto"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-slate-900 text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white tracking-tight leading-tight">
                      {currentStudent.name}
                    </h4>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold text-[10px] border border-indigo-400/30">
                        {currentStudent.className}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono font-bold">
                        NISN: {currentStudent.nisn}
                      </span>
                    </div>
                  </div>
                </div>

                {/* High-Resolution QR Canvas / Image */}
                <div className="bg-white p-3.5 rounded-2xl shadow-inner border border-slate-200 flex flex-col items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${currentStudent.name}`}
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-500 font-mono mt-1">
                    {qrPayloadType === 'std_code' ? `STD-${currentStudent.nisn}` : currentStudent.nisn}
                  </p>
                </div>

                {/* Verification Footer */}
                <div className="w-full flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-white/10">
                  <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Dapodik Terverifikasi</span>
                  </span>
                  <span>T.A {config.academicYear}</span>
                </div>
              </div>

              {/* Controls, Customization & Navigation */}
              <div className="flex-1 w-full space-y-4 text-slate-800 dark:text-slate-200">
                {/* Navigation Carousel between Students */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex <= 0}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Siswa {currentIndex + 1} dari {students.length}
                    </p>
                    <select
                      value={currentStudent.id}
                      onChange={(e) => {
                        const s = students.find((item) => item.id === e.target.value);
                        if (s) {
                          setCurrentStudent(s);
                          if (onSelectStudent) onSelectStudent(s);
                        }
                      }}
                      className="mt-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.className} - {s.name} ({s.nisn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={currentIndex >= students.length - 1}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* QR Code Payload & Format Options */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Konfigurasi Format QR Presensi</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setQrPayloadType('nisn')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        qrPayloadType === 'nisn'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block text-[11px] font-bold">Hanya NISN</span>
                      <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5">
                        {currentStudent.nisn}
                      </span>
                    </button>

                    <button
                      onClick={() => setQrPayloadType('std_code')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        qrPayloadType === 'std_code'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block text-[11px] font-bold">Prefix Standar</span>
                      <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5">
                        STD-{currentStudent.nisn}
                      </span>
                    </button>

                    <button
                      onClick={() => setQrPayloadType('json')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        qrPayloadType === 'json'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block text-[11px] font-bold">JSON Lengkap</span>
                      <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5">
                        {'{id, nisn, rombel}'}
                      </span>
                    </button>
                  </div>

                  {/* QR Color Selector */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-500">Warna QR Code:</span>
                    <div className="flex items-center space-x-1.5">
                      {[
                        { label: 'Slate', color: '#0f172a' },
                        { label: 'Indigo', color: '#4338ca' },
                        { label: 'Emerald', color: '#047857' },
                        { label: 'Navy', color: '#1e3a8a' },
                      ].map((item) => (
                        <button
                          key={item.color}
                          onClick={() => setQrColor(item.color)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            qrColor === item.color ? 'scale-110 border-indigo-500 ring-2 ring-indigo-300' : 'border-white'
                          }`}
                          style={{ backgroundColor: item.color }}
                          title={item.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Download, Print, Copy */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <button
                    onClick={handleDownloadPng}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PNG</span>
                  </button>

                  <button
                    onClick={handlePrintCard}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Kartu QR</span>
                  </button>

                  <button
                    onClick={handleCopyNisn}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Tersalin!' : 'Salin NISN'}</span>
                  </button>
                </div>

                {/* Instant Kiosk Instructions */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300">
                  💡 <strong>Panduan Cepat Presensi:</strong> Siswa dapat mengarahkan QR Code ini ke kamera pemindai gerbang pada menu <strong>Scan QR Presensi</strong> untuk konfirmasi kehadiran otomatis dalam hitungan &lt;1 detik.
                </div>
              </div>
            </div>
          ) : (
            /* Batch QR Generation & Printing Matrix */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Cetak Lembar QR Code Kolektif
                    </h4>
                    <p className="text-xs text-slate-500">
                      Cetak QR Badge untuk seluruh rombel sekaligus dalam 1 halaman
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={batchClassFilter}
                    onChange={(e) => setBatchClassFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Rombel ({students.length} Siswa)</option>
                    {Array.from(new Set(students.map((s) => s.className))).map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handlePrintCard}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Semua ({filteredBatchStudents.length})</span>
                  </button>
                </div>
              </div>

              {/* Grid of Batch Student QR Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
                {filteredBatchStudents.map((s) => (
                  <BatchStudentQrBadge key={s.id} student={s} config={config} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mini Batch QR Badge Component
const BatchStudentQrBadge: React.FC<{ student: Student; config: SchoolConfig }> = ({ student, config }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(student.nisn, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => setDataUrl(url))
      .catch(console.error);
  }, [student.nisn]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col items-center text-center space-y-2 shadow-2xs">
      <div className="w-full flex items-center justify-between text-[9px] font-bold text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-700">
        <span className="truncate">{config.schoolName}</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{student.className}</span>
      </div>

      {dataUrl ? (
        <img src={dataUrl} alt={student.name} className="w-24 h-24 object-contain mx-auto" />
      ) : (
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
          QR...
        </div>
      )}

      <div className="w-full">
        <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
          {student.name}
        </h5>
        <p className="text-[10px] font-mono text-slate-500 font-bold">{student.nisn}</p>
      </div>
    </div>
  );
};
