// frontend/src/components/admin/Selo.jsx
// Selo colorido com o status do pedido.
import { classeStatus } from '../../utils/pedidos';

export default function Selo({ status }) {
  return <span className={classeStatus(status)}>{status}</span>;
}
