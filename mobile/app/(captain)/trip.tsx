import { View, Text, StyleSheet } from 'react-native';

export default function TripScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Экран «Рейс» объединен с главной</Text>
      <Text style={styles.hint}>Создание и запуск рейса теперь доступны на вкладке «Главная».</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  hint: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
});
