import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  formatMoney, formatDateTime, formatDateRange, formatDuration,
  tripStatusColor, tripStatusLabel, paymentMethodLabel,
} from '@/lib/utils';
import type { Trip } from '@/types';

export default function TripsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery<{ trips: Trip[]; total: number }>({
    queryKey: ['trips', from, to, status],
    queryFn: () => {
      const params = new URLSearchParams({ from, to, limit: '100' });
      if (status !== 'all') params.set('status', status);
      return api.get(`/trips?${params}`).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/trips/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      toast({ title: 'Рейс удален' });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка удаления';
      toast({ title: 'Не удалось удалить рейс', description: msg, variant: 'destructive' });
    },
  });

  const handleDelete = (trip: Trip) => {
    if (user?.role !== 'ADMIN') {
      toast({ title: 'Удаление недоступно', description: 'Удалять рейсы может только администратор', variant: 'destructive' });
      return;
    }
    const confirmation = window.confirm(`Удалить рейс ${trip.boat.name} на ${formatDateRange(from, to)}? Это действие необратимо.`);
    if (!confirmation) return;
    deleteMutation.mutate(trip.id);
  };

  const trips = data?.trips ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Рейсы</h1>
        <p className="text-muted-foreground text-sm mt-1">Журнал всех рейсов</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-1">
          <Label>С даты</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>По дату</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>Статус</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="CREATED">Создан</SelectItem>
              <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
              <SelectItem value="COMPLETED">Завершён</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Нет рейсов за выбранный период</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className={`w-1.5 flex-shrink-0 ${trip.status === 'COMPLETED' ? 'bg-green-500' : trip.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{trip.boat.name}</span>
                          <Badge className={tripStatusColor[trip.status]}>{tripStatusLabel[trip.status]}</Badge>
                          <Badge variant="outline">{paymentMethodLabel[trip.paymentMethod]}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                          <div><span className="text-muted-foreground">Капитан:</span> {trip.captain.name}</div>
                          <div>
                            <span className="text-muted-foreground">Период:</span>{' '}
                            {formatDateRange(trip.date, trip.date)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Дата:</span>{' '}
                            {trip.date}
                          </div>
                          {trip.startedAt && <div><span className="text-muted-foreground">Начало:</span> {formatDateTime(trip.startedAt)}</div>}
                          {trip.endedAt && <div><span className="text-muted-foreground">Конец:</span> {formatDateTime(trip.endedAt)}</div>}
                          {trip.durationMinutes != null && (
                            <div><span className="text-muted-foreground">Длит.:</span> {formatDuration(trip.durationMinutes)}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {trip.status === 'COMPLETED' ? (
                          <p className="text-lg font-bold text-green-600">{formatMoney(trip.price)}</p>
                        ) : (
                          <p className="text-lg font-bold">{formatMoney(trip.price)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">прибыль: {formatMoney(trip.profit ?? 0)}</p>
                        <p className="text-xs text-muted-foreground">капитан: {formatMoney(trip.captainSalary ?? 0)}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => handleDelete(trip)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
                        </Button>
                      </div>
                    </div>
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
