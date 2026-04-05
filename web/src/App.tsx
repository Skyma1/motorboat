import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/components/layout/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import UsersPage from '@/pages/admin/UsersPage';
import BoatsPage from '@/pages/admin/BoatsPage';
import PiersPage from '@/pages/admin/PiersPage';
import RatesPage from '@/pages/admin/RatesPage';
import TripsPage from '@/pages/admin/TripsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import BalancesPage from '@/pages/admin/BalancesPage';
import { Toaster } from '@/components/ui/toaster';
import { canAccessRoute } from '@/lib/permissions';

function RequireAuth({ children, route }: { children: React.ReactNode; route?: string }) {
  const { accessToken, user } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user?.role === 'CAPTAIN') return <Navigate to="/login" replace />;
  if (route && !canAccessRoute(user?.role, route)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<RequireAuth route="/users"><UsersPage /></RequireAuth>} />
          <Route path="boats" element={<RequireAuth route="/boats"><BoatsPage /></RequireAuth>} />
          <Route path="piers" element={<RequireAuth route="/piers"><PiersPage /></RequireAuth>} />
          <Route path="rates" element={<RequireAuth route="/rates"><RatesPage /></RequireAuth>} />
          <Route path="trips" element={<RequireAuth route="/trips"><TripsPage /></RequireAuth>} />
          <Route path="reports" element={<RequireAuth route="/reports"><ReportsPage /></RequireAuth>} />
          <Route path="balances" element={<RequireAuth route="/balances"><BalancesPage /></RequireAuth>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
