import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    name: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Не авторизован' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id, isActive: true },
      select: { id: true, role: true, name: true },
    });
    if (!user) {
      res.status(401).json({ message: 'Пользователь не найден' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

export const requireRoles = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Нет доступа' });
      return;
    }
    next();
  };
};
