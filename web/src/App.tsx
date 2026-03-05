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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
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
          <Route path="users" element={<UsersPage />} />
          <Route path="boats" element={<BoatsPage />} />
          <Route path="piers" element={<PiersPage />} />
          <Route path="rates" element={<RatesPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="balances" element={<BalancesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
