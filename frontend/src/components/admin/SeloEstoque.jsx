// frontend/src/components/admin/SeloEstoque.jsx
// Situação do estoque do produto (normal, abaixo do mínimo, zerado...).
import { SITUACOES_ESTOQUE } from '../../constants/estoque';
import { situacaoEstoque } from '../../utils/estoque';

export default function SeloEstoque({ produto }) {
  const situacao = situacaoEstoque(produto);
  return <span className={`adm-selo adm-estoque--${situacao}`}>{SITUACOES_ESTOQUE[situacao]}</span>;
}
