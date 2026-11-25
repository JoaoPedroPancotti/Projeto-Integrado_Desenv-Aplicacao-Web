// frontend/src/services/api/catalogo.js
// Endpoints públicos usados pelo site.
import http from '../http';
import { dados } from './resposta';

export const catalogoApi = {
  listarProdutos: () => http.get('/produtos').then(dados),
  enviarOrcamento: pedido => http.post('/orcamentos', pedido).then(dados),
};
