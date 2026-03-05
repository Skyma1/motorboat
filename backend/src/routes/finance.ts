import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { recalcDailyBalance } from '../services/tripService';
import { AppError } from '../middleware/errorHandler';
import { getTodayDateString as getToday } from '../utils/dateUtils';

const router = Router();

router.use(authenticate);

router.get('/daily-summary', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) || getToday();

    const trips = await prisma.trip.findMany({
      where: { date, status: 'COMPLETED' },
      include: { captain: { select: { id: true, name: true } } },
    });

    const totalRevenue = trips.reduce((s, t) => s + t.price, 0);
    const totalCaptainSalary = trips.reduce((s, t) => s + (t.captainSalary ?? 0), 0);
    const totalDispatcherPayment = trips.reduce((s, t) => s + (t.dispatcherPayment ?? 0), 0);
    const totalPierCost = trips.reduce((s, t) => s + t.pierCost, 0);
    const totalProfit = trips.reduce((s, t) => s + (t.profit ?? 0), 0);

    const expenses = await prisma.expense.findMany({ where: { date } });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const balances = await prisma.dailyBalance.findMany({
      where: { date },
      include: { captain: { select: { id: true, name: true } } },
    });

    res.json({
      date,
      trips: trips.length,
      totalRevenue,
      totalCaptainSalary,
      totalDispatcherPayment,
      totalPierCost,
      totalExpenses,
      totalProfit: totalProfit - totalExpenses,
      captainBalances: balances,
    });
  } catch (err) { next(err); }
});

router.get('/captain-balance/:captainId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { captainId } = req.params;

    if (req.user!.role === 'CAPTAIN' && req.user!.id !== captainId) {
      throw new AppError('Нет доступа', 403);
    }

    const date = (req.query.date as string) || getToday();
    const balance = await recalcDailyBalance(captainId, date);

    res.json({ captainId, date, ...balance });
  } catch (err) { next(err); }
});

router.get('/balances', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) || getToday();

    const captains = await prisma.user.findMany({
      where: { role: 'CAPTAIN', isActive: true },
      select: { id: true, name: true },
    });

    const balances = await Promise.all(
      captains.map(async (captain) => {
        const b = await recalcDailyBalance(captain.id, date);
        return { captain, date, ...b };
      })
    );

    res.json(balances);
  } catch (err) { next(err); }
});

router.get('/reports', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = from as string;
    if (to) dateFilter.lte = to as string;

    const trips = await prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        date: Object.keys(dateFilter).length ? dateFilter : undefined,
      },
      include: {
        captain: { select: { id: true, name: true } },
        dispatcher: { select: { id: true, name: true } },
        boat: { select: { id: true, name: true } },
        pier: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: Object.keys(dateFilter).length ? dateFilter : undefined,
      },
      include: { captain: { select: { id: true, name: true } } },
    });

    // By captain
    const captainStats: Record<string, { name: string; trips: number; revenue: number; salary: number; expenses: number }> = {};
    trips.forEach((t) => {
      const k = t.captainId;
      if (!captainStats[k]) captainStats[k] = { name: t.captain.name, trips: 0, revenue: 0, salary: 0, expenses: 0 };
      captainStats[k].trips++;
      captainStats[k].revenue += t.price;
      captainStats[k].salary += t.captainSalary ?? 0;
    });
    expenses.forEach((e) => {
      const k = e.captainId;
      if (captainStats[k]) captainStats[k].expenses += e.amount;
    });

    // By dispatcher
    const dispatcherStats: Record<string, { name: string; trips: number; payment: number }> = {};
    trips.forEach((t) => {
      if (!t.dispatcherId || !t.dispatcher) return;
      const k = t.dispatcherId;
      if (!dispatcherStats[k]) dispatcherStats[k] = { name: t.dispatcher.name, trips: 0, payment: 0 };
      dispatcherStats[k].trips++;
      dispatcherStats[k].payment += t.dispatcherPayment ?? 0;
    });

    // By boat
    const boatStats: Record<string, { name: string; trips: number; revenue: number; profit: number }> = {};
    trips.forEach((t) => {
      const k = t.boatId;
      if (!boatStats[k]) boatStats[k] = { name: t.boat.name, trips: 0, revenue: 0, profit: 0 };
      boatStats[k].trips++;
      boatStats[k].revenue += t.price;
      boatStats[k].profit += t.profit ?? 0;
    });

    // By pier
    const pierStats: Record<string, { name: string; trips: number; cost: number }> = {};
    trips.forEach((t) => {
      const k = t.pierId;
      if (!pierStats[k]) pierStats[k] = { name: t.pier.name, trips: 0, cost: 0 };
      pierStats[k].trips++;
      pierStats[k].cost += t.pierCost;
    });

    const totalRevenue = trips.reduce((s, t) => s + t.price, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalProfit = trips.reduce((s, t) => s + (t.profit ?? 0), 0) - totalExpenses;

    res.json({
      period: { from, to },
      summary: { totalTrips: trips.length, totalRevenue, totalExpenses, totalProfit },
      byCapitan: captainStats,
      byDispatcher: dispatcherStats,
      byBoat: boatStats,
      byPier: pierStats,
    });
  } catch (err) { next(err); }
});

router.post('/close-day', requireRoles('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    const date = (req.body.date as string) || getToday();

    const captains = await prisma.user.findMany({
      where: { role: 'CAPTAIN', isActive: true },
      select: { id: true },
    });

    for (const captain of captains) {
      await recalcDailyBalance(captain.id, date);
      await prisma.dailyBalance.updateMany({
        where: { captainId: captain.id, date, isClosed: false },
        data: { isClosed: true, closedAt: new Date() },
      });
    }

    res.json({ message: `День ${date} закрыт для ${captains.length} капитанов` });
  } catch (err) { next(err); }
});

export default router;
