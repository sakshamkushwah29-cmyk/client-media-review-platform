import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config';

export function generateReviewToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload: { id: string; email: string; organizationId: string; role: string }): string {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): { id: string; email: string; organizationId: string; role: string } | null {
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}
