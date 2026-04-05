import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGuard() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) router.replace('/(auth)/login');
    else if (user && inAuthGroup) {
      if (user.role === 'CAPTAIN') router.replace('/(captain)/home');
      else if (user.role === 'DISPATCHER' || user.role === 'ADMIN') router.replace('/(dispatcher)/home');
      else router.replace('/(auth)/login');
    }
  }, [user, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(captain)" />
        <Stack.Screen name="(dispatcher)" />
      </Stack>
    </QueryClientProvider>
  );
}
