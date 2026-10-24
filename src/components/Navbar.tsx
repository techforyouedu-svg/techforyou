import React, { useState } from 'react';
import { ShieldCheck, Search, BookOpen, Lock, LogOut, Menu, X, ChevronRight, Award } from 'lucide-react';
import { getAdminToken, clearAdminAuth, getStoredUser } from '../api/client';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = getAdminToken();
  const user = getStoredUser();

  const handleLogout = () => {
    clearAdminAuth();
    setMobileMenuOpen(false);
    onNavigate('home');
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Award },
    { id: 'find', label: 'Find My Certificate', icon: Search },
    { id: 'verify', label: 'Verify Serial', icon: ShieldCheck },
    { id: 'courses', label: 'Courses & Outcomes', icon: BookOpen },
  ];

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Institute Brand Logo */}
        <div
          onClick={() => handleLinkClick('home')}
          className="flex items-center gap-3 cursor-pointer group select-none min-h-[44px]"
        >
          <div className="relative w-11 h-11 rounded-xl bg-black flex items-center justify-center p-0.5 shadow-sm border border-emerald-500/50 group-hover:border-emerald-400 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="Tech For You"
              className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight group-hover:text-emerald-700 transition-colors">
                Tech For You
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                WEB DEV & TECH
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`relative py-2 px-1 text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[44px] ${
                  isActive
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />}
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action: Desktop Admin Portal / Logout */}
        <div className="hidden md:flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLinkClick('admin')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors border min-h-[40px] ${
                  currentView.startsWith('admin')
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Admin Panel ({user?.name ? user.name.split(' ')[0] : 'Admin'})
              </button>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleLinkClick('admin-login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-colors min-h-[40px]"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Staff Login
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="md:hidden flex items-center gap-2">
          {token && (
            <button
              onClick={() => handleLinkClick('admin')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-emerald-400 rounded-lg"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-6 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />}
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Mobile Admin Section */}
          <div className="pt-3 border-t border-slate-100">
            {token ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLinkClick('admin')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Admin Dashboard ({user?.name ? user.name.split(' ')[0] : 'Admin'})</span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleLinkClick('admin-login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[44px]"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Staff & Administrator Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
