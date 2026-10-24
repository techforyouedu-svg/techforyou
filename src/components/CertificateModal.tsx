import React from 'react';
import { CertificateRenderer } from './CertificateRenderer';
import { X, Trash2 } from 'lucide-react';
import { Certificate } from '../types';

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onDelete?: (certificate: Certificate) => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose, onDelete }) => {
  if (!certificate) return null;

  return (
    <div className="certificate-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="certificate-modal-content relative w-full max-w-5xl max-h-[98vh] overflow-y-auto bg-slate-100 rounded-xl sm:rounded-2xl shadow-2xl p-2 sm:p-5 border border-slate-300">
        {/* Modal Top Bar - Hidden in Print */}
        <div className="no-print flex items-center justify-between pb-2 sm:pb-3 mb-2 sm:mb-3 border-b border-slate-200 sticky top-0 bg-slate-100/95 backdrop-blur-xs z-30">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-base font-bold text-slate-900 truncate">
              {certificate.serialNumber}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {certificate.snapshot.student.fullName} · {certificate.snapshot.course.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onDelete && (
              <button
                onClick={() => onDelete(certificate)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer min-h-[36px]"
                title="Delete this certificate"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Component (Renders Front & Marksheet) */}
        <CertificateRenderer
          serialNumber={certificate.serialNumber}
          verificationId={certificate.verificationId}
          issueDate={certificate.issueDate}
          status={certificate.status}
          revocationReason={certificate.revocationReason}
          snapshot={certificate.snapshot}
          qrCodeDataUrl={certificate.qrCodeDataUrl}
          verificationUrl={certificate.verificationUrl}
          showControls={true}
        />
      </div>
    </div>
  );
};
