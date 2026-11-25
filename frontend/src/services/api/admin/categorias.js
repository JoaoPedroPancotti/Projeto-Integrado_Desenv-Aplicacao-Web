// frontend/src/services/api/admin/categorias.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/categorias';

export const categoriasApi = {
  listar: () => http.get(BASE).then(dados),
  criar: categoria => http.post(BASE, categoria).then(dados),
  atualizar: (id, categoria) => http.put(`${BASE}/${id}`, categoria).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
};
