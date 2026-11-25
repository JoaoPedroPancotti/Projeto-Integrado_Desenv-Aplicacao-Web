import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Lock,
  Truck,
  ClipboardList,
  MessageCircle,
  MapPin,
  Phone,
  Clock,
  Mail,
  CircleCheck,
  ShieldCheck,
  HardHat,
  Ruler,
  Plus,
} from "lucide-react";
import { catalogoApi } from "../services/api/catalogo";
import Cabecalho from "../components/layout/Cabecalho";
import useRolarParaHash from "../hooks/useRolarParaHash";
import useSeo from "../hooks/useSeo";
import { LOJA, linkMapa, linkTelefone, linkWhatsapp } from "../data/loja";
import { DEPARTAMENTOS } from "../data/departamentos";
import { DUVIDAS, LISTA_EXEMPLO, PASSOS } from "../data/conteudoHome";
import "../styles/pages/Home.css";

const JSON_LD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DUVIDAS.map(([pergunta, resposta]) => ({
    "@type": "Question",
    name: pergunta,
    acceptedAnswer: { "@type": "Answer", text: resposta },
  })),
};

export default function Home({ pronto = true }) {
  const navigate = useNavigate();
  useSeo({
    titulo: "Materiais de Construção em São João da Boa Vista - SP",
    descricao:
      "Materiais de construção em São João da Boa Vista - SP: cimento, areia, tijolos, hidráulica, elétrica e tintas. Monte sua lista e peça orçamento online, com entrega na região.",
    caminho: "/",
    jsonLd: JSON_LD_FAQ,
  });
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    catalogoApi
      .listarProdutos()
      .then((lista) =>
        setProdutos(lista.filter((p) => p.ativo !== 0).slice(0, 4)),
      )
      .catch((erro) => console.error("Erro ao buscar produtos:", erro));
  }, []);

  useRolarParaHash();

  const abrirCatalogo = (termo = "") => {
    const parametro = termo.trim()
      ? `?busca=${encodeURIComponent(termo.trim())}`
      : "";
    navigate(`/catalogo${parametro}`);
  };

  return (
    <div className="home">
      <Cabecalho />

      <main>
        <section
          id="inicio"
          className={`home-banner ${pronto ? "home-banner--visivel" : ""}`}
        >
          <div className="home-banner-foto">
            <img src="/images/frenteloja.png" alt="Fachada da Comercial Pancotti, loja de materiais de construção em São João da Boa Vista" fetchPriority="high" decoding="async" />
          </div>
          <div className="home-banner-interno">
            <div className="home-banner-conteudo">
              <span className="home-etiqueta">Construir ficou mais simples</span>
              <h1>Sua obra começa com a <em>escolha certa.</em></h1>
              <p>
                Encontre materiais para cada etapa, monte sua lista e receba um
                orçamento personalizado com prazo e entrega.
              </p>
              <div className="home-botoes">
                <button className="btn-primario" onClick={() => abrirCatalogo()}>
                  Explorar catálogo <ArrowRight size={19} />
                </button>
                <a className="btn-secundario" href="#como-funciona">
                  Como funciona
                </a>
              </div>
              <div className="home-banner-prova">
                <span>
                  <CircleCheck size={17} /> Sem cadastro
                </span>
                <span>
                  <CircleCheck size={17} /> Atendimento humano
                </span>
              </div>
            </div>
            <div className="home-banner-selo">
              <strong>Do básico ao acabamento</strong>
              <span>Tudo em um só orçamento</span>
            </div>
          </div>
        </section>

        <section className="home-destaques" aria-label="Vantagens">
          <div>
            <Truck size={24} />
            <span>
              <strong>Entrega na região</strong>Frete e prazo no orçamento
            </span>
          </div>
          <div>
            <ClipboardList size={24} />
            <span>
              <strong>Orçamento fácil</strong>Monte sua lista online
            </span>
          </div>
          <div>
            <MessageCircle size={24} />
            <span>
              <strong>Atendimento direto</strong>Resposta da equipe Pancotti
            </span>
          </div>
          <div>
            <ShieldCheck size={24} />
            <span>
              <strong>Compra segura</strong>Confirmação antes do pedido
            </span>
          </div>
        </section>

        <section id="produtos" className="home-secao">
          <div className="home-titulo-secao">
            <h2>Compre por departamento</h2>
            <button className="home-link" onClick={() => abrirCatalogo()}>
              Ver catálogo completo <ArrowRight size={17} />
            </button>
          </div>
          <div className="home-categorias">
            {DEPARTAMENTOS.map(
              ({ icone: Icone, nome, descricao, busca: termo, foto, selo, itens }) => (
                <Link
                  key={nome}
                  to={`/catalogo?busca=${encodeURIComponent(termo)}`}
                  className={`home-categoria ${foto ? "" : "home-categoria--marca"}`}
                >
                  {foto ? (
                    <img src={foto} alt="" loading="lazy" />
                  ) : (
                    <Icone className="home-categoria-marca-icone" size={190} strokeWidth={1.1} />
                  )}
                  {selo && <span className="home-categoria-selo">{selo}</span>}
                  <span className="home-categoria-texto">
                    <strong>{nome}</strong>
                    <small>{descricao}.</small>
                    {itens && (
                      <span className="home-categoria-itens">
                        {itens.map((item) => <span key={item}>{item}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="home-categoria-seta" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              ),
            )}
          </div>

          {produtos.length > 0 && (
            <div className="home-vitrine">
              <div className="home-vitrine-topo">
                <div>
                  <span className="home-etiqueta">Seleção Pancotti</span>
                  <h2>Produtos para começar sua lista</h2>
                </div>
                <button className="home-link" onClick={() => abrirCatalogo()}>
                  Ver todos <ArrowRight size={17} />
                </button>
              </div>
              <div className="home-produtos">
                {produtos.map((produto) => (
                  <article
                    key={produto.id}
                    className="home-produto"
                    onClick={() => abrirCatalogo(produto.nome)}
                  >
                    <div className="home-produto-foto">
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt={`${produto.nome} - Comercial Pancotti`} loading="lazy" decoding="async" />
                      ) : (
                        <span>{produto.nome.charAt(0)}</span>
                      )}
                      <em>Disponível</em>
                    </div>
                    <div className="home-produto-corpo">
                      <small>Material para construção</small>
                      <h3>{produto.nome}</h3>
                      <p>
                        {produto.descricao ||
                          "Consulte condições, quantidade e entrega com nossa equipe."}
                      </p>
                      <div>
                        <strong>Preço sob consulta</strong>
                        <span>
                          Adicionar à lista <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="home-faixa-obra">
          <div className="home-faixa-obra-interno">
            <div className="home-faixa-obra-texto">
              <h2>Tem a lista completa da obra?</h2>
              <p>
                Mande tudo de uma vez. Nossa equipe confere as quantidades,
                monta o orçamento e combina a entrega com você.
              </p>
              <div className="home-faixa-obra-botoes">
                <button onClick={() => abrirCatalogo()}>
                  Montar minha lista <ArrowRight size={18} />
                </button>
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={18} /> Enviar pelo WhatsApp
                </a>
              </div>
            </div>

            <div className="home-lista-exemplo" aria-hidden="true">
              <div className="home-lista-exemplo-topo">
                <strong>Minha lista</strong>
                <span>3 itens</span>
              </div>
              {LISTA_EXEMPLO.map(([foto, nome, qtd]) => (
                <div key={nome} className="home-lista-exemplo-item">
                  <img src={foto} alt="" loading="lazy" />
                  <span>{nome}</span>
                  <b>{qtd}</b>
                </div>
              ))}
              <div className="home-lista-exemplo-botao">
                Pedir orçamento <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="home-secao home-como">
          <div className="home-como-titulo">
            <h2>Como funciona o orçamento</h2>
            <p>
              Sem cadastro e sem pagar nada pelo site. Você escolhe com calma e
              nossa equipe cuida do restante.
            </p>
            <button className="home-link" onClick={() => abrirCatalogo()}>
              Começar pelo catálogo <ArrowRight size={17} />
            </button>
          </div>
          <ol className="home-passos">
            {PASSOS.map(([Icone, titulo, texto], indice) => (
              <li key={titulo}>
                <span className="home-passo-numero">{indice + 1}</span>
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
                <Icone className="home-passo-icone" size={26} strokeWidth={1.6} />
              </li>
            ))}
          </ol>
        </section>

        <section id="sobre" className="home-sobre">
          <div className="home-sobre-interno">
            <div className="home-sobre-texto">
              <h2>
                Experiência de loja física com a <em>praticidade do digital.</em>
              </h2>
              <p>
                A Comercial Pancotti atende quem constrói, reforma e trabalha
                todos os dias no canteiro. Aqui você encontra orientação próxima
                e um catálogo feito para agilizar sua compra.
              </p>
              <ul className="home-sobre-diferenciais">
                <li>
                  <HardHat size={26} strokeWidth={1.7} />
                  <strong>Equipe que entende de obra</strong>
                  <span>Orientação para escolher o material certo para cada etapa.</span>
                </li>
                <li>
                  <Ruler size={26} strokeWidth={1.7} />
                  <strong>Quantidade sob medida</strong>
                  <span>Areia e brita por metro, outros itens por quilo ou unidade.</span>
                </li>
                <li>
                  <Truck size={26} strokeWidth={1.7} />
                  <strong>Frete e prazo no orçamento</strong>
                  <span>Você sabe o valor da entrega antes de fechar o pedido.</span>
                </li>
              </ul>
            </div>

            <div className="home-sobre-visual">
              <div
                className="home-sobre-foto"
                role="img"
                aria-label="Interior da Comercial Pancotti, com prateleiras de materiais"
              />
              <div className="home-sobre-visita">
                <strong>Visite a loja</strong>
                <span>
                  <MapPin size={17} />
                  <span>
                    {LOJA.endereco}
                    <br />
                    {LOJA.cidade}
                  </span>
                </span>
                <span>
                  <Clock size={17} />
                  <span>
                    {LOJA.horarios.map((h) => (
                      <span key={h} className="home-sobre-horario">{h}</span>
                    ))}
                  </span>
                </span>
                <a
                  href={linkMapa}
                  target="_blank"
                  rel="noreferrer"
                >
                  Como chegar <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="duvidas" className="home-secao home-duvidas">
          <div className="home-duvidas-lado">
            <h2>Dúvidas frequentes</h2>
            <p>
              Respostas rápidas para o que mais perguntam antes de pedir um
              orçamento.
            </p>
            <div className="home-ajuda">
              <strong>Não achou sua resposta?</strong>
              <span>Fale direto com a nossa equipe.</span>
              <a
                className="home-ajuda-whats"
                href={linkWhatsapp}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> Chamar no WhatsApp
              </a>
              <a
                className="home-ajuda-fone"
                href={linkTelefone}
              >
                <Phone size={16} /> {LOJA.telefone}
              </a>
            </div>
          </div>
          <div className="home-perguntas">
            {DUVIDAS.map(([pergunta, resposta], indice) => (
              <details key={pergunta} open={indice === 0}>
                <summary>
                  <span>{pergunta}</span>
                  <span className="home-pergunta-icone" aria-hidden="true">
                    <Plus size={18} />
                  </span>
                </summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contato" className="home-contato-area">
          <div className="home-contato-chamada">
            <span className="home-etiqueta">Estamos por perto</span>
            <h2>Visite a loja ou fale com a gente.</h2>
            <p>
              Conte o que sua obra precisa e receba orientação da nossa equipe.
            </p>
            <button onClick={() => abrirCatalogo()}>
              Solicitar orçamento <ArrowRight size={18} />
            </button>
          </div>
          <div className="home-contatos">
            <div>
              <MapPin size={21} />
              <span>
                <strong>Endereço</strong>
                {LOJA.endereco}
                <br />
                {LOJA.cidade}
              </span>
            </div>
            <div>
              <Phone size={21} />
              <span>
                <strong>Telefone e WhatsApp</strong>
                <a href={linkTelefone}>
                  {LOJA.telefone}
                </a>
                <br />
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chamar no WhatsApp
                </a>
              </span>
            </div>
            <div>
              <Clock size={21} />
              <span>
                <strong>Horário</strong>
                {LOJA.horarios[0]}
                <br />
                {LOJA.horarios[1]}
              </span>
            </div>
            <div>
              <Mail size={21} />
              <span>
                <strong>E-mail</strong>
                {LOJA.email}
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-rodape">
        <div className="home-rodape-colunas">
          <div>
            <img src="/images/logotipo-claro.png" alt="Comercial Pancotti" />
            <p>
              Materiais para construção com atendimento próximo, da base ao
              acabamento.
            </p>
          </div>
          <div>
            <h4>Institucional</h4>
            <a href="#sobre">Sobre nós</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#duvidas">Dúvidas frequentes</a>
          </div>
          <div>
            <h4>Compre por categoria</h4>
            <Link to="/catalogo?busca=cimento">Materiais básicos</Link>
            <Link to="/catalogo?busca=hidr%C3%A1ulica">Hidráulica</Link>
            <Link to="/catalogo?busca=el%C3%A9trica">Elétrica</Link>
            <Link to="/catalogo?busca=tinta">Tintas</Link>
            <Link to="/catalogo?busca=ferramenta">Ferramentas</Link>
            <Link to="/catalogo">Catálogo completo</Link>
          </div>
          <div>
            <h4>Atendimento</h4>
            <span>{LOJA.telefone}</span>
            <span>{LOJA.email}</span>
            <span>{LOJA.horarios[0]}</span>
          </div>
        </div>
        <div className="home-rodape-base">
          <span>
            © {new Date().getFullYear()} Comercial Pancotti. Todos os direitos
            reservados.
          </span>
          <button onClick={() => navigate("/login")}>
            <Lock size={13} /> Área do lojista
          </button>
        </div>
      </footer>
    </div>
  );
}
