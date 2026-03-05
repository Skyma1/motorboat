import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { io } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { completeTripCalculations, recalcDailyBalance } from '../services/tripService';
import { getTodayDateString } from '../utils/dateUtils';

const router = Router();

router.use(authenticate);

const tripInclude = {
  boat: true,
  captain: { select: { id: true, name: true } },
  dispatcher: { select: { id: true, name: true } },
  pier: true,
};

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, status, captainId, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (req.user!.role === 'CAPTAIN') where.captainId = req.user!.id;
    if (date) where.date = date as string;
    if (status) where.status = status as string;
    if (captainId && req.user!.role !== 'CAPTAIN') where.captainId = captainId as string;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: tripInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.trip.count({ where }),
    ]);

    res.json({ trips, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

router.get('/active', async (_req, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { status: { in: ['CREATED', 'IN_PROGRESS'] } },
      include: tripInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(trips);
  } catch (err) { next(err); }
});

router.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = getTodayDateString();
    const where: Record<string, unknown> = { date: today };
    if (req.user!.role === 'CAPTAIN') where.captainId = req.user!.id;

    const trips = await prisma.trip.findMany({
      where,
      include: tripInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(trips);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: tripInclude,
    });
    if (!trip) throw new AppError('Рейс не найден', 404);

    if (req.user!.role === 'CAPTAIN' && trip.captainId !== req.user!.id) {
      throw new AppError('Нет доступа', 403);
    }
    res.json(trip);
  } catch (err) { next(err); }
});

router.post('/', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { boatId, pierId, paymentMethod, price, dispatcherId } = req.body;

    if (!boatId || !pierId || !paymentMethod) {
      throw new AppError('Катер, причал и способ оплаты обязательны');
    }
    if (price === undefined || price === null || Number(price) < 0) {
      throw new AppError('Укажите цену прогулки');
    }

    const validMethods = ['CASH', 'TRANSFER', 'ACQUIRING'];
    if (!validMethods.includes(paymentMethod)) throw new AppError('Неверный способ оплаты');

    const existingActiveTrip = await prisma.trip.findFirst({
      where: { captainId: req.user!.id, status: { in: ['CREATED', 'IN_PROGRESS'] } },
    });
    if (existingActiveTrip) throw new AppError('У вас уже есть активный рейс');

    const pier = await prisma.pier.findUnique({ where: { id: pierId } });
    if (!pier) throw new AppError('Причал не найден', 404);

    const today = getTodayDateString();

    const trip = await prisma.trip.create({
      data: {
        boatId,
        captainId: req.user!.id,
        dispatcherId: dispatcherId || null,
        pierId,
        price: Number(price),
        paymentMethod,
        pierCost: pier.cost,
        date: today,
      },
      include: tripInclude,
    });

    await prisma.boat.update({ where: { id: boatId }, data: { status: 'ON_TRIP' } });

    io.emit('trip:created', { trip });
    io.emit('boat:updated', { boatId });

    res.status(201).json(trip);
  } catch (err) { next(err); }
});

router.post('/:id/start', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new AppError('Рейс не найден', 404);
    if (trip.captainId !== req.user!.id) throw new AppError('Нет доступа', 403);
    if (trip.status !== 'CREATED') throw new AppError('Рейс уже запущен или завершён');

    const updated = await prisma.trip.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: tripInclude,
    });

    io.emit('trip:started', { tripId: id });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/complete', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new AppError('Рейс не найден', 404);
    if (trip.captainId !== req.user!.id) throw new AppError('Нет доступа', 403);
    if (trip.status !== 'IN_PROGRESS') throw new AppError('Рейс не запущен');

    await prisma.trip.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });

    await prisma.boat.update({ where: { id: trip.boatId }, data: { status: 'FREE' } });

    const completed = await completeTripCalculations(id);

    io.emit('trip:completed', { tripId: id });
    io.emit('boat:updated', { boatId: trip.boatId });

    res.json(completed);
  } catch (err) { next(err); }
});

router.put('/:id/reassign', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { captainId, boatId } = req.body;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new AppError('Рейс не найден', 404);
    if (trip.status === 'COMPLETED') throw new AppError('Нельзя изменить завершённый рейс');

    const data: Record<string, string> = {};
    if (captainId) data.captainId = captainId;
    if (boatId) data.boatId = boatId;

    const updated = await prisma.trip.update({
      where: { id },
      data,
      include: tripInclude,
    });

    io.emit('trip:reassigned', { tripId: id });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
