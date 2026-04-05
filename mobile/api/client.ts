import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_LOCAL_PORT = '3001';

const getHostFromExpo = (): string | null => {
  const expoHostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
    null;

  if (!expoHostUri) return null;

  const normalized = expoHostUri.replace(/^[a-zA-Z]+:\/\//, '');
  const [host] = normalized.split(':');
  return host || null;
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const expoHost = getHostFromExpo();
  if (expoHost) return `http://${expoHost}:${DEFAULT_LOCAL_PORT}/api`;

  return `http://127.0.0.1:${DEFAULT_LOCAL_PORT}/api`;
};

const BASE_URL = resolveApiBaseUrl();

export const getApiBaseUrl = () => BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          await useAuthStore.getState().setTokens(data.accessToken, refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          await useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
