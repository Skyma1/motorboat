import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CaptainLayout() {
  const insets = useSafeAreaInsets();
  const tabPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: tabPaddingBottom,
          paddingTop: 4,
          height: 56 + tabPaddingBottom,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
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
          href: null,
          title: 'Рейс',
          tabBarIcon: ({ color, size }) => <Ionicons name="boat" size={size} color={color} />,
          headerTitle: 'Рейс',
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
      <Tabs.Screen
        name="more"
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
          headerTitle: 'Дополнительно',
        }}
      />
    </Tabs>
  );
}
