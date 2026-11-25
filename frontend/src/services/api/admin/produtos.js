// frontend/src/services/api/admin/produtos.js
import http from '../../http';
import { dados } from '../resposta';

const BASE = '/admin/produtos';

export const produtosApi = {
  listar: () => http.get(BASE).then(dados),
  buscar: id => http.get(`${BASE}/${id}`).then(dados),
  criar: produto => http.post(BASE, produto).then(dados),
  atualizar: (id, produto) => http.put(`${BASE}/${id}`, produto).then(dados),
  alterarAtivo: (id, ativo) => http.patch(`${BASE}/${id}/ativo`, { ativo }).then(dados),
  excluir: id => http.delete(`${BASE}/${id}`).then(dados),
  // devolve { url } da foto gravada
  enviarImagem: arquivo => {
    const corpo = new FormData();
    corpo.append('imagem', arquivo);
    return http.post('/admin/upload', corpo).then(dados);
  },
};
