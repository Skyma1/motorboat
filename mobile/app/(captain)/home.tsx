import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Modal, TextInput } from 'react-native';
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
}

interface Balance {
  cashIncome: number;
  partTimeIncome?: number;
  captainSalary: number;
  fuelTotal?: number;
  operationalSpend?: number;
  expensesTotal: number;
  balance: number;
}

interface HandoverRequired {
  required: boolean;
  forDate: string;
  amount: number;
}
interface Boat { id: string; name: string; status: string }

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Наличные', emoji: '💵' },
  { value: 'TRANSFER', label: 'Перевод', emoji: '🔄' },
  { value: 'ACQUIRING', label: 'Эквайринг', emoji: '💳' },
];

export default function CaptainHome() {
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [boatId, setBoatId] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [receiverText, setReceiverText] = useState('');

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
  const { data: handoverRequired } = useQuery<HandoverRequired>({
    queryKey: ['handover-required'],
    queryFn: () => api.get('/finance/cash-handover/required').then((r) => r.data),
    refetchInterval: 30_000,
  });
  const { data: boats = [] } = useQuery<Boat[]>({
    queryKey: ['boats'],
    queryFn: () => api.get('/boats').then((r) => r.data),
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
  const createMutation = useMutation({
    mutationFn: async (data: { boatId: string; paymentMethod: string; price: number }) => {
      const created = await api.post('/trips', data).then((r) => r.data as { id: string });
      await api.post(`/trips/${created.id}/start`);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captain-active-trips'] });
      qc.invalidateQueries({ queryKey: ['handover-required'] });
      setCreateOpen(false);
      setBoatId('');
      setPrice('');
      setPaymentMethod('CASH');
      Alert.alert('Рейс создан', 'Рейс сразу запущен');
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });
  const handoverMutation = useMutation({
    mutationFn: (payload: { forDate: string; amount: number; receiverText: string }) =>
      api.post('/finance/cash-handover', payload),
    onSuccess: async () => {
      setReceiverText('');
      await qc.invalidateQueries({ queryKey: ['handover-required'] });
      Alert.alert('Сохранено', 'Данные о сдаче налички сохранены');
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

  const handleCreate = () => {
    if (!boatId) { Alert.alert('Ошибка', 'Выберите катер'); return; }
    if (!price || Number(price) <= 0) { Alert.alert('Ошибка', 'Введите корректную цену'); return; }
    if (handoverRequired?.required) { Alert.alert('Нужно заполнить', 'Сначала укажите, кому сдали вчерашнюю наличку'); return; }
    createMutation.mutate({ boatId, paymentMethod, price: Number(price) });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={tripsLoading} onRefresh={refetch} />}
    >
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricPrimary]}>
          <Text style={styles.metricLabel}>Заработал за день</Text>
          <Text style={styles.metricValue}>{formatMoney(balance?.captainSalary ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabelDark}>Средств на судне</Text>
          <Text style={styles.metricValueDark}>{formatMoney(balance?.cashIncome ?? 0)}</Text>
        </View>
      </View>

      {handoverRequired?.required && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Внимание: не закрыта наличка за вчера</Text>
          <Text style={styles.warningText}>
            {handoverRequired.forDate}: {formatMoney(handoverRequired.amount)}
          </Text>
          <Text style={styles.warningText}>Нажмите «Начать рейс», чтобы сперва указать кому сдали наличку.</Text>
        </View>
      )}

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
          <Text style={styles.noTripHint}>Создайте новый рейс прямо с главной</Text>
          <TouchableOpacity style={styles.createTripButton} onPress={() => setCreateOpen(true)}>
            <Text style={styles.createTripButtonText}>Начать рейс</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новый рейс</Text>
            <Text style={styles.modalSubtitle}>Заполните данные перед стартом прогулки</Text>
            <Text style={styles.inputLabel}>Катер *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {boats.filter((b) => b.status !== 'MAINTENANCE').map((boat) => (
                  <TouchableOpacity
                    key={boat.id}
                    style={[styles.chip, boatId === boat.id && styles.chipSelected, boat.status === 'ON_TRIP' && styles.chipDisabled]}
                    onPress={() => boat.status !== 'ON_TRIP' && setBoatId(boat.id)}
                  >
                    <Text style={[styles.chipText, boatId === boat.id && styles.chipTextSelected]}>
                      {boat.name}{boat.status === 'ON_TRIP' ? ' (занят)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {handoverRequired?.required && (
              <View style={styles.handoverCard}>
                <Text style={styles.handoverTitle}>Сначала закройте вчерашнюю наличку</Text>
                <Text style={styles.handoverText}>Дата: {handoverRequired.forDate}</Text>
                <Text style={styles.handoverText}>Сумма: {formatMoney(handoverRequired.amount)}</Text>
                <TextInput
                  style={styles.input}
                  value={receiverText}
                  onChangeText={setReceiverText}
                  placeholder="Кому отдали наличку"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={[styles.modalPrimaryButton, handoverMutation.isPending && styles.submitDisabled]}
                  onPress={() => {
                    if (!receiverText.trim()) {
                      Alert.alert('Ошибка', 'Укажите, кому отдали наличку');
                      return;
                    }
                    handoverMutation.mutate({
                      forDate: handoverRequired.forDate,
                      amount: handoverRequired.amount,
                      receiverText: receiverText.trim(),
                    });
                  }}
                  disabled={handoverMutation.isPending}
                >
                  <Text style={styles.modalPrimaryText}>Сохранить сдачу налички</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>Способ оплаты *</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.paymentCard, paymentMethod === m.value && styles.paymentCardSelected]}
                  onPress={() => setPaymentMethod(m.value)}
                >
                  <Text style={styles.paymentEmoji}>{m.emoji}</Text>
                  <Text style={[styles.paymentLabel, paymentMethod === m.value && styles.paymentLabelSelected]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Цена прогулки (₽) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="5000"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setCreateOpen(false)}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, createMutation.isPending && styles.submitDisabled]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                <Text style={styles.modalPrimaryText}>{createMutation.isPending ? 'Создание...' : 'Создать рейс'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  metricsGrid: { gap: 12, marginBottom: 14 },
  metricCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricPrimary: { backgroundColor: '#052e16' },
  metricLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  metricValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 6 },
  metricLabelDark: { fontSize: 13, color: '#64748b' },
  metricValueDark: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  warningCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 12, padding: 12, marginBottom: 16 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#9a3412', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#7c2d12' },
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
  submitDisabled: { opacity: 0.7 },
  noTripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  noTripText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  noTripHint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  createTripButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  createTripButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  handoverCard: { backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fdba74', padding: 12, gap: 4 },
  handoverTitle: { fontSize: 14, fontWeight: '700', color: '#9a3412' },
  handoverText: { fontSize: 13, color: '#7c2d12' },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentCard: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  paymentCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  paymentEmoji: { fontSize: 18, marginBottom: 2 },
  paymentLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  paymentLabelSelected: { color: '#1d4ed8' },
  input: { height: 48, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, fontSize: 16, backgroundColor: '#fff', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelButton: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#334155', fontWeight: '600' },
  modalPrimaryButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
});
