import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { formatMoney, formatDateTime } from '@/utils/format';

interface Trip {
  id: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
  price: number;
  paymentMethod: string;
  startedAt: string | null;
  boat: { id: string; name: string };
  captain: { id: string; name: string };
  pier: { id: string; name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Создан', color: '#92400e', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'На ходу', color: '#1e40af', bg: '#dbeafe' },
  COMPLETED: { label: 'Завершён', color: '#166534', bg: '#dcfce7' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Наличные', TRANSFER: 'Перевод', ACQUIRING: 'Эквайринг',
};

export default function DispatcherHome() {
  const { data: trips = [], isLoading, refetch } = useQuery<Trip[]>({
    queryKey: ['all-active-trips'],
    queryFn: () => api.get('/trips/active').then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{trips.filter(t => t.status === 'IN_PROGRESS').length}</Text>
          <Text style={styles.statLabel}>На ходу</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{trips.filter(t => t.status === 'CREATED').length}</Text>
          <Text style={styles.statLabel}>Ожидает</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatMoney(trips.reduce((s, t) => s + t.price, 0))}</Text>
          <Text style={styles.statLabel}>Выручка</Text>
        </View>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>Нет активных рейсов</Text></View>
        }
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.boatName}>{item.boat.name}</Text>
                  <Text style={styles.captainName}>Капитан: {item.captain.name}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.infoText}>{PAYMENT_LABELS[item.paymentMethod]}</Text>
                <Text style={[styles.infoText, styles.price]}>{formatMoney(item.price)}</Text>
              </View>
              {item.startedAt && (
                <Text style={styles.timeText}>Начало: {formatDateTime(item.startedAt)}</Text>
              )}
            </View>
          );
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  statsBar: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 16, paddingHorizontal: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  boatName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  captainName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardInfo: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' },
  infoText: { fontSize: 14, color: '#374151' },
  price: { fontWeight: '700', color: '#16a34a', marginLeft: 'auto' },
  timeText: { fontSize: 12, color: '#94a3b8' },
});
