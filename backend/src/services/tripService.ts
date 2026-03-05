import { prisma } from '../index';
import { io } from '../index';
import { AppError } from '../middleware/errorHandler';
import { calcDurationMinutes, getDateString } from '../utils/dateUtils';

export const completeTripCalculations = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      captain: { include: { captainRate: true } },
      dispatcher: { include: { dispatcherRate: true } },
      pier: true,
    },
  });

  if (!trip) throw new AppError('Рейс не найден', 404);
  if (!trip.startedAt || !trip.endedAt) throw new AppError('Рейс не завершён');

  const durationMinutes = calcDurationMinutes(trip.startedAt, trip.endedAt);
  const hourlyRate = trip.captain.captainRate?.hourlyRate ?? 0;
  const captainSalary = (hourlyRate / 60) * durationMinutes;
  const dispatcherPayment = trip.dispatcher
    ? (trip.dispatcher.dispatcherRate?.ratePerTrip ?? 0)
    : 0;
  const pierCost = trip.pier.cost;
  const profit = trip.price - captainSalary - dispatcherPayment - pierCost;

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      durationMinutes,
      captainSalary,
      dispatcherPayment,
      pierCost,
      profit,
    },
  });

  await recalcDailyBalance(trip.captainId, trip.date);

  io.emit('trip:updated', { tripId });
  io.emit('balance:updated', { captainId: trip.captainId, date: trip.date });

  return updated;
};

export const recalcDailyBalance = async (captainId: string, date: string) => {
  const trips = await prisma.trip.findMany({
    where: { captainId, date, status: 'COMPLETED' },
  });

  const expenses = await prisma.expense.findMany({
    where: { captainId, date },
  });

  const captain = await prisma.user.findUnique({
    where: { id: captainId },
    include: { captainRate: true },
  });

  const cashIncome = trips
    .filter((t) => t.paymentMethod === 'CASH')
    .reduce((sum, t) => sum + t.price, 0);

  const totalSalaryFromTrips = trips.reduce(
    (sum, t) => sum + (t.captainSalary ?? 0),
    0
  );

  const exitPayment = captain?.captainRate?.exitPayment ?? 0;
  const effectiveSalary = Math.max(totalSalaryFromTrips, exitPayment);

  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const balance = cashIncome - effectiveSalary - expensesTotal;

  await prisma.dailyBalance.upsert({
    where: { captainId_date: { captainId, date } },
    create: {
      captainId,
      date,
      cashIncome,
      captainSalary: effectiveSalary,
      exitPayment,
      expensesTotal,
      balance,
    },
    update: {
      cashIncome,
      captainSalary: effectiveSalary,
      exitPayment,
      expensesTotal,
      balance,
    },
  });

  return { cashIncome, captainSalary: effectiveSalary, exitPayment, expensesTotal, balance };
};
