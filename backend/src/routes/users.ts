import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', requireRoles('ADMIN', 'DISPATCHER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, role: true, phone: true, email: true,
        isActive: true, createdAt: true,
        captainBoat: { include: { boat: true } },
        captainRate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.get('/captains', requireRoles('ADMIN', 'DISPATCHER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const captains = await prisma.user.findMany({
      where: { role: 'CAPTAIN', isActive: true },
      select: {
        id: true, name: true, phone: true,
        captainBoat: { include: { boat: true } },
        captainRate: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(captains);
  } catch (err) { next(err); }
});

router.get('/dispatchers', requireRoles('ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const dispatchers = await prisma.user.findMany({
      where: { role: 'DISPATCHER', isActive: true },
      select: {
        id: true, name: true, phone: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(dispatchers);
  } catch (err) { next(err); }
});

router.post('/', requireRoles('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, password, role, hourlyRate, exitPayment } = req.body;

    if (!name || !password || !role) throw new AppError('Имя, пароль и роль обязательны');
    if (!['CAPTAIN', 'DISPATCHER', 'ADMIN'].includes(role)) throw new AppError('Неверная роль');
    if (!phone && !email) throw new AppError('Укажите телефон или email');

    const existing = await prisma.user.findFirst({
      where: { OR: [phone ? { phone } : {}, email ? { email } : {}].filter(o => Object.keys(o).length > 0) },
    });
    if (existing) throw new AppError('Пользователь с таким телефоном или email уже существует');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        passwordHash,
        role: role as Role,
        captainRate: role === 'CAPTAIN'
          ? { create: { hourlyRate: Number(hourlyRate) || 1600, exitPayment: Number(exitPayment) || 2500 } }
          : undefined,
      },
      select: { id: true, name: true, role: true, phone: true, email: true },
    });

    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.put('/:id', requireRoles('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, isActive } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, role: true, phone: true, email: true, isActive: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRoles('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) throw new AppError('Нельзя удалить самого себя');

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Пользователь деактивирован' });
  } catch (err) { next(err); }
});

export default router;
