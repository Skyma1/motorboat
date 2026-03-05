import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/api/client';
import { formatMoney } from '@/utils/format';

interface Balance {
  captain: { id: string; name: string };
  cashIncome: number;
  captainSalary: number;
  expensesTotal: number;
  balance: number;
}

export default function BalancesScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: balances = [], isLoading, refetch } = useQuery<Balance[]>({
    queryKey: ['balances', today],
    queryFn: () => api.get(`/finance/balances?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <FlatList
      data={balances}
      keyExtractor={(b) => b.captain.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      ListEmptyComponent={
        <View style={styles.empty}><Text style={styles.emptyText}>Нет данных</Text></View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { borderLeftColor: item.balance >= 0 ? '#16a34a' : '#dc2626' }]}>
          <View style={styles.header}>
            <Text style={styles.captainName}>{item.captain.name}</Text>
            <Text style={[styles.balance, { color: item.balance >= 0 ? '#16a34a' : '#dc2626' }]}>
              {item.balance >= 0 ? '↑ ' : '↓ '}{formatMoney(Math.abs(item.balance))}
            </Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.detail}>+ Наличные: {formatMoney(item.cashIncome)}</Text>
            <Text style={styles.detail}>− ЗП: {formatMoney(item.captainSalary)}</Text>
            <Text style={styles.detail}>− Расходы: {formatMoney(item.expensesTotal)}</Text>
          </View>
          <Text style={styles.result}>
            {item.balance >= 0 ? `Сдаёт ${formatMoney(item.balance)}` : `Получает ${formatMoney(Math.abs(item.balance))}`}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  captainName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  balance: { fontSize: 16, fontWeight: '800' },
  details: { gap: 3, marginBottom: 10 },
  detail: { fontSize: 13, color: '#64748b' },
  result: { fontSize: 14, fontWeight: '600', color: '#374151', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
});
