import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    Alert.alert('Выход', 'Выйти из системы?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Управление</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/(dispatcher)/piers')}>
          <Text style={styles.itemText}>Причалы</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/(dispatcher)/captains')}>
          <Text style={styles.itemText}>Ставки капитанов</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.item} onPress={() => router.push('/(dispatcher)/users')}>
            <Text style={styles.itemText}>Пользователи</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  item: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  itemText: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
