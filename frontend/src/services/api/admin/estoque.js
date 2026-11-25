// frontend/src/services/api/admin/estoque.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/estoque';

export const estoqueApi = {
  resumo: () => http.get(`${BASE}/resumo`).then(dados),
  listarMovimentacoes: filtros => http.get(`${BASE}/movimentacoes`, { params: filtros }).then(dados),
  registrarMovimentacao: movimentacao => http.post(`${BASE}/movimentacoes`, movimentacao).then(dados),
  registrarEntrada: nota => http.post(`${BASE}/entrada`, nota).then(dados),
  aplicarInventario: contagem => http.post(`${BASE}/inventario`, contagem).then(dados),
  relatorios: dias => http.get(`${BASE}/relatorios`, { params: { dias } }).then(dados),
};
