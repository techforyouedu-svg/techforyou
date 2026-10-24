export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'superadmin' | 'admin' | 'instructor';
  createdAt: string;
  lastLogin?: string;
}

export interface Student {
  id: string;
  studentIdNumber: string; // e.g. STU-2026-1042
  fullName: string;
  fatherName: string;
  phoneNumber: string; // e.g. +92 300 1234567
  email?: string;
  cnicOrNationalId?: string;
  address?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CourseOutcome {
  id: string;
  title: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  code: string; // e.g. FS-101
  category: string;
  duration: string; // e.g. 6 Months (480 Hours)
  description: string;
  learningOutcomes: CourseOutcome[];
  status: 'active' | 'archived';
  defaultTemplateId?: string;
  gradingMethod?: 'total' | 'weighted';
  passingPercentage?: number;
  assessmentParameters?: AssessmentParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentParameter {
  id: string;
  name: string;
  maxMarks: number;
  weightage: number; // percentage (e.g. 25%)
  isRequired: boolean;
  description?: string;
}

export interface GradeRule {
  minPercentage: number;
  grade: string;
  resultLabel: string;
  isPassing: boolean;
  description?: string;
}

export interface GradingConfiguration {
  id: string;
  title: string;
  method: 'total' | 'weighted';
  passingPercentage: number;
  rules: GradeRule[];
  parameters: AssessmentParameter[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  completionDate?: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  marks: Record<string, number>; // parameterId -> obtained marks
  calculatedPercentage?: number;
  calculatedGrade?: string;
  calculatedResult?: string;
  isEligibleForCertificate?: boolean;
  certificateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  themeStyle: 'imperial_gold' | 'sovereign_navy' | 'modern_minimal' | 'academic_classic' | 'cyber_emerald' | 'web_development';
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  borderStyle: 'ornate' | 'geometric' | 'minimal' | 'vintage' | 'cyber_circuit';
  showFatherName: boolean;
  showGradeFront: boolean;
  showSeal: boolean;
  showQR: boolean;
  showSignatures: boolean;
  showFloatingCodeSigns?: boolean;
  customWatermarkText?: string;
  isDefault: boolean;
}

export interface CertificateSnapshot {
  student: {
    id: string;
    fullName: string;
    fatherName: string;
    studentIdNumber: string;
    phoneMasked: string;
    email?: string;
  };
  course: {
    id: string;
    title: string;
    code: string;
    category: string;
    duration: string;
    learningOutcomes: string[];
  };
  grading: {
    method: 'total' | 'weighted';
    parameters: Array<{
      parameterId: string;
      name: string;
      maxMarks: number;
      obtainedMarks: number;
      weightage: number;
      percentage: number;
    }>;
    totalMaxMarks: number;
    totalObtainedMarks: number;
    overallPercentage: number;
    grade: string;
    result: string;
    isPassed: boolean;
    passingPercentage: number;
    rulesSnapshot: GradeRule[];
  };
  institute: {
    name: string;
    tagline: string;
    registrationNumber: string;
    accreditationDetails?: string;
    certificateTitle?: string;
    verificationInstructions?: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    instructorName?: string;
    instructorTitle?: string;
    instructorSignatureUrl?: string;
    directorName?: string;
    directorTitle?: string;
    registrarName?: string;
    registrarTitle?: string;
    sealUrl?: string;
    directorSignatureUrl?: string;
    registrarSignatureUrl?: string;
  };
  template: {
    id: string;
    name: string;
    themeStyle: string;
    primaryColor: string;
    accentColor: string;
    borderStyle: string;
    showFatherName: boolean;
    showGradeFront: boolean;
    showSeal: boolean;
    showQR: boolean;
    showSignatures: boolean;
    showFloatingCodeSigns?: boolean;
  };
  isEligibleForCertificate?: boolean;
  candidateEligibilityStatus?: 'ELIGIBLE' | 'INELIGIBLE';
}

export interface Certificate {
  id: string;
  serialNumber: string; // e.g. TFY-2026-FS-0492
  verificationId: string; // Secure unguessable UUID / random identifier
  studentId: string;
  courseId: string;
  enrollmentId: string;
  status: 'VALID' | 'REVOKED';
  isEligibleForCertificate?: boolean;
  issueDate: string; // YYYY-MM-DD
  completionDate: string;
  revocationReason?: string;
  revokedAt?: string;
  revokedBy?: string;
  issuedBy: string; // Admin email/name
  snapshot: CertificateSnapshot;
  qrCodeDataUrl: string;
  verificationUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstituteSettings {
  instituteName: string;
  tagline: string;
  registrationNumber: string;
  accreditationDetails: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instructorName: string;
  instructorTitle: string;
  instructorSignatureUrl?: string;
  directorName?: string;
  directorTitle?: string;
  directorSignatureUrl?: string;
  registrarName?: string;
  registrarTitle?: string;
  registrarSignatureUrl?: string;
  instituteSealUrl: string;
  logoUrl: string;
  certificateSerialPrefix: string;
  certificateTitle: string;
  certificateWording: string;
  verificationInstructions: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: 'certificate' | 'student' | 'course' | 'enrollment' | 'grading' | 'template' | 'settings' | 'auth';
  entityId?: string;
  details: string;
  ipAddress?: string;
}
