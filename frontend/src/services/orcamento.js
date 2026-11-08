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

// Avisado sempre que a lista muda (o contador do header escuta)
export const EVENTO_ORCAMENTO = 'pancotti-orcamento';

export function salvarOrcamento(itens) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // navegador sem acesso ao localStorage: o orçamento só fica na memória
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ORCAMENTO, { detail: itens }));
}

export function limparOrcamento() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ORCAMENTO, { detail: [] }));
}
