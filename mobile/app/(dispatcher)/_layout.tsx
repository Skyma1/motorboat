import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DispatcherLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f1f5f9', height: 60, paddingBottom: 4 },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Рейсы', headerTitle: 'Активные рейсы', tabBarIcon: ({ color, size }) => <Ionicons name="boat" size={size} color={color} /> }} />
      <Tabs.Screen name="balances" options={{ title: 'Балансы', headerTitle: 'Балансы капитанов', tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="piers" options={{ title: 'Причалы', headerTitle: 'Управление причалами', tabBarIcon: ({ color, size }) => <Ionicons name="pin" size={size} color={color} /> }} />
      <Tabs.Screen name="captains" options={{ title: 'Капитаны', headerTitle: 'Ставки капитанов', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы', headerTitle: 'Финансы сегодня', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
    </Tabs>
  );
}
