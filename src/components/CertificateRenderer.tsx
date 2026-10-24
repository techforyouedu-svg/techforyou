import React, { useRef, useState, useEffect } from 'react';
import { CertificateSnapshot } from '../types';
import { Download, Printer, RotateCw, AlertTriangle, ShieldCheck, ZoomIn, ZoomOut, Maximize2, Code2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface CertificateRendererProps {
  serialNumber: string;
  verificationId: string;
  issueDate: string;
  completionDate?: string;
  status: 'VALID' | 'REVOKED';
  revocationReason?: string;
  snapshot: CertificateSnapshot;
  qrCodeDataUrl: string;
  verificationUrl?: string;
  showControls?: boolean;
}

export const CertificateRenderer: React.FC<CertificateRendererProps> = ({
  serialNumber,
  issueDate,
  status,
  revocationReason,
  snapshot,
  qrCodeDataUrl,
  showControls = true,
}) => {
  const { student, course, grading, institute, template } = snapshot;

  // Determine eligibility: candidate is eligible only if passed
  const isCandidateEligible = snapshot.isEligibleForCertificate !== undefined
    ? snapshot.isEligibleForCertificate
    : (grading.isPassed && grading.overallPercentage >= (grading.passingPercentage ?? 50));

  // If candidate is not eligible, default to back (the issued transcript with stamp), else front
  const [activeSide, setActiveSide] = useState<'front' | 'back'>(isCandidateEligible ? 'front' : 'back');
  const [isExporting, setIsExporting] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('/logo.png');

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Pre-load /logo.png as a local Data URL to eliminate CORS/taint failures in html2canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setLogoDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        console.warn('Could not convert logo to data URL:', e);
      }
    };
    img.src = '/logo.png';
  }, []);

  // Primary color & theme palette (matching logo)
  const primaryColor = template?.primaryColor || '#040907';
  const accentColor = template?.accentColor || '#10b981';

  // Course Instructor: ONLY M.Moiz Raza
  const instructorName = institute?.instructorName || 'M.Moiz Raza';
  const instructorTitle = institute?.instructorTitle || 'Course Instructor';
  const instructorSignature = institute?.instructorSignatureUrl || 'M. Moiz Raza';

  // Multi-tier high-fidelity element capture helper
  const captureSheetImage = async (el: HTMLElement, defaultBg: string): Promise<string> => {
    try {
      // 1. Primary: toJpeg via native browser SVG ForeignObject rendering (supports Tailwind 4, oklch, shadows)
      return await toJpeg(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: defaultBg,
      });
    } catch (e1) {
      console.warn('toJpeg primary failed, trying with skipFonts: true', e1);
      try {
        // 2. Fallback: skipFonts to avoid any cross-origin webfont CORS failure
        return await toJpeg(el, {
          quality: 0.95,
          pixelRatio: 2,
          skipFonts: true,
          backgroundColor: defaultBg,
        });
      } catch (e2) {
        console.warn('toJpeg skipFonts failed, trying toPng', e2);
        try {
          // 3. Fallback: toPng
          return await toPng(el, {
            pixelRatio: 2,
            skipFonts: true,
            backgroundColor: defaultBg,
          });
        } catch (e3) {
          console.warn('toPng failed, fallback to canvas', e3);
          // 4. Fallback: html2canvas
          const canvas = await html2canvas(el, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: defaultBg,
          });
          return canvas.toDataURL('image/jpeg', 0.92);
        }
      }
    }
  };

  // Robust Handle PDF Export (Strictly 2 Pages: Page 1 Certificate, Page 2 Marksheet)
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const frontEl = frontRef.current;
    const backEl = backRef.current;

    if (!frontEl || !backEl) {
      setIsExporting(false);
      return;
    }

    // Save previous display state
    const prevFrontDisplay = frontEl.style.display;
    const prevBackDisplay = backEl.style.display;
    const frontHadHidden = frontEl.classList.contains('hidden');
    const backHadHidden = backEl.classList.contains('hidden');

    try {
      // Temporarily ensure both elements are visible in DOM layout for capture
      frontEl.classList.remove('hidden');
      frontEl.style.display = 'block';
      backEl.classList.remove('hidden');
      backEl.style.display = 'block';

      // Allow DOM reflow and font metrics to settle
      await new Promise((r) => setTimeout(r, 150));

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4', // 297mm x 210mm
        compress: true,
      });

      // Page 1: Certificate (Front)
      const frontImg = await captureSheetImage(frontEl, '#fafbfc');
      pdf.addImage(frontImg, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

      // Page 2: Marksheet & Academic Transcript (Back)
      pdf.addPage([297, 210], 'landscape');
      const backImg = await captureSheetImage(backEl, '#faf8f5');
      pdf.addImage(backImg, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

      // Direct download of the 2-page PDF
      pdf.save(`Certificate-${serialNumber}.pdf`);
    } catch (err: any) {
      console.error('All client-side PDF capture methods failed:', err);
      // Clean fallback: invoke print to PDF without disturbing alert
      handlePrint();
    } finally {
      // Restore initial displays
      frontEl.style.display = prevFrontDisplay;
      backEl.style.display = prevBackDisplay;
      if (frontHadHidden) frontEl.classList.add('hidden');
      if (backHadHidden) backEl.classList.add('hidden');
      setIsExporting(false);
    }
  };

  // Handle JPG Export
  const handleDownloadJPG = async (side: 'front' | 'back') => {
    setIsExporting(true);
    const targetElement = side === 'front' ? frontRef.current : backRef.current;
    if (!targetElement) {
      setIsExporting(false);
      return;
    }

    const wasHidden = targetElement.classList.contains('hidden') || targetElement.style.display === 'none';
    const prevDisplay = targetElement.style.display;

    try {
      if (wasHidden) {
        targetElement.classList.remove('hidden');
        targetElement.style.display = 'block';
        await new Promise((r) => setTimeout(r, 150));
      }

      const imgData = await captureSheetImage(targetElement, side === 'front' ? '#fafbfc' : '#faf8f5');

      const link = document.createElement('a');
      link.download = `Certificate-${serialNumber}-${side === 'front' ? 'FRONT' : 'MARKSHEET'}.jpg`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error('Failed to export JPG:', err);
    } finally {
      if (wasHidden) {
        targetElement.classList.add('hidden');
        targetElement.style.display = prevDisplay;
      }
      setIsExporting(false);
    }
  };

  // Strict 2-Page Landscape Print Handler (Page 1: Certificate, Page 2: Marksheet only)
  const handlePrint = () => {
    const frontEl = frontRef.current;
    const backEl = backRef.current;

    if (!frontEl || !backEl) {
      window.print();
      return;
    }

    // Temporarily ensure both are available in DOM
    const prevFrontDisplay = frontEl.style.display;
    const prevBackDisplay = backEl.style.display;
    frontEl.style.display = 'block';
    backEl.style.display = 'block';

    const frontHtml = frontEl.innerHTML;
    const backHtml = backEl.innerHTML;

    // Restore displays immediately
    frontEl.style.display = prevFrontDisplay;
    backEl.style.display = prevBackDisplay;

    // Collect all stylesheets from head
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    // Create an isolated print iframe so NOTHING else from the website is printed
    const existingIframe = document.getElementById('certificate-print-iframe');
    if (existingIframe && document.body.contains(existingIframe)) {
      document.body.removeChild(existingIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'certificate-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Tech For You - Certificate ${serialNumber}</title>
          ${styleTags}
          <style>
            @page {
              size: landscape;
              margin: 0mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 297mm !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page-sheet {
              width: 297mm !important;
              height: 209mm !important;
              max-height: 209mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 6mm !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              position: relative !important;
              background: #ffffff !important;
            }
            .print-page-sheet:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="print-page-sheet">${frontHtml}</div>
          <div class="print-page-sheet">${backHtml}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 450);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Candidate Ineligibility Notice Bar */}
      {!isCandidateEligible && (
        <div className="no-print w-full max-w-5xl mb-3 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-950 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <div className="font-extrabold text-rose-900 text-sm tracking-tight flex items-center gap-2">
                <span>Candidate is Not Eligible for Certificate</span>
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-mono text-[10px] uppercase">
                  Score: {grading.overallPercentage}% (Passing: {grading.passingPercentage}%)
                </span>
              </div>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Official Academic Transcript has been issued with institutional stamp on the reverse side. Certificate front reflects candidate ineligibility.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSide('back')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeSide === 'back'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-100'
              }`}
            >
              View Stamped Transcript
            </button>
            <button
              onClick={() => setActiveSide('front')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeSide === 'front'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-100'
              }`}
            >
              View Certificate Front
            </button>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      {showControls && (
        <div className="no-print flex flex-col md:flex-row items-center justify-between gap-3 w-full max-w-5xl mb-4 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {/* Side Toggle Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveSide('front')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSide === 'front'
                  ? 'bg-slate-900 text-emerald-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isCandidateEligible ? 'Front Certificate' : 'Certificate Front (Ineligible Notice)'}
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSide === 'back'
                  ? 'bg-slate-900 text-emerald-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Back Transcript & Outcomes</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${isCandidateEligible ? 'bg-emerald-800 text-emerald-200' : 'bg-rose-800 text-rose-200'}`}>
                WITH STAMP
              </span>
            </button>
          </div>

          {/* Action Buttons & Zoom Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
            {/* Mobile View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                title="Fit to screen width"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                  zoomMode === 'fit' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('full')}
                title="View full resolution (100%)"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                  zoomMode === 'full' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">100%</span>
              </button>
            </div>

            <button
              onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Flip Side"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Flip</span>
            </button>

            <button
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>

            <button
              disabled={isExporting}
              onClick={() => handleDownloadJPG(activeSide)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 min-h-[38px]"
              title={`Download ${activeSide === 'front' ? 'Certificate' : 'Transcript'} as Image`}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">JPG</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Print Certificate"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Touch Hint */}
      <div className="no-print sm:hidden text-[11px] text-slate-500 flex items-center justify-center gap-1.5 py-1">
        <span>↔ Swipe horizontally to view full certificate or tap Print / PDF</span>
      </div>

      {/* Certificate Viewer Wrapper - Responsive Scrolling Container */}
      <div className="certificate-viewer-wrapper w-full flex justify-center overflow-x-auto pb-6 pt-1 touch-pan-x">
        <div
          className={`certificate-scroll-container transition-all duration-300 ${
            zoomMode === 'fit' ? 'w-full min-w-[700px] sm:min-w-0 max-w-5xl' : 'min-w-[980px] max-w-[1020px]'
          }`}
        >
          {/* ========================================================= */}
          {/* FRONT SIDE (CERTIFICATE OF COMPETENCE) */}
          {/* ========================================================= */}
          <div
            ref={frontRef}
            className={`certificate-print-page bg-[#fafbfc] text-slate-900 rounded-xl shadow-2xl relative overflow-hidden transition-opacity duration-300 ${
              activeSide === 'front' ? 'block' : 'hidden print:block'
            }`}
            style={{
              aspectRatio: '1.414 / 1',
              padding: '24px',
            }}
          >
            {/* Guilloche & Security Geometry Pattern Layer */}
            <div className="absolute inset-0 certificate-guilloche-bg pointer-events-none opacity-40" />

            {/* Microprint Border Rule simulation */}
            <div className="absolute inset-2 border border-slate-300/40 pointer-events-none rounded-lg" />

            {/* Subtle Watermark Logo Layer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none">
              <img src={logoDataUrl} alt="" className="w-96 h-96 object-contain" />
            </div>

            {/* FLOATING CODING SIGNS & TOKENS (Professional Web Development Theme) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-1">
              <div className="absolute top-6 left-8 font-code text-xl font-bold text-emerald-500/25 animate-float-slow">
                &lt;code&gt;
              </div>
              <div className="absolute top-12 right-12 font-code text-2xl font-black text-emerald-600/25 animate-float-reverse">
                &#123; ...dev &#125;
              </div>
              <div className="absolute top-1/4 left-6 font-code text-xs font-semibold text-emerald-600/20">
                const qualified = true;
              </div>
              <div className="absolute top-1/3 right-8 font-code text-xs font-semibold text-emerald-600/20">
                async function deploy()
              </div>
              <div className="absolute bottom-1/3 left-10 font-code text-sm font-bold text-emerald-500/20">
                &lt;React /&gt;
              </div>
              <div className="absolute bottom-1/4 right-10 font-code text-xs font-mono text-emerald-600/25">
                npm run build:prod
              </div>
              <div className="absolute bottom-16 left-16 font-code text-xs font-mono text-emerald-600/20">
                git commit -m "verified"
              </div>
              <div className="absolute bottom-20 right-20 font-code text-base font-black text-emerald-500/20 animate-float-slow">
                &lt;/&gt;
              </div>
              <div className="absolute top-20 left-1/3 font-code text-[11px] font-mono text-emerald-600/15">
                01000011 01001111 01000100 01000101
              </div>
              <div className="absolute top-1/2 right-6 font-code text-lg font-bold text-emerald-500/20">
                =&gt; &#123; return &#125;
              </div>
              <div className="absolute bottom-10 left-1/3 font-code text-[9px] font-semibold text-emerald-600/20">
                TypeScript · REST API · FullStack
              </div>
            </div>

            {/* Ineligible Prominent Watermark across Front Side */}
            {!isCandidateEligible && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="text-center transform -rotate-15 border-4 border-rose-600/40 bg-white/75 backdrop-blur-xs px-8 py-4 rounded-2xl shadow-xl max-w-lg">
                  <div className="text-xl sm:text-3xl font-black font-mono tracking-widest text-rose-700 uppercase">
                    CANDIDATE IS NOT ELIGIBLE FOR CERTIFICATE
                  </div>
                  <div className="text-xs font-bold text-rose-900 mt-1 uppercase tracking-wider">
                    Official Academic Transcript Issued On Reverse Side With Stamp
                  </div>
                </div>
              </div>
            )}

            {/* Revoked Diagonal Watermark */}
            {status === 'REVOKED' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <span className="text-7xl font-cinzel font-black tracking-widest text-rose-600/30 uppercase transform -rotate-25 border-4 border-rose-600/30 px-12 py-3 rounded-2xl">
                  REVOKED
                </span>
              </div>
            )}

            {/* Outer Cyber Emerald & Obsidian Border */}
            <div
              className="relative w-full h-full border-4 rounded-lg p-2 flex flex-col justify-between z-10"
              style={{ borderColor: isCandidateEligible ? accentColor : '#e11d48' }}
            >
              {/* Inner Fine Cyber Border */}
              <div
                className="w-full h-full border border-dashed rounded-md p-6 flex flex-col justify-between relative bg-white/80 backdrop-blur-xs"
                style={{ borderColor: primaryColor }}
              >
                {/* Top Corner Circuit Tech Ornaments */}
                <div className="absolute top-2 left-2 text-xs font-mono text-emerald-600 font-bold">┌[+]</div>
                <div className="absolute top-2 right-2 text-xs font-mono text-emerald-600 font-bold">[+]┐</div>
                <div className="absolute bottom-2 left-2 text-xs font-mono text-emerald-600 font-bold">└[+]</div>
                <div className="absolute bottom-2 right-2 text-xs font-mono text-emerald-600 font-bold">[+]┘</div>

                {/* Header Section with Official Uploaded Logo */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-xl bg-black border border-emerald-500/60 p-0.5 shadow-[0_0_12px_rgba(16,185,129,0.35)] overflow-hidden shrink-0">
                      <img src={logoDataUrl} alt="Tech For You Logo" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel tracking-widest text-sm uppercase font-extrabold text-slate-900">
                          {institute?.name || 'Tech For You'}
                        </span>
                        <span className="text-[9px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          WEB DEV & TECH
                        </span>
                      </div>
                      <p className="text-[10px] tracking-wider text-slate-500 uppercase font-medium">
                        {institute?.accreditationDetails || 'Centre of Advanced Software Engineering & Certified Computing'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h1
                      className="font-cinzel text-xl md:text-2xl font-bold tracking-widest uppercase"
                      style={{ color: isCandidateEligible ? primaryColor : '#be123c' }}
                    >
                      {isCandidateEligible
                        ? (institute?.certificateTitle || 'Certificate of Professional Competence')
                        : 'Official Academic Record · Ineligibility Notice'}
                    </h1>
                    <div className={`w-36 h-0.5 mx-auto mt-1 ${isCandidateEligible ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'}`} />
                  </div>
                </div>

                {/* Candidate & Course Information Body */}
                <div className="text-center my-auto py-2 space-y-2">
                  <p className="font-serif italic text-xs text-slate-600 tracking-wide">
                    {isCandidateEligible
                      ? 'This is proudly presented and officially conferred upon'
                      : 'Academic examination record concerning the registered candidate'}
                  </p>

                  <div className="py-0.5">
                    <h2
                      className="font-playfair text-2xl md:text-3xl font-bold tracking-wide"
                      style={{ color: primaryColor }}
                    >
                      {student.fullName}
                    </h2>
                    <div className={`w-56 h-[1.5px] mx-auto mt-1 ${isCandidateEligible ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`} />
                  </div>

                  {template.showFatherName && student.fatherName && (
                    <p className="text-xs font-medium text-slate-600">
                      Son / Daughter of <span className="font-semibold text-slate-800">{student.fatherName}</span>
                    </p>
                  )}

                  {isCandidateEligible ? (
                    <>
                      <p className="font-serif italic text-xs text-slate-600 pt-1">
                        in recognition of successful completion and rigorous examination in the specialized curriculum
                      </p>

                      <h3 className="font-sans text-base md:text-lg font-bold text-slate-900 tracking-tight max-w-2xl mx-auto">
                        {course.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed px-4">
                        Demonstrating commendable academic competence, technical proficiency in full-stack architecture, software laboratory evaluations, and the completion of all prerequisite benchmarks with distinction.
                      </p>
                    </>
                  ) : (
                    <div className="my-2 p-3 bg-rose-50/90 border border-rose-200 rounded-xl max-w-xl mx-auto space-y-1.5 shadow-2xs">
                      <div className="inline-block px-3 py-0.5 bg-rose-600 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-md">
                        Candidate is Not Eligible for Certificate
                      </div>
                      <h3 className="font-sans text-sm font-bold text-slate-900">
                        {course.title} ({course.code})
                      </h3>
                      <p className="text-[11px] text-rose-900 font-medium leading-relaxed px-2">
                        The candidate participated in the specialized curriculum but has not fulfilled the requisite passing criteria of {grading.passingPercentage ?? 50}% (Score Achieved: <strong>{grading.overallPercentage}%</strong> · Grade: <strong>{grading.grade}</strong> · Result: <strong>{grading.result}</strong>). A formal Certificate of Competence is withheld. An Official Academic Transcript has been issued on the reverse side with verified institutional stamp.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Section */}
                <div className="pt-3 border-t border-slate-200/80 flex items-end justify-between text-left">
                  {/* Left Metadata & QR */}
                  <div className="flex items-center gap-3">
                    {template.showQR && qrCodeDataUrl && (
                      <div className="bg-white p-1 rounded-sm border border-slate-200 shadow-2xs">
                        <img src={qrCodeDataUrl} alt="Verify QR" className="w-16 h-16" />
                      </div>
                    )}
                    <div className="space-y-0.5 text-[10px] text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Serial No: </span>
                        <span className="font-mono font-medium text-slate-900">{serialNumber}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Issue Date: </span>
                        <span>{issueDate}</span>
                      </div>
                      {template.showGradeFront && (
                        <div>
                          <span className="font-semibold text-slate-800">Status: </span>
                          <span className={`font-bold ${isCandidateEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isCandidateEligible ? `${grading.grade} (${grading.result})` : `Ineligible (${grading.grade})`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-medium pt-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Official Cryptographic Credential
                      </div>
                    </div>
                  </div>

                  {/* Center Official Cyber Emblem Seal */}
                  {template.showSeal && (
                    <div className="flex flex-col items-center justify-center">
                      <div className={`relative w-16 h-16 rounded-full border-2 ${isCandidateEligible ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]' : 'border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.35)]'} bg-black flex items-center justify-center p-1 overflow-hidden`}>
                        <img src={logoDataUrl} alt="Official Seal" className="w-full h-full object-cover rounded-full" />
                      </div>
                      <span className={`text-[7px] font-mono tracking-widest font-bold uppercase mt-0.5 ${isCandidateEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCandidateEligible ? 'OFFICIAL SEAL' : 'INELIGIBLE · RECORD'}
                      </span>
                    </div>
                  )}

                  {/* Right Signature: ONLY Course Instructor: M.Moiz Raza */}
                  {template.showSignatures && (
                    <div className="flex flex-col items-center justify-end text-center min-w-[180px]">
                      {/* Calligraphic Signature Script */}
                      <div className="font-signature text-2xl md:text-3xl font-bold text-slate-900 pb-0.5 tracking-wider select-none transform -rotate-1 hover:rotate-0 transition-transform">
                        {instructorSignature}
                      </div>

                      {/* Signature Underline */}
                      <div className="w-40 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 mx-auto rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />

                      {/* Official Title Line */}
                      <div className="text-[10px] font-extrabold text-slate-800 pt-1 font-mono tracking-wider uppercase">
                        Course Instructor : {instructorName}
                      </div>
                      <div className="text-[8px] text-emerald-700 font-semibold tracking-widest uppercase">
                        Tech For You · Faculty Accreditation
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BACK SIDE (TRANSCRIPT & OUTCOMES WITH OFFICIAL STAMP) */}
          {/* ========================================================= */}
          <div
            ref={backRef}
            className={`certificate-print-page certificate-print-page-back bg-[#faf8f5] text-slate-900 rounded-xl shadow-2xl relative overflow-hidden transition-opacity duration-300 ${
              activeSide === 'back' ? 'block' : 'hidden print:block'
            }`}
            style={{
              aspectRatio: '1.414 / 1',
              padding: '24px',
            }}
          >
            <div className="absolute inset-0 certificate-guilloche-bg pointer-events-none opacity-30" />

            {/* Subtle Watermark Logo on Back Side */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none">
              <img src={logoDataUrl} alt="" className="w-64 h-64 object-contain" />
            </div>

            {/* Subtle Ambient Floating Coding Signs on Back Side */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-1">
              <div className="absolute top-8 left-12 font-mono text-lg font-black text-emerald-600/15">
                &lt;/transcript&gt;
              </div>
              <div className="absolute bottom-10 right-14 font-mono text-sm font-bold text-emerald-600/15">
                &#123; verified: true &#125;
              </div>
            </div>

            {/* OFFICIAL INSTITUTIONAL RUBBER STAMP */}
            {!isCandidateEligible ? (
              <div className="absolute top-16 right-10 z-20 pointer-events-none select-none transform rotate-[-8deg]">
                <div className="border-4 border-rose-700/85 rounded-2xl p-2.5 bg-rose-50/80 backdrop-blur-2xs text-rose-800 shadow-md flex flex-col items-center justify-center text-center font-mono">
                  <div className="text-[8px] font-black uppercase tracking-widest border-b border-rose-700/60 pb-0.5 w-full">
                    ★ OFFICIAL TRANSCRIPT ★
                  </div>
                  <div className="font-black text-xs uppercase tracking-tight py-0.5 text-rose-950">
                    TECH FOR YOU
                  </div>
                  <div className="text-[9px] font-black bg-rose-700 text-white px-2 py-0.5 rounded uppercase tracking-wider my-0.5 shadow-2xs">
                    CANDIDATE NOT ELIGIBLE FOR CERTIFICATE
                  </div>
                  <div className="text-[8px] font-bold text-rose-800 uppercase tracking-tight">
                    TRANSCRIPT ISSUED WITH OFFICIAL STAMP
                  </div>
                  <div className="text-[7.5px] text-rose-700 font-mono mt-0.5">
                    REF: {serialNumber} · VERIFIED
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute top-16 right-10 z-20 pointer-events-none select-none transform rotate-[-5deg]">
                <div className="border-3 border-emerald-700/85 rounded-2xl p-2.5 bg-emerald-50/70 backdrop-blur-2xs text-emerald-800 shadow-xs flex flex-col items-center justify-center text-center font-mono">
                  <div className="text-[8px] font-black uppercase tracking-widest border-b border-emerald-700/60 pb-0.5 w-full">
                    ★ OFFICIAL TRANSCRIPT ★
                  </div>
                  <div className="font-black text-[11px] uppercase tracking-tight py-0.5 text-emerald-950">
                    TECH FOR YOU
                  </div>
                  <div className="text-[8px] font-extrabold text-emerald-700 uppercase">
                    ACADEMIC RECORD ISSUED & VERIFIED
                  </div>
                  <div className="text-[7.5px] text-emerald-600 font-mono mt-0.5">
                    REF: {serialNumber}
                  </div>
                </div>
              </div>
            )}

            {/* Outer Border */}
            <div
              className="relative w-full h-full border-4 rounded-lg p-2 flex flex-col justify-between z-10"
              style={{ borderColor: isCandidateEligible ? accentColor : '#e11d48' }}
            >
              <div
                className="w-full h-full border border-dashed rounded-md p-6 flex flex-col justify-between relative bg-white/80 backdrop-blur-xs"
                style={{ borderColor: primaryColor }}
              >
                {/* Header with Logo */}
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black border border-emerald-500/50 p-0.5 overflow-hidden shadow-xs shrink-0">
                      <img src={logoDataUrl} alt="Tech For You Logo" className="w-full h-full object-cover rounded-md" />
                    </div>
                    <div>
                      <h2 className="font-cinzel text-base md:text-lg font-bold tracking-wider" style={{ color: primaryColor }}>
                        Official Academic Transcript & Competency Record
                      </h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                        {institute?.name || 'Tech For You'} · {course.title} ({course.code})
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] space-y-0.5">
                    <div>
                      <span className="text-slate-500">Student Name: </span>
                      <span className="font-semibold text-slate-800">{student.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Serial Ref: </span>
                      <span className="font-mono font-medium text-slate-900">{serialNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Two Column Content: Left Outcomes, Right Marks Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-auto py-2">
                  {/* Left Column: Learning Outcomes & Modules */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Verified Technical Competencies
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Evaluated
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[10.5px] text-slate-700 leading-snug">
                      {course.learningOutcomes.map((outcome, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                          <span>{outcome}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
                      <span>Curriculum Duration: <strong>{course.duration}</strong></span>
                      <span>Faculty: <strong>{instructorName}</strong></span>
                    </div>
                  </div>

                  {/* Right Column: Assessment Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Assessment Breakdown
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Method: {grading.method === 'weighted' ? 'Weighted Scheme' : 'Total Aggregate'}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-1 px-2">Parameter</th>
                            <th className="py-1 px-2 text-right">Max</th>
                            <th className="py-1 px-2 text-right">Obtained</th>
                            {grading.method === 'weighted' && (
                              <th className="py-1 px-2 text-right">Weight</th>
                            )}
                            <th className="py-1 px-2 text-right">% Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {grading.parameters.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-1 px-2 font-medium">{p.name}</td>
                              <td className="py-1 px-2 text-right text-slate-500">{p.maxMarks}</td>
                              <td className="py-1 px-2 text-right font-semibold text-slate-900">{p.obtainedMarks}</td>
                              {grading.method === 'weighted' && (
                                <td className="py-1 px-2 text-right text-slate-500">{p.weightage}%</td>
                              )}
                              <td className="py-1 px-2 text-right font-bold text-emerald-700">{p.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                          <tr>
                            <td className="py-1.5 px-2">Overall Assessment</td>
                            <td className="py-1.5 px-2 text-right">{grading.totalMaxMarks}</td>
                            <td className="py-1.5 px-2 text-right">{grading.totalObtainedMarks}</td>
                            {grading.method === 'weighted' && (
                              <td className="py-1.5 px-2 text-right">100%</td>
                            )}
                            <td className="py-1.5 px-2 text-right font-bold text-emerald-800">{grading.overallPercentage}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Final Grade Summary Box */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Final Grade</div>
                        <div className={`text-base font-extrabold ${isCandidateEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {grading.grade}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Result Classification</div>
                        <div className={`font-semibold ${isCandidateEligible ? 'text-slate-800' : 'text-rose-700'}`}>
                          {grading.result}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Certification Status</div>
                        <div className={`font-bold text-[10px] ${isCandidateEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isCandidateEligible ? 'CONFIRMED PASS' : 'NOT ELIGIBLE FOR CERTIFICATE'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Notes & Verification Instructions with Instructor Accreditation */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-500">
                  <div className="max-w-xl text-center sm:text-left">
                    <p className="leading-tight">
                      {institute?.verificationInstructions ||
                        'Official transcript generated directly from the Tech For You immutable academic database ledger. Verification can be performed online anytime.'}
                    </p>
                  </div>
                  <div className="text-center sm:text-right font-mono font-medium text-slate-700">
                    <div>Instructor: <span className="font-bold text-slate-900">{instructorName}</span></div>
                    <div>ID: {snapshot.student.studentIdNumber || serialNumber}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
