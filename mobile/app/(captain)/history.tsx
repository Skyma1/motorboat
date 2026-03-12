import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/api/client';
import { formatMoney, formatDateTime, formatDuration, paymentMethodLabel } from '@/utils/format';

interface Trip {
  id: string;
  price: number;
  paymentMethod: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  captainSalary: number | null;
  profit: number | null;
  date: string;
  boat: { name: string };
  pier: { name: string } | null;
  dockingType?: 'PRIVATE' | 'CITY' | null;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#f59e0b',
  IN_PROGRESS: '#2563eb',
  COMPLETED: '#16a34a',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершён',
};

export default function HistoryScreen() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ trips: Trip[]; total: number }>({
    queryKey: ['captain-history', page],
    queryFn: () => api.get(`/trips?limit=20&page=${page}`).then((r) => r.data),
  });

  const trips = data?.trips ?? [];

  if (isLoading) return <ActivityIndicator style={{ marginTop: 60 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет рейсов</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.boatName}>{item.boat.name}</Text>
                <Text style={styles.pierName}>
                  {item.dockingType === 'CITY'
                    ? `Городская${item.pier?.name ? `: ${item.pier.name}` : ''}`
                    : item.dockingType === 'PRIVATE'
                      ? 'Наш причал'
                      : 'Швартовка не заполнена'} · {item.date}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Цена</Text>
                  <Text style={styles.infoValue}>{formatMoney(item.price)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Оплата</Text>
                  <Text style={styles.infoValue}>{paymentMethodLabel[item.paymentMethod]}</Text>
                </View>
                {item.durationMinutes != null && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Длит.</Text>
                    <Text style={styles.infoValue}>{formatDuration(item.durationMinutes)}</Text>
                  </View>
                )}
                {item.captainSalary != null && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Моя ЗП</Text>
                    <Text style={styles.infoValue}>{formatMoney(item.captainSalary)}</Text>
                  </View>
                )}
              </View>

              {item.startedAt && (
                <Text style={styles.timeText}>
                  {formatDateTime(item.startedAt)}
                  {item.endedAt ? ` — ${formatDateTime(item.endedAt)}` : ''}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 10 },
  headerLeft: { flex: 1 },
  boatName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  pierName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  infoItem: {},
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  timeText: { fontSize: 12, color: '#9ca3af' },
});
