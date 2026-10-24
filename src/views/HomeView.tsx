import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight, Layers, Lock, Cpu } from 'lucide-react';
import { Course, InstituteSettings } from '../types';

interface HomeViewProps {
  settings?: InstituteSettings;
  courses: Course[];
  onNavigate: (view: string, param?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ courses, onNavigate }) => {
  const [quickSerial, setQuickSerial] = useState('');

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSerial.trim()) {
      onNavigate('verify', quickSerial.trim());
    }
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#060b09] text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 px-6 py-16 sm:px-12 sm:py-20 shadow-2xl border border-emerald-950/80">
        {/* Background Cyber Grid & Glow */}
        <div className="absolute inset-0 bg-radial from-emerald-950/30 via-[#060b09] to-black pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          {/* Logo Brand Emblem Showcase */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-400 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black border-2 border-emerald-500 p-1 overflow-hidden shadow-2xl">
                <img
                  src="/logo.png"
                  alt="Tech For You Cyber & Tech Institute"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Web Development & Software Engineering</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-white leading-tight">
            Tech For You
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Verifiable, tamper-proof academic certificates, cyber transcripts, and competency credentials. Backed by immutable database snapshots and instant QR verification.
          </p>

          {/* Quick Serial Verification Search Box */}
          <div className="pt-4 max-w-xl mx-auto">
            <form onSubmit={handleQuickVerify} className="flex flex-col sm:flex-row gap-2 bg-slate-900/80 p-2 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="relative flex-1">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                <input
                  type="text"
                  value={quickSerial}
                  onChange={(e) => setQuickSerial(e.target.value)}
                  placeholder="Enter Certificate Serial (e.g. TFY-2026-FS-XXXX)"
                  className="w-full pl-11 pr-4 py-3 bg-black/80 text-white placeholder-slate-500 text-sm font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-emerald-950"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verify Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Secondary CTA */}
          <div className="pt-2 flex items-center justify-center gap-4 text-xs sm:text-sm">
            <button
              onClick={() => onNavigate('find')}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 font-semibold transition-colors cursor-pointer"
            >
              Search by Candidate Name & Phone Number →
            </button>
          </div>
        </div>
      </section>

      {/* Verification & System Architecture Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
            Enterprise Certificate Architecture
          </h2>
          <p className="text-sm text-slate-500">
            Engineered with strict academic standards, tamper resistance, and complete curricular transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Front & Back Dual Credential</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every issued certificate includes both an ornamental ceremonial front page and a detailed transcript on the reverse displaying verified learning outcomes and breakdown marks.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-2xs">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Dynamic Multi-Param Grading</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Configurable grading engine supporting both weighted and total-marks calculations across Theory, Labs, Projects, Viva Voce, and Continuous Assignments.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Immutable Snapshot Storage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Certificates capture a permanent historical snapshot of candidate data, grading thresholds, and outcomes so future rule changes never alter existing credentials.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Courses & Outcomes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Cyber & Software Curriculum</div>
            <h2 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
              Certified Technical Programs
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              All courses feature strict hands-on assessment parameters and verifiable learning outcomes.
            </p>
          </div>
          <button
            onClick={() => onNavigate('courses')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Explore All Syllabi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {c.code}
                  </span>
                  <span>{c.duration}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

                {/* Outcomes sample */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Core Learning Outcomes:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {c.learningOutcomes?.slice(0, 3).map((o, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{o.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{c.category}</span>
                <button
                  onClick={() => onNavigate('find')}
                  className="text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  Verify Graduates →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
