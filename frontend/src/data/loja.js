// frontend/src/data/loja.js
// Dados de contato da loja: fonte única para cabeçalho, home, catálogo e rodapé.
import { linkWhatsApp } from '../utils/whatsapp';

export const LOJA = {
  endereco: 'R. Júlio Michelazo, 326 - Vila Nossa Sra. de Fátima',
  cidade: 'São João da Boa Vista - SP, 13872-660',
  telefone: '(19) 99494-3399',
  whatsapp: '(19) 99494-3399',
  email: 'contato@pancotti.com',
  horario: 'Seg–Sex 7h às 18h · Sáb 7h às 12h',
  horarios: ['Segunda a sexta: 7h às 18h', 'Sábado: 7h às 12h'],
};

export const linkTelefone = `tel:+55${LOJA.telefone.replace(/\D/g, '')}`;
export const linkWhatsapp = linkWhatsApp(LOJA.whatsapp);
export const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${LOJA.endereco}, ${LOJA.cidade}`)}`;
