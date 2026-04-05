import type { Role } from '@/types';

type NavItemKey =
  | 'dashboard'
  | 'trips'
  | 'balances'
  | 'reports'
  | 'users'
  | 'boats'
  | 'piers'
  | 'rates';

const navRoleAccess: Record<NavItemKey, Role[]> = {
  dashboard: ['ADMIN', 'DISPATCHER'],
  trips: ['ADMIN', 'DISPATCHER'],
  balances: ['ADMIN', 'DISPATCHER'],
  reports: ['ADMIN', 'DISPATCHER'],
  users: ['ADMIN'],
  boats: ['ADMIN', 'DISPATCHER'],
  piers: ['ADMIN', 'DISPATCHER'],
  rates: ['ADMIN', 'DISPATCHER'],
};

const routeAccess: Record<string, Role[]> = {
  '/': ['ADMIN', 'DISPATCHER'],
  '/trips': ['ADMIN', 'DISPATCHER'],
  '/balances': ['ADMIN', 'DISPATCHER'],
  '/reports': ['ADMIN', 'DISPATCHER'],
  '/users': ['ADMIN'],
  '/boats': ['ADMIN', 'DISPATCHER'],
  '/piers': ['ADMIN', 'DISPATCHER'],
  '/rates': ['ADMIN', 'DISPATCHER'],
};

export function canAccessNavItem(role: Role | undefined, key: NavItemKey): boolean {
  if (!role) return false;
  return navRoleAccess[key].includes(role);
}

export function canAccessRoute(role: Role | undefined, route: string): boolean {
  if (!role) return false;
  const allowed = routeAccess[route];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function canManageUsers(role: Role | undefined): boolean {
  return role === 'ADMIN';
}

export function canCreateBoat(role: Role | undefined): boolean {
  return role === 'ADMIN';
}

export function canDeleteBoat(role: Role | undefined): boolean {
  return role === 'ADMIN';
}
