// frontend/src/services/api/admin/fornecedores.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/fornecedores';

export const fornecedoresApi = {
  listar: () => http.get(BASE).then(dados),
  buscar: id => http.get(`${BASE}/${id}`).then(dados),
  criar: fornecedor => http.post(BASE, fornecedor).then(dados),
  atualizar: (id, fornecedor) => http.put(`${BASE}/${id}`, fornecedor).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
};
