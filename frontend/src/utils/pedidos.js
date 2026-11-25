// frontend/src/utils/pedidos.js
import { semAcento } from './texto';

// Número do pedido exibido ao cliente e no painel: #000123
export const protocolo = id => `#${String(id).padStart(6, '0')}`;

// Classe CSS do selo de status ("Em Andamento" -> adm-selo--em-andamento)
export const classeStatus = status => `adm-selo adm-selo--${semAcento(status).replace(/\s+/g, '-')}`;
