import cron from 'node-cron';
import { prisma } from '../index';
import { recalcDailyBalance } from './tripService';
import { getDateString } from '../utils/dateUtils';

export const initScheduler = () => {
  // Every day at 00:00 (server timezone) — close the day
  cron.schedule(
    '0 0 * * *',
    async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getDateString(yesterday);

      console.log(`🕛 Closing day ${yesterdayStr}...`);

      const captains = await prisma.user.findMany({
        where: { role: 'CAPTAIN', isActive: true },
        select: { id: true },
      });

      for (const captain of captains) {
        try {
          await recalcDailyBalance(captain.id, yesterdayStr);

          await prisma.dailyBalance.updateMany({
            where: { captainId: captain.id, date: yesterdayStr, isClosed: false },
            data: { isClosed: true, closedAt: new Date() },
          });
        } catch (err) {
          console.error(`Error closing day for captain ${captain.id}:`, err);
        }
      }

      console.log(`✅ Day ${yesterdayStr} closed for ${captains.length} captains`);
    },
    { timezone: process.env.TZ || 'Europe/Moscow' }
  );
};
