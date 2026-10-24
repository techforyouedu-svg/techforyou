import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { InstituteSettings } from '../types';

interface FooterProps {
  settings?: InstituteSettings;
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  return (
    <footer className="no-print bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Institute Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black border border-emerald-500/40 p-0.5 overflow-hidden shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <img src="/logo.png" alt="Tech For You" className="w-full h-full object-cover rounded-lg" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                {settings?.instituteName || 'Tech For You'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Centre of Advanced Software Engineering, Web Development & Computing.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Services
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('find')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Find My Certificate
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('verify')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Verify Serial Number
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('courses')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Courses & Outcomes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin-login')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Faculty Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details (03194331346 & Kot Radha Kishan only) */}
          <div className="space-y-3 text-xs text-slate-400">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Contact
            </h4>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <a
                href="tel:03194331346"
                className="text-white hover:text-emerald-400 transition-colors font-mono font-medium text-sm"
              >
                03194331346
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-white font-medium text-sm">Kot Radha Kishan</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Tech For You. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="text-slate-300 font-medium">Kot Radha Kishan</span>
            <span>·</span>
            <a href="tel:03194331346" className="text-emerald-400 font-mono hover:underline">
              03194331346
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
