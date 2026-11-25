// frontend/src/utils/whatsapp.js

// Link do WhatsApp a partir de um telefone brasileiro, com mensagem opcional
export function linkWhatsApp(telefone, texto = '') {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
