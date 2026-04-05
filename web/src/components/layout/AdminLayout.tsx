import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
  LayoutDashboard, Users, Ship, Anchor, BarChart3,
  FileText, Wallet, LogOut, TrendingUp, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { canAccessNavItem } from '@/lib/permissions';

const navItems: Array<{
  key: 'dashboard' | 'trips' | 'balances' | 'reports' | 'users' | 'boats' | 'piers' | 'rates';
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}> = [
  { key: 'dashboard', to: '/', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { key: 'trips', to: '/trips', label: 'Рейсы', icon: Ship },
  { key: 'balances', to: '/balances', label: 'Балансы капитанов', icon: Wallet },
  { key: 'reports', to: '/reports', label: 'Отчёты', icon: TrendingUp },
  { key: 'users', to: '/users', label: 'Пользователи', icon: Users },
  { key: 'boats', to: '/boats', label: 'Катера', icon: Ship },
  { key: 'piers', to: '/piers', label: 'Причалы', icon: Anchor },
  { key: 'rates', to: '/rates', label: 'Ставки', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">MotorBoat</p>
              <p className="text-xs text-slate-400">Управление бизнесом</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => canAccessNavItem(user?.role, item.key))
            .map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400">
              {user?.role === 'ADMIN'
                ? 'Администратор'
                : user?.role === 'DISPATCHER'
                  ? 'Диспетчер'
                  : user?.role === 'CAPTAIN'
                    ? 'Капитан'
                    : user?.role}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
