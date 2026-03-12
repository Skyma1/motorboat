import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/api/client';
import { formatMoney } from '@/utils/format';

interface Balance {
  captain: { id: string; name: string };
  cashIncome: number;
  captainSalary: number;
  expensesTotal: number;
  balance: number;
  handover?: {
    id: string;
    amount: number;
    receiverText: string;
    forDate: string;
  } | null;
}

export default function BalancesScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const qc = useQueryClient();
  const [editHandover, setEditHandover] = useState<Balance['handover']>(null);
  const [receiverText, setReceiverText] = useState('');

  const { data: balances = [], isLoading, refetch } = useQuery<Balance[]>({
    queryKey: ['balances', today],
    queryFn: () => api.get(`/finance/balances?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const updateHandoverMutation = useMutation({
    mutationFn: ({ id, receiverText, amount }: { id: string; receiverText: string; amount: number }) =>
      api.put(`/finance/cash-handover/${id}`, { receiverText, amount }),
    onSuccess: () => {
      setEditHandover(null);
      qc.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  return (
    <View style={{ flex: 1 }}>
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
            <View style={styles.handoverBox}>
              {item.handover ? (
                <>
                  <Text style={styles.handoverText}>Сдал за {item.handover.forDate}: {item.handover.receiverText}</Text>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      if (!item.handover) return;
                      setEditHandover(item.handover);
                      setReceiverText(item.handover.receiverText);
                    }}
                  >
                    <Text style={styles.editBtnText}>Редактировать</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.missingText}>⚠ Нет записи, кому сдана вчерашняя наличка</Text>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={!!editHandover} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Кому сдана наличка</Text>
            <TextInput
              style={styles.input}
              value={receiverText}
              onChangeText={setReceiverText}
              placeholder="Например: Диме"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditHandover(null)}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (!editHandover) return;
                  if (!receiverText.trim()) {
                    Alert.alert('Ошибка', 'Заполните поле');
                    return;
                  }
                  updateHandoverMutation.mutate({
                    id: editHandover.id,
                    receiverText: receiverText.trim(),
                    amount: editHandover.amount,
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
  handoverBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  handoverText: { fontSize: 13, color: '#0f172a', marginBottom: 6 },
  missingText: { fontSize: 13, color: '#b45309' },
  editBtn: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  editBtnText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: { height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  cancelText: { color: '#334155', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
});
