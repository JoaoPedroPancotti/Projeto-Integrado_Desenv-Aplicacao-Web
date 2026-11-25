// frontend/src/services/api/resposta.js
// Os serviços devolvem só o corpo da resposta; o erro do axios segue intacto
// (a tela lê a mensagem em erro.response.data.erro).
export const dados = resposta => resposta.data;
