import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { recalcDailyBalance } from '../services/tripService';
import { getTodayDateString } from '../utils/dateUtils';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, captainId } = req.query;
    const where: Record<string, unknown> = {};

    if (req.user!.role === 'CAPTAIN') {
      where.captainId = req.user!.id;
    } else if (captainId) {
      where.captainId = captainId as string;
    }
    if (date) where.date = date as string;

    const expenses = await prisma.expense.findMany({
      where,
      include: { captain: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(expenses);
  } catch (err) { next(err); }
});

router.get('/part-time', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, captainId } = req.query;
    const where: Record<string, unknown> = {};
    if (req.user!.role === 'CAPTAIN') where.captainId = req.user!.id;
    else if (captainId) where.captainId = captainId as string;
    if (date) where.date = date as string;

    const rows = await prisma.partTimeWork.findMany({
      where,
      include: { captain: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/fuel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, captainId } = req.query;
    const where: Record<string, unknown> = {};
    if (req.user!.role === 'CAPTAIN') where.captainId = req.user!.id;
    else if (captainId) where.captainId = captainId as string;
    if (date) where.date = date as string;

    const rows = await prisma.fuelExpense.findMany({
      where,
      include: { captain: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, comment } = req.body;
    if (!amount || Number(amount) <= 0) throw new AppError('Укажите корректную сумму');
    if (!comment?.trim()) throw new AppError('Комментарий обязателен');

    const today = getTodayDateString();

    const expense = await prisma.expense.create({
      data: {
        captainId: req.user!.id,
        amount: Number(amount),
        comment: comment.trim(),
        date: today,
      },
    });

    await recalcDailyBalance(req.user!.id, today);

    res.status(201).json(expense);
  } catch (err) { next(err); }
});

router.post('/part-time', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, comment, tripId } = req.body;
    if (!amount || Number(amount) <= 0) throw new AppError('Укажите корректную сумму');
    if (!comment?.trim()) throw new AppError('Комментарий обязателен');

    const today = getTodayDateString();
    const row = await prisma.partTimeWork.create({
      data: {
        captainId: req.user!.id,
        tripId: tripId || null,
        amount: Number(amount),
        comment: comment.trim(),
        date: today,
      },
    });
    await recalcDailyBalance(req.user!.id, today);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.post('/fuel', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { liters, amount, comment, tripId } = req.body;
    if (!amount || Number(amount) <= 0) throw new AppError('Укажите корректную сумму');
    if (!comment?.trim()) throw new AppError('Комментарий обязателен');
    if (liters !== undefined && liters !== null && Number(liters) <= 0) {
      throw new AppError('Литры должны быть больше 0');
    }

    const today = getTodayDateString();
    const row = await prisma.fuelExpense.create({
      data: {
        captainId: req.user!.id,
        tripId: tripId || null,
        liters: liters !== undefined && liters !== null ? Number(liters) : null,
        amount: Number(amount),
        comment: comment.trim(),
        date: today,
      },
    });
    await recalcDailyBalance(req.user!.id, today);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRoles('CAPTAIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new AppError('Расход не найден', 404);

    if (req.user!.role === 'CAPTAIN' && expense.captainId !== req.user!.id) {
      throw new AppError('Нет доступа', 403);
    }

    await prisma.expense.delete({ where: { id } });
    await recalcDailyBalance(expense.captainId, expense.date);

    res.json({ message: 'Расход удалён' });
  } catch (err) { next(err); }
});

router.delete('/part-time/:id', requireRoles('CAPTAIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const row = await prisma.partTimeWork.findUnique({ where: { id } });
    if (!row) throw new AppError('Подработка не найдена', 404);
    if (req.user!.role === 'CAPTAIN' && row.captainId !== req.user!.id) throw new AppError('Нет доступа', 403);
    await prisma.partTimeWork.delete({ where: { id } });
    await recalcDailyBalance(row.captainId, row.date);
    res.json({ message: 'Подработка удалена' });
  } catch (err) { next(err); }
});

router.delete('/fuel/:id', requireRoles('CAPTAIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const row = await prisma.fuelExpense.findUnique({ where: { id } });
    if (!row) throw new AppError('Заправка не найдена', 404);
    if (req.user!.role === 'CAPTAIN' && row.captainId !== req.user!.id) throw new AppError('Нет доступа', 403);
    await prisma.fuelExpense.delete({ where: { id } });
    await recalcDailyBalance(row.captainId, row.date);
    res.json({ message: 'Заправка удалена' });
  } catch (err) { next(err); }
});

export default router;
