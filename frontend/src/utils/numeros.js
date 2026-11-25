// frontend/src/utils/numeros.js

// Aceita "1,5" e "1.5"; vazio vira null
export const lerNumero = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

// Data de hoje no fuso local, no formato AAAA-MM-DD
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
