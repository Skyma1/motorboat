import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { formatMoney } from '@/utils/format';

interface Captain {
  id: string;
  name: string;
  captainRate?: { hourlyRate: number; exitPayment: number };
}

export default function CaptainsScreen() {
  const qc = useQueryClient();
  const [rates, setRates] = useState<Record<string, string>>({});

  const { data: captains = [], isLoading } = useQuery<Captain[]>({
    queryKey: ['captains'],
    queryFn: () => api.get('/users/captains').then((r) => r.data),
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ captainId, hourlyRate }: { captainId: string; hourlyRate: number }) =>
      api.put(`/rates/captains/${captainId}`, { hourlyRate }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['captains'] });
      setRates((prev) => { const n = { ...prev }; delete n[vars.captainId]; return n; });
      Alert.alert('Готово', 'Ставка обновлена');
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={captains}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const rateStr = rates[item.id] ?? String(item.captainRate?.hourlyRate ?? 0);
        return (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.current}>Текущая: {formatMoney(item.captainRate?.hourlyRate ?? 0)}/ч</Text>
              <Text style={styles.current}>Выход: {formatMoney(item.captainRate?.exitPayment ?? 0)}</Text>
            </View>
            <View style={styles.rateInput}>
              <Text style={styles.rateLabel}>₽/час</Text>
              <TextInput
                style={styles.input}
                value={rateStr}
                onChangeText={(v) => setRates({ ...rates, [item.id]: v })}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => updateRateMutation.mutate({ captainId: item.id, hourlyRate: Number(rateStr) })}
                disabled={updateRateMutation.isPending}
              >
                <Text style={styles.saveBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#166534' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  current: { fontSize: 12, color: '#64748b', marginTop: 2 },
  rateInput: { alignItems: 'center', gap: 4 },
  rateLabel: { fontSize: 11, color: '#9ca3af' },
  input: { width: 80, height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, textAlign: 'center', fontSize: 15, color: '#111827' },
  saveBtn: { width: 40, height: 32, backgroundColor: '#2563eb', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
