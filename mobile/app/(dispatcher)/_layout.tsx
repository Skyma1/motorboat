import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DispatcherLayout() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const insets = useSafeAreaInsets();
  const tabPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f1f5f9',
          height: 56 + tabPaddingBottom,
          paddingBottom: tabPaddingBottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Рейсы', headerTitle: 'Активные рейсы', tabBarIcon: ({ color, size }) => <Ionicons name="boat" size={size} color={color} /> }} />
      <Tabs.Screen name="balances" options={{ title: 'Балансы', headerTitle: 'Балансы капитанов', tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы', headerTitle: 'Финансы сегодня', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'Ещё', headerTitle: 'Дополнительно', tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} /> }} />
      <Tabs.Screen name="piers" options={{ href: null, title: 'Причалы', headerTitle: 'Управление причалами' }} />
      <Tabs.Screen name="captains" options={{ href: null, title: 'Капитаны', headerTitle: 'Ставки капитанов' }} />
      <Tabs.Screen
        name="users"
        options={{
          href: isAdmin ? null : undefined,
          title: 'Пользователи',
          headerTitle: 'Пользователи',
        }}
      />
    </Tabs>
  );
}
