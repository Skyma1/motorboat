import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { canManageUsers } from '@/lib/permissions';
import { pluralizeRu } from '@/lib/utils';
import type { User } from '@/types';

const roleLabel: Record<string, string> = { ADMIN: 'Администратор', DISPATCHER: 'Диспетчер', CAPTAIN: 'Капитан' };
const roleColor: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  DISPATCHER: 'bg-blue-100 text-blue-800',
  CAPTAIN: 'bg-green-100 text-green-800',
};

interface UserForm {
  name: string; phone: string; password: string; role: string;
  hourlyRate: string; exitPayment: string;
}

const defaultForm: UserForm = {
  name: '', phone: '', password: '', role: 'CAPTAIN',
  hourlyRate: '1600', exitPayment: '2500',
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const canManage = canManageUsers(user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(defaultForm);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserForm) => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm(defaultForm);
      toast({ title: 'Пользователь создан' });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка';
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserForm> }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setEditUser(null);
      toast({ title: 'Пользователь обновлён' });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка';
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => {
    setEditUser(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name,
      phone: user.phone || '',
      password: '',
      role: user.role,
      hourlyRate: String(user.captainRate?.hourlyRate ?? 1600),
      exitPayment: String(user.captainRate?.exitPayment ?? 2500),
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, data: { name: form.name, phone: form.phone, password: form.password || undefined } });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Пользователи</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} {pluralizeRu(users.length, ['пользователь', 'пользователя', 'пользователей'])} в системе
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Добавить
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="grid gap-4">
          {['ADMIN', 'DISPATCHER', 'CAPTAIN'].map((role) => {
            const roleUsers = users.filter((u) => u.role === role);
            if (roleUsers.length === 0) return null;
            return (
              <Card key={role}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {roleLabel[role]} ({roleUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {roleUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.phone || user.email}</p>
                            {user.role === 'CAPTAIN' && user.captainRate && (
                              <p className="text-xs text-blue-600">
                                {user.captainRate.hourlyRate}₽/ч · выход: {user.captainRate.exitPayment}₽
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={roleColor[user.role]}>{roleLabel[user.role]}</Badge>
                          {!user.isActive && <Badge variant="destructive">Неактивен</Badge>}
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" className="h-auto flex-col gap-1 px-2 py-1" onClick={() => openEdit(user)}>
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="text-[10px] leading-none text-slate-600">отредактировать</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-auto flex-col gap-1 px-2 py-1"
                                onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                              >
                                {user.isActive ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                                <span className="text-[10px] leading-none text-red-600">удалить</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open && canManage} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+79001234567" />
            </div>
            <div className="space-y-2">
              <Label>Пароль {editUser ? '(оставьте пустым — не менять)' : '*'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editUser} />
            </div>
            {!editUser && (
              <div className="space-y-2">
                <Label>Роль *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAPTAIN">Капитан</SelectItem>
                    <SelectItem value="DISPATCHER">Диспетчер</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.role === 'CAPTAIN' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ставка (₽/час)</Label>
                  <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Оплата за выход (₽)</Label>
                  <Input type="number" value={form.exitPayment} onChange={(e) => setForm({ ...form, exitPayment: e.target.value })} min="0" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editUser ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
