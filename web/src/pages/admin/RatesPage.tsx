import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/types';

export default function RatesPage() {
  const qc = useQueryClient();

  const { data: captains = [] } = useQuery<User[]>({
    queryKey: ['captains'],
    queryFn: () => api.get('/users/captains').then((r) => r.data),
  });

  const captainRateMutation = useMutation({
    mutationFn: ({ captainId, hourlyRate, exitPayment }: { captainId: string; hourlyRate: number; exitPayment: number }) =>
      api.put(`/rates/captains/${captainId}`, { hourlyRate, exitPayment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['captains'] }); toast({ title: 'Ставка капитана обновлена' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const [captainRates, setCaptainRates] = useState<Record<string, { hourlyRate: string; exitPayment: string }>>({});

  const getCaptainRate = (captain: User) => ({
    hourlyRate: captainRates[captain.id]?.hourlyRate ?? String(captain.captainRate?.hourlyRate ?? 0),
    exitPayment: captainRates[captain.id]?.exitPayment ?? String(captain.captainRate?.exitPayment ?? 0),
  });

  return (
    <TooltipProvider>
      <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ставки</h1>
        <p className="text-muted-foreground text-sm mt-1">Настройка индивидуальных ставок для капитанов</p>
      </div>

      {/* Captains */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ставки капитанов</CardTitle>
          <CardDescription>Почасовая ставка и оплата за выход на работу</CardDescription>
        </CardHeader>
        <CardContent>
          {captains.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет капитанов</p>
          ) : (
            <div className="space-y-4">
              {captains.map((captain) => {
                const rates = getCaptainRate(captain);
                return (
                  <div key={captain.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700 flex-shrink-0">
                      {captain.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{captain.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">₽/час</p>
                        <Input
                          type="number" min="0" className="w-24 h-8 text-sm"
                          value={rates.hourlyRate}
                          onChange={(e) => setCaptainRates({
                            ...captainRates,
                            [captain.id]: { ...rates, hourlyRate: e.target.value },
                          })}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Выход (₽)</p>
                        <Input
                          type="number" min="0" className="w-28 h-8 text-sm"
                          value={rates.exitPayment}
                          onChange={(e) => setCaptainRates({
                            ...captainRates,
                            [captain.id]: { ...rates, exitPayment: e.target.value },
                          })}
                        />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            className="min-w-24 justify-center"
                            onClick={() => captainRateMutation.mutate({
                              captainId: captain.id,
                              hourlyRate: Number(rates.hourlyRate),
                              exitPayment: Number(rates.exitPayment),
                            })}
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Сохранить
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Сохранить изменения ставки</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
    </TooltipProvider>
  );
}
