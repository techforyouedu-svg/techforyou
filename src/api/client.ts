import {
  AuditLog,
  Certificate,
  Course,
  Enrollment,
  GradingConfiguration,
  InstituteSettings,
  Student,
  CertificateTemplate,
} from '../types';

const TOKEN_KEY = 'tfy_admin_token';
const USER_KEY = 'tfy_admin_user';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Server communication error' }));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      clearAdminAuth();
      window.dispatchEvent(new Event('auth_expired'));
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Public
  getInstitute: () => request<{ success: boolean; data: InstituteSettings }>('/api/public/institute'),
  getCourses: () => request<{ success: boolean; data: Course[] }>('/api/public/courses'),
  searchCertificates: (payload: { fullName: string; fatherName?: string; phoneNumber?: string; courseId?: string; serialNumber?: string }) =>
    request<{ success: boolean; count: number; results: any[] }>('/api/certificates/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCertificate: (identifier: string) =>
    request<{ success: boolean; status: 'VALID' | 'REVOKED' | 'NOT_FOUND'; certificate: Certificate }>(
      `/api/certificates/verify/${encodeURIComponent(identifier)}`
    ),

  // Auth
  login: (payload: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: any; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request<{ success: boolean; user: any }>('/api/auth/me'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Dashboard
  getStats: () => request<{ success: boolean; data: any }>('/api/admin/stats'),

  // Students
  getStudents: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Student[] }>(`/api/admin/students${q ? `?${q}` : ''}`);
  },
  createStudent: (payload: Partial<Student>) =>
    request<{ success: boolean; data: Student }>('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getStudentDetails: (id: string) =>
    request<{ success: boolean; data: Student & { enrollments: Enrollment[]; certificates: Certificate[] } }>(
      `/api/admin/students/${id}`
    ),
  updateStudent: (id: string, payload: Partial<Student>) =>
    request<{ success: boolean; data: Student }>(`/api/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/students/${id}`, {
      method: 'DELETE',
    }),

  // Courses
  getAdminCourses: () => request<{ success: boolean; data: Course[] }>('/api/admin/courses'),
  createCourse: (payload: Partial<Course>) =>
    request<{ success: boolean; data: Course }>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCourse: (id: string, payload: Partial<Course>) =>
    request<{ success: boolean; data: Course }>(`/api/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCourse: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    }),

  // Enrollments
  getEnrollments: (params?: { studentId?: string; courseId?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Enrollment[] }>(`/api/admin/enrollments${q ? `?${q}` : ''}`);
  },
  createEnrollment: (payload: {
    studentId?: string;
    courseId: string;
    enrollmentDate?: string;
    registerStudent?: { fullName: string; fatherName: string; phoneNumber: string; email?: string };
  }) =>
    request<{ success: boolean; data: Enrollment }>('/api/admin/enrollments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateEnrollmentMarks: (id: string, payload: { marks: Record<string, number>; status?: string; completionDate?: string }) =>
    request<{ success: boolean; data: Enrollment }>(`/api/admin/enrollments/${id}/marks`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Grading
  getGradingConfig: () => request<{ success: boolean; data: GradingConfiguration }>('/api/admin/grading-config'),
  updateGradingConfig: (payload: Partial<GradingConfiguration>) =>
    request<{ success: boolean; data: GradingConfiguration }>('/api/admin/grading-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  testCalculateGrades: (payload: { config?: Partial<GradingConfiguration>; marks: Record<string, number>; courseId?: string }) =>
    request<{ success: boolean; data: any }>('/api/admin/grading-config/test-calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Templates
  getTemplates: () => request<{ success: boolean; data: CertificateTemplate[] }>('/api/admin/templates'),
  createTemplate: (payload: Partial<CertificateTemplate>) =>
    request<{ success: boolean; data: CertificateTemplate }>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Certificates
  getCertificates: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Certificate[] }>(`/api/admin/certificates${q ? `?${q}` : ''}`);
  },
  issueCertificate: (payload: {
    studentId: string;
    courseId: string;
    enrollmentId?: string;
    marks?: Record<string, number>;
    templateId?: string;
    issueDate?: string;
    completionDate?: string;
    customOutcomes?: string[];
  }) =>
    request<{ success: boolean; data: Certificate; message: string }>('/api/admin/certificates/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeCertificate: (id: string, revocationReason: string) =>
    request<{ success: boolean; data: Certificate; message: string }>(`/api/admin/certificates/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ revocationReason }),
    }),
  deleteCertificate: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/certificates/${id}`, {
      method: 'DELETE',
    }),

  // Settings & Logs
  getSettings: () => request<{ success: boolean; data: InstituteSettings }>('/api/admin/settings'),
  updateSettings: (payload: Partial<InstituteSettings>) =>
    request<{ success: boolean; data: InstituteSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAuditLogs: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: AuditLog[]; total: number; page: number; totalPages: number }>(
      `/api/admin/audit-logs${q ? `?${q}` : ''}`
    );
  },

  // Database & MongoDB Management
  getDatabaseStatus: () =>
    request<{ success: boolean; data: any }>('/api/admin/database/status'),
  connectDatabase: (payload: { uri: string; saveToEnv?: boolean }) =>
    request<{ success: boolean; message: string; data: any }>('/api/admin/database/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  syncDatabase: () =>
    request<{ success: boolean; message: string; data: any }>('/api/admin/database/sync', {
      method: 'POST',
    }),
  disconnectDatabase: () =>
    request<{ success: boolean; message: string; data: any }>('/api/admin/database/disconnect', {
      method: 'POST',
    }),
};
