import { Router, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { calculateEnrollmentGrades, validateGradingConfiguration } from '../gradingEngine.js';
import { Certificate, Course, Enrollment, Student } from '../types.js';

const router = Router();
router.use(requireAdmin);

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const totalStudents = db.students.filter((s) => s.status === 'active').length;
  const totalCourses = db.courses.filter((c) => c.status === 'active').length;
  const totalEnrollments = db.enrollments.length;
  const certificates = db.certificates;
  const totalCertificates = certificates.length;
  const validCertificates = certificates.filter((c) => c.status === 'VALID').length;
  const revokedCertificates = certificates.filter((c) => c.status === 'REVOKED').length;
  const pendingCertificates = db.enrollments.filter(
    (e) => e.status === 'completed' && !e.certificateId
  ).length;

  // Grade distribution
  const gradeDistribution: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
  certificates.forEach((c) => {
    const g = c.snapshot.grading.grade;
    if (gradeDistribution[g] !== undefined) {
      gradeDistribution[g] += 1;
    } else {
      gradeDistribution[g] = 1;
    }
  });

  const recentCertificates = certificates.slice(0, 5).map((c) => ({
    id: c.id,
    serialNumber: c.serialNumber,
    studentName: c.snapshot.student.fullName,
    courseTitle: c.snapshot.course.title,
    grade: c.snapshot.grading.grade,
    result: c.snapshot.grading.result,
    status: c.status,
    issueDate: c.issueDate,
  }));

  const recentActivities = db.auditLogs.slice(0, 8);

  res.json({
    success: true,
    data: {
      totalStudents,
      totalCourses,
      totalEnrollments,
      totalCertificates,
      validCertificates,
      revokedCertificates,
      pendingCertificates,
      gradeDistribution,
      recentCertificates,
      recentActivities,
    },
  });
});

// ==========================================
// 2. STUDENTS MANAGEMENT
// ==========================================
router.get('/students', (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.search as string || '').toLowerCase().trim();
  const statusFilter = req.query.status as string;

  let students = db.students;
  if (statusFilter && statusFilter !== 'all') {
    students = students.filter((s) => s.status === statusFilter);
  }

  if (query) {
    students = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query) ||
        s.fatherName.toLowerCase().includes(query) ||
        s.phoneNumber.toLowerCase().includes(query) ||
        s.studentIdNumber.toLowerCase().includes(query) ||
        (s.email && s.email.toLowerCase().includes(query))
    );
  }

  // Include enrollment count and certificate count
  const enriched = students.map((s) => {
    const sEnrollments = db.enrollments.filter((e) => e.studentId === s.id);
    const sCerts = db.certificates.filter((c) => c.studentId === s.id);
    return {
      ...s,
      enrollmentCount: sEnrollments.length,
      certificateCount: sCerts.length,
    };
  });

  res.json({ success: true, data: enriched });
});

router.post('/students', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, fatherName, phoneNumber, email, studentIdNumber, cnicOrNationalId, address } = req.body;

    if (!fullName?.trim() || !fatherName?.trim() || !phoneNumber?.trim()) {
      res.status(400).json({ success: false, message: 'Full name, father’s name, and phone number are required.' });
      return;
    }

    // Clean phone
    const cleanPhone = phoneNumber.trim();

    // Check duplicate phone or studentId
    const existingPhone = db.students.find((s) => s.phoneNumber === cleanPhone);
    if (existingPhone) {
      res.status(400).json({
        success: false,
        message: `A student with phone number "${cleanPhone}" is already registered (${existingPhone.fullName}).`,
      });
      return;
    }

    const autoIdNumber = studentIdNumber?.trim() || `TFY-STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingId = db.students.find((s) => s.studentIdNumber.toLowerCase() === autoIdNumber.toLowerCase());
    if (existingId) {
      res.status(400).json({
        success: false,
        message: `Student ID "${autoIdNumber}" is already in use.`,
      });
      return;
    }

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      studentIdNumber: autoIdNumber,
      fullName: fullName.trim(),
      fatherName: fatherName.trim(),
      phoneNumber: cleanPhone,
      email: email?.trim() || undefined,
      cnicOrNationalId: cnicOrNationalId?.trim() || undefined,
      address: address?.trim() || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.students.unshift(newStudent);
    db.persist();

    db.addAuditLog(req.user!.email, 'STUDENT_CREATED', 'student', newStudent.id, `Created student record for ${newStudent.fullName} (${newStudent.studentIdNumber})`, req.ip);

    res.status(201).json({ success: true, data: newStudent });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error creating student' });
  }
});

router.get('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  const student = db.students.find((s) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const enrollments = db.enrollments
    .filter((e) => e.studentId === student.id)
    .map((e) => {
      const course = db.courses.find((c) => c.id === e.courseId);
      const cert = e.certificateId ? db.certificates.find((c) => c.id === e.certificateId) : null;
      return {
        ...e,
        course,
        certificate: cert ? { id: cert.id, serialNumber: cert.serialNumber, status: cert.status } : null,
      };
    });

  const certificates = db.certificates.filter((c) => c.studentId === student.id);

  res.json({
    success: true,
    data: {
      ...student,
      enrollments,
      certificates,
    },
  });
});

router.put('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  const student = db.students.find((s) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const { fullName, fatherName, phoneNumber, email, cnicOrNationalId, address, status } = req.body;
  if (fullName !== undefined) student.fullName = fullName.trim();
  if (fatherName !== undefined) student.fatherName = fatherName.trim();
  if (phoneNumber !== undefined) student.phoneNumber = phoneNumber.trim();
  if (email !== undefined) student.email = email.trim();
  if (cnicOrNationalId !== undefined) student.cnicOrNationalId = cnicOrNationalId.trim();
  if (address !== undefined) student.address = address.trim();
  if (status !== undefined) student.status = status;
  student.updatedAt = new Date().toISOString();

  db.persist();
  db.addAuditLog(req.user!.email, 'STUDENT_UPDATED', 'student', student.id, `Updated details for ${student.fullName}`, req.ip);

  res.json({ success: true, data: student });
});

router.delete('/students/:id', (req: AuthenticatedRequest, res: Response) => {
  const studentIndex = db.students.findIndex((s) => s.id === req.params.id);
  if (studentIndex === -1) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const s = db.students[studentIndex];
  // Check if student has issued certificates
  const hasCerts = db.certificates.some((c) => c.studentId === s.id);
  if (hasCerts) {
    // Soft archive rather than hard delete to protect certificate verification integrity
    s.status = 'archived';
    db.persist();
    db.addAuditLog(req.user!.email, 'STUDENT_ARCHIVED', 'student', s.id, `Archived student ${s.fullName} with active certificates`, req.ip);
    res.json({ success: true, message: 'Student archived (contains active certificate records).' });
    return;
  }

  db.students.splice(studentIndex, 1);
  db.persist();
  db.addAuditLog(req.user!.email, 'STUDENT_DELETED', 'student', s.id, `Deleted student ${s.fullName}`, req.ip);
  res.json({ success: true, message: 'Student record deleted.' });
});

// ==========================================
// 3. COURSES MANAGEMENT
// ==========================================
router.get('/courses', (req: AuthenticatedRequest, res: Response) => {
  const courses = db.courses.map((c) => {
    const enrollmentsCount = db.enrollments.filter((e) => e.courseId === c.id).length;
    const certsCount = db.certificates.filter((cert) => cert.courseId === c.id).length;
    return {
      ...c,
      enrollmentsCount,
      certificatesCount: certsCount,
    };
  });
  res.json({ success: true, data: courses });
});

router.post('/courses', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, code, category, duration, description, learningOutcomes, defaultTemplateId, gradingMethod, passingPercentage, assessmentParameters } = req.body;
    if (!title?.trim() || !code?.trim()) {
      res.status(400).json({ success: false, message: 'Course title and code are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    if (db.courses.some((c) => c.code.toUpperCase() === cleanCode)) {
      res.status(400).json({ success: false, message: `Course with code "${cleanCode}" already exists.` });
      return;
    }

    const outcomes = Array.isArray(learningOutcomes)
      ? learningOutcomes.map((item: any, idx: number) => ({
          id: item.id || `oc-${Date.now()}-${idx}`,
          title: typeof item === 'string' ? item : item.title,
          order: idx + 1,
        }))
      : [];

    const parsedParameters = Array.isArray(assessmentParameters)
      ? assessmentParameters.map((p: any, idx: number) => ({
          id: p.id || `param-${Date.now()}-${idx}`,
          name: p.name?.trim() || `Assessment ${idx + 1}`,
          maxMarks: Number(p.maxMarks) > 0 ? Number(p.maxMarks) : 100,
          weightage: Number(p.weightage) >= 0 ? Number(p.weightage) : 25,
          isRequired: p.isRequired !== false,
          description: p.description?.trim() || '',
        }))
      : [];

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: title.trim(),
      code: cleanCode,
      category: category?.trim() || 'General Engineering',
      duration: duration?.trim() || '3 Months',
      description: description?.trim() || '',
      learningOutcomes: outcomes,
      status: 'active',
      defaultTemplateId: defaultTemplateId || 'tmpl-web-development',
      gradingMethod: gradingMethod === 'weighted' ? 'weighted' : 'total',
      passingPercentage: Number(passingPercentage) > 0 ? Number(passingPercentage) : 50,
      assessmentParameters: parsedParameters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.courses.unshift(newCourse);
    db.persist();
    db.addAuditLog(req.user!.email, 'COURSE_CREATED', 'course', newCourse.id, `Created course ${newCourse.code} - ${newCourse.title} with ${parsedParameters.length} assessment parameters`, req.ip);

    res.status(201).json({ success: true, data: newCourse });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error creating course' });
  }
});

router.put('/courses/:id', (req: AuthenticatedRequest, res: Response) => {
  const course = db.courses.find((c) => c.id === req.params.id);
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found.' });
    return;
  }

  const { title, code, category, duration, description, learningOutcomes, defaultTemplateId, status, gradingMethod, passingPercentage, assessmentParameters } = req.body;
  if (title !== undefined) course.title = title.trim();
  if (code !== undefined) course.code = code.trim().toUpperCase();
  if (category !== undefined) course.category = category.trim();
  if (duration !== undefined) course.duration = duration.trim();
  if (description !== undefined) course.description = description.trim();
  if (defaultTemplateId !== undefined) course.defaultTemplateId = defaultTemplateId;
  if (status !== undefined) course.status = status;
  if (gradingMethod !== undefined) course.gradingMethod = gradingMethod === 'weighted' ? 'weighted' : 'total';
  if (passingPercentage !== undefined) course.passingPercentage = Number(passingPercentage) > 0 ? Number(passingPercentage) : 50;

  if (Array.isArray(assessmentParameters)) {
    course.assessmentParameters = assessmentParameters.map((p: any, idx: number) => ({
      id: p.id || `param-${Date.now()}-${idx}`,
      name: p.name?.trim() || `Assessment ${idx + 1}`,
      maxMarks: Number(p.maxMarks) > 0 ? Number(p.maxMarks) : 100,
      weightage: Number(p.weightage) >= 0 ? Number(p.weightage) : 25,
      isRequired: p.isRequired !== false,
      description: p.description?.trim() || '',
    }));
  }

  if (Array.isArray(learningOutcomes)) {
    course.learningOutcomes = learningOutcomes.map((item: any, idx: number) => ({
      id: item.id || `oc-${Date.now()}-${idx}`,
      title: typeof item === 'string' ? item : item.title,
      order: idx + 1,
    }));
  }

  course.updatedAt = new Date().toISOString();
  db.persist();
  db.addAuditLog(req.user!.email, 'COURSE_UPDATED', 'course', course.id, `Updated course ${course.code}`, req.ip);

  res.json({ success: true, data: course });
});

router.delete('/courses/:id', (req: AuthenticatedRequest, res: Response) => {
  const course = db.courses.find((c) => c.id === req.params.id);
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found.' });
    return;
  }

  course.status = 'archived';
  db.persist();
  db.addAuditLog(req.user!.email, 'COURSE_ARCHIVED', 'course', course.id, `Archived course ${course.code}`, req.ip);
  res.json({ success: true, message: 'Course archived successfully.' });
});

// ==========================================
// 4. ENROLLMENTS & MARKS MANAGEMENT
// ==========================================
router.get('/enrollments', (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.query.studentId as string;
  const courseId = req.query.courseId as string;
  const status = req.query.status as string;

  let enrollments = db.enrollments;
  if (studentId) enrollments = enrollments.filter((e) => e.studentId === studentId);
  if (courseId) enrollments = enrollments.filter((e) => e.courseId === courseId);
  if (status && status !== 'all') enrollments = enrollments.filter((e) => e.status === status);

  const enriched = enrollments.map((e) => {
    const student = db.students.find((s) => s.id === e.studentId);
    const course = db.courses.find((c) => c.id === e.courseId);
    const certificate = e.certificateId ? db.certificates.find((c) => c.id === e.certificateId) : null;
    return {
      ...e,
      student,
      course,
      certificate: certificate ? { id: certificate.id, serialNumber: certificate.serialNumber, status: certificate.status } : null,
    };
  });

  res.json({ success: true, data: enriched });
});

// Quick Enroll or regular Enroll
router.post('/enrollments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, courseId, enrollmentDate, registerStudent } = req.body;

    let targetStudentId = studentId;

    // Handle combined register new student + enroll workflow
    if (registerStudent && !studentId) {
      const { fullName, fatherName, phoneNumber, email } = registerStudent;
      if (!fullName?.trim() || !fatherName?.trim() || !phoneNumber?.trim()) {
        res.status(400).json({ success: false, message: 'Registration requires full name, father name, and phone.' });
        return;
      }

      // Check existing phone
      let student = db.students.find((s) => s.phoneNumber === phoneNumber.trim());
      if (!student) {
        student = {
          id: `stu-${Date.now()}`,
          studentIdNumber: `TFY-STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: fullName.trim(),
          fatherName: fatherName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email?.trim(),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.students.unshift(student);
      }
      targetStudentId = student.id;
    }

    if (!targetStudentId || !courseId) {
      res.status(400).json({ success: false, message: 'Student ID and Course ID are required.' });
      return;
    }

    // Check duplicate enrollment
    const existing = db.enrollments.find(
      (e) => e.studentId === targetStudentId && e.courseId === courseId && e.status !== 'dropped'
    );
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'This student is already actively enrolled in this course.',
      });
      return;
    }

    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      studentId: targetStudentId,
      courseId,
      enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
      status: 'enrolled',
      marks: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.enrollments.unshift(newEnrollment);
    db.persist();

    db.addAuditLog(req.user!.email, 'STUDENT_ENROLLED', 'enrollment', newEnrollment.id, `Enrolled student ${targetStudentId} into course ${courseId}`, req.ip);

    res.status(201).json({ success: true, data: newEnrollment });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error creating enrollment' });
  }
});

// Update Marks & Compute Grades
router.put('/enrollments/:id/marks', (req: AuthenticatedRequest, res: Response) => {
  const enrollment = db.enrollments.find((e) => e.id === req.params.id);
  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment record not found.' });
    return;
  }

  const { marks, status, completionDate } = req.body;
  if (marks && typeof marks === 'object') {
    enrollment.marks = { ...enrollment.marks, ...marks };
  }

  // Calculate grades using course-specific or default grading configuration
  const course = db.courses.find((c) => c.id === enrollment.courseId);
  const globalConfig = db.gradingConfigs.find((g) => g.isDefault) || db.gradingConfigs[0];
  const effectiveParameters = (course?.assessmentParameters && course.assessmentParameters.length > 0)
    ? course.assessmentParameters
    : (globalConfig?.parameters || []);
  const effectiveMethod = course?.gradingMethod || globalConfig?.method || 'total';
  const effectivePassing = course?.passingPercentage !== undefined ? course.passingPercentage : (globalConfig?.passingPercentage ?? 50);

  const effectiveConfig = {
    id: `course-${course?.id || 'default'}`,
    title: course?.title ? `${course.title} Grading` : (globalConfig?.title || 'Grading'),
    method: effectiveMethod,
    passingPercentage: effectivePassing,
    parameters: effectiveParameters,
    rules: globalConfig?.rules || [],
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const calc = calculateEnrollmentGrades(effectiveConfig, enrollment.marks);
  enrollment.calculatedPercentage = calc.overallPercentage;
  enrollment.calculatedGrade = calc.grade;
  enrollment.calculatedResult = calc.result;
  enrollment.isEligibleForCertificate = calc.isPassed;

  if (status) enrollment.status = status;
  if (completionDate) enrollment.completionDate = completionDate;
  enrollment.updatedAt = new Date().toISOString();

  db.persist();
  db.addAuditLog(req.user!.email, 'MARKS_UPDATED', 'enrollment', enrollment.id, `Updated assessment marks for enrollment ${enrollment.id} (${calc.overallPercentage}%, Grade: ${calc.grade})`, req.ip);

  res.json({ success: true, data: enrollment, calculation: calc });
});

// ==========================================
// 5. GRADING CONFIGURATION
// ==========================================
router.get('/grading-config', (req: AuthenticatedRequest, res: Response) => {
  const config = db.gradingConfigs.find((g) => g.isDefault) || db.gradingConfigs[0];
  res.json({ success: true, data: config });
});

router.put('/grading-config', (req: AuthenticatedRequest, res: Response) => {
  const { title, method, passingPercentage, parameters, rules } = req.body;

  const validation = validateGradingConfiguration({
    title,
    method,
    passingPercentage: Number(passingPercentage),
    parameters,
    rules,
  });

  if (!validation.valid) {
    res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors });
    return;
  }

  let config = db.gradingConfigs.find((g) => g.isDefault);
  if (!config) {
    config = {
      id: `gc-${Date.now()}`,
      title: title || 'Institute Grading System',
      method: method || 'weighted',
      passingPercentage: Number(passingPercentage) || 50,
      parameters: parameters || [],
      rules: rules || [],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.gradingConfigs.push(config);
  } else {
    config.title = title;
    config.method = method;
    config.passingPercentage = Number(passingPercentage);
    config.parameters = parameters;
    config.rules = rules;
    config.updatedAt = new Date().toISOString();
  }

  db.persist();
  db.addAuditLog(req.user!.email, 'GRADING_CONFIG_UPDATED', 'grading', config.id, `Updated grading configuration (${method} method, ${passingPercentage}% pass threshold)`, req.ip);

  res.json({ success: true, data: config });
});

// Live tester endpoint for admin to test marks calculation
router.post('/grading-config/test-calculate', (req: AuthenticatedRequest, res: Response) => {
  const { config, marks, courseId } = req.body;
  let activeConfig = config;
  if (!activeConfig && courseId) {
    const course = db.courses.find((c) => c.id === courseId);
    if (course && course.assessmentParameters && course.assessmentParameters.length > 0) {
      const globalConfig = db.gradingConfigs.find((g) => g.isDefault) || db.gradingConfigs[0];
      activeConfig = {
        ...globalConfig,
        method: course.gradingMethod || globalConfig.method,
        passingPercentage: course.passingPercentage !== undefined ? course.passingPercentage : globalConfig.passingPercentage,
        parameters: course.assessmentParameters,
      };
    }
  }
  if (!activeConfig) {
    activeConfig = db.gradingConfigs.find((g) => g.isDefault) || db.gradingConfigs[0];
  }
  const result = calculateEnrollmentGrades(activeConfig, marks || {});
  res.json({ success: true, data: result });
});

// ==========================================
// 6. CERTIFICATE TEMPLATES
// ==========================================
router.get('/templates', (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: db.templates });
});

router.post('/templates', (req: AuthenticatedRequest, res: Response) => {
  const { name, description, themeStyle, primaryColor, accentColor, secondaryColor, borderStyle, showFatherName, showGradeFront, showSeal, showQR, showSignatures } = req.body;

  const newTemplate = {
    id: `tmpl-${Date.now()}`,
    name: name || 'Custom Certificate Template',
    description: description || '',
    themeStyle: themeStyle || 'imperial_gold',
    primaryColor: primaryColor || '#0f172a',
    accentColor: accentColor || '#d4af37',
    secondaryColor: secondaryColor || '#1e3a8a',
    borderStyle: borderStyle || 'ornate',
    showFatherName: showFatherName !== undefined ? showFatherName : true,
    showGradeFront: showGradeFront !== undefined ? showGradeFront : true,
    showSeal: showSeal !== undefined ? showSeal : true,
    showQR: showQR !== undefined ? showQR : true,
    showSignatures: showSignatures !== undefined ? showSignatures : true,
    isDefault: false,
  };

  db.templates.push(newTemplate);
  db.persist();
  res.status(201).json({ success: true, data: newTemplate });
});

// ==========================================
// 7. CERTIFICATE ISSUANCE & REVOCATION
// ==========================================
router.get('/certificates', (req: AuthenticatedRequest, res: Response) => {
  const search = (req.query.search as string || '').toLowerCase().trim();
  const status = req.query.status as string;

  let certs = db.certificates;
  if (status && status !== 'all') {
    certs = certs.filter((c) => c.status === status);
  }

  if (search) {
    certs = certs.filter(
      (c) =>
        c.serialNumber.toLowerCase().includes(search) ||
        c.snapshot.student.fullName.toLowerCase().includes(search) ||
        c.snapshot.course.title.toLowerCase().includes(search) ||
        c.snapshot.course.code.toLowerCase().includes(search)
    );
  }

  res.json({ success: true, data: certs });
});

// Guided Issuance Endpoint
router.post('/certificates/issue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, courseId, enrollmentId, marks, templateId, issueDate, completionDate, customOutcomes } = req.body;

    // Validate student
    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(400).json({ success: false, message: 'Valid student is required.' });
      return;
    }

    // Validate course
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) {
      res.status(400).json({ success: false, message: 'Valid course is required.' });
      return;
    }

    // Validate enrollment
    let enrollment = db.enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) {
      // Find or create enrollment
      enrollment = db.enrollments.find((e) => e.studentId === studentId && e.courseId === courseId);
      if (!enrollment) {
        enrollment = {
          id: `enr-${Date.now()}`,
          studentId,
          courseId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: 'completed',
          marks: marks || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.enrollments.push(enrollment);
      }
    }

    // Prevent duplicate certificate for this enrollment
    if (enrollment.certificateId) {
      const existingCert = db.certificates.find((c) => c.id === enrollment.certificateId && c.status === 'VALID');
      if (existingCert) {
        res.status(400).json({
          success: false,
          message: `A valid certificate (${existingCert.serialNumber}) has already been issued for this enrollment.`,
        });
        return;
      }
    }

    // Apply marks
    if (marks) {
      enrollment.marks = { ...enrollment.marks, ...marks };
    }

    // Calculate grades using course-specific or default grading configuration
    const globalConfig = db.gradingConfigs.find((g) => g.isDefault) || db.gradingConfigs[0];
    const effectiveParameters = (course.assessmentParameters && course.assessmentParameters.length > 0)
      ? course.assessmentParameters
      : (globalConfig?.parameters || []);
    const effectiveMethod = course.gradingMethod || globalConfig?.method || 'total';
    const effectivePassing = course.passingPercentage !== undefined ? course.passingPercentage : (globalConfig?.passingPercentage ?? 50);

    const effectiveConfig = {
      id: `course-${course.id}`,
      title: `${course.title} Grading`,
      method: effectiveMethod,
      passingPercentage: effectivePassing,
      parameters: effectiveParameters,
      rules: globalConfig?.rules || [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const calc = calculateEnrollmentGrades(effectiveConfig, enrollment.marks);
    const isEligibleForCertificate = calc.isPassed;

    // Select template
    const template = db.templates.find((t) => t.id === templateId) || db.templates[0];

    // Generate unique serial number: e.g. TFY-2026-FS-0492
    const prefix = db.settings.certificateSerialPrefix || 'TFY-2026';
    const codeTag = course.code.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const serialNumber = `${prefix}-${codeTag}-${randomSeq}`;

    // Generate secure unguessable verification ID
    const verificationId = crypto.randomUUID();

    // Construct Verification URL
    const appUrl = process.env.APP_URL || 'https://techforyou.edu.pk';
    const verificationUrl = `${appUrl}/verify/${verificationId}`;

    // Generate QR code Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 256,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    // Outcomes to snapshot
    const learningOutcomesToSnapshot = Array.isArray(customOutcomes) && customOutcomes.length > 0
      ? customOutcomes
      : course.learningOutcomes.map((o) => o.title);

    // Mask phone for student snapshot
    const rawPhone = student.phoneNumber;
    const phoneMasked = rawPhone.length > 4
      ? rawPhone.slice(0, 7) + '••••' + rawPhone.slice(-3)
      : rawPhone;

    const certId = `cert-${Date.now()}`;
    const finalIssueDate = issueDate || new Date().toISOString().split('T')[0];
    const finalCompletionDate = completionDate || enrollment.completionDate || finalIssueDate;

    // Create permanent immutable certificate snapshot
    const newCertificate: Certificate = {
      id: certId,
      serialNumber,
      verificationId,
      studentId: student.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
      status: 'VALID',
      isEligibleForCertificate,
      issueDate: finalIssueDate,
      completionDate: finalCompletionDate,
      issuedBy: req.user!.email,
      qrCodeDataUrl,
      verificationUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshot: {
        student: {
          id: student.id,
          fullName: student.fullName,
          fatherName: student.fatherName,
          studentIdNumber: student.studentIdNumber,
          phoneMasked,
          email: student.email,
        },
        course: {
          id: course.id,
          title: course.title,
          code: course.code,
          category: course.category,
          duration: course.duration,
          learningOutcomes: learningOutcomesToSnapshot,
        },
        grading: {
          method: effectiveMethod,
          parameters: calc.parameterBreakdown,
          totalMaxMarks: calc.totalMaxMarks,
          totalObtainedMarks: calc.totalObtainedMarks,
          overallPercentage: calc.overallPercentage,
          grade: calc.grade,
          result: calc.result,
          isPassed: calc.isPassed,
          passingPercentage: calc.passingPercentage,
          rulesSnapshot: globalConfig?.rules || [],
        },
        isEligibleForCertificate,
        candidateEligibilityStatus: isEligibleForCertificate ? 'ELIGIBLE' : 'INELIGIBLE',
        institute: {
          name: db.settings.instituteName,
          tagline: db.settings.tagline,
          registrationNumber: db.settings.registrationNumber,
          address: db.settings.address,
          phone: db.settings.phone,
          email: db.settings.email,
          website: db.settings.website,
          instructorName: db.settings.instructorName || 'M.Moiz Raza',
          instructorTitle: db.settings.instructorTitle || 'Course Instructor',
          instructorSignatureUrl: db.settings.instructorSignatureUrl || 'M. Moiz Raza',
          directorName: db.settings.directorName || '',
          directorTitle: db.settings.directorTitle || '',
          registrarName: db.settings.registrarName || '',
          registrarTitle: db.settings.registrarTitle || '',
          sealUrl: db.settings.instituteSealUrl || '/logo.png',
          directorSignatureUrl: db.settings.directorSignatureUrl || '',
          registrarSignatureUrl: db.settings.registrarSignatureUrl || '',
        },
        template: {
          id: template.id,
          name: template.name,
          themeStyle: template.themeStyle,
          primaryColor: template.primaryColor,
          accentColor: template.accentColor,
          borderStyle: template.borderStyle,
          showFatherName: template.showFatherName,
          showGradeFront: template.showGradeFront,
          showSeal: template.showSeal,
          showQR: template.showQR,
          showSignatures: template.showSignatures,
          showFloatingCodeSigns: template.showFloatingCodeSigns ?? true,
        },
      },
    };

    // Update enrollment
    enrollment.status = 'completed';
    enrollment.certificateId = newCertificate.id;
    enrollment.calculatedPercentage = calc.overallPercentage;
    enrollment.calculatedGrade = calc.grade;
    enrollment.calculatedResult = calc.result;
    enrollment.isEligibleForCertificate = isEligibleForCertificate;

    // Save to DB
    db.certificates.unshift(newCertificate);
    db.persist();

    // Audit log
    db.addAuditLog(
      req.user!.email,
      'CERTIFICATE_ISSUED',
      'certificate',
      newCertificate.id,
      `Issued ${isEligibleForCertificate ? 'Certificate' : 'Academic Transcript (Candidate Ineligible)'} ${serialNumber} to ${student.fullName} for course ${course.title} (Grade ${calc.grade})`,
      req.ip
    );

    res.status(201).json({
      success: true,
      data: newCertificate,
      isEligible: isEligibleForCertificate,
      message: isEligibleForCertificate
        ? `Certificate ${serialNumber} successfully issued.`
        : `Academic Transcript issued with official stamp (Candidate marked ineligible for certificate).`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error issuing certificate' });
  }
});

// Revoke Certificate
router.post('/certificates/:id/revoke', (req: AuthenticatedRequest, res: Response) => {
  const { revocationReason } = req.body;
  if (!revocationReason?.trim()) {
    res.status(400).json({ success: false, message: 'A mandatory revocation reason is required.' });
    return;
  }

  const cert = db.certificates.find((c) => c.id === req.params.id);
  if (!cert) {
    res.status(404).json({ success: false, message: 'Certificate not found.' });
    return;
  }

  if (cert.status === 'REVOKED') {
    res.status(400).json({ success: false, message: 'Certificate has already been revoked.' });
    return;
  }

  cert.status = 'REVOKED';
  cert.revocationReason = revocationReason.trim();
  cert.revokedAt = new Date().toISOString();
  cert.revokedBy = req.user!.email;
  cert.updatedAt = new Date().toISOString();

  db.persist();

  db.addAuditLog(
    req.user!.email,
    'CERTIFICATE_REVOKED',
    'certificate',
    cert.id,
    `Revoked certificate ${cert.serialNumber} (${cert.snapshot.student.fullName}). Reason: ${cert.revocationReason}`,
    req.ip
  );

  res.json({
    success: true,
    data: cert,
    message: `Certificate ${cert.serialNumber} revoked successfully.`,
  });
});

// Delete Certificate permanently
router.delete('/certificates/:id', (req: AuthenticatedRequest, res: Response) => {
  const certId = req.params.id;
  const index = db.certificates.findIndex((c) => c.id === certId);
  if (index === -1) {
    res.status(404).json({ success: false, message: 'Certificate not found.' });
    return;
  }

  const cert = db.certificates[index];

  // Unlink from student enrollment if present
  const linkedEnrollment = db.enrollments.find(
    (e) => e.certificateId === cert.id || e.id === cert.enrollmentId
  );
  if (linkedEnrollment) {
    linkedEnrollment.certificateId = undefined;
    if (linkedEnrollment.status === 'completed') {
      linkedEnrollment.status = 'in_progress';
    }
  }

  // Remove certificate
  db.certificates.splice(index, 1);
  db.persist();

  // Audit log
  db.addAuditLog(
    req.user!.email,
    'CERTIFICATE_DELETED',
    'certificate',
    cert.id,
    `Deleted certificate ${cert.serialNumber} for candidate ${cert.snapshot.student.fullName} (Course: ${cert.snapshot.course.title})`,
    req.ip
  );

  res.json({
    success: true,
    message: `Certificate ${cert.serialNumber} deleted successfully.`,
  });
});

// ==========================================
// 8. SETTINGS & AUDIT LOGS
// ==========================================
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: db.settings });
});

router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  Object.assign(db.settings, updates);
  db.persist();

  db.addAuditLog(req.user!.email, 'SETTINGS_UPDATED', 'settings', undefined, 'Updated institute settings and certificate branding', req.ip);

  res.json({ success: true, data: db.settings });
});

router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = (page - 1) * limit;

  const logs = db.auditLogs.slice(offset, offset + limit);
  res.json({
    success: true,
    data: logs,
    total: db.auditLogs.length,
    page,
    totalPages: Math.ceil(db.auditLogs.length / limit),
  });
});

// ==========================================
// 9. DATABASE & MONGODB CLUSTER MANAGEMENT
// ==========================================
router.get('/database/status', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: db.getDatabaseStatus(),
  });
});

router.post('/database/connect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uri, saveToEnv = true } = req.body;
    if (!uri || typeof uri !== 'string' || !uri.trim()) {
      res.status(400).json({ success: false, message: 'MongoDB connection URI is required.' });
      return;
    }

    const result = await db.connectMongo(uri, Boolean(saveToEnv));
    if (result.success) {
      db.addAuditLog(
        req.user!.email,
        'SETTINGS_UPDATED',
        'settings',
        undefined,
        `Connected to MongoDB database "${result.dbName || 'cluster'}"`,
        req.ip
      );
      res.json({
        success: true,
        message: result.message,
        data: result.status,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result.status,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to connect to MongoDB' });
  }
});

router.post('/database/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!db.isMongo) {
      res.status(400).json({ success: false, message: 'Cannot sync: MongoDB is not currently connected.' });
      return;
    }
    await db.syncToMongoAsync();
    res.json({
      success: true,
      message: 'Full synchronization to MongoDB completed successfully.',
      data: db.getDatabaseStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Synchronization failed' });
  }
});

router.post('/database/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.disconnectMongo();
    db.addAuditLog(req.user!.email, 'SETTINGS_UPDATED', 'settings', undefined, 'Disconnected from MongoDB. Reverted to local file storage.', req.ip);
    res.json({
      success: true,
      message: result.message,
      data: db.getDatabaseStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Disconnection failed' });
  }
});

export default router;
