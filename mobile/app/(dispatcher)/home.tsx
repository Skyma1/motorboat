import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  dockingType: 'PRIVATE' | 'CITY' | null;
  cityDockHours: number | null;
  pierCost: number;
}
interface Pier { id: string; name: string; cost: number }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Создан', color: '#92400e', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'На ходу', color: '#1e40af', bg: '#dbeafe' },
  COMPLETED: { label: 'Завершён', color: '#166534', bg: '#dcfce7' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: '💵 Нал', TRANSFER: '📱 Перевод', ACQUIRING: '💳 Эквайринг',
};

export default function DispatcherHome() {
  const qc = useQueryClient();
  const [dockTrip, setDockTrip] = useState<Trip | null>(null);
  const [dockingType, setDockingType] = useState<'PRIVATE' | 'CITY'>('PRIVATE');
  const [pierId, setPierId] = useState('');
  const [cityDockHours, setCityDockHours] = useState('');

  const { data: trips = [], isLoading, refetch } = useQuery<Trip[]>({
    queryKey: ['all-active-trips'],
    queryFn: () => api.get('/trips/active').then((r) => r.data),
    refetchInterval: 15_000,
  });
  const { data: piers = [] } = useQuery<Pier[]>({
    queryKey: ['piers'],
    queryFn: () => api.get('/piers').then((r) => r.data),
  });

  const dockingMutation = useMutation({
    mutationFn: (payload: { id: string; dockingType: 'PRIVATE' | 'CITY'; pierId?: string; cityDockHours?: number }) =>
      api.put(`/trips/${payload.id}/docking`, payload),
    onSuccess: () => {
      setDockTrip(null);
      setPierId('');
      setCityDockHours('');
      qc.invalidateQueries({ queryKey: ['all-active-trips'] });
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
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
                <Text style={styles.infoText}>
                  ⚓ {item.dockingType === 'CITY' ? `Городская (${item.pier?.name || 'не выбрано'})` : item.dockingType === 'PRIVATE' ? 'Наш причал' : 'Не заполнено'}
                </Text>
                <Text style={styles.infoText}>{PAYMENT_LABELS[item.paymentMethod]}</Text>
                <Text style={[styles.infoText, styles.price]}>{formatMoney(item.price)}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setDockTrip(item);
                    setDockingType(item.dockingType ?? 'PRIVATE');
                    setPierId(item.pier?.id ?? '');
                    setCityDockHours(item.cityDockHours ? String(item.cityDockHours) : '');
                  }}
                >
                  <Text style={styles.actionBtnText}>Заполнить швартовку</Text>
                </TouchableOpacity>
                {item.pierCost > 0 && (
                  <Text style={styles.pierCostText}>Швартовка: {formatMoney(item.pierCost)}</Text>
                )}
              </View>
              {item.startedAt && (
                <Text style={styles.timeText}>Начало: {formatDateTime(item.startedAt)}</Text>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!dockTrip} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Швартовка рейса</Text>
            <Text style={styles.modalSubtitle}>{dockTrip?.boat.name}</Text>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, dockingType === 'PRIVATE' && styles.typeBtnActive]}
                onPress={() => setDockingType('PRIVATE')}
              >
                <Text style={[styles.typeText, dockingType === 'PRIVATE' && styles.typeTextActive]}>Наш причал (бесплатно)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, dockingType === 'CITY' && styles.typeBtnActive]}
                onPress={() => setDockingType('CITY')}
              >
                <Text style={[styles.typeText, dockingType === 'CITY' && styles.typeTextActive]}>Городской (почасово)</Text>
              </TouchableOpacity>
            </View>

            {dockingType === 'CITY' && (
              <>
                <Text style={styles.inputLabel}>Причал</Text>
                <View style={styles.pierList}>
                  {piers.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.pierChip, pierId === p.id && styles.pierChipActive]} onPress={() => setPierId(p.id)}>
                      <Text style={[styles.pierChipText, pierId === p.id && styles.pierChipTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Часы швартовки</Text>
                <TextInput
                  style={styles.input}
                  value={cityDockHours}
                  onChangeText={setCityDockHours}
                  keyboardType="numeric"
                  placeholder="2"
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDockTrip(null)}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (!dockTrip) return;
                  if (dockingType === 'CITY' && (!pierId || !cityDockHours)) {
                    Alert.alert('Ошибка', 'Для городской швартовки укажите причал и часы');
                    return;
                  }
                  dockingMutation.mutate({
                    id: dockTrip.id,
                    dockingType,
                    pierId: dockingType === 'CITY' ? pierId : undefined,
                    cityDockHours: dockingType === 'CITY' ? Number(cityDockHours) : undefined,
                  });
                }}
              >
                <Text style={styles.saveText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardInfo: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#374151' },
  price: { fontWeight: '700', color: '#16a34a', marginLeft: 'auto' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  actionBtn: { backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  actionBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  pierCostText: { fontSize: 12, color: '#334155' },
  timeText: { fontSize: 12, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  typeRow: { gap: 8, marginBottom: 12 },
  typeBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  typeBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  typeText: { fontSize: 13, color: '#334155' },
  typeTextActive: { color: '#1d4ed8', fontWeight: '600' },
  inputLabel: { fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 6 },
  pierList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pierChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 },
  pierChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pierChipText: { fontSize: 12, color: '#334155' },
  pierChipTextActive: { color: '#1d4ed8', fontWeight: '600' },
  input: { height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  cancelText: { color: '#334155', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
});
