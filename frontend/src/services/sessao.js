// frontend/src/services/sessao.js
// Guarda o login do painel no navegador.

const CHAVE = 'pancotti-admin';

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || null;
  } catch {
    return null;
  }
}

export function lerToken() {
  return ler()?.token || null;
}

export function lerAdmin() {
  return ler()?.admin || null;
}

export function entrar(token, admin) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ token, admin }));
  } catch {
    // sem localStorage o login não persiste
  }
}

export function sair() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
}
