import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, MessageCircle, X } from 'lucide-react';
import api from '../services/api';
import { Carregando, Vazio } from './componentes';
import { haQuanto, linkWhatsApp } from './util';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => { api.get('/admin/clientes').then(({ data }) => setClientes(data)).catch(() => setClientes([])); }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, '');
    return (clientes || []).filter(c => !termo
      || c.nome.toLowerCase().includes(termo)
      || (c.email || '').toLowerCase().includes(termo)
      || (digitos && c.telefone.replace(/\D/g, '').includes(digitos)));
  }, [clientes, busca]);

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Relacionamento</span><h1>Clientes</h1><p>Cadastrados automaticamente quando fazem um pedido no site. Pedidos com o mesmo telefone ficam no mesmo cliente.</p></div>
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <span className="adm-mudo">{filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}</span>
        </div>
        {!clientes && <Carregando />}
        {clientes && !filtrados.length && <Vazio icone={Users} titulo="Nenhum cliente encontrado" />}
        {clientes && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela">
              <thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>Pedidos</th><th>Último pedido</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(cliente => (
                  <tr key={cliente.id} onClick={() => navigate(`/admin/clientes/${cliente.id}`)}>
                    <td><div className="adm-produto-celula"><span className="adm-avatar">{cliente.nome.charAt(0)}</span><strong>{cliente.nome}</strong></div></td>
                    <td data-rotulo="Telefone">{cliente.telefone}</td>
                    <td data-rotulo="E-mail">{cliente.email || <span className="adm-mudo">—</span>}</td>
                    <td data-rotulo="Pedidos">{cliente.pedidos}</td>
                    <td data-rotulo="Último pedido" className="adm-mudo">{cliente.ultimo_pedido ? haQuanto(cliente.ultimo_pedido) : '—'}</td>
                    <td data-acoes onClick={e => e.stopPropagation()}><a className="adm-icone-botao adm-icone-botao--whats" href={linkWhatsApp(cliente.telefone)} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`Conversar com ${cliente.nome} no WhatsApp`}><MessageCircle size={17} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
