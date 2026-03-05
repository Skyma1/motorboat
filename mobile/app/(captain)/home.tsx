import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { formatMoney, formatDuration } from '@/utils/format';

interface Trip {
  id: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
  price: number;
  paymentMethod: string;
  startedAt: string | null;
  durationMinutes: number | null;
  boat: { name: string };
  pier: { name: string };
}

interface Balance {
  cashIncome: number;
  captainSalary: number;
  expensesTotal: number;
  balance: number;
}

export default function CaptainHome() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: activeTrips = [], isLoading: tripsLoading, refetch } = useQuery<Trip[]>({
    queryKey: ['captain-active-trips'],
    queryFn: () => api.get('/trips/active').then((r) =>
      r.data.filter((t: Trip & { captainId: string }) => t.captainId === user?.id)
    ),
    refetchInterval: 10_000,
  });

  const { data: balance } = useQuery<Balance>({
    queryKey: ['captain-balance', user?.id, today],
    queryFn: () => api.get(`/finance/captain-balance/${user?.id}?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const activeTrip = activeTrips.find((t) => t.status === 'IN_PROGRESS') ?? activeTrips[0];

  useEffect(() => {
    if (activeTrip?.status !== 'IN_PROGRESS' || !activeTrip.startedAt) {
      setElapsed(0);
      return;
    }
    const update = () => {
      const diff = (Date.now() - new Date(activeTrip.startedAt!).getTime()) / 60000;
      setElapsed(diff);
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  const startMutation = useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captain-active-trips'] }),
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captain-active-trips'] });
      qc.invalidateQueries({ queryKey: ['captain-balance'] });
      Alert.alert('Рейс завершён', 'Расчёты выполнены автоматически');
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const handleStart = () => {
    if (!activeTrip) return;
    Alert.alert('Начать прогулку', 'Зафиксировать время начала сейчас?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Начать', onPress: () => startMutation.mutate(activeTrip.id) },
    ]);
  };

  const handleComplete = () => {
    if (!activeTrip) return;
    Alert.alert('Завершить прогулку', 'Зафиксировать время окончания сейчас?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Завершить', style: 'destructive', onPress: () => completeMutation.mutate(activeTrip.id) },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={tripsLoading} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Привет, {user?.name.split(' ')[0]}!</Text>
          <Text style={styles.date}>{format(new Date(), 'd MMMM', { locale: ru })}</Text>
        </View>
        <TouchableOpacity onPress={() => { Alert.alert('Выход', 'Выйти из системы?', [{ text: 'Отмена' }, { text: 'Выйти', onPress: logout }]); }}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={[styles.balanceCard, balance && balance.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
        <Text style={styles.balanceTitle}>Баланс наличных сегодня</Text>
        <Text style={styles.balanceAmount}>
          {balance ? formatMoney(Math.abs(balance.balance)) : '—'}
        </Text>
        <Text style={styles.balanceStatus}>
          {balance
            ? balance.balance > 0 ? '↑ Сдать владельцу'
              : balance.balance < 0 ? '↓ Получить от бизнеса'
              : 'Ноль — расчёты совпадают'
            : 'Загрузка...'}
        </Text>
        {balance && (
          <View style={styles.balanceDetails}>
            <Text style={styles.balanceDetail}>+ Наличные: {formatMoney(balance.cashIncome)}</Text>
            <Text style={styles.balanceDetail}>− ЗП: {formatMoney(balance.captainSalary)}</Text>
            <Text style={styles.balanceDetail}>− Расходы: {formatMoney(balance.expensesTotal)}</Text>
          </View>
        )}
      </View>

      {/* Active trip */}
      {activeTrip ? (
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>Текущий рейс</Text>
            <View style={[styles.statusBadge, activeTrip.status === 'IN_PROGRESS' ? styles.statusActive : styles.statusCreated]}>
              <Text style={styles.statusText}>
                {activeTrip.status === 'IN_PROGRESS' ? 'В процессе' : 'Создан'}
              </Text>
            </View>
          </View>

          <View style={styles.tripInfo}>
            <Text style={styles.tripInfoText}>⛵ Катер: {activeTrip.boat.name}</Text>
            <Text style={styles.tripInfoText}>⚓ Причал: {activeTrip.pier.name}</Text>
            <Text style={styles.tripInfoText}>💰 Цена: {formatMoney(activeTrip.price)}</Text>
            <Text style={styles.tripInfoText}>
              💳 Оплата: {{ CASH: 'Наличные', TRANSFER: 'Перевод', ACQUIRING: 'Эквайринг' }[activeTrip.paymentMethod]}
            </Text>
          </View>

          {activeTrip.status === 'IN_PROGRESS' && (
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Длительность</Text>
              <Text style={styles.timerValue}>{formatDuration(elapsed)}</Text>
            </View>
          )}

          <View style={styles.tripActions}>
            {activeTrip.status === 'CREATED' && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStart}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>▶  Начать прогулку</Text>}
              </TouchableOpacity>
            )}
            {activeTrip.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={styles.endButton}
                onPress={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>■  Завершить прогулку</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noTripCard}>
          <Text style={styles.noTripText}>⛵ Нет активных рейсов</Text>
          <Text style={styles.noTripHint}>Перейдите на вкладку «Рейс» для создания</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 14, color: '#64748b', marginTop: 2 },
  logoutText: { fontSize: 14, color: '#64748b' },
  balanceCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  balancePositive: { backgroundColor: '#052e16' },
  balanceNegative: { backgroundColor: '#450a0a' },
  balanceTitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff' },
  balanceStatus: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 12 },
  balanceDetails: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 12, gap: 4 },
  balanceDetail: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tripTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusActive: { backgroundColor: '#dbeafe' },
  statusCreated: { backgroundColor: '#fef9c3' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#1e40af' },
  tripInfo: { gap: 6, marginBottom: 14 },
  tripInfoText: { fontSize: 15, color: '#374151' },
  timerBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
  timerLabel: { fontSize: 13, color: '#6b7280' },
  timerValue: { fontSize: 28, fontWeight: '800', color: '#2563eb', marginTop: 4 },
  tripActions: { gap: 10 },
  startButton: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  endButton: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noTripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  noTripText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  noTripHint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
