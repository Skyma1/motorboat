import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { formatMoney, formatDateTime } from '@/utils/format';

interface Expense {
  id: string;
  amount: number;
  comment: string;
  createdAt: string;
}

export default function ExpensesScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', today],
    queryFn: () => api.get(`/expenses?date=${today}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (data: { amount: number; comment: string }) => api.post('/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['captain-balance'] });
      setAmount('');
      setComment('');
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['captain-balance'] });
    },
  });

  const handleAdd = () => {
    if (!amount || Number(amount) <= 0) { Alert.alert('Ошибка', 'Введите корректную сумму'); return; }
    if (!comment.trim()) { Alert.alert('Ошибка', 'Комментарий обязателен'); return; }
    addMutation.mutate({ amount: Number(amount), comment: comment.trim() });
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <View style={styles.container}>
      {/* Add form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Добавить расход</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputAmount]}
            value={amount}
            onChangeText={setAmount}
            placeholder="Сумма (₽)"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            style={[styles.input, styles.inputComment]}
            value={comment}
            onChangeText={setComment}
            placeholder="На что потрачено"
            placeholderTextColor="#9ca3af"
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={addMutation.isPending}>
          {addMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addButtonText}>+ Добавить расход</Text>}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {expenses.length > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого расходов сегодня</Text>
          <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Расходов за сегодня нет</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={styles.expenseLeft}>
                <Text style={styles.expenseComment}>{item.comment}</Text>
                <Text style={styles.expenseDate}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>−{formatMoney(item.amount)}</Text>
                <TouchableOpacity onPress={() => {
                  Alert.alert('Удалить?', item.comment, [
                    { text: 'Отмена' },
                    { text: 'Удалить', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                  ]);
                }}>
                  <Text style={styles.deleteText}>удалить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  form: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { height: 44, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  inputAmount: { width: 110 },
  inputComment: { flex: 1 },
  addButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fef2f2' },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  list: { padding: 16, gap: 10 },
  expenseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  expenseLeft: { flex: 1 },
  expenseComment: { fontSize: 15, fontWeight: '500', color: '#111827' },
  expenseDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  deleteText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
