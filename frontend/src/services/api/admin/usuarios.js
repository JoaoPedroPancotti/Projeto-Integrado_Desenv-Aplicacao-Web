// frontend/src/services/api/admin/usuarios.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/usuarios';

export const usuariosApi = {
  listar: () => http.get(BASE).then(dados),
  criar: usuario => http.post(BASE, usuario).then(dados),
  atualizar: (id, usuario) => http.put(`${BASE}/${id}`, usuario).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
};
