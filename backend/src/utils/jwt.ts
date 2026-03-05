import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export function signAccessToken(payload: { id: string; role: Role; name: string }): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1d' } as any);
}

export function signRefreshToken(payload: { id: string }): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' } as any);
}

export function verifyAccessToken(token: string): { id: string; role: Role; name: string } {
  return jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: Role; name: string };
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
}
