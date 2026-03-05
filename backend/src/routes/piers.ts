import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const piers = await prisma.pier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(piers);
  } catch (err) { next(err); }
});

router.post('/', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { name, cost } = req.body;
    if (!name) throw new AppError('Название причала обязательно');
    if (cost === undefined || cost === null) throw new AppError('Стоимость обязательна');

    const pier = await prisma.pier.create({
      data: { name, cost: Number(cost) },
    });
    res.status(201).json(pier);
  } catch (err) { next(err); }
});

router.put('/:id', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, cost, isActive } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (cost !== undefined) data.cost = Number(cost);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const pier = await prisma.pier.update({ where: { id }, data });
    res.json(pier);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.pier.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Причал деактивирован' });
  } catch (err) { next(err); }
});

export default router;
