import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { recalcDailyBalance } from '../services/tripService';
import { AppError } from '../middleware/errorHandler';
import { getDateString, getTodayDateString as getToday } from '../utils/dateUtils';

const router = Router();

router.use(authenticate);

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateString(d);
};

const getPrevDate = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return getDateString(d);
};

router.get('/daily-summary', requireRoles('ADMIN', 'DISPATCHER'), async (req, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) || getToday();

    const trips = await prisma.trip.findMany({
      where: { date, status: 'COMPLETED' },
      include: { captain: { select: { id: true, name: true } } },
    });

    const totalRevenue = trips.reduce((s, t) => s + t.price, 0);
    const totalCaptainSalary = trips.reduce((s, t) => s + (t.captainSalary ?? 0), 0);
    const totalPierCost = trips.reduce((s, t) => s + t.pierCost, 0);
    const totalProfit = trips.reduce((s, t) => s + (t.profit ?? 0), 0);

    const expenses = await prisma.expense.findMany({ where: { date } });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const partTimeWorks = await prisma.partTimeWork.findMany({ where: { date } });
    const totalPartTimeIncome = partTimeWorks.reduce((s, r) => s + r.amount, 0);
    const fuelExpenses = await prisma.fuelExpense.findMany({ where: { date } });
    const totalFuelExpenses = fuelExpenses.reduce((s, r) => s + r.amount, 0);

    const balances = await prisma.dailyBalance.findMany({
      where: { date },
      include: { captain: { select: { id: true, name: true } } },
    });

    res.json({
      date,
      trips: trips.length,
      totalRevenue,
      totalCaptainSalary,
      totalPierCost,
      totalExpenses,
      totalPartTimeIncome,
      totalFuelExpenses,
      totalProfit: totalProfit + totalPartTimeIncome - totalExpenses - totalFuelExpenses,
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
        const previousDate = getPrevDate(date);
        const handover = await prisma.cashHandover.findUnique({
          where: { captainId_forDate: { captainId: captain.id, forDate: previousDate } },
        });
        return { captain, date, handover, ...b };
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
    const partTimeWorks = await prisma.partTimeWork.findMany({
      where: {
        date: Object.keys(dateFilter).length ? dateFilter : undefined,
      },
      include: { captain: { select: { id: true, name: true } } },
    });
    const fuelExpenses = await prisma.fuelExpense.findMany({
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
    partTimeWorks.forEach((p) => {
      const k = p.captainId;
      if (captainStats[k]) captainStats[k].revenue += p.amount;
    });
    fuelExpenses.forEach((f) => {
      const k = f.captainId;
      if (captainStats[k]) captainStats[k].expenses += f.amount;
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
      if (!t.pierId || !t.pier) return;
      const k = t.pierId;
      if (!pierStats[k]) pierStats[k] = { name: t.pier.name, trips: 0, cost: 0 };
      pierStats[k].trips++;
      pierStats[k].cost += t.pierCost;
    });

    const totalRevenue = trips.reduce((s, t) => s + t.price, 0);
    const totalPartTimeIncome = partTimeWorks.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0) + fuelExpenses.reduce((s, f) => s + f.amount, 0);
    const totalProfit = trips.reduce((s, t) => s + (t.profit ?? 0), 0) + totalPartTimeIncome - totalExpenses;

    res.json({
      period: { from, to },
      summary: { totalTrips: trips.length, totalRevenue, totalPartTimeIncome, totalExpenses, totalProfit },
      byCapitan: captainStats,
      byBoat: boatStats,
      byPier: pierStats,
    });
  } catch (err) { next(err); }
});

router.get('/cash-handover/required', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const captainId = req.user!.id;
    const yesterdayDate = getYesterday();
    const yesterdayBalance = await prisma.dailyBalance.findUnique({
      where: { captainId_date: { captainId, date: yesterdayDate } },
    });
    const handover = await prisma.cashHandover.findUnique({
      where: { captainId_forDate: { captainId, forDate: yesterdayDate } },
    });
    const required = !!yesterdayBalance && yesterdayBalance.cashIncome > 0 && yesterdayBalance.balance > 0 && !handover;
    res.json({
      required,
      forDate: yesterdayDate,
      amount: required ? yesterdayBalance!.balance : 0,
      handover,
    });
  } catch (err) { next(err); }
});

router.post('/cash-handover', requireRoles('CAPTAIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { forDate, receiverText, amount } = req.body;
    if (!forDate) throw new AppError('Укажите дату сдачи');
    if (!receiverText?.trim()) throw new AppError('Укажите, кому сдали наличку');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new AppError('Укажите корректную сумму');

    const handover = await prisma.cashHandover.upsert({
      where: { captainId_forDate: { captainId: req.user!.id, forDate } },
      create: {
        captainId: req.user!.id,
        forDate,
        amount: value,
        receiverText: receiverText.trim(),
      },
      update: {
        amount: value,
        receiverText: receiverText.trim(),
      },
    });
    res.status(201).json(handover);
  } catch (err) { next(err); }
});

router.put('/cash-handover/:id', requireRoles('ADMIN', 'DISPATCHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { receiverText, amount } = req.body;
    if (!receiverText?.trim()) throw new AppError('Укажите, кому сдали наличку');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new AppError('Укажите корректную сумму');

    const updated = await prisma.cashHandover.update({
      where: { id },
      data: {
        receiverText: receiverText.trim(),
        amount: value,
        editedByDispatcherAt: new Date(),
        editedByDispatcherId: req.user!.id,
      },
    });
    res.json(updated);
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
