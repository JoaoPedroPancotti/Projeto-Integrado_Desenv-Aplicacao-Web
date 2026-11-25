// frontend/src/services/api/admin/pedidos.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/orcamentos';

export const pedidosApi = {
  listar: filtros => http.get(BASE, { params: filtros }).then(dados),
  buscar: id => http.get(`${BASE}/${id}`).then(dados),
  atualizar: (id, pedido) => http.put(`${BASE}/${id}`, pedido).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
  adicionarItem: (id, item) => http.post(`${BASE}/${id}/itens`, item).then(dados),
  removerItem: (id, itemId) => http.delete(`${BASE}/${id}/itens/${itemId}`).then(dados),
};
