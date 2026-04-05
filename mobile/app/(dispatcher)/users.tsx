import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

type Role = 'ADMIN' | 'DISPATCHER' | 'CAPTAIN';
interface User {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
}

const roleLabel: Record<Role, string> = {
  ADMIN: 'Администратор',
  DISPATCHER: 'Диспетчер',
  CAPTAIN: 'Капитан',
};

export default function UsersScreen() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/users/${id}`, { isActive }),
    onSuccess: () => {
      setUpdatingId(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) => {
      setUpdatingId(null);
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка';
      Alert.alert('Ошибка', msg);
    },
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>Пользователи не найдены</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{roleLabel[item.role]}{item.phone ? ` · ${item.phone}` : ''}</Text>
          </View>
          <TouchableOpacity
            style={[styles.action, item.isActive ? styles.actionDanger : styles.actionSuccess]}
            onPress={() => {
              Alert.alert(
                item.isActive ? 'Отключить пользователя?' : 'Включить пользователя?',
                item.name,
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Подтвердить',
                    style: item.isActive ? 'destructive' : 'default',
                    onPress: () => {
                      setUpdatingId(item.id);
                      toggleMutation.mutate({ id: item.id, isActive: !item.isActive });
                    },
                  },
                ]
              );
            }}
            disabled={updatingId === item.id}
          >
            <Text style={styles.actionText}>
              {updatingId === item.id ? '...' : item.isActive ? 'Отключить' : 'Включить'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  action: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionDanger: { backgroundColor: '#fee2e2' },
  actionSuccess: { backgroundColor: '#dcfce7' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
});
