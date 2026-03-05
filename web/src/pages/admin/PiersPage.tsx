import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Anchor } from 'lucide-react';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/utils';
import type { Pier } from '@/types';

export default function PiersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editPier, setEditPier] = useState<Pier | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const { data: piers = [], isLoading } = useQuery<Pier[]>({
    queryKey: ['piers'],
    queryFn: () => api.get('/piers').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; cost: number }) => api.post('/piers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['piers'] }); setOpen(false); toast({ title: 'Причал добавлен' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; cost: number } }) => api.put(`/piers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['piers'] }); setOpen(false); toast({ title: 'Причал обновлён' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/piers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['piers'] }); toast({ title: 'Причал удалён' }); },
  });

  const openCreate = () => { setEditPier(null); setName(''); setCost(''); setOpen(true); };
  const openEdit = (pier: Pier) => { setEditPier(pier); setName(pier.name); setCost(String(pier.cost)); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, cost: Number(cost) };
    if (editPier) updateMutation.mutate({ id: editPier.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Причалы</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление причалами и стоимостью посадки</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить причал</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {piers.map((pier) => (
            <Card key={pier.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Anchor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{pier.name}</p>
                      <p className="text-sm text-blue-600 font-medium">{formatMoney(pier.cost)} / рейс</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(pier)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Изменить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(pier.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPier ? 'Редактировать причал' : 'Новый причал'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Набережная" />
            </div>
            <div className="space-y-2">
              <Label>Стоимость за рейс (₽) *</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} required min="0" placeholder="600" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit">{editPier ? 'Сохранить' : 'Добавить'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
