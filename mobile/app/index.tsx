import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (user) {
    if (user.role === 'CAPTAIN') return <Redirect href="/(captain)/home" />;
    if (user.role === 'DISPATCHER') return <Redirect href="/(dispatcher)/home" />;
    return <Redirect href="/(captain)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
