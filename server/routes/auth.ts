import { Router, Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tech-for-you-super-secure-jwt-secret-key-2026';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const admin = db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase().trim());
    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
      return;
    }

    const isMatch = bcryptjs.compareSync(password, admin.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
      return;
    }

    admin.lastLogin = new Date().toISOString();
    db.persist();

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    db.addAuditLog(admin.email, 'ADMIN_LOGIN', 'auth', admin.id, `Admin ${admin.email} logged in successfully`, req.ip);

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Login error' });
  }
});

router.get('/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = db.admins.find((a) => a.id === req.user?.id);
  if (!admin) {
    res.status(404).json({ success: false, message: 'Admin not found.' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLogin: admin.lastLogin,
    },
  });
});

router.post('/change-password', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }

    const admin = db.admins.find((a) => a.id === req.user?.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found.' });
      return;
    }

    const isMatch = bcryptjs.compareSync(currentPassword, admin.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password does not match.' });
      return;
    }

    admin.passwordHash = bcryptjs.hashSync(newPassword, 10);
    db.persist();

    db.addAuditLog(admin.email, 'PASSWORD_CHANGED', 'auth', admin.id, `Password changed by ${admin.email}`, req.ip);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating password.' });
  }
});

export default router;
