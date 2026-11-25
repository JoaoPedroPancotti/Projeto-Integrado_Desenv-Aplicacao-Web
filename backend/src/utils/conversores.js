// backend/src/utils/conversores.js
// Normalização dos valores vindos dos formulários.

// '' ou null viram null; aceita vírgula decimal ("2,5")
const numero = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

// Texto sem espaços nas pontas; vazio vira null
const texto = v => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

// Checkbox/booleano: só false ou 0 desligam (ausente = ligado)
const ligado = v => !(v === false || v === 0);

module.exports = { numero, texto, ligado };
