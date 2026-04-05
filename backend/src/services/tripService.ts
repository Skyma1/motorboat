import { prisma } from '../index';
import { io } from '../index';
import { AppError } from '../middleware/errorHandler';
import { calcDurationMinutes } from '../utils/dateUtils';

export const completeTripCalculations = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      captain: { include: { captainRate: true } },
    },
  });

  if (!trip) throw new AppError('Рейс не найден', 404);
  if (!trip.startedAt || !trip.endedAt) throw new AppError('Рейс не завершён');

  const durationMinutes = calcDurationMinutes(trip.startedAt, trip.endedAt);
  const hourlyRate = trip.captain.captainRate?.hourlyRate ?? 0;
  const captainSalary = (hourlyRate / 60) * durationMinutes;
  const pierCost = 0;
  const profit = trip.price - captainSalary - pierCost;

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      durationMinutes,
      captainSalary,
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
  const partTimeWorks = await prisma.partTimeWork.findMany({
    where: { captainId, date },
  });
  const fuelExpenses = await prisma.fuelExpense.findMany({
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
  const partTimeIncome = partTimeWorks.reduce((sum, i) => sum + i.amount, 0);
  const fuelTotal = fuelExpenses.reduce((sum, f) => sum + f.amount, 0);
  const operationalSpend = expensesTotal + fuelTotal;

  const balance = cashIncome + partTimeIncome - effectiveSalary - operationalSpend;

  await prisma.dailyBalance.upsert({
    where: { captainId_date: { captainId, date } },
    create: {
      captainId,
      date,
      cashIncome,
      captainSalary: effectiveSalary,
      exitPayment,
      expensesTotal: operationalSpend,
      balance,
    },
    update: {
      cashIncome,
      captainSalary: effectiveSalary,
      exitPayment,
      expensesTotal: operationalSpend,
      balance,
    },
  });

  return {
    cashIncome,
    partTimeIncome,
    captainSalary: effectiveSalary,
    exitPayment,
    expensesTotal,
    fuelTotal,
    operationalSpend,
    balance,
  };
};
