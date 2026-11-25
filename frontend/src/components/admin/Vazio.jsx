// frontend/src/components/admin/Vazio.jsx
// Estado vazio de listas e telas (com ações opcionais em "children").
import { Inbox } from 'lucide-react';

export default function Vazio({ titulo, texto, children, icone: Icone = Inbox }) {
  return <div className="adm-estado"><Icone size={34} /><h3>{titulo}</h3>{texto && <p>{texto}</p>}{children}</div>;
}
