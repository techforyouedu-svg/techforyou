import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Award, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { Course } from '../types';

interface CoursesViewProps {
  courses: Course[];
  onNavigate: (view: string, param?: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ courses, onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...Array.from(new Set(courses.map((c) => c.category)))];

  const filteredCourses = selectedCategory === 'all'
    ? courses
    : courses.filter((c) => c.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Curricular Standards & Competencies</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
          Institute Courses & Learning Outcomes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Explore our certified technical engineering programs. Every certificate issued by Tech For You reflects verified mastery across these competencies.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {cat === 'all' ? 'All Disciplines' : cat}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
                  {c.code}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.duration}</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 font-sans">{c.title}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">{c.category}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

              {/* Learning Outcomes List */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Curricular Learning Outcomes</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {c.learningOutcomes?.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-bold text-emerald-700 mt-0.5 shrink-0">
                        0{idx + 1}.
                      </span>
                      <span className="leading-relaxed">{outcome.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                <span>Verified on back transcript</span>
              </div>
              <button
                onClick={() => onNavigate('find')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span>Find Graduates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
