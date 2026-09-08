import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/tokens';
import { db } from '../db';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: 'owner' | 'manager' | 'contributor';
  fullName: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireStaffAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const decoded = verifyJwt(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Expired or invalid token' });
  }

  // Verify in database
  const profile = db.query(`
    SELECT p.id, p.organization_id, p.full_name, p.email, p.role
    FROM profiles p
    WHERE p.id = ?
  `).get(decoded.id) as any;

  if (!profile) {
    return res.status(401).json({ error: 'Unauthorized: User profile not found' });
  }

  req.user = {
    id: profile.id,
    email: profile.email,
    organizationId: profile.organization_id,
    role: profile.role,
    fullName: profile.full_name,
  };

  next();
}
