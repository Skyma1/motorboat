import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

export const paymentMethodLabel: Record<string, string> = {
  CASH: 'Наличные',
  TRANSFER: 'Перевод',
  ACQUIRING: 'Эквайринг',
};

export const tripStatusLabel: Record<string, string> = {
  CREATED: 'Создан',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершён',
};

export const tripStatusColor: Record<string, string> = {
  CREATED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export const boatStatusLabel: Record<string, string> = {
  FREE: 'Свободен',
  ON_TRIP: 'На рейсе',
  MAINTENANCE: 'Обслуживание',
};

export const boatStatusColor: Record<string, string> = {
  FREE: 'bg-green-100 text-green-800',
  ON_TRIP: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
};
