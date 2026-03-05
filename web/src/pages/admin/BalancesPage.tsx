import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import api from '@/api/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';

interface BalanceEntry {
  captain: { id: string; name: string };
  date: string;
  cashIncome: number;
  captainSalary: number;
  exitPayment: number;
  expensesTotal: number;
  balance: number;
}

export default function BalancesPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: balances = [], isLoading } = useQuery<BalanceEntry[]>({
    queryKey: ['balances', date],
    queryFn: () => api.get(`/finance/balances?date=${date}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);
  const captainsOwing = balances.filter((b) => b.balance > 0);
  const captainsReceiving = balances.filter((b) => b.balance < 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Балансы капитанов</h1>
        <p className="text-muted-foreground text-sm mt-1">Ежедневный баланс наличных по каждому капитану</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="space-y-1">
          <Label>Дата</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="mt-6 flex gap-4">
          <div className="px-4 py-2 bg-green-50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Сдают владельцу</p>
            <p className="font-bold text-green-700">{formatMoney(captainsOwing.reduce((s, b) => s + b.balance, 0))}</p>
          </div>
          <div className="px-4 py-2 bg-red-50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Получают от бизнеса</p>
            <p className="font-bold text-red-600">{formatMoney(Math.abs(captainsReceiving.reduce((s, b) => s + b.balance, 0)))}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : balances.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">Нет данных за выбранный день</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((b) => (
            <Card key={b.captain.id} className={`border-l-4 ${b.balance > 0 ? 'border-l-green-500' : b.balance < 0 ? 'border-l-red-500' : 'border-l-gray-300'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{b.captain.name}</span>
                  <div className="flex items-center gap-1">
                    {b.balance > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : b.balance < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`font-bold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {formatMoney(Math.abs(b.balance))}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">+ Наличные от клиентов</span>
                    <span className="font-medium text-green-600">{formatMoney(b.cashIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Зарплата капитана</span>
                    <span className="font-medium text-red-600">−{formatMoney(b.captainSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Хоз. расходы</span>
                    <span className="font-medium text-red-600">−{formatMoney(b.expensesTotal)}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between font-semibold">
                    <span>{b.balance >= 0 ? 'Сдаёт владельцу' : 'Получает от бизнеса'}</span>
                    <span className={b.balance >= 0 ? 'text-green-700' : 'text-red-600'}>
                      {formatMoney(Math.abs(b.balance))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
