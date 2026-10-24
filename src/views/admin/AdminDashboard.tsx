import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Award,
  Users,
  BookOpen,
  GraduationCap,
  Sliders,
  Palette,
  Settings,
  History,
  Plus,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Download,
  Trash2,
  Edit,
  ArrowRight,
  RefreshCw,
  FileCheck,
  ShieldAlert,
  Percent,
  Database,
  Server,
  HardDrive,
} from 'lucide-react';
import { api } from '../../api/client';
import {
  AssessmentParameter,
  AuditLog,
  Certificate,
  CertificateTemplate,
  Course,
  Enrollment,
  GradingConfiguration,
  InstituteSettings,
  Student,
} from '../../types';
import { CertificateModal } from '../../components/CertificateModal';
import { CertificateRenderer } from '../../components/CertificateRenderer';

interface AdminDashboardProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'issue' | 'certificates' | 'students' | 'courses' | 'enrollments' | 'grading' | 'templates' | 'settings' | 'audit' | 'database'
  >('overview');

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Core Data
  const [stats, setStats] = useState<any>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [gradingConfig, setGradingConfig] = useState<GradingConfiguration | null>(null);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [settings, setSettings] = useState<InstituteSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Database / MongoDB State
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [saveToEnvChecked, setSaveToEnvChecked] = useState(true);
  const [isConnectingDb, setIsConnectingDb] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  // Modals state
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [revocationReasonInput, setRevocationReasonInput] = useState('');
  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
  const [isDeletingCert, setIsDeletingCert] = useState(false);

  // Student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    fatherName: '',
    phoneNumber: '',
    email: '',
    cnicOrNationalId: '',
    address: '',
    studentIdNumber: '',
  });

  // Course modal
  const defaultWebDevParams: AssessmentParameter[] = [
    { id: 'param-1', name: 'Theory Examination', maxMarks: 100, weightage: 30, isRequired: true },
    { id: 'param-2', name: 'Practical Web Project', maxMarks: 100, weightage: 40, isRequired: true },
    { id: 'param-3', name: 'Assignments & Quizzes', maxMarks: 50, weightage: 15, isRequired: true },
    { id: 'param-4', name: 'Coding Lab & Viva', maxMarks: 50, weightage: 15, isRequired: true },
  ];

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    category: 'Software Engineering',
    duration: '6 Months (480 Hours)',
    description: '',
    learningOutcomes: ['', ''],
    defaultTemplateId: 'tmpl-web-development',
    gradingMethod: 'total' as 'total' | 'weighted',
    passingPercentage: 50,
    assessmentParameters: defaultWebDevParams,
  });

  // Enrollment modal
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<'existing' | 'quick_register'>('existing');
  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    courseId: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    fullName: '',
    fatherName: '',
    phoneNumber: '',
    email: '',
  });

  // Marks modal
  const [marksModalOpen, setMarksModalOpen] = useState(false);
  const [selectedEnrollmentForMarks, setSelectedEnrollmentForMarks] = useState<Enrollment | null>(null);
  const [marksInput, setMarksInput] = useState<Record<string, number>>({});

  // ==========================================
  // GUIDED CERTIFICATE ISSUANCE STATE
  // ==========================================
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [wizardMarks, setWizardMarks] = useState<Record<string, number>>({});
  const [wizardCalculations, setWizardCalculations] = useState<any>(null);
  const [wizardOutcomes, setWizardOutcomes] = useState<string[]>([]);
  const [wizardTemplateId, setWizardTemplateId] = useState('tmpl-web-development');
  const [wizardIssueDate, setWizardIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isIssuing, setIsIssuing] = useState(false);

  // Filter & Search states
  const [certSearch, setCertSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Fetch initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        statsRes,
        certsRes,
        studentsRes,
        coursesRes,
        enrollmentsRes,
        gradingRes,
        templatesRes,
        settingsRes,
        logsRes,
      ] = await Promise.all([
        api.getStats(),
        api.getCertificates(),
        api.getStudents(),
        api.getAdminCourses(),
        api.getEnrollments(),
        api.getGradingConfig(),
        api.getTemplates(),
        api.getSettings(),
        api.getAuditLogs({ limit: 50 }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (certsRes.success) setCertificates(certsRes.data);
      if (studentsRes.success) setStudents(studentsRes.data);
      if (coursesRes.success) setCourses(coursesRes.data);
      if (enrollmentsRes.success) setEnrollments(enrollmentsRes.data);
      if (gradingRes.success) setGradingConfig(gradingRes.data);
      if (templatesRes.success) setTemplates(templatesRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);

      // Load database status
      try {
        const dbRes = await api.getDatabaseStatus();
        if (dbRes?.success) setDbStatus(dbRes.data);
      } catch (_) {}
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) {
      showNotification('error', 'Please provide a valid MongoDB connection string URI.');
      return;
    }
    setIsConnectingDb(true);
    try {
      const res = await api.connectDatabase({
        uri: mongoUriInput.trim(),
        saveToEnv: saveToEnvChecked,
      });
      if (res.success) {
        showNotification('success', res.message || 'Connected to MongoDB successfully!');
        setDbStatus(res.data);
        setMongoUriInput('');
        loadAllData();
      } else {
        showNotification('error', res.message || 'Failed to connect to MongoDB cluster.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to connect to MongoDB cluster.');
    } finally {
      setIsConnectingDb(false);
    }
  };

  const handleSyncMongo = async () => {
    setIsSyncingDb(true);
    try {
      const res = await api.syncDatabase();
      if (res.success) {
        showNotification('success', 'Full database synchronization to MongoDB completed successfully!');
        setDbStatus(res.data);
        loadAllData();
      } else {
        showNotification('error', res.message || 'Sync failed.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Sync failed.');
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleDisconnectMongo = async () => {
    if (!window.confirm('Are you sure you want to disconnect from MongoDB? The system will revert to local file storage (data/db.json).')) {
      return;
    }
    try {
      const res = await api.disconnectDatabase();
      if (res.success) {
        showNotification('info', res.message || 'Reverted to local file storage.');
        setDbStatus(res.data);
        loadAllData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error disconnecting from MongoDB.');
    }
  };

  // ==========================================
  // WIZARD CALCULATION TRIGGER
  // ==========================================
  useEffect(() => {
    if (activeTab === 'issue') {
      api.testCalculateGrades({ marks: wizardMarks, courseId: selectedCourseId }).then((res) => {
        if (res.success) {
          setWizardCalculations(res.data);
        }
      });
    }
  }, [wizardMarks, activeTab, selectedCourseId]);

  // When student or course selected in wizard, load outcomes and pre-saved marks automatically
  useEffect(() => {
    if (selectedCourseId) {
      const c = courses.find((crs) => crs.id === selectedCourseId);
      if (c && c.learningOutcomes) {
        setWizardOutcomes(c.learningOutcomes.map((o) => o.title));
      }

      // Check if student has an existing enrollment for this course with saved marks
      const matchingEnr = enrollments.find(
        (e) => e.studentId === selectedStudentId && e.courseId === selectedCourseId
      );

      if (matchingEnr && matchingEnr.marks && Object.keys(matchingEnr.marks).length > 0) {
        setWizardMarks({ ...matchingEnr.marks });
        showNotification('info', `Automatically loaded saved assessment marks for ${matchingEnr.student?.fullName || 'student'}.`);
      } else {
        const params = (c?.assessmentParameters && c.assessmentParameters.length > 0)
          ? c.assessmentParameters
          : (gradingConfig?.parameters || []);
        const initialMarks: Record<string, number> = {};
        params.forEach((p) => {
          initialMarks[p.id] = Math.round(p.maxMarks * 0.85);
        });
        setWizardMarks(initialMarks);
      }
    }
  }, [selectedCourseId, selectedStudentId]);

  // Quick save wizard marks to enrollment
  const handleSaveWizardMarksToEnrollment = async () => {
    const enr = enrollments.find((e) => e.studentId === selectedStudentId && e.courseId === selectedCourseId);
    if (!enr) {
      showNotification('info', 'Student is not yet enrolled. Marks will be saved and linked upon certificate/transcript issuance.');
      return;
    }
    try {
      await api.updateEnrollmentMarks(enr.id, { marks: wizardMarks });
      showNotification('success', 'Assessment marks auto-saved directly to student enrollment record!');
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error saving marks');
    }
  };

  // Handle Certificate / Transcript Issuance
  const handleIssueCertificateSubmit = async () => {
    if (!selectedStudentId || !selectedCourseId) {
      showNotification('error', 'Please select both a student and an enrolled course.');
      return;
    }

    setIsIssuing(true);
    try {
      const res = await api.issueCertificate({
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        marks: wizardMarks,
        templateId: wizardTemplateId,
        issueDate: wizardIssueDate,
        customOutcomes: wizardOutcomes,
      });

      if (res.success) {
        const isEligible = res.data.snapshot?.isEligibleForCertificate ?? res.data.snapshot?.grading.isPassed;
        showNotification(
          'success',
          isEligible
            ? `Official Certificate ${res.data.serialNumber} issued successfully!`
            : `Official Academic Transcript ${res.data.serialNumber} issued with institutional stamp (Candidate marked ineligible for certificate).`
        );
        setPreviewCert(res.data);
        loadAllData();
        // Reset wizard
        setWizardStep(1);
        setSelectedStudentId('');
        setSelectedCourseId('');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to issue credential record.');
    } finally {
      setIsIssuing(false);
    }
  };

  // Handle Revocation Submit
  const handleConfirmRevocation = async () => {
    if (!revokingCert) return;
    if (!revocationReasonInput.trim()) {
      showNotification('error', 'Mandatory revocation reason is required.');
      return;
    }

    try {
      const res = await api.revokeCertificate(revokingCert.id, revocationReasonInput.trim());
      if (res.success) {
        showNotification('success', `Certificate ${revokingCert.serialNumber} has been revoked.`);
        setRevokingCert(null);
        setRevocationReasonInput('');
        loadAllData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to revoke certificate.');
    }
  };

  // Handle Certificate Deletion
  const handleConfirmDeleteCert = async () => {
    if (!deletingCert) return;
    setIsDeletingCert(true);
    try {
      const res = await api.deleteCertificate(deletingCert.id);
      if (res.success) {
        showNotification('success', res.message || `Certificate ${deletingCert.serialNumber} deleted successfully.`);
        if (previewCert?.id === deletingCert.id) {
          setPreviewCert(null);
        }
        setDeletingCert(null);
        loadAllData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete certificate.');
    } finally {
      setIsDeletingCert(false);
    }
  };

  // ==========================================
  // STUDENT SUBMIT
  // ==========================================
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, studentForm);
        showNotification('success', `Updated student ${studentForm.fullName}`);
      } else {
        await api.createStudent(studentForm);
        showNotification('success', `Registered student ${studentForm.fullName}`);
      }
      setStudentModalOpen(false);
      setEditingStudent(null);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error saving student');
    }
  };

  // ==========================================
  // COURSE SUBMIT
  // ==========================================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: courseForm.title,
        code: courseForm.code,
        category: courseForm.category,
        duration: courseForm.duration,
        description: courseForm.description,
        learningOutcomes: courseForm.learningOutcomes
          .filter((t) => t.trim().length > 0)
          .map((title, i) => ({ id: `oc-${Date.now()}-${i}`, title: title.trim(), order: i + 1 })),
        defaultTemplateId: courseForm.defaultTemplateId,
        gradingMethod: courseForm.gradingMethod,
        passingPercentage: Number(courseForm.passingPercentage) || 50,
        assessmentParameters: courseForm.assessmentParameters,
      };

      if (editingCourse) {
        await api.updateCourse(editingCourse.id, payload);
        showNotification('success', `Updated course ${courseForm.code} with ${courseForm.assessmentParameters.length} assessment parameters`);
      } else {
        await api.createCourse(payload);
        showNotification('success', `Created course ${courseForm.code} with ${courseForm.assessmentParameters.length} assessment parameters`);
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error saving course');
    }
  };

  // ==========================================
  // ENROLLMENT SUBMIT
  // ==========================================
  const handleSaveEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (enrollmentMode === 'quick_register') {
        await api.createEnrollment({
          courseId: enrollForm.courseId,
          enrollmentDate: enrollForm.enrollmentDate,
          registerStudent: {
            fullName: enrollForm.fullName,
            fatherName: enrollForm.fatherName,
            phoneNumber: enrollForm.phoneNumber,
            email: enrollForm.email,
          },
        });
        showNotification('success', `Registered and enrolled ${enrollForm.fullName}`);
      } else {
        await api.createEnrollment({
          studentId: enrollForm.studentId,
          courseId: enrollForm.courseId,
          enrollmentDate: enrollForm.enrollmentDate,
        });
        showNotification('success', 'Student enrolled successfully');
      }
      setEnrollmentModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error creating enrollment');
    }
  };

  // ==========================================
  // UPDATE MARKS SUBMIT
  // ==========================================
  const handleSaveMarks = async () => {
    if (!selectedEnrollmentForMarks) return;
    try {
      await api.updateEnrollmentMarks(selectedEnrollmentForMarks.id, {
        marks: marksInput,
        status: 'completed',
        completionDate: new Date().toISOString().split('T')[0],
      });
      showNotification('success', 'Assessment marks updated and grades computed.');
      setMarksModalOpen(false);
      setSelectedEnrollmentForMarks(null);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error saving marks');
    }
  };

  // Filtered Certificates
  const filteredCertificates = certificates.filter((c) => {
    const matchesStatus = certStatusFilter === 'all' || c.status === certStatusFilter;
    const matchesSearch =
      !certSearch ||
      c.serialNumber.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.snapshot.student.fullName.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.snapshot.course.title.toLowerCase().includes(certSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : feedbackMessage.type === 'info'
              ? 'bg-sky-50 text-sky-900 border-sky-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : feedbackMessage.type === 'info' ? (
            <FileCheck className="w-4 h-4 text-sky-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Admin Shell Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-emerald-500/50 p-0.5 overflow-hidden shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
              <img src="/logo.png" alt="Tech For You Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white">Tech For You Registrar Administration</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                  SECURE PORTAL
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('database')}
                  className={`text-[10.5px] font-bold tracking-wide px-2 py-0.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    dbStatus?.connected && dbStatus?.mode === 'mongodb'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900'
                      : 'bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Click to configure or view MongoDB status"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dbStatus?.connected && dbStatus?.mode === 'mongodb'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>{dbStatus?.connected && dbStatus?.mode === 'mongodb' ? 'MongoDB Atlas' : 'Local File DB'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as Superadmin · System Date: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('issue');
                setWizardStep(1);
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Issue Certificate</span>
            </button>
            <button
              onClick={loadAllData}
              title="Refresh Data"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
            >
              Public Site →
            </button>
          </div>
        </div>
      </div>

      {/* Subnav Tabs Bar */}
      <div className="bg-white border-b border-slate-200 shadow-2xs overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'issue', label: 'Issue Wizard', icon: Award },
            { id: 'certificates', label: 'Certificates', icon: FileCheck },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'courses', label: 'Courses', icon: BookOpen },
            { id: 'enrollments', label: 'Enrollments', icon: GraduationCap },
            { id: 'grading', label: 'Grading Engine', icon: Sliders },
            { id: 'templates', label: 'Templates', icon: Palette },
            { id: 'settings', label: 'Institute Settings', icon: Settings },
            { id: 'audit', label: 'Audit Trail', icon: History },
            { id: 'database', label: 'MongoDB & Database', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Students
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalStudents ?? students.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Active candidates</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Courses
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalCourses ?? courses.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Certified syllabi</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Enrollments
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalEnrollments ?? enrollments.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Academic records</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                  Issued Certs
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-1">
                  {stats?.validCertificates ?? certificates.filter((c) => c.status === 'VALID').length}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Valid & verified</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                  Pending Certs
                </div>
                <div className="text-2xl font-bold text-amber-800 mt-1">
                  {stats?.pendingCertificates ?? 0}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">Eligible to issue</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">
                  Revoked
                </div>
                <div className="text-2xl font-bold text-rose-800 mt-1">
                  {stats?.revokedCertificates ?? certificates.filter((c) => c.status === 'REVOKED').length}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">Invalidated records</div>
              </div>
            </div>

            {/* Middle Section: Grade Distribution & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Grade Distribution Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Grade Distribution Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-400">Issued Cohorts</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {['A+', 'A', 'B', 'C', 'D'].map((grade) => {
                    const count = stats?.gradeDistribution?.[grade] || 0;
                    const total = certificates.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={grade} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">Grade {grade}</span>
                          <span className="text-slate-500 font-mono">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quick Administration Actions
                </h3>
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('issue');
                      setWizardStep(1);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">Issue New Certificate</div>
                      <div className="text-[11px] text-slate-500">Run guided 5-step issuance wizard</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                  </button>

                  <button
                    onClick={() => {
                      setStudentForm({
                        fullName: '',
                        fatherName: '',
                        phoneNumber: '',
                        email: '',
                        cnicOrNationalId: '',
                        address: '',
                        studentIdNumber: '',
                      });
                      setEditingStudent(null);
                      setStudentModalOpen(true);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">Register New Student</div>
                      <div className="text-[11px] text-slate-500">Add candidate with unique student ID</div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>

                  <button
                    onClick={() => {
                      setEnrollForm({
                        studentId: '',
                        courseId: '',
                        enrollmentDate: new Date().toISOString().split('T')[0],
                        fullName: '',
                        fatherName: '',
                        phoneNumber: '',
                        email: '',
                      });
                      setEnrollmentMode('quick_register');
                      setEnrollmentModalOpen(true);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">Quick Register & Enroll</div>
                      <div className="text-[11px] text-slate-500">1-step candidate registration and course enrollment</div>
                    </div>
                    <GraduationCap className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Recent Audit Stream */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Activity Audit
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-[11px] text-amber-700 hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Issued Certificates Table */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recently Issued & Validated Certificates
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any certificate to preview Front/Back or test revocation workflows.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  View All Certificates ({certificates.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Serial No</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {certificates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No certificates issued yet. Register a student and click "Issue Certificate" to generate an official credential.
                        </td>
                      </tr>
                    ) : (
                      certificates.slice(0, 5).map((cert) => (
                        <tr key={cert.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{cert.serialNumber}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{cert.snapshot.student.fullName}</td>
                          <td className="py-2.5 px-3">{cert.snapshot.course.title}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800">
                            {cert.snapshot.grading.grade} ({cert.snapshot.grading.result})
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cert.status === 'VALID'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {cert.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPreviewCert(cert)}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                                title="View Front & Back"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {cert.status === 'VALID' && (
                                <button
                                  onClick={() => setRevokingCert(cert)}
                                  className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                                  title="Revoke Certificate"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeletingCert(cert)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                                title="Delete Certificate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GUIDED CERTIFICATE ISSUANCE WIZARD */}
        {/* ========================================================= */}
        {activeTab === 'issue' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Wizard Steps Indicator */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                {[
                  { step: 1, label: '1. Candidate & Course' },
                  { step: 2, label: '2. Marks & Grades' },
                  { step: 3, label: '3. Outcomes' },
                  { step: 4, label: '4. Template' },
                  { step: 5, label: '5. Preview & Issue' },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => {
                      if (s.step < wizardStep) setWizardStep(s.step);
                    }}
                    className={`text-xs font-semibold pb-1 transition-colors ${
                      wizardStep === s.step
                        ? 'text-amber-800 border-b-2 border-amber-600 font-bold'
                        : wizardStep > s.step
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* STEP 1: Candidate & Course Selection */}
              {wizardStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <h3 className="text-base font-bold text-slate-900">
                    Step 1: Select Candidate & Enrolled Course
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Select Candidate Student
                      </label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      >
                        <option value="">-- Choose Candidate --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.studentIdNumber}) — Father: {s.fatherName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Select Course Program
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!selectedStudentId || !selectedCourseId}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>Proceed to Assessment Marks</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Marks & Grading */}
              {wizardStep === 2 && (() => {
                const curCourse = courses.find((c) => c.id === selectedCourseId);
                const activeParams = (curCourse?.assessmentParameters && curCourse.assessmentParameters.length > 0)
                  ? curCourse.assessmentParameters
                  : (gradingConfig?.parameters || []);
                const activeMethod = curCourse?.gradingMethod || gradingConfig?.method || 'total';
                const activePassing = curCourse?.passingPercentage ?? gradingConfig?.passingPercentage ?? 50;

                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Step 2: Enter & Review Assessment Marks
                        </h3>
                        <p className="text-xs text-slate-500">
                          Course: <strong>{curCourse?.title}</strong> · Scheme: {activeMethod === 'weighted' ? 'Weighted Grading' : 'Total Marks-based'} · Minimum passing requirement: {activePassing}%
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveWizardMarksToEnrollment}
                        className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Save Marks to Enrollment</span>
                      </button>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {activeParams.map((param) => {
                        const val = wizardMarks[param.id] ?? 0;
                        return (
                          <div key={param.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">{param.name}</span>
                              <span className="text-slate-400 ml-2">
                                (Max: {param.maxMarks} marks{activeMethod === 'weighted' ? `, Weight: ${param.weightage}%` : ''})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={param.maxMarks}
                                value={val}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value) || 0;
                                  setWizardMarks((prev) => ({ ...prev, [param.id]: Math.min(param.maxMarks, Math.max(0, parsed)) }));
                                }}
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 text-right focus:bg-white focus:outline-none"
                              />
                              <span className="text-slate-500">/ {param.maxMarks}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculated Live Feedback */}
                    {wizardCalculations && (
                      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 text-xs ${wizardCalculations.isPassed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] font-semibold">Total Marks</div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {wizardCalculations.totalObtainedMarks} / {wizardCalculations.totalMaxMarks}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] font-semibold">Calculated Percentage</div>
                          <div className={`font-mono font-bold text-sm ${wizardCalculations.isPassed ? 'text-emerald-800' : 'text-rose-800'}`}>
                            {wizardCalculations.overallPercentage}%
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] font-semibold">Grade Awarded</div>
                          <div className={`font-bold text-sm ${wizardCalculations.isPassed ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {wizardCalculations.grade}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] font-semibold">Result Label</div>
                          <div className="font-semibold text-slate-800">
                            {wizardCalculations.result}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] font-semibold">Candidate Status</div>
                          <div className={`font-bold ${wizardCalculations.isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {wizardCalculations.isPassed ? 'ELIGIBLE (PASSED)' : 'INELIGIBLE FOR CERTIFICATE'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notice for Ineligible Candidates */}
                    {wizardCalculations && !wizardCalculations.isPassed && (
                      <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-rose-800">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Candidate is Ineligible for Certificate ({wizardCalculations.overallPercentage}% &lt; {wizardCalculations.passingPercentage}%)</span>
                        </div>
                        <p className="text-[11px] text-rose-800 leading-snug">
                          The candidate has not met the passing criteria. You can still proceed: an <strong>Official Academic Transcript will be issued with institutional stamp</strong>, and the Certificate front will state <em>'Candidate is not eligible for certificate'</em>.
                        </p>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className={`px-6 py-2.5 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 ${
                          wizardCalculations?.isPassed
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
                        }`}
                      >
                        <span>
                          {wizardCalculations?.isPassed
                            ? 'Proceed to Learning Outcomes'
                            : 'Proceed with Ineligible Candidate (Issue Transcript with Stamp)'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-amber-300" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 3: Curricular Learning Outcomes */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Step 3: Review Verified Learning Outcomes
                    </h3>
                    <p className="text-xs text-slate-500">
                      These learning outcomes will be printed onto the official reverse transcript of the certificate.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {wizardOutcomes.map((outcome, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500 w-6">
                          0{idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={outcome}
                          onChange={(e) => {
                            const newOutcomes = [...wizardOutcomes];
                            newOutcomes[idx] = e.target.value;
                            setWizardOutcomes(newOutcomes);
                          }}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setWizardOutcomes(wizardOutcomes.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setWizardOutcomes([...wizardOutcomes, ''])}
                      className="mt-2 text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Outcome
                    </button>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2"
                    >
                      <span>Proceed to Template Selection</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Template & Issue Date */}
              {wizardStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <h3 className="text-base font-bold text-slate-900">
                    Step 4: Select Certificate Template & Issue Date
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        onClick={() => setWizardTemplateId(tmpl.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          wizardTemplateId === tmpl.id
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">{tmpl.name}</span>
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300"
                            style={{ backgroundColor: tmpl.accentColor }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{tmpl.description}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Conferral Issue Date
                    </label>
                    <input
                      type="date"
                      value={wizardIssueDate}
                      onChange={(e) => setWizardIssueDate(e.target.value)}
                      className="w-full sm:w-64 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(5)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2"
                    >
                      <span>Final Review & Live Preview</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Live Front/Back Preview & Explicit Issuance */}
              {wizardStep === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Step 5: Official Review & Concurrence
                      </h3>
                      <p className="text-xs text-slate-500">
                        Verify all snapshot parameters before permanent cryptographic ledger recording.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isIssuing}
                      onClick={handleIssueCertificateSubmit}
                      className={`px-6 py-2.5 ${wizardCalculations?.isPassed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-700 hover:bg-rose-600'} text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50`}
                    >
                      <Award className="w-4 h-4" />
                      <span>
                        {isIssuing
                          ? 'Issuing Record...'
                          : wizardCalculations?.isPassed
                          ? 'Confirm & Issue Official Certificate'
                          : 'Confirm & Issue Stamped Academic Transcript'}
                      </span>
                    </button>
                  </div>

                  {/* Summary Bar */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Candidate: </span>
                      <span className="font-bold text-slate-900">
                        {students.find((s) => s.id === selectedStudentId)?.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Course: </span>
                      <span className="font-bold text-slate-900">
                        {courses.find((c) => c.id === selectedCourseId)?.title}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Final Grade: </span>
                      <span className="font-bold text-amber-800">
                        {wizardCalculations?.grade} ({wizardCalculations?.overallPercentage}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Issue Date: </span>
                      <span className="font-bold text-slate-900">{wizardIssueDate}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      ← Back to Template Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CERTIFICATES MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Official Certificate Ledger</h2>
                <p className="text-xs text-slate-500">
                  {certificates.length} total issued credentials in immutable database records.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    placeholder="Search serial, candidate, course..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <select
                  value={certStatusFilter}
                  onChange={(e) => setCertStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="VALID">Valid Only</option>
                  <option value="REVOKED">Revoked Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Grade & Result</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No issued certificates found. Use the "Issue Certificate" tab to create your first certificate.
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{cert.serialNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{cert.snapshot.student.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">{cert.snapshot.student.fatherName}</td>
                        <td className="py-3 px-4 max-w-xs truncate">{cert.snapshot.course.title}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-800">{cert.snapshot.grading.grade}</span> ({cert.snapshot.grading.result})
                        </td>
                        <td className="py-3 px-4 font-mono">{cert.issueDate}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cert.status === 'VALID'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {cert.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewCert(cert)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            {cert.status === 'VALID' && (
                              <button
                                onClick={() => setRevokingCert(cert)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Revoke</span>
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingCert(cert)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold rounded border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Delete Certificate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: STUDENTS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registered Students Directory</h2>
                <p className="text-xs text-slate-500">Manage candidate profiles, phone records, and enrollments.</p>
              </div>
              <button
                onClick={() => {
                  setStudentForm({
                    fullName: '',
                    fatherName: '',
                    phoneNumber: '',
                    email: '',
                    cnicOrNationalId: '',
                    address: '',
                    studentIdNumber: '',
                  });
                  setEditingStudent(null);
                  setStudentModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Student</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Enrollments</th>
                    <th className="py-3 px-4">Certificates</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No students registered yet. Click "Add Student" or "Quick Register & Enroll" to add candidates.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.studentIdNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4">{s.fatherName}</td>
                        <td className="py-3 px-4 font-mono">{s.phoneNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{s.email || '—'}</td>
                        <td className="py-3 px-4 font-semibold">{s.enrollmentCount ?? 0} enrolled</td>
                        <td className="py-3 px-4 font-semibold text-emerald-800">{s.certificateCount ?? 0} issued</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStudent(s);
                              setStudentForm({
                                fullName: s.fullName,
                                fatherName: s.fatherName,
                                phoneNumber: s.phoneNumber,
                                email: s.email || '',
                                cnicOrNationalId: s.cnicOrNationalId || '',
                                address: s.address || '',
                                studentIdNumber: s.studentIdNumber,
                              });
                              setStudentModalOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Archive student ${s.fullName}?`)) {
                                await api.deleteStudent(s.id);
                                loadAllData();
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Archive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: COURSES MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Institute Course Catalog</h2>
                <p className="text-xs text-slate-500">Define course codes, categories, duration, and dynamic outcomes.</p>
              </div>
              <button
                onClick={() => {
                  setCourseForm({
                    title: '',
                    code: '',
                    category: 'Software Engineering',
                    duration: '6 Months (480 Academic Hours)',
                    description: '',
                    learningOutcomes: ['', ''],
                    defaultTemplateId: 'tmpl-web-development',
                    gradingMethod: 'total',
                    passingPercentage: 50,
                    assessmentParameters: defaultWebDevParams,
                  });
                  setEditingCourse(null);
                  setCourseModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add New Course</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((c) => (
                <div key={c.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200">
                      {c.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{c.duration}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-600">{c.description}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Scheme: <strong>{c.gradingMethod === 'weighted' ? 'Weighted' : 'Total Marks'}</strong> (Pass: {c.passingPercentage ?? 50}%)</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {(c.assessmentParameters && c.assessmentParameters.length > 0) ? c.assessmentParameters.length : defaultWebDevParams.length} Parameters
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-100 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Learning Outcomes ({c.learningOutcomes?.length || 0}):
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {c.learningOutcomes?.slice(0, 3).map((o, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{o.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {c.enrollmentsCount ?? 0} Enrolled · {c.certificatesCount ?? 0} Certified
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCourse(c);
                          setCourseForm({
                            title: c.title,
                            code: c.code,
                            category: c.category,
                            duration: c.duration,
                            description: c.description,
                            learningOutcomes: c.learningOutcomes?.map((o) => o.title) || [],
                            defaultTemplateId: c.defaultTemplateId || 'tmpl-web-development',
                            gradingMethod: c.gradingMethod || 'total',
                            passingPercentage: c.passingPercentage ?? 50,
                            assessmentParameters: (c.assessmentParameters && c.assessmentParameters.length > 0)
                              ? c.assessmentParameters.map((p) => ({ ...p }))
                              : defaultWebDevParams,
                          });
                          setCourseModalOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Course & Grading</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: ENROLLMENTS & MARKS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Student Course Enrollments & Marks</h2>
                <p className="text-xs text-slate-500">Record assessment scores and trigger certificate eligibility.</p>
              </div>

              <button
                onClick={() => {
                  setEnrollForm({
                    studentId: '',
                    courseId: '',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    fullName: '',
                    fatherName: '',
                    phoneNumber: '',
                    email: '',
                  });
                  setEnrollmentMode('existing');
                  setEnrollmentModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>New Enrollment</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Enrollment Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score & Grade</th>
                    <th className="py-3 px-4">Certificate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No enrollments found. Click "New Enrollment" or "Quick Register & Enroll" to enroll students.
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{e.student?.fullName || 'Student'}</div>
                          <div className="text-[10px] text-slate-400">{e.student?.studentIdNumber}</div>
                        </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{e.course?.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{e.course?.code}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{e.enrollmentDate}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {e.calculatedPercentage !== undefined ? (
                          <span className="font-bold text-amber-800">
                            {e.calculatedPercentage}% ({e.calculatedGrade})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No marks recorded</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {e.certificate ? (
                          <span className="font-mono text-emerald-700 font-semibold">{e.certificate.serialNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not issued</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedEnrollmentForMarks(e);
                              setMarksInput(e.marks || {});
                              setMarksModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px]"
                          >
                            Update Marks
                          </button>
                          {!e.certificateId && e.status === 'completed' && (
                            <button
                              onClick={() => {
                                setSelectedStudentId(e.studentId);
                                setSelectedCourseId(e.courseId);
                                setWizardMarks(e.marks || {});
                                setActiveTab('issue');
                                setWizardStep(2);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px]"
                            >
                              Issue Cert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: GRADING ENGINE & WEIGHTAGE */}
        {/* ========================================================= */}
        {activeTab === 'grading' && gradingConfig && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Configurable Grading System & Weightage</h2>
                  <p className="text-xs text-slate-500">
                    Control assessment parameters, weightage balances, and grade classification rules without code edits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.updateGradingConfig(gradingConfig);
                      showNotification('success', 'Grading configuration saved successfully.');
                      loadAllData();
                    } catch (err: any) {
                      showNotification('error', err.message || 'Error updating configuration.');
                    }
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Save Grading Rules
                </button>
              </div>

              {/* Mode Toggle & Passing Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Grading Calculation Method
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGradingConfig({ ...gradingConfig, method: 'weighted' })}
                      className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        gradingConfig.method === 'weighted'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      Weighted Percentage (Weights sum to 100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradingConfig({ ...gradingConfig, method: 'total' })}
                      className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        gradingConfig.method === 'total'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      Total Marks Ratio
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Minimum Pass Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={gradingConfig.passingPercentage}
                    onChange={(e) =>
                      setGradingConfig({ ...gradingConfig, passingPercentage: parseFloat(e.target.value) || 50 })
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Assessment Parameters List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Assessment Parameters
                  </h3>
                  {gradingConfig.method === 'weighted' && (
                    <span
                      className={`text-xs font-semibold ${
                        Math.abs(
                          gradingConfig.parameters.reduce((s, p) => s + (p.weightage || 0), 0) - 100
                        ) < 0.1
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-bold'
                      }`}
                    >
                      Total Weights:{' '}
                      {gradingConfig.parameters.reduce((s, p) => s + (p.weightage || 0), 0)}% (Must equal 100%)
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {gradingConfig.parameters.map((param, i) => (
                    <div
                      key={param.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => {
                          const newParams = [...gradingConfig.parameters];
                          newParams[i].name = e.target.value;
                          setGradingConfig({ ...gradingConfig, parameters: newParams });
                        }}
                        className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1 min-w-[200px]"
                      />

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Max Marks:</span>
                          <input
                            type="number"
                            value={param.maxMarks}
                            onChange={(e) => {
                              const newParams = [...gradingConfig.parameters];
                              newParams[i].maxMarks = parseFloat(e.target.value) || 0;
                              setGradingConfig({ ...gradingConfig, parameters: newParams });
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-right font-mono"
                          />
                        </div>

                        {gradingConfig.method === 'weighted' && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Weight:</span>
                            <input
                              type="number"
                              value={param.weightage}
                              onChange={(e) => {
                                const newParams = [...gradingConfig.parameters];
                                newParams[i].weightage = parseFloat(e.target.value) || 0;
                                setGradingConfig({ ...gradingConfig, parameters: newParams });
                              }}
                              className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-right font-mono font-bold"
                            />
                            <span>%</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const newParams = gradingConfig.parameters.filter((_, idx) => idx !== i);
                            setGradingConfig({ ...gradingConfig, parameters: newParams });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newP = {
                        id: `param-${Date.now()}`,
                        name: 'New Assessment Parameter',
                        maxMarks: 100,
                        weightage: 10,
                        isRequired: true,
                      };
                      setGradingConfig({ ...gradingConfig, parameters: [...gradingConfig.parameters, newP] });
                    }}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Assessment Parameter</span>
                  </button>
                </div>
              </div>

              {/* Grading Rules Table */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Grade Thresholds & Result Classifications
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Min %</th>
                        <th className="py-2 px-3">Grade</th>
                        <th className="py-2 px-3">Result Label</th>
                        <th className="py-2 px-3">Pass Standing</th>
                        <th className="py-2 px-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {gradingConfig.rules.map((rule, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={rule.minPercentage}
                              onChange={(e) => {
                                const newRules = [...gradingConfig.rules];
                                newRules[idx].minPercentage = parseFloat(e.target.value) || 0;
                                setGradingConfig({ ...gradingConfig, rules: newRules });
                              }}
                              className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono"
                            />
                            %
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={rule.grade}
                              onChange={(e) => {
                                const newRules = [...gradingConfig.rules];
                                newRules[idx].grade = e.target.value;
                                setGradingConfig({ ...gradingConfig, rules: newRules });
                              }}
                              className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-bold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={rule.resultLabel}
                              onChange={(e) => {
                                const newRules = [...gradingConfig.rules];
                                newRules[idx].resultLabel = e.target.value;
                                setGradingConfig({ ...gradingConfig, rules: newRules });
                              }}
                              className="w-48 px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={rule.isPassing}
                              onChange={(e) => {
                                const newRules = [...gradingConfig.rules];
                                newRules[idx].isPassing = e.target.checked;
                                setGradingConfig({ ...gradingConfig, rules: newRules });
                              }}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const newRules = gradingConfig.rules.filter((_, i) => i !== idx);
                                setGradingConfig({ ...gradingConfig, rules: newRules });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newRule = { minPercentage: 40, grade: 'E', resultLabel: 'Conditional Pass', isPassing: true };
                    setGradingConfig({ ...gradingConfig, rules: [...gradingConfig.rules, newRule] });
                  }}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Grade Rule</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: TEMPLATES & DESIGNER */}
        {/* ========================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Certificate Designer & Styling</h2>
              <p className="text-xs text-slate-500">
                Configure ornamental styles, color palettes, border geometries, and field visibility toggles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900">{tmpl.name}</h3>
                      {tmpl.isDefault && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          DEFAULT
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">{tmpl.description}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Primary</div>
                        <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: tmpl.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Accent</div>
                        <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: tmpl.accentColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Border Style</div>
                        <span className="text-xs font-medium text-slate-700 capitalize">{tmpl.borderStyle}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Show Father's Name:</span>
                        <span className="font-semibold">{tmpl.showFatherName ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Show Grade on Front:</span>
                        <span className="font-semibold">{tmpl.showGradeFront ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Embossed Seal:</span>
                        <span className="font-semibold">{tmpl.showSeal ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Verification QR Code:</span>
                        <span className="font-semibold">{tmpl.showQR ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">A4 Landscape Dimension (297mm × 210mm)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: SETTINGS */}
        {/* ========================================================= */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Institute Credentials & Signatures</h2>
                  <p className="text-xs text-slate-500">
                    Manage official naming, accreditation badges, and authorized signatories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.updateSettings(settings);
                      showNotification('success', 'Institute settings saved successfully.');
                      loadAllData();
                    } catch (err: any) {
                      showNotification('error', err.message || 'Error saving settings.');
                    }
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Save Institute Settings
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Institute Name
                  </label>
                  <input
                    type="text"
                    value={settings.instituteName}
                    onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={settings.registrationNumber}
                    onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Accreditation & Standards
                  </label>
                  <input
                    type="text"
                    value={settings.accreditationDetails}
                    onChange={(e) => setSettings({ ...settings, accreditationDetails: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Course Instructor Name (Sole Signatory)
                  </label>
                  <input
                    type="text"
                    value={settings.instructorName || 'M.Moiz Raza'}
                    onChange={(e) => setSettings({ ...settings, instructorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none"
                    placeholder="M.Moiz Raza"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Official Course Instructor for Tech For You certificates.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Instructor Title
                  </label>
                  <input
                    type="text"
                    value={settings.instructorTitle || 'Course Instructor'}
                    onChange={(e) => setSettings({ ...settings, instructorTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                    placeholder="Course Instructor"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Instructor Digital Signature Text
                  </label>
                  <input
                    type="text"
                    value={settings.instructorSignatureUrl || 'M. Moiz Raza'}
                    onChange={(e) => setSettings({ ...settings, instructorSignatureUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-signature text-xl focus:bg-white focus:outline-none"
                    placeholder="M. Moiz Raza"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Certificate Serial Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.certificateSerialPrefix}
                    onChange={(e) => setSettings({ ...settings, certificateSerialPrefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Certificate Title
                  </label>
                  <input
                    type="text"
                    value={settings.certificateTitle}
                    onChange={(e) => setSettings({ ...settings, certificateTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Official Certificate Conferral Wording
                  </label>
                  <textarea
                    rows={3}
                    value={settings.certificateWording}
                    onChange={(e) => setSettings({ ...settings, certificateWording: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 10: AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Audit Trail & Security Ledger</h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all administrative certificate issuances, revocations, and configuration updates.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                        No administrative activity recorded yet. Actions will automatically appear here.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{log.actor}</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-800">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-600 uppercase">{log.entityType}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-800">{log.details}</td>
                        <td className="py-2.5 px-4 text-slate-400">{log.ipAddress || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 11: MONGODB & CLOUD DATABASE */}
        {/* ========================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Top Status Banner */}
            <div
              className={`rounded-2xl p-6 sm:p-7 border shadow-sm transition-all ${
                dbStatus?.mode === 'mongodb' && dbStatus?.connected
                  ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-emerald-500/40 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      dbStatus?.mode === 'mongodb' && dbStatus?.connected
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold">
                        {dbStatus?.mode === 'mongodb' && dbStatus?.connected
                          ? 'MongoDB Cluster Connected'
                          : 'Embedded Local File Store'}
                      </h2>
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                          dbStatus?.mode === 'mongodb' && dbStatus?.connected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dbStatus?.mode === 'mongodb' && dbStatus?.connected
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-amber-500'
                          }`}
                        />
                        {dbStatus?.mode === 'mongodb' && dbStatus?.connected ? 'ONLINE & ACTIVE' : 'FILE BACKED'}
                      </span>
                    </div>

                    <p
                      className={`text-xs ${
                        dbStatus?.mode === 'mongodb' && dbStatus?.connected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {dbStatus?.mode === 'mongodb' && dbStatus?.connected
                        ? `Live persistent MongoDB cluster. Database: "${dbStatus?.databaseName || 'tech_for_you'}"`
                        : 'Operating on embedded local JSON file storage (data/db.json). Ready to connect to MongoDB.'}
                    </p>

                    {dbStatus?.uriMasked && (
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[10.5px] font-mono text-emerald-300/80 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                          URI: {dbStatus.uriMasked}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {dbStatus?.mode === 'mongodb' && dbStatus?.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSyncMongo}
                        disabled={isSyncingDb}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDb ? 'animate-spin' : ''}`} />
                        <span>{isSyncingDb ? 'Syncing...' : 'Sync MongoDB Now'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectMongo}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('mongo-uri-field') as HTMLInputElement | null;
                        input?.focus();
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Connect MongoDB →
                    </button>
                  )}
                </div>
              </div>

              {/* Error display if any */}
              {dbStatus?.error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Last Connection Error:</div>
                    <div className="font-mono text-[11px] mt-0.5">{dbStatus.error}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Grid: Connect Form & Active Synced Counts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Connect to MongoDB Form */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-800" />
                    <span>Connect MongoDB (Atlas or Local)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste your MongoDB connection URI below. All existing certificates, student records, and courses will be preserved and migrated.
                  </p>
                </div>

                <form onSubmit={handleConnectMongo} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="mongo-uri-field"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
                    >
                      MongoDB Connection URI <span className="text-emerald-800">*</span>
                    </label>
                    <input
                      id="mongo-uri-field"
                      type="text"
                      required
                      value={mongoUriInput}
                      onChange={(e) => setMongoUriInput(e.target.value)}
                      placeholder="mongodb+srv://<username>:<password>@cluster0.xyz.mongodb.net/tech_for_you?retryWrites=true&w=majority"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Supports both <strong>MongoDB Atlas</strong> (<code className="text-slate-600">mongodb+srv://</code>) and local installations (<code className="text-slate-600">mongodb://localhost:27017</code>).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="save-to-env-check"
                      type="checkbox"
                      checked={saveToEnvChecked}
                      onChange={(e) => setSaveToEnvChecked(e.target.checked)}
                      className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="save-to-env-check"
                      className="text-xs text-slate-700 select-none cursor-pointer"
                    >
                      Save to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env</code> file (permanent auto-connect on server restart)
                    </label>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isConnectingDb}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isConnectingDb ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting & Migrating...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>Connect & Migrate Database</span>
                        </>
                      )}
                    </button>
                    {dbStatus?.mode === 'mongodb' && dbStatus?.connected && (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected & Active
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Records Synchronized Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Database Entities</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live document counts currently managed in the active storage layer.
                  </p>

                  <div className="divide-y divide-slate-100 text-xs mt-3">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600">Certificates Issued</span>
                      <span className="font-mono font-bold text-slate-900">{certificates.length}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600">Registered Students</span>
                      <span className="font-mono font-bold text-slate-900">{students.length}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600">Active Courses</span>
                      <span className="font-mono font-bold text-slate-900">{courses.length}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600">Enrollment Records</span>
                      <span className="font-mono font-bold text-slate-900">{enrollments.length}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-600">Audit Trail Events</span>
                      <span className="font-mono font-bold text-slate-900">{auditLogs.length}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Engine Type:</span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {dbStatus?.mode === 'mongodb' ? 'MongoDB Driver' : 'Embedded JSON'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick MongoDB Atlas Setup Guide */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Quick Setup Guide for MongoDB Atlas</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-600">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">1. Free Atlas Cluster</div>
                  <p className="text-[11px] text-slate-500">
                    Sign in at cloud.mongodb.com and deploy a free M0 Shared Cluster.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">2. Network Whitelist</div>
                  <p className="text-[11px] text-slate-500">
                    Under <strong>Network Access</strong>, add IP Address <code className="text-emerald-700 font-mono">0.0.0.0/0</code> (Allow Access from Anywhere).
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">3. Database User</div>
                  <p className="text-[11px] text-slate-500">
                    Under <strong>Database Access</strong>, add a user with read/write role and a secure password.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">4. Connection URI</div>
                  <p className="text-[11px] text-slate-500">
                    Click <strong>Connect → Drivers</strong>, copy your URI, replace <code className="text-emerald-700 font-mono">&lt;password&gt;</code>, and paste above or in <code className="text-slate-800 font-mono">.env</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: PREVIEW CERTIFICATE FRONT & BACK */}
      {/* ========================================================= */}
      <CertificateModal
        certificate={previewCert}
        onClose={() => setPreviewCert(null)}
        onDelete={(cert) => setDeletingCert(cert)}
      />

      {/* ========================================================= */}
      {/* MODAL: REVOKE CERTIFICATE (WITH MANDATORY REASON) */}
      {/* ========================================================= */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-rose-950">Revoke Official Certificate</h3>
                <p className="text-xs text-rose-800 font-mono">{revokingCert.serialNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Revoking this certificate permanently marks it as invalidated on the public verification portal. This action is audited with your administrator identity.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Mandatory Reason for Revocation <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={revocationReasonInput}
                onChange={(e) => setRevocationReasonInput(e.target.value)}
                placeholder="e.g. Discrepancy discovered during academic council portfolio audit..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRevokingCert(null);
                  setRevocationReasonInput('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevocation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CERTIFICATE CONFIRMATION */}
      {/* ========================================================= */}
      {deletingCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-950">Delete Certificate Record</h3>
                <p className="text-xs text-rose-800 font-mono">{deletingCert.serialNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete certificate <strong>{deletingCert.serialNumber}</strong> for candidate <strong>{deletingCert.snapshot.student.fullName}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11.5px] text-amber-900 leading-snug">
              <strong>Notice:</strong> This action permanently removes the certificate and marksheet from the database and registry. Linked student enrollment records will be unlocked for re-evaluation.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingCert}
                onClick={() => setDeletingCert(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCert}
                onClick={handleConfirmDeleteCert}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingCert ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingCert ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT STUDENT */}
      {/* ========================================================= */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingStudent ? 'Edit Student Details' : 'Register New Student'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Father's Name *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.fatherName}
                    onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.phoneNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Email Address</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Student ID # (Auto if empty)</label>
                  <input
                    type="text"
                    value={studentForm.studentIdNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, studentIdNumber: e.target.value })}
                    placeholder="e.g. TFY-STU-2026-1042"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">National ID / CNIC</label>
                  <input
                    type="text"
                    value={studentForm.cnicOrNationalId}
                    onChange={(e) => setStudentForm({ ...studentForm, cnicOrNationalId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Residential Address</label>
                <input
                  type="text"
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {editingStudent ? 'Save Changes' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT COURSE */}
      {/* ========================================================= */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingCourse ? 'Edit Course Curricular Standard' : 'Add New Course'}
            </h3>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="e.g. FS-101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Category</label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Duration</label>
                  <input
                    type="text"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    placeholder="e.g. 6 Months (480 Hours)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Course Description</label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              {/* Dynamic Outcomes */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 uppercase tracking-wide">
                  Curricular Learning Outcomes
                </label>
                {courseForm.learningOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 font-bold w-5">0{idx + 1}.</span>
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) => {
                        const newO = [...courseForm.learningOutcomes];
                        newO[idx] = e.target.value;
                        setCourseForm({ ...courseForm, learningOutcomes: newO });
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCourseForm({
                          ...courseForm,
                          learningOutcomes: courseForm.learningOutcomes.filter((_, i) => i !== idx),
                        });
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCourseForm({ ...courseForm, learningOutcomes: [...courseForm.learningOutcomes, ''] })}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Outcome
                </button>
              </div>

              {/* Dynamic Course Assessment & Grading Parameters */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 uppercase tracking-wide">
                      Course Assessment & Grading Parameters
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Configure custom grading parameters for this specific course. These parameters will be used when entering student marks and printing transcripts.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCourseForm({
                        ...courseForm,
                        gradingMethod: 'total',
                        passingPercentage: 50,
                        assessmentParameters: defaultWebDevParams,
                      });
                    }}
                    className="self-start sm:self-auto px-2.5 py-1 text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                  >
                    Reset to Standard
                  </button>
                </div>

                {/* Scheme & Pass Threshold */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Grading Method
                    </label>
                    <select
                      value={courseForm.gradingMethod}
                      onChange={(e) => setCourseForm({ ...courseForm, gradingMethod: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none"
                    >
                      <option value="total">Total Marks Aggregate</option>
                      <option value="weighted">Weighted Percentage Scheme</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Minimum Passing Threshold (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={courseForm.passingPercentage}
                        onChange={(e) => setCourseForm({ ...courseForm, passingPercentage: parseFloat(e.target.value) || 50 })}
                        className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none"
                      />
                      <span className="text-slate-500 font-medium">% required to pass</span>
                    </div>
                  </div>
                </div>

                {/* Parameters List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                    <span>Assessment Parameter</span>
                    <span className="text-right">Max Marks {courseForm.gradingMethod === 'weighted' ? '& Weight %' : ''}</span>
                  </div>

                  {courseForm.assessmentParameters.map((param, pIdx) => (
                    <div key={param.id || pIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-mono text-slate-400 font-bold text-xs w-5">#{pIdx + 1}</span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Theory Exam, Practical Project..."
                          value={param.name}
                          onChange={(e) => {
                            const newP = [...courseForm.assessmentParameters];
                            newP[pIdx] = { ...newP[pIdx], name: e.target.value };
                            setCourseForm({ ...courseForm, assessmentParameters: newP });
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                        />
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[11px]">Max:</span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={param.maxMarks}
                            onChange={(e) => {
                              const newP = [...courseForm.assessmentParameters];
                              newP[pIdx] = { ...newP[pIdx], maxMarks: parseFloat(e.target.value) || 100 };
                              setCourseForm({ ...courseForm, assessmentParameters: newP });
                            }}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-right"
                          />
                        </div>

                        {courseForm.gradingMethod === 'weighted' && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[11px]">Weight:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={param.weightage}
                              onChange={(e) => {
                                const newP = [...courseForm.assessmentParameters];
                                newP[pIdx] = { ...newP[pIdx], weightage: parseFloat(e.target.value) || 0 };
                                setCourseForm({ ...courseForm, assessmentParameters: newP });
                              }}
                              className="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-right"
                            />
                            <span className="text-slate-500 text-[11px]">%</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCourseForm({
                              ...courseForm,
                              assessmentParameters: courseForm.assessmentParameters.filter((_, i) => i !== pIdx),
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Parameter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newParam: AssessmentParameter = {
                        id: `param-${Date.now()}-${courseForm.assessmentParameters.length}`,
                        name: '',
                        maxMarks: 100,
                        weightage: 25,
                        isRequired: true,
                      };
                      setCourseForm({
                        ...courseForm,
                        assessmentParameters: [...courseForm.assessmentParameters, newParam],
                      });
                    }}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Assessment Parameter</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW ENROLLMENT */}
      {/* ========================================================= */}
      {enrollmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Student Course Enrollment</h3>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEnrollmentMode('existing')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  enrollmentMode === 'existing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Enroll Existing Student
              </button>
              <button
                type="button"
                onClick={() => setEnrollmentMode('quick_register')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  enrollmentMode === 'quick_register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Quick Register & Enroll
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment} className="space-y-4 text-xs">
              {enrollmentMode === 'existing' ? (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Select Existing Student
                  </label>
                  <select
                    required
                    value={enrollForm.studentId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.studentIdNumber})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Candidate Full Name *</label>
                    <input
                      type="text"
                      required
                      value={enrollForm.fullName}
                      onChange={(e) => setEnrollForm({ ...enrollForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Father's Name *</label>
                    <input
                      type="text"
                      required
                      value={enrollForm.fatherName}
                      onChange={(e) => setEnrollForm({ ...enrollForm, fatherName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Registered Phone *</label>
                    <input
                      type="text"
                      required
                      value={enrollForm.phoneNumber}
                      onChange={(e) => setEnrollForm({ ...enrollForm, phoneNumber: e.target.value })}
                      placeholder="+92 300 1234567"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Course Program</label>
                <select
                  required
                  value={enrollForm.courseId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">Enrollment Date</label>
                <input
                  type="date"
                  value={enrollForm.enrollmentDate}
                  onChange={(e) => setEnrollForm({ ...enrollForm, enrollmentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollmentModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPDATE ASSESSMENT MARKS */}
      {/* ========================================================= */}
      {marksModalOpen && selectedEnrollmentForMarks && gradingConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Update Assessment Marks & Final Standing
              </h3>
              <p className="text-xs text-slate-500">
                {selectedEnrollmentForMarks.student?.fullName} · {selectedEnrollmentForMarks.course?.title}
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              {(() => {
                const curCourse = courses.find((c) => c.id === selectedEnrollmentForMarks.courseId) || selectedEnrollmentForMarks.course;
                const modalParams = (curCourse?.assessmentParameters && curCourse.assessmentParameters.length > 0)
                  ? curCourse.assessmentParameters
                  : (gradingConfig?.parameters || []);
                const modalMethod = curCourse?.gradingMethod || gradingConfig?.method || 'total';

                return modalParams.map((param) => (
                  <div key={param.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900">{param.name}</span>
                      <span className="text-slate-400 ml-1">
                        (Max: {param.maxMarks}{modalMethod === 'weighted' ? `, Weight: ${param.weightage}%` : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={param.maxMarks}
                        value={marksInput[param.id] ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setMarksInput({ ...marksInput, [param.id]: val });
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right"
                      />
                      <span className="text-slate-500">/ {param.maxMarks}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMarksModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Compute & Save Marks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
