import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { formatMoney } from '@/utils/format';

interface Boat { id: string; name: string; status: string }
interface Pier { id: string; name: string; cost: number }
interface Dispatcher { id: string; name: string }

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Наличные', emoji: '💵' },
  { value: 'TRANSFER', label: 'Перевод', emoji: '📱' },
  { value: 'ACQUIRING', label: 'Эквайринг', emoji: '💳' },
];

export default function TripScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [boatId, setBoatId] = useState('');
  const [pierId, setPierId] = useState('');
  const [dispatcherId, setDispatcherId] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const { data: boats = [] } = useQuery<Boat[]>({
    queryKey: ['boats'],
    queryFn: () => api.get('/boats').then((r) => r.data),
  });

  const { data: piers = [] } = useQuery<Pier[]>({
    queryKey: ['piers'],
    queryFn: () => api.get('/piers').then((r) => r.data),
  });

  const { data: dispatchers = [] } = useQuery<Dispatcher[]>({
    queryKey: ['dispatchers'],
    queryFn: () => api.get('/users/dispatchers').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { boatId: string; pierId: string; paymentMethod: string; price: number; dispatcherId?: string }) =>
      api.post('/trips', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captain-active-trips'] });
      setPrice('');
      Alert.alert('Рейс создан', 'Вернитесь на главную и нажмите «Начать прогулку»');
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const selectedPier = piers.find((p) => p.id === pierId);

  const handleSubmit = () => {
    if (!boatId) { Alert.alert('Ошибка', 'Выберите катер'); return; }
    if (!pierId) { Alert.alert('Ошибка', 'Выберите причал'); return; }
    if (!price || Number(price) <= 0) { Alert.alert('Ошибка', 'Введите корректную цену'); return; }

    createMutation.mutate({
      boatId, pierId, paymentMethod,
      price: Number(price),
      dispatcherId: dispatcherId || undefined,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Boat */}
      <View style={styles.section}>
        <Text style={styles.label}>Катер *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {boats.filter((b) => b.status !== 'MAINTENANCE').map((boat) => (
              <TouchableOpacity
                key={boat.id}
                style={[styles.chip, boatId === boat.id && styles.chipSelected, boat.status === 'ON_TRIP' && styles.chipDisabled]}
                onPress={() => boat.status !== 'ON_TRIP' && setBoatId(boat.id)}
              >
                <Text style={[styles.chipText, boatId === boat.id && styles.chipTextSelected]}>
                  {boat.name}{boat.status === 'ON_TRIP' ? ' 🚢' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Pier */}
      <View style={styles.section}>
        <Text style={styles.label}>Причал *</Text>
        <View style={styles.grid}>
          {piers.map((pier) => (
            <TouchableOpacity
              key={pier.id}
              style={[styles.pierCard, pierId === pier.id && styles.pierCardSelected]}
              onPress={() => setPierId(pier.id)}
            >
              <Text style={[styles.pierName, pierId === pier.id && styles.pierNameSelected]}>{pier.name}</Text>
              <Text style={[styles.pierCost, pierId === pier.id && styles.pierCostSelected]}>{formatMoney(pier.cost)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Payment method */}
      <View style={styles.section}>
        <Text style={styles.label}>Способ оплаты *</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.paymentCard, paymentMethod === m.value && styles.paymentCardSelected]}
              onPress={() => setPaymentMethod(m.value)}
            >
              <Text style={styles.paymentEmoji}>{m.emoji}</Text>
              <Text style={[styles.paymentLabel, paymentMethod === m.value && styles.paymentLabelSelected]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Price */}
      <View style={styles.section}>
        <Text style={styles.label}>Цена прогулки (₽) *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="5000"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Dispatcher (optional) */}
      <View style={styles.section}>
        <Text style={styles.label}>Диспетчер (необязательно)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, dispatcherId === '' && styles.chipSelected]}
              onPress={() => setDispatcherId('')}
            >
              <Text style={[styles.chipText, dispatcherId === '' && styles.chipTextSelected]}>Без диспетчера</Text>
            </TouchableOpacity>
            {dispatchers.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, dispatcherId === d.id && styles.chipSelected]}
                onPress={() => setDispatcherId(d.id)}
              >
                <Text style={[styles.chipText, dispatcherId === d.id && styles.chipTextSelected]}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Summary */}
      {selectedPier && price && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Итого</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Цена прогулки</Text>
            <Text style={styles.summaryValue}>{formatMoney(Number(price))}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Стоимость причала</Text>
            <Text style={styles.summaryValue}>{formatMoney(selectedPier.cost)}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, createMutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Создать рейс</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pierCard: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', width: '47%' },
  pierCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pierName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  pierNameSelected: { color: '#1d4ed8' },
  pierCost: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  pierCostSelected: { color: '#2563eb' },
  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentCard: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  paymentCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  paymentEmoji: { fontSize: 22, marginBottom: 4 },
  paymentLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  paymentLabelSelected: { color: '#1d4ed8' },
  input: { height: 50, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, fontSize: 16, backgroundColor: '#fff', color: '#111827' },
  summaryCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryKey: { fontSize: 14, color: '#374151' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  submitButton: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
