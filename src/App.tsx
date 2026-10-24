import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { FindCertificateView } from './views/FindCertificateView';
import { VerifyView } from './views/VerifyView';
import { CoursesView } from './views/CoursesView';
import { AdminLoginView } from './views/admin/AdminLoginView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { api, getAdminToken } from './api/client';
import { Course, InstituteSettings } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<InstituteSettings | undefined>(undefined);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Parse path on initial mount for deep links (e.g. /verify/:id or /find or /admin)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify')) {
        const parts = path.split('/').filter(Boolean);
        setCurrentView('verify');
        if (parts.length > 1) {
          setViewParam(decodeURIComponent(parts[1]));
        }
      } else if (path.startsWith('/find')) {
        setCurrentView('find');
      } else if (path.startsWith('/courses')) {
        setCurrentView('courses');
      } else if (path.startsWith('/admin/login')) {
        setCurrentView('admin-login');
      } else if (path.startsWith('/admin')) {
        setCurrentView(getAdminToken() ? 'admin' : 'admin-login');
      } else {
        setCurrentView('home');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch initial public data
  useEffect(() => {
    async function initData() {
      try {
        const [instRes, courseRes] = await Promise.all([
          api.getInstitute(),
          api.getCourses(),
        ]);
        if (instRes.success) setSettings(instRes.data);
        if (courseRes.success) setCourses(courseRes.data);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    setViewParam(param);

    // Update browser URL cleanly
    let newPath = '/';
    if (view === 'find') newPath = '/find';
    else if (view === 'verify') newPath = param ? `/verify/${encodeURIComponent(param)}` : '/verify';
    else if (view === 'courses') newPath = '/courses';
    else if (view === 'admin-login') newPath = '/admin/login';
    else if (view === 'admin') newPath = '/admin';

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1 w-full">
        {currentView === 'home' && (
          <HomeView settings={settings} courses={courses} onNavigate={handleNavigate} />
        )}

        {currentView === 'find' && (
          <FindCertificateView courses={courses} onNavigate={handleNavigate} />
        )}

        {currentView === 'verify' && (
          <VerifyView initialIdentifier={viewParam} onNavigate={handleNavigate} />
        )}

        {currentView === 'courses' && (
          <CoursesView courses={courses} onNavigate={handleNavigate} />
        )}

        {currentView === 'admin-login' && (
          <AdminLoginView
            onLoginSuccess={() => handleNavigate('admin')}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}
      </main>

      <Footer settings={settings} onNavigate={handleNavigate} />
    </div>
  );
}
