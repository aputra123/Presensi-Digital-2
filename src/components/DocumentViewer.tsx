import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileCheck,
  Eye,
} from 'lucide-react';

export interface DocumentItem {
  id: string;
  title: string;
  documentName?: string;
  documentUrl?: string;
  fileType?: 'pdf' | 'image' | 'unknown';
  uploaderName?: string;
  uploaderRole?: string;
  date?: string;
  category?: string;
}

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  initialIndex?: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  documents = [],
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || documents.length === 0) return null;

  const currentDoc = documents[currentIndex] || documents[0];

  const getDetectedType = (doc: DocumentItem): 'pdf' | 'image' | 'unknown' => {
    if (doc.fileType) return doc.fileType;
    const url = (doc.documentUrl || '').toLowerCase();
    const name = (doc.documentName || '').toLowerCase();
    if (url.startsWith('data:application/pdf') || name.endsWith('.pdf') || url.includes('.pdf')) {
      return 'pdf';
    }
    if (
      url.startsWith('data:image/') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp') ||
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.png') ||
      url.includes('images.unsplash.com')
    ) {
      return 'image';
    }
    return 'image'; // default fallback for preview
  };

  const detectedType = getDetectedType(currentDoc);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    setZoom(1);
    setRotation(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!currentDoc.documentUrl) return;
    const link = document.createElement('a');
    link.href = currentDoc.documentUrl;
    link.download = currentDoc.documentName || `dokumen_${currentDoc.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] max-h-[800px] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white truncate">
                {currentDoc.title || currentDoc.documentName || 'Pratinjau Dokumen'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {currentDoc.uploaderName ? `Diajukan oleh: ${currentDoc.uploaderName}` : ''}{' '}
                {currentDoc.category ? `• ${currentDoc.category}` : ''}{' '}
                {currentDoc.date ? `• ${currentDoc.date}` : ''}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {detectedType === 'image' && (
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  title="Perkecil"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-2 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  title="Perbesar"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Putar 90°"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentDoc.documentUrl && (
              <button
                onClick={handleDownload}
                title="Unduh Dokumen Asli"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unduh</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Document Viewer Canvas */}
        <div className="flex-1 bg-slate-950/60 relative overflow-hidden flex items-center justify-center p-4">
          {detectedType === 'pdf' ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {currentDoc.documentUrl && currentDoc.documentUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={currentDoc.documentUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl border border-slate-800"
                />
              ) : (
                <div className="text-center space-y-4 max-w-md p-8 bg-slate-900/90 rounded-3xl border border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {currentDoc.documentName || 'Dokumen Surat Resmi PDF'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Dokumen surat dokter atau surat tugas resmi terlampir dalam format PDF digital.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleDownload}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md inline-flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh / Buka File PDF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              {currentDoc.documentUrl ? (
                <img
                  src={currentDoc.documentUrl}
                  alt={currentDoc.documentName || 'Dokumen'}
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="text-center space-y-3 p-8 bg-slate-900 rounded-3xl border border-slate-800">
                  <FileCheck className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">Tidak ada gambar pratinjau langsung.</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Arrows for Gallery */}
          {documents.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700/80 shadow-lg cursor-pointer transition-transform hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700/80 shadow-lg cursor-pointer transition-transform hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnail Strip for Gallery */}
        {documents.length > 1 && (
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              {documents.map((doc, idx) => {
                const isSelected = idx === currentIndex;
                const type = getDetectedType(doc);
                return (
                  <button
                    key={doc.id || idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setZoom(1);
                      setRotation(0);
                    }}
                    className={`h-14 w-14 rounded-xl border-2 shrink-0 overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    {type === 'image' && doc.documentUrl ? (
                      <img
                        src={doc.documentUrl}
                        alt="thumb"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono font-bold text-slate-400 shrink-0">
              Dokumen {currentIndex + 1} dari {documents.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
