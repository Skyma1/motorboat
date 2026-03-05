import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CaptainLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: 4,
          height: 60,
        },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerTitle: 'MotorBoat',
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Рейс',
          tabBarIcon: ({ color, size }) => <Ionicons name="boat" size={size} color={color} />,
          headerTitle: 'Создать рейс',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Расходы',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          headerTitle: 'Хозяйственные расходы',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
          headerTitle: 'История рейсов',
        }}
      />
    </Tabs>
  );
}
