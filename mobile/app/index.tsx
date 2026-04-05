import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (user) {
    if (user.role === 'CAPTAIN') return <Redirect href="/(captain)/home" />;
    if (user.role === 'DISPATCHER' || user.role === 'ADMIN') return <Redirect href="/(dispatcher)/home" />;
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(auth)/login" />;
}
