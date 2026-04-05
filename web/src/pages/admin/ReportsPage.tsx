import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, pluralizeRu } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'custom';

interface ReportData {
  summary: { totalTrips: number; totalRevenue: number; totalPartTimeIncome: number; totalExpenses: number; totalProfit: number };
  byCapitan: Record<string, { name: string; trips: number; revenue: number; salary: number; expenses: number }>;
  byBoat: Record<string, { name: string; trips: number; revenue: number; profit: number }>;
  byPier: Record<string, { name: string; trips: number; cost: number }>;
}

export default function ReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const getRange = (): { from: string; to: string } => {
    switch (period) {
      case 'today': return { from: today, to: today };
      case 'week': return {
        from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
      case 'month': return {
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      };
      case 'custom': return { from: customFrom, to: customTo };
    }
  };

  const { from, to } = getRange();

  const { data: report, isLoading } = useQuery<ReportData>({
    queryKey: ['reports', from, to],
    queryFn: () => api.get(`/finance/reports?from=${from}&to=${to}`).then((r) => r.data),
  });

  const captainChartData = Object.entries(report?.byCapitan ?? {}).map(([, v]) => ({
    name: v.name.split(' ')[0],
    Выручка: v.revenue,
    Зарплата: v.salary,
    Рейсов: v.trips,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Отчёты и аналитика</h1>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-end gap-3 mb-8">
        {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {{ today: 'Сегодня', week: 'Неделя', month: 'Месяц', custom: 'Период' }[p]}
          </Button>
        ))}
        {period === 'custom' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">От</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40 h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">До</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40 h-9" />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : !report ? null : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Рейсов', value: String(report.summary.totalTrips), color: 'text-slate-900' },
              { label: 'Выручка', value: formatMoney(report.summary.totalRevenue), color: 'text-green-600' },
              { label: 'Подработки', value: formatMoney(report.summary.totalPartTimeIncome), color: 'text-blue-600' },
              { label: 'Расходы', value: formatMoney(report.summary.totalExpenses), color: 'text-red-600' },
              { label: 'Прибыль', value: formatMoney(report.summary.totalProfit), color: report.summary.totalProfit >= 0 ? 'text-green-700' : 'text-red-600' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-5 text-center">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {captainChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Выручка и зарплата по капитанам</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={captainChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${v / 1000}к`} />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Legend />
                    <Bar dataKey="Выручка" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Зарплата" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By captain */}
            <Card>
              <CardHeader><CardTitle className="text-base">По капитанам</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.byCapitan).map(([id, v]) => (
                    <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.trips} {pluralizeRu(v.trips, ['рейс', 'рейса', 'рейсов'])}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatMoney(v.revenue)}</p>
                        <p className="text-xs text-muted-foreground">ЗП: {formatMoney(v.salary)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By boat */}
            <Card>
              <CardHeader><CardTitle className="text-base">По катерам</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.byBoat).map(([id, v]) => (
                    <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.trips} {pluralizeRu(v.trips, ['рейс', 'рейса', 'рейсов'])}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatMoney(v.revenue)}</p>
                        <p className="text-xs text-muted-foreground">прибыль: {formatMoney(v.profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* By pier */}
            <Card>
              <CardHeader><CardTitle className="text-base">По причалам</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(report.byPier).map(([id, v]) => (
                    <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.trips} {pluralizeRu(v.trips, ['рейс', 'рейса', 'рейсов'])}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-600">{formatMoney(v.cost)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
