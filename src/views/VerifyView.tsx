import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { api } from '../api/client';
import { Certificate } from '../types';
import { CertificateRenderer } from '../components/CertificateRenderer';

interface VerifyViewProps {
  initialIdentifier?: string;
  onNavigate: (view: string, param?: string) => void;
}

export const VerifyView: React.FC<VerifyViewProps> = ({ initialIdentifier = '', onNavigate }) => {
  const [identifierInput, setIdentifierInput] = useState(initialIdentifier);
  const [isLoading, setIsLoading] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [resultStatus, setResultStatus] = useState<'VALID' | 'REVOKED' | 'NOT_FOUND' | null>(null);
  const [certificateData, setCertificateData] = useState<Certificate | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // If initialIdentifier was supplied via navigation (e.g. from Home or Find page or URL parameter)
  useEffect(() => {
    if (initialIdentifier && initialIdentifier.trim()) {
      setIdentifierInput(initialIdentifier.trim());
      performVerification(initialIdentifier.trim());
    }
  }, [initialIdentifier]);

  const performVerification = async (query: string) => {
    if (!query) return;
    setIsLoading(true);
    setHasVerified(false);
    setResultStatus(null);
    setCertificateData(null);
    setErrorMessage('');

    try {
      const res = await api.verifyCertificate(query);
      setHasVerified(true);
      setResultStatus(res.status);
      setCertificateData(res.certificate);
    } catch (err: any) {
      setHasVerified(true);
      setResultStatus('NOT_FOUND');
      setErrorMessage(err.message || 'No official record found matching this identifier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifierInput.trim()) {
      performVerification(identifierInput.trim());
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Official Certificate Verification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
          Verify Certificate Authenticity
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter the official Certificate Serial Number or Scan QR Code Verification UUID to authenticate credentials directly from the Tech For You immutable database.
        </p>
      </div>

      {/* Input Verification Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
            <input
              type="text"
              value={identifierInput}
              onChange={(e) => setIdentifierInput(e.target.value)}
              placeholder="e.g. TFY-2026-FS-XXXX or Verification UUID"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !identifierInput.trim()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-950" />
            <span>{isLoading ? 'Verifying...' : 'Verify Certificate'}</span>
          </button>
        </form>
      </div>

      {/* Verification Result Display */}
      {hasVerified && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Status Banner */}
          {resultStatus === 'VALID' && certificateData && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-slate-900 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        OFFICIALLY VALID & VERIFIED
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Serial: {certificateData.serialNumber}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      Authentic Credential Verified
                    </h2>
                    <p className="text-xs text-emerald-900 mt-0.5">
                      This credential has been verified against the official academic database of Tech For You Institute.
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-600 border-l sm:border-l-2 border-emerald-200 pl-4 space-y-0.5">
                  <div>
                    <span className="text-slate-400">Database Record ID: </span>
                    <span className="font-mono text-slate-800 font-semibold">{certificateData.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Verification Timestamp: </span>
                    <span className="text-slate-700">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Record Summary Table */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-4 border-t border-emerald-200/80 text-xs">
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Candidate Name</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {certificateData.snapshot.student.fullName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Father's Name</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {certificateData.snapshot.student.fatherName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Course Title</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                    {certificateData.snapshot.course.title}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Course Instructor</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {certificateData.snapshot.institute.instructorName || 'M.Moiz Raza'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Grade & Result</div>
                  <div className="font-bold text-emerald-800 text-sm mt-0.5">
                    Grade {certificateData.snapshot.grading.grade} ({certificateData.snapshot.grading.result})
                  </div>
                </div>
              </div>
            </div>
          )}

          {resultStatus === 'REVOKED' && certificateData && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 text-slate-900 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                      CERTIFICATE REVOKED / INVALIDATED
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Serial: {certificateData.serialNumber}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-rose-950">
                    Official Notice of Revocation
                  </h2>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    This certificate is no longer in valid standing. It was officially revoked by the institute administration and must not be accepted for employment or academic credentialing.
                  </p>

                  <div className="p-3 bg-white/80 rounded-xl border border-rose-200 mt-2 text-xs space-y-1">
                    <div>
                      <strong className="text-rose-950">Mandatory Revocation Reason: </strong>
                      <span className="text-rose-800 font-medium">
                        {certificateData.revocationReason || 'Administrative revocation order issued.'}
                      </span>
                    </div>
                    {certificateData.revokedAt && (
                      <div className="text-slate-500 text-[11px]">
                        Revoked on: {new Date(certificateData.revokedAt).toLocaleString()} by {certificateData.revokedBy || 'Institute Council'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {resultStatus === 'NOT_FOUND' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 mx-auto flex items-center justify-center">
                <XCircle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Certificate Record Not Found</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                No certificate record was found matching <span className="font-mono font-bold text-slate-800">"{identifierInput}"</span> in the Tech For You official database.
              </p>
              <div className="pt-2 text-xs text-slate-500">
                Please ensure there are no typographical errors in the serial number, or use the{' '}
                <button
                  onClick={() => onNavigate('find')}
                  className="text-emerald-700 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Candidate Search Form
                </button>{' '}
                to look up by full name and registered phone number.
              </div>
            </div>
          )}

          {/* Full Interactive Certificate Renderer Preview if record exists */}
          {certificateData && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Official Credential Preview & Verification Package
                </h3>
                <span className="text-xs text-slate-500">Dual-Sided Print A4 (297mm × 210mm)</span>
              </div>

              <CertificateRenderer
                serialNumber={certificateData.serialNumber}
                verificationId={certificateData.verificationId}
                issueDate={certificateData.issueDate}
                completionDate={certificateData.completionDate}
                status={certificateData.status}
                revocationReason={certificateData.revocationReason}
                snapshot={certificateData.snapshot}
                qrCodeDataUrl={certificateData.qrCodeDataUrl}
                verificationUrl={certificateData.verificationUrl}
                showControls={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
