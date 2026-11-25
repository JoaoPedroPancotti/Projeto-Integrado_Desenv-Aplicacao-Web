// frontend/src/services/api/admin/dashboard.js
import http from '../../http';
import { dados } from '../resposta';

export const dashboardApi = {
  resumo: () => http.get('/admin/resumo').then(dados),
};
