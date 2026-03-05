import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const boats = await prisma.boat.findMany({
      where: { isActive: true },
      include: { captain: { include: { captain: { select: { id: true, name: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json(boats);
  } catch (err) { next(err); }
});

router.post('/', requireRoles('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, captainId } = req.body;
    if (!name) throw new AppError('Название катера обязательно');

    const boat = await prisma.boat.create({
      data: {
        name,
        captain: captainId
          ? { create: { captainId } }
          : undefined,
      },
      include: { captain: { include: { captain: { select: { id: true, name: true } } } } },
    });
    res.status(201).json(boat);
  } catch (err) { next(err); }
});

router.put('/:id', requireRoles('ADMIN', 'DISPATCHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, status, captainId } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;

    const boat = await prisma.boat.update({ where: { id }, data });

    if (captainId !== undefined) {
      await prisma.boatCaptain.deleteMany({ where: { boatId: id } });
      if (captainId) {
        await prisma.boatCaptain.deleteMany({ where: { captainId } });
        await prisma.boatCaptain.create({ data: { boatId: id, captainId } });
      }
    }

    const updated = await prisma.boat.findUnique({
      where: { id },
      include: { captain: { include: { captain: { select: { id: true, name: true } } } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRoles('ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const { id } = _req.params;
    const activeTrip = await prisma.trip.findFirst({
      where: { boatId: id, status: { in: ['CREATED', 'IN_PROGRESS'] } },
    });
    if (activeTrip) throw new AppError('Нельзя удалить катер с активным рейсом');

    await prisma.boat.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Катер деактивирован' });
  } catch (err) { next(err); }
});

export default router;
