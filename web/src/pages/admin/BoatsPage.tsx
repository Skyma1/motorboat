import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { boatStatusColor, boatStatusLabel } from '@/lib/utils';
import type { Boat, User } from '@/types';

export default function BoatsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editBoat, setEditBoat] = useState<Boat | null>(null);
  const [name, setName] = useState('');
  const [captainId, setCaptainId] = useState('');
  const [status, setStatus] = useState('FREE');

  const { data: boats = [], isLoading } = useQuery<Boat[]>({
    queryKey: ['boats'],
    queryFn: () => api.get('/boats').then((r) => r.data),
  });

  const { data: captains = [] } = useQuery<User[]>({
    queryKey: ['captains'],
    queryFn: () => api.get('/users/captains').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; captainId?: string }) => api.post('/boats', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boats'] }); setOpen(false); toast({ title: 'Катер добавлен' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.put(`/boats/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boats'] }); setOpen(false); toast({ title: 'Катер обновлён' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/boats/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boats'] }); toast({ title: 'Катер деактивирован' }); },
    onError: (e: unknown) => { toast({ title: 'Ошибка', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }); },
  });

  const openCreate = () => { setEditBoat(null); setName(''); setCaptainId('none'); setStatus('FREE'); setOpen(true); };
  const openEdit = (boat: Boat) => {
    setEditBoat(boat); setName(boat.name);
    setCaptainId(boat.captain?.captainId || 'none');
    setStatus(boat.status); setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, captainId: captainId === 'none' ? undefined : captainId, status };
    if (editBoat) updateMutation.mutate({ id: editBoat.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Катера</h1>
          <p className="text-muted-foreground text-sm mt-1">{boats.length} катеров в системе</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Добавить катер</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boats.map((boat) => (
            <Card key={boat.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{boat.name}</p>
                    {boat.captain?.captain && (
                      <p className="text-sm text-muted-foreground">Капитан: {boat.captain.captain.name}</p>
                    )}
                  </div>
                  <Badge className={boatStatusColor[boat.status]}>{boatStatusLabel[boat.status]}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(boat)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Изменить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(boat.id)} disabled={boat.status === 'ON_TRIP'}>
                    <Trash2 className="w-3.5 h-3.5" />
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
            <DialogTitle>{editBoat ? 'Редактировать катер' : 'Новый катер'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Аврора" />
            </div>
            <div className="space-y-2">
              <Label>Капитан</Label>
              <Select value={captainId} onValueChange={setCaptainId}>
                <SelectTrigger><SelectValue placeholder="Без капитана" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без капитана</SelectItem>
                  {captains.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editBoat && (
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Свободен</SelectItem>
                    <SelectItem value="ON_TRIP">На рейсе</SelectItem>
                    <SelectItem value="MAINTENANCE">Обслуживание</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit">{editBoat ? 'Сохранить' : 'Добавить'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
