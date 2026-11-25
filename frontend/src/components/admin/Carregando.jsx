// frontend/src/components/admin/Carregando.jsx
import { LoaderCircle } from 'lucide-react';

export default function Carregando({ texto = 'Carregando...' }) {
  return <div className="adm-estado"><LoaderCircle size={28} className="adm-girando" /><p>{texto}</p></div>;
}
