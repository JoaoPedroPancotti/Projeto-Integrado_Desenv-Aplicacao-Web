// frontend/src/services/api.js
import axios from 'axios';
import { lerToken, sair } from './auth';

// Na Vercel, defina VITE_API_URL com o endereço da API publicada (ex.: https://pancotti-api.vercel.app/api)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3006/api',
});

// Envia o token do painel em todas as chamadas
api.interceptors.request.use(config => {
  const token = lerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada no painel: volta para o login
api.interceptors.response.use(
  resposta => resposta,
  erro => {
    const url = erro.config?.url || '';
    if (erro.response?.status === 401 && url.startsWith('/admin') && url !== '/admin/login') {
      sair();
      window.location.href = '/login?expirou=1';
    }
    return Promise.reject(erro);
  }
);

export default api;
