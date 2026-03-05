import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = process.env.TZ || 'Europe/Moscow';

export const getTodayDateString = (): string => {
  const now = new Date();
  const zoned = toZonedTime(now, TZ);
  return format(zoned, 'yyyy-MM-dd');
};

export const getDateString = (date: Date): string => {
  const zoned = toZonedTime(date, TZ);
  return format(zoned, 'yyyy-MM-dd');
};

export const calcDurationMinutes = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / 60000;
};
