import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/api/client';
import { formatMoney } from '@/utils/format';

interface DailySummary {
  date: string;
  trips: number;
  totalRevenue: number;
  totalCaptainSalary: number;
  totalDispatcherPayment: number;
  totalPierCost: number;
  totalExpenses: number;
  totalProfit: number;
}

export default function FinanceScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: summary, isLoading, refetch } = useQuery<DailySummary>({
    queryKey: ['daily-summary', today],
    queryFn: () => api.get(`/finance/daily-summary?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <Text style={styles.dateLabel}>{format(new Date(), 'd MMMM yyyy', { locale: ru })}</Text>

      {summary && (
        <>
          {/* Profit highlight */}
          <View style={[styles.profitCard, { backgroundColor: summary.totalProfit >= 0 ? '#052e16' : '#450a0a' }]}>
            <Text style={styles.profitLabel}>Прибыль за день</Text>
            <Text style={styles.profitAmount}>{formatMoney(summary.totalProfit)}</Text>
            <Text style={styles.tripsCount}>{summary.trips} рейсов</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsCard}>
            {[
              { label: 'Выручка', value: summary.totalRevenue, color: '#16a34a', sign: '+' },
              { label: 'Зарплаты капитанов', value: summary.totalCaptainSalary, color: '#dc2626', sign: '−' },
              { label: 'Оплата диспетчеров', value: summary.totalDispatcherPayment, color: '#dc2626', sign: '−' },
              { label: 'Стоимость причалов', value: summary.totalPierCost, color: '#dc2626', sign: '−' },
              { label: 'Хоз. расходы', value: summary.totalExpenses, color: '#dc2626', sign: '−' },
            ].map(({ label, value, color, sign }) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, { color }]}>{sign}{formatMoney(value)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.totalLabel}>Итого прибыль</Text>
              <Text style={[styles.totalValue, { color: summary.totalProfit >= 0 ? '#16a34a' : '#dc2626' }]}>
                {formatMoney(summary.totalProfit)}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  dateLabel: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  profitCard: { borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' },
  profitLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  profitAmount: { fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 4 },
  tripsCount: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: '#374151' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  totalValue: { fontSize: 15, fontWeight: '800' },
});
