// frontend/src/services/api/admin/clientes.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/clientes';

export const clientesApi = {
  listar: () => http.get(BASE).then(dados),
  buscar: id => http.get(`${BASE}/${id}`).then(dados),
  atualizar: (id, cliente) => http.put(`${BASE}/${id}`, cliente).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
};
