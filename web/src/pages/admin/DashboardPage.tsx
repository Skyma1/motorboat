import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TrendingUp, Ship, Wallet, Users } from 'lucide-react';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, tripStatusColor, tripStatusLabel, boatStatusColor, boatStatusLabel } from '@/lib/utils';
import type { Trip, Boat, DailySummary } from '@/types';

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: summary } = useQuery<DailySummary>({
    queryKey: ['daily-summary', today],
    queryFn: () => api.get(`/finance/daily-summary?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: activeTrips = [] } = useQuery<Trip[]>({
    queryKey: ['active-trips'],
    queryFn: () => api.get('/trips/active').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: boats = [] } = useQuery<Boat[]>({
    queryKey: ['boats'],
    queryFn: () => api.get('/boats').then((r) => r.data),
  });

  const todayLabel = format(new Date(), 'd MMMM yyyy', { locale: ru });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1">{todayLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Выручка сегодня"
          value={formatMoney(summary?.totalRevenue ?? 0)}
          sub={`${summary?.trips ?? 0} рейсов`}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Прибыль сегодня"
          value={formatMoney(summary?.totalProfit ?? 0)}
          icon={Wallet}
          color="bg-blue-500"
        />
        <StatCard
          title="Активных рейсов"
          value={String(activeTrips.length)}
          icon={Ship}
          color="bg-orange-500"
        />
        <StatCard
          title="Катеров на рейсе"
          value={String(boats.filter((b) => b.status === 'ON_TRIP').length)}
          sub={`из ${boats.length} всего`}
          icon={Users}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active trips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Активные рейсы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTrips.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Нет активных рейсов</p>
            ) : (
              <div className="space-y-3">
                {activeTrips.map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{trip.boat.name}</p>
                      <p className="text-xs text-muted-foreground">Капитан: {trip.captain.name}</p>
                      <p className="text-xs text-muted-foreground">Причал: {trip.pier?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={tripStatusColor[trip.status]}>
                        {tripStatusLabel[trip.status]}
                      </Badge>
                      <p className="text-sm font-semibold mt-1">{formatMoney(trip.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Флот
            </CardTitle>
          </CardHeader>
          <CardContent>
            {boats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Нет катеров</p>
            ) : (
              <div className="space-y-3">
                {boats.map((boat) => (
                  <div key={boat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{boat.name}</p>
                      {boat.captain?.captain && (
                        <p className="text-xs text-muted-foreground">
                          Капитан: {boat.captain.captain.name}
                        </p>
                      )}
                    </div>
                    <Badge className={boatStatusColor[boat.status]}>
                      {boatStatusLabel[boat.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's finance */}
        {summary && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Финансы за сегодня
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Выручка', value: summary.totalRevenue, color: 'text-green-600' },
                  { label: 'Зарплаты капитанов', value: summary.totalCaptainSalary, color: 'text-orange-600' },
                  { label: 'Стоимость причалов', value: summary.totalPierCost, color: 'text-slate-600' },
                  { label: 'Подработки', value: summary.totalPartTimeIncome, color: 'text-blue-600' },
                  { label: 'Заправка', value: summary.totalFuelExpenses, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{formatMoney(value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                <p className="font-semibold text-blue-900">Итого прибыль</p>
                <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatMoney(summary.totalProfit)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
