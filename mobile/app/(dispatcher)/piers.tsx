import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { formatMoney } from '@/utils/format';

interface Pier { id: string; name: string; cost: number }

export default function PiersScreen() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPier, setEditPier] = useState<Pier | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const { data: piers = [], isLoading } = useQuery<Pier[]>({
    queryKey: ['piers'],
    queryFn: () => api.get('/piers').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; cost: number }) =>
      editPier
        ? api.put(`/piers/${editPier.id}`, data)
        : api.post('/piers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['piers'] });
      setModalOpen(false);
    },
    onError: (e: unknown) => Alert.alert('Ошибка', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/piers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['piers'] }),
  });

  const openCreate = () => { setEditPier(null); setName(''); setCost(''); setModalOpen(true); };
  const openEdit = (pier: Pier) => { setEditPier(pier); setName(pier.name); setCost(String(pier.cost)); setModalOpen(true); };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
        <Text style={styles.addBtnText}>+ Добавить причал</Text>
      </TouchableOpacity>

      <FlatList
        data={piers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text style={styles.emptyText}>Нет причалов</Text></View> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.pierName}>{item.name}</Text>
              <Text style={styles.pierCost}>{formatMoney(item.cost)} / рейс</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>Изменить</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Удалить?', item.name, [
                { text: 'Отмена' },
                { text: 'Удалить', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
              ])}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editPier ? 'Редактировать причал' : 'Новый причал'}</Text>
            <Text style={styles.inputLabel}>Название</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Набережная" />
            <Text style={styles.inputLabel}>Стоимость за рейс (₽)</Text>
            <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="600" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => saveMutation.mutate({ name, cost: Number(cost) })}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Сохранить</Text>}
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
  addBtn: { margin: 16, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardContent: { flex: 1 },
  pierName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  pierCost: { fontSize: 14, color: '#2563eb', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  deleteText: { fontSize: 18, color: '#dc2626', paddingHorizontal: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, marginBottom: 16, color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
