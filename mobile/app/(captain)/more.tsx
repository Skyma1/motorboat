import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function CaptainMoreScreen() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Выход', 'Выйти из системы?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  logoutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
