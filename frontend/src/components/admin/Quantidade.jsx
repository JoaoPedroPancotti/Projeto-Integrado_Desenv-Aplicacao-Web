// frontend/src/components/admin/Quantidade.jsx
// Quantidade com sinal e cor: +10 saco / -2 saco
import { quantidade } from '../../utils/formatacao';

export default function Quantidade({ valor, unidade }) {
  const classe = valor > 0 ? 'adm-qtd-entra' : valor < 0 ? 'adm-qtd-sai' : '';
  return <strong className={classe}>{valor > 0 ? '+' : ''}{quantidade(valor)} <small>{unidade || 'un'}</small></strong>;
}
