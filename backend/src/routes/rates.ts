import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/captains', requireRoles('ADMIN', 'DISPATCHER'), async (_req, res: Response, next: NextFunction) => {
  try {
    const rates = await prisma.captainRate.findMany({
      include: { captain: { select: { id: true, name: true } } },
    });
    res.json(rates);
  } catch (err) { next(err); }
});

router.put('/captains/:captainId', requireRoles('ADMIN', 'DISPATCHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { captainId } = req.params;
    const { hourlyRate, exitPayment } = req.body;

    const data: Record<string, number> = {};
    if (hourlyRate !== undefined) data.hourlyRate = Number(hourlyRate);
    if (exitPayment !== undefined) {
      if (req.user!.role !== 'ADMIN') throw new AppError('Только администратор может изменять оплату за выход', 403);
      data.exitPayment = Number(exitPayment);
    }

    const rate = await prisma.captainRate.upsert({
      where: { captainId },
      create: { captainId, hourlyRate: 1600, exitPayment: 2500, ...data },
      update: data,
      include: { captain: { select: { id: true, name: true } } },
    });
    res.json(rate);
  } catch (err) { next(err); }
});

export default router;
