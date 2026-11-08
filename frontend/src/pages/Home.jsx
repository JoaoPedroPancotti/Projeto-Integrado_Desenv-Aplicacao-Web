import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Package,
  BrickWall,
  Droplets,
  Zap,
  PaintRoller,
  Wrench,
  Search,
  ShieldCheck,
  HardHat,
  Ruler,
  Plus,
} from "lucide-react";
import api from "../services/api";
import Cabecalho from "../components/Cabecalho";
import "./Home.css";

const LOJA = {
  endereco: "R. Júlio Michelazo, 326 - Vila Nossa Sra. de Fátima",
  cidade: "São João da Boa Vista - SP, 13872-660",
  telefone: "(19) 99494-3399",
  whatsapp: "(19) 99494-3399",
  email: "contato@pancotti.com",
  horarios: ["Segunda a sexta: 7h às 18h", "Sábado: 7h às 12h"],
};

const CATEGORIAS = [
  {
    icone: Package,
    nome: "Materiais básicos",
    descricao: "Cimento, areia, brita, cal e argamassa.",
    busca: "cimento",
    foto: "/products/cimento-votoran-cp2-50kg.jpg",
    selo: "Mais procurado",
  },
  {
    icone: BrickWall,
    nome: "Tijolos e blocos",
    descricao: "Cerâmicos, concreto e peças estruturais.",
    busca: "tijolo",
    foto: "/products/tijolo-baiano-6-furos.jpg",
  },
  {
    icone: Droplets,
    nome: "Hidráulica",
    descricao: "Tubos, conexões, registros e caixas d’água.",
    busca: "hidráulica",
    foto: "/products/tubo-pvc.jpg",
  },
  {
    icone: Zap,
    nome: "Elétrica",
    descricao: "Fios, disjuntores, tomadas e interruptores.",
    busca: "elétrica",
    foto: "/products/disjuntor.jpg",
  },
  {
    icone: PaintRoller,
    nome: "Tintas e acabamento",
    descricao: "Tintas, massas, pisos e revestimentos.",
    busca: "tinta",
    foto: "/products/tinta-acrilica.jpg",
  },
  {
    icone: Wrench,
    nome: "Ferragens e ferramentas",
    descricao: "Pregos, parafusos e ferramentas.",
    busca: "ferramenta",
    itens: ["Pregos", "Parafusos", "Ferramentas manuais", "Fixação"],
  },
];

// Exemplo ilustrativo do cartão "Minha lista" na faixa amarela
const LISTA_EXEMPLO = [
  ["/products/cimento-votoran-cp2-50kg.jpg", "Cimento CP II 50 kg", "20 sc"],
  ["/products/areia-fina-lavada.jpg", "Areia fina lavada", "3 m³"],
  ["/products/tijolo-baiano-6-furos.jpg", "Tijolo baiano 6 furos", "1.000 un"],
];

const PASSOS = [
  [Search, "Escolha os materiais", "Navegue pelos departamentos ou busque pelo nome e adicione à sua lista."],
  [ClipboardList, "Envie seus dados", "Informe seu contato e os detalhes da obra. Não é preciso criar conta."],
  [MessageCircle, "Receba a proposta", "Retornamos com valores, disponibilidade, frete e prazo de entrega."],
];

const DUVIDAS = [
  [
    "Preciso criar uma conta para pedir orçamento?",
    "Não. Basta escolher os produtos no catálogo e informar seu nome e telefone ao finalizar.",
  ],
  [
    "Por que os preços não aparecem no site?",
    "Os valores variam conforme a quantidade e a entrega. Por isso enviamos o preço certo junto com o orçamento.",
  ],
  [
    "Vocês fazem entrega?",
    "Sim, entregamos na nossa região. O valor do frete e o prazo são informados no orçamento.",
  ],
  [
    "Posso pedir quantidades fracionadas?",
    "Sim. Materiais como areia e brita podem ser pedidos por metro, e outros itens por quilo ou unidade.",
  ],
];

export default function Home({ pronto = true }) {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    api
      .get("/produtos")
      .then((resposta) =>
        setProdutos(resposta.data.filter((p) => p.ativo !== 0).slice(0, 4)),
      )
      .catch((erro) => console.error("Erro ao buscar produtos:", erro));
  }, []);

  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const secao = document.querySelector(hash);
    if (secao) setTimeout(() => secao.scrollIntoView({ behavior: "smooth" }), 80);
  }, [hash]);

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
          <div className="home-banner-foto">
            <img src="/frenteloja.png" alt="Fachada da Comercial Pancotti" fetchPriority="high" />
          </div>
          <div className="home-banner-selo">
            <strong>Do básico ao acabamento</strong>
            <span>Tudo em um só orçamento</span>
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
            {CATEGORIAS.map(
              ({ icone: Icone, nome, descricao, busca: termo, foto, selo, itens }) => (
                <button
                  key={nome}
                  className={`home-categoria ${foto ? "" : "home-categoria--marca"}`}
                  onClick={() => abrirCatalogo(termo)}
                >
                  {foto ? (
                    <img src={foto} alt="" loading="lazy" />
                  ) : (
                    <Icone className="home-categoria-marca-icone" size={190} strokeWidth={1.1} />
                  )}
                  {selo && <span className="home-categoria-selo">{selo}</span>}
                  <span className="home-categoria-texto">
                    <strong>{nome}</strong>
                    <small>{descricao}</small>
                    {itens && (
                      <span className="home-categoria-itens">
                        {itens.map((item) => <span key={item}>{item}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="home-categoria-seta" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </button>
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
                        <img src={produto.imagem_url} alt={produto.nome} />
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
                  href={`https://wa.me/55${LOJA.whatsapp.replace(/\D/g, "")}`}
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
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${LOJA.endereco}, ${LOJA.cidade}`)}`}
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
                href={`https://wa.me/55${LOJA.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> Chamar no WhatsApp
              </a>
              <a
                className="home-ajuda-fone"
                href={`tel:+55${LOJA.telefone.replace(/\D/g, "")}`}
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
                <a href={`tel:+55${LOJA.telefone.replace(/\D/g, "")}`}>
                  {LOJA.telefone}
                </a>
                <br />
                <a
                  href={`https://wa.me/55${LOJA.whatsapp.replace(/\D/g, "")}`}
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
            <img src="/logotipo-claro.png" alt="Comercial Pancotti" />
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
            <a href="#produtos">Materiais básicos</a>
            <a href="#produtos">Hidráulica e elétrica</a>
            <a href="#produtos">Tintas e ferramentas</a>
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
