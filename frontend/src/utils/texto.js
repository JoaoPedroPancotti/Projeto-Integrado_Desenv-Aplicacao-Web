// frontend/src/utils/texto.js

// Minúsculas e sem acento, para buscas ("Elétrica" encontra "eletrica")
export const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
