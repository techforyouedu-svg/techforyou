import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// In-memory rate limiting map for search endpoints
const searchRateLimiter = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SEARCH_REQUESTS = 15; // 15 requests per minute per IP

function checkSearchRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = searchRateLimiter.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    searchRateLimiter.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= MAX_SEARCH_REQUESTS) {
    return false;
  }
  record.count += 1;
  return true;
}

// GET /api/public/institute
router.get('/institute', (req: Request, res: Response) => {
  const s = db.settings;
  res.json({
    success: true,
    data: {
      instituteName: s.instituteName,
      tagline: s.tagline,
      registrationNumber: s.registrationNumber,
      accreditationDetails: s.accreditationDetails,
      address: s.address,
      phone: s.phone,
      email: s.email,
      website: s.website,
      directorName: s.directorName,
      directorTitle: s.directorTitle,
      registrarName: s.registrarName,
      registrarTitle: s.registrarTitle,
      certificateTitle: s.certificateTitle,
      certificateWording: s.certificateWording,
      verificationInstructions: s.verificationInstructions,
    },
  });
});

// GET /api/public/courses
router.get('/courses', (req: Request, res: Response) => {
  const courses = db.courses
    .filter((c) => c.status === 'active')
    .map((c) => ({
      id: c.id,
      title: c.title,
      code: c.code,
      category: c.category,
      duration: c.duration,
      description: c.description,
      learningOutcomes: c.learningOutcomes,
    }));
  res.json({ success: true, data: courses });
});

// POST /api/certificates/search
// Privacy-protected search requiring matching name + phone or father name
router.post('/certificates/search', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkSearchRateLimit(clientIp)) {
    res.status(429).json({
      success: false,
      message: 'Too many search requests. Please wait a moment before searching again.',
    });
    return;
  }

  const { fullName, fatherName, phoneNumber, courseId, serialNumber } = req.body;

  // If user searched directly by serial number:
  if (serialNumber && typeof serialNumber === 'string' && serialNumber.trim().length > 0) {
    const cleanSerial = serialNumber.trim().toUpperCase();
    const cert = db.certificates.find((c) => c.serialNumber.toUpperCase() === cleanSerial);
    if (!cert) {
      res.json({ success: true, count: 0, results: [] });
      return;
    }
    // Return sanitized result
    res.json({
      success: true,
      count: 1,
      results: [
        {
          id: cert.id,
          serialNumber: cert.serialNumber,
          verificationId: cert.verificationId,
          candidateName: cert.snapshot.student.fullName,
          fatherName: cert.snapshot.student.fatherName,
          phoneMasked: cert.snapshot.student.phoneMasked,
          courseTitle: cert.snapshot.course.title,
          courseCode: cert.snapshot.course.code,
          issueDate: cert.issueDate,
          overallGrade: cert.snapshot.grading.grade,
          finalResult: cert.snapshot.grading.result,
          status: cert.status,
          verificationUrl: cert.verificationUrl,
          qrCodeDataUrl: cert.qrCodeDataUrl,
          snapshot: cert.snapshot,
        },
      ],
    });
    return;
  }

  // Multi-field verification requirement to protect privacy
  const cleanName = (fullName || '').trim().toLowerCase();
  const cleanFather = (fatherName || '').trim().toLowerCase();
  const cleanPhone = (phoneNumber || '').replace(/[\s\-\(\)\+]/g, '');

  if (!cleanName || cleanName.length < 2) {
    res.status(400).json({
      success: false,
      message: 'Please provide the student’s full name (at least 2 characters).',
    });
    return;
  }

  if (!cleanFather && cleanPhone.length < 4) {
    res.status(400).json({
      success: false,
      message: 'For candidate privacy, please enter Father’s Name or at least 4 digits of the registered phone number.',
    });
    return;
  }

  // Filter matching certificates
  const matchingCertificates = db.certificates.filter((cert) => {
    const certStudent = cert.snapshot.student;
    const certName = (certStudent.fullName || '').toLowerCase();
    const certFather = (certStudent.fatherName || '').toLowerCase();
    
    // Find original student record for phone matching if needed
    const studentRecord = db.students.find((s) => s.id === cert.studentId);
    const rawPhone = studentRecord ? studentRecord.phoneNumber.replace(/[\s\-\(\)\+]/g, '') : '';

    // Check name match
    const nameMatch = certName.includes(cleanName) || cleanName.includes(certName);
    if (!nameMatch) return false;

    // Check course filter if selected
    if (courseId && courseId !== 'all' && cert.courseId !== courseId) {
      return false;
    }

    // Check secondary privacy identifier
    let secondaryMatched = false;
    if (cleanFather && (certFather.includes(cleanFather) || cleanFather.includes(certFather))) {
      secondaryMatched = true;
    }
    if (cleanPhone && rawPhone.endsWith(cleanPhone)) {
      secondaryMatched = true;
    }

    return secondaryMatched;
  });

  const sanitizedResults = matchingCertificates.map((cert) => ({
    id: cert.id,
    serialNumber: cert.serialNumber,
    verificationId: cert.verificationId,
    candidateName: cert.snapshot.student.fullName,
    fatherName: cert.snapshot.student.fatherName,
    phoneMasked: cert.snapshot.student.phoneMasked,
    courseTitle: cert.snapshot.course.title,
    courseCode: cert.snapshot.course.code,
    issueDate: cert.issueDate,
    overallGrade: cert.snapshot.grading.grade,
    finalResult: cert.snapshot.grading.result,
    status: cert.status,
    verificationUrl: cert.verificationUrl,
    qrCodeDataUrl: cert.qrCodeDataUrl,
    snapshot: cert.snapshot,
  }));

  res.json({
    success: true,
    count: sanitizedResults.length,
    results: sanitizedResults,
  });
});

// GET /api/certificates/verify/:identifier
// Queries by serialNumber (e.g. TFY-2026-FS-8941) OR verificationId (UUID)
router.get('/certificates/verify/:identifier', (req: Request, res: Response) => {
  const identifier = req.params.identifier.trim();
  if (!identifier) {
    res.status(400).json({ success: false, message: 'Verification identifier required.' });
    return;
  }

  // Lookup in database
  const cert = db.certificates.find(
    (c) =>
      c.serialNumber.toLowerCase() === identifier.toLowerCase() ||
      c.verificationId.toLowerCase() === identifier.toLowerCase()
  );

  if (!cert) {
    res.status(404).json({
      success: false,
      status: 'NOT_FOUND',
      message: `No certificate record found matching identifier "${identifier}". Please confirm the serial number.`,
    });
    return;
  }

  res.json({
    success: true,
    status: cert.status, // 'VALID' | 'REVOKED'
    certificate: {
      id: cert.id,
      serialNumber: cert.serialNumber,
      verificationId: cert.verificationId,
      status: cert.status,
      issueDate: cert.issueDate,
      completionDate: cert.completionDate,
      revocationReason: cert.revocationReason,
      revokedAt: cert.revokedAt,
      revokedBy: cert.revokedBy,
      qrCodeDataUrl: cert.qrCodeDataUrl,
      verificationUrl: cert.verificationUrl,
      snapshot: cert.snapshot,
      createdAt: cert.createdAt,
    },
  });
});

export default router;
