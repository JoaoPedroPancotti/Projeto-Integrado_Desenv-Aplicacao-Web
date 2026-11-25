// frontend/src/services/api/admin/autenticacao.js
import http from '../../http';
import { dados } from '../resposta';

export const autenticacaoApi = {
  entrar: credenciais => http.post('/admin/login', credenciais).then(dados),
  alterarMinhaSenha: senhas => http.put('/admin/minha-senha', senhas).then(dados),
};
