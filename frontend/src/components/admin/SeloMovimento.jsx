// frontend/src/components/admin/SeloMovimento.jsx
// Tipo da movimentação de estoque (entrada, saída, venda...).
import { TIPOS_MOVIMENTO } from '../../constants/estoque';

export default function SeloMovimento({ tipo }) {
  return <span className={`adm-selo adm-mov--${tipo}`}>{TIPOS_MOVIMENTO[tipo]?.nome || tipo}</span>;
}
