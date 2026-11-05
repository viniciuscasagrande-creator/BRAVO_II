import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para injetar JWT token salvo na sessão
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('disk_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta para capturar 403 e alertar sobre isolamento multi-tenant
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      console.error('[Segurança Disk] 403 Forbidden: Violação de limite de acesso multi-tenant detectada.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
