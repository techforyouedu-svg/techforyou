import React, { useState } from 'react';
import { Search, UserCheck, ShieldCheck, Eye, AlertCircle, Phone } from 'lucide-react';
import { api } from '../api/client';
import { Course, Certificate } from '../types';
import { CertificateModal } from '../components/CertificateModal';

interface FindCertificateViewProps {
  courses: Course[];
  onNavigate: (view: string, param?: string) => void;
}

export const FindCertificateView: React.FC<FindCertificateViewProps> = ({ courses, onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [serialNumber, setSerialNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Selected certificate for modal viewing / export
  const [activeModalCert, setActiveModalCert] = useState<Certificate | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setHasSearched(false);

    if (serialNumber.trim()) {
      // Direct serial search
      setIsLoading(true);
      try {
        const res = await api.searchCertificates({ serialNumber: serialNumber.trim(), fullName: '' });
        setResults(res.results || []);
        setHasSearched(true);
      } catch (err: any) {
        setErrorMessage(err.message || 'Search failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter the candidate’s full name (at least 2 characters).');
      return;
    }

    if (!fatherName.trim() && (!phoneNumber || phoneNumber.trim().length < 4)) {
      setErrorMessage('To protect student privacy, please enter Father’s Name or at least 4 digits of the registered phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.searchCertificates({
        fullName: fullName.trim(),
        fatherName: fatherName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        courseId: courseId !== 'all' ? courseId : undefined,
      });

      setResults(res.results || []);
      setHasSearched(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during search. Please verify input.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Certificate Search Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
          Find My Issued Certificate
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter candidate credentials to retrieve official transcripts, view front and back previews, and download high-resolution PDF/JPG credentials.
        </p>
      </div>

      {/* Search Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSearch} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Candidate Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter candidate full name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Father's Name <span className="text-slate-400 font-normal">(Recommended)</span>
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Enter father's name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Registered Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Phone Number <span className="text-slate-400 font-normal">(or last 4 digits)</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +92 300 0000000 or last 4 digits"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Course Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Course Program
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="all">All Enrolled Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-800">Privacy Protection:</strong> To prevent unauthorized record exposure, searches require matching the candidate's name combined with either Father’s Name or registered contact digits.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Search Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setFullName('');
                setFatherName('');
                setPhoneNumber('');
                setCourseId('all');
                setResults([]);
                setHasSearched(false);
                setErrorMessage('');
              }}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-950" />
              <span>{isLoading ? 'Searching Certificates...' : 'Search Certificates'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Search Results ({results.length} record{results.length !== 1 ? 's' : ''} found)
            </h2>
            <span className="text-xs text-slate-500">Official Tech For You Credential Records</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Matching Certificate Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No issued certificates matched the given criteria. Please verify spelling, confirm the registered phone number, or check with the institute registrar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {results.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {cert.serialNumber}
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          cert.status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {cert.status === 'VALID' ? 'STATUS: VALID' : 'STATUS: REVOKED'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">Issued: {cert.issueDate}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-sans">
                      {cert.candidateName}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400">Father's Name: </span>
                        <span className="font-medium text-slate-800">{cert.fatherName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Course: </span>
                        <span className="font-medium text-slate-800">{cert.courseTitle}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Grade & Result: </span>
                        <span className="font-semibold text-emerald-800">{cert.overallGrade}</span> ({cert.finalResult})
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Phone: {cert.phoneMasked}</span>
                      <span>·</span>
                      <span>Verification ID: {cert.verificationId?.substring(0, 8)}•••</span>
                    </div>
                  </div>

                  {/* Actions for this Certificate */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveModalCert(cert as Certificate)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Front & Back</span>
                    </button>
                    <button
                      onClick={() => onNavigate('verify', cert.serialNumber)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs rounded-xl transition-colors border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verify Record</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificate Interactive Modal */}
      <CertificateModal
        certificate={activeModalCert}
        onClose={() => setActiveModalCert(null)}
      />
    </div>
  );
};
