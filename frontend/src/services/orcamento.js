// frontend/src/services/orcamento.js
// Guarda o orçamento no navegador para o cliente não perder os itens ao sair da página.

const CHAVE = 'pancotti-orcamento';

export function carregarOrcamento() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function salvarOrcamento(itens) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // navegador sem acesso ao localStorage: o orçamento só fica na memória
  }
}

export function limparOrcamento() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
}
