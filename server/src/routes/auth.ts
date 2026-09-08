import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { hashPassword, comparePassword, signJwt } from '../utils/tokens';
import { requireStaffAuth, AuthRequest } from '../middleware/auth';
import { CONFIG } from '../config';

const router = Router();

// Register staff user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, organizationName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user exists
    const existing = db.query('SELECT id FROM profiles WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const orgCount = db.query('SELECT count(*) as count FROM organizations').get() as { count: number };
    let orgId: string;
    let role: 'owner' | 'manager' | 'contributor' = 'owner';

    const now = new Date().toISOString();

    if (orgCount.count === 0 || organizationName) {
      // Create primary organization
      orgId = crypto.randomUUID();
      const orgName = organizationName || 'Creative Studio';
      const rootFolderId = `gdrive_root_${crypto.randomBytes(8).toString('hex')}`;
      
      db.run(`
        INSERT INTO organizations (id, name, drive_root_folder_id, storage_quota_bytes, storage_used_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orgId, orgName, rootFolderId, CONFIG.DEFAULT_QUOTA_BYTES, 0, now]);
      role = 'owner';
    } else {
      // Attach to first organization
      const firstOrg = db.query('SELECT id FROM organizations LIMIT 1').get() as { id: string };
      orgId = firstOrg.id;
      role = 'contributor';
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.run(`
      INSERT INTO profiles (id, organization_id, full_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, orgId, fullName.trim(), email.toLowerCase().trim(), passwordHash, role, now]);

    const token = signJwt({
      id: userId,
      email: email.toLowerCase().trim(),
      organizationId: orgId,
      role,
    });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        role,
        organizationId: orgId,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const profile = db.query(`
      SELECT p.id, p.organization_id, p.full_name, p.email, p.password_hash, p.role, o.name as org_name
      FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.email = ?
    `).get(email.toLowerCase().trim()) as any;

    if (!profile) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, profile.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signJwt({
      id: profile.id,
      email: profile.email,
      organizationId: profile.organization_id,
      role: profile.role,
    });

    return res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        organizationId: profile.organization_id,
        organizationName: profile.org_name,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Current user profile
router.get('/me', requireStaffAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = db.query(`
      SELECT p.id, p.organization_id, p.full_name, p.email, p.role, o.name as org_name
      FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ?
    `).get(req.user!.id) as any;

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        organizationId: profile.organization_id,
        organizationName: profile.org_name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Clerk user session sync
router.post('/clerk-sync', async (req: Request, res: Response) => {
  try {
    const { email, fullName, clerkId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName && fullName.trim() ? fullName.trim() : cleanEmail.split('@')[0];

    // Find existing profile
    let profile = db.query(`
      SELECT p.id, p.organization_id, p.full_name, p.email, p.role, o.name as org_name
      FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.email = ?
    `).get(cleanEmail) as any;

    if (!profile) {
      // Find primary organization or create one
      let org = db.query('SELECT id, name FROM organizations ORDER BY created_at ASC LIMIT 1').get() as any;
      const now = new Date().toISOString();
      let orgId: string;
      let orgName: string;

      if (!org) {
        orgId = crypto.randomUUID();
        orgName = `${cleanName}'s Studio`;
        const rootFolderId = `gdrive_root_${crypto.randomBytes(8).toString('hex')}`;
        db.run(`
          INSERT INTO organizations (id, name, drive_root_folder_id, storage_quota_bytes, storage_used_bytes, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orgId, orgName, rootFolderId, CONFIG.DEFAULT_QUOTA_BYTES, 0, now]);
      } else {
        orgId = org.id;
        orgName = org.name;
      }

      const userId = crypto.randomUUID();
      const dummyPasswordHash = await hashPassword(crypto.randomUUID());
      const role = 'owner';

      db.run(`
        INSERT INTO profiles (id, organization_id, full_name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, orgId, cleanName, cleanEmail, dummyPasswordHash, role, now]);

      profile = {
        id: userId,
        organization_id: orgId,
        full_name: cleanName,
        email: cleanEmail,
        role,
        org_name: orgName,
      };
    }

    const token = signJwt({
      id: profile.id,
      email: profile.email,
      organizationId: profile.organization_id,
      role: profile.role,
    });

    return res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        organizationId: profile.organization_id,
        organizationName: profile.org_name,
      },
    });
  } catch (err: any) {
    console.error('Clerk sync error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
