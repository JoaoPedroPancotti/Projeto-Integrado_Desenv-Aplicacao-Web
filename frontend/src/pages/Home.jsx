import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronDown,
  Package,
  BrickWall,
  Droplets,
  Zap,
  PaintRoller,
  Wrench,
  Search,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
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
  },
  {
    icone: BrickWall,
    nome: "Tijolos e blocos",
    descricao: "Cerâmicos, concreto e peças estruturais.",
    busca: "tijolo",
  },
  {
    icone: Droplets,
    nome: "Hidráulica",
    descricao: "Tubos, conexões, registros e caixas d’água.",
    busca: "hidráulica",
  },
  {
    icone: Zap,
    nome: "Elétrica",
    descricao: "Fios, disjuntores, tomadas e interruptores.",
    busca: "elétrica",
  },
  {
    icone: PaintRoller,
    nome: "Tintas e acabamento",
    descricao: "Tintas, massas, pisos e revestimentos.",
    busca: "tinta",
  },
  {
    icone: Wrench,
    nome: "Ferragens e ferramentas",
    descricao: "Pregos, parafusos e ferramentas.",
    busca: "ferramenta",
  },
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
  const [busca, setBusca] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    api
      .get("/produtos")
      .then((resposta) =>
        setProdutos(resposta.data.filter((p) => p.ativo !== 0).slice(0, 4)),
      )
      .catch((erro) => console.error("Erro ao buscar produtos:", erro));
  }, []);

  const abrirCatalogo = (termo = "") => {
    const parametro = termo.trim()
      ? `?busca=${encodeURIComponent(termo.trim())}`
      : "";
    navigate(`/catalogo${parametro}`);
  };

  const pesquisar = (evento) => {
    evento.preventDefault();
    abrirCatalogo(busca);
  };

  return (
    <div className="home">
      <div className="home-faixa">
        <span>Atendimento para sua obra do início ao acabamento</span>
        <div>
          <a href={`tel:+55${LOJA.telefone.replace(/\D/g, "")}`}>
            <Phone size={13} /> {LOJA.telefone}
          </a>
          <span>Seg–Sex, 7h às 18h</span>
        </div>
      </div>

      <header className="home-cabecalho">
        <div className="home-topo">
          <a
            href="#inicio"
            className="home-marca"
            aria-label="Comercial Pancotti - início"
          >
            <img src="/logotipo-claro.png" alt="Comercial Pancotti" />
          </a>

          <form className="home-busca" onSubmit={pesquisar}>
            <span>Produtos</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="O que você precisa para a obra?"
              aria-label="Buscar produtos"
            />
            <button type="submit" aria-label="Pesquisar">
              <Search size={21} />
            </button>
          </form>

          <div className="home-acoes-topo">
            <a href="#contato" className="home-atendimento">
              <Headphones size={21} />
              <span>
                <small>Precisa de ajuda?</small>
                <strong>Fale conosco</strong>
              </span>
            </a>
            <button className="home-orcamento" onClick={() => abrirCatalogo()}>
              <ClipboardList size={21} />
              <span>
                <small>Monte agora</small>
                <strong>Seu orçamento</strong>
              </span>
            </button>
          </div>
        </div>

        <div className="home-navegacao">
          {/* <button className="home-departamentos" onClick={() => setMenuAberto(!menuAberto)}><Menu size={18} /> Departamentos <ChevronDown size={15} /></button> */}
          <nav
            className={menuAberto ? "home-menu home-menu--aberto" : "home-menu"}
          >
            <a href="#produtos" onClick={() => setMenuAberto(false)}>
              Produtos
            </a>
            <a href="#como-funciona" onClick={() => setMenuAberto(false)}>
              Como comprar
            </a>
            <a href="#sobre" onClick={() => setMenuAberto(false)}>
              Sobre a Pancotti
            </a>
            <a href="#duvidas" onClick={() => setMenuAberto(false)}>
              Dúvidas
            </a>
            <a href="#contato" onClick={() => setMenuAberto(false)}>
              Contato
            </a>
          </nav>
          <button
            className="home-menu-lojista"
            onClick={() => navigate("/login")}
          >
            <Lock size={15} /> Área do lojista
          </button>
        </div>
      </header>

      <main>
        <section
          id="inicio"
          className={`home-banner ${pronto ? "home-banner--visivel" : ""}`}
        >
          <div className="home-banner-conteudo">
            <span className="home-etiqueta">Construir ficou mais simples</span>
            <h1>Sua obra começa com a escolha certa.</h1>
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
            <img src="/frenteloja.png" alt="Fachada da Comercial Pancotti" />
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
            <div>
              <span className="home-etiqueta">Departamentos</span>
              <h2>Encontre por categoria</h2>
            </div>
            <button className="home-link" onClick={() => abrirCatalogo()}>
              Ver catálogo completo <ArrowRight size={17} />
            </button>
          </div>
          <div className="home-categorias">
            {CATEGORIAS.map(
              ({ icone: Icone, nome, descricao, busca: termo }) => (
                <button
                  key={nome}
                  className="home-categoria"
                  onClick={() => abrirCatalogo(termo)}
                >
                  <span className="home-categoria-icone">
                    <Icone size={27} />
                  </span>
                  <span>
                    <strong>{nome}</strong>
                    <small>{descricao}</small>
                  </span>
                  <ArrowRight className="home-categoria-seta" size={18} />
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
          <div>
            <span className="home-etiqueta">Atendimento personalizado</span>
            <h2>Tem uma lista completa da obra?</h2>
            <p>
              Envie os itens que precisa. Nossa equipe organiza o orçamento,
              confere as quantidades e combina a entrega com você.
            </p>
          </div>
          <button onClick={() => abrirCatalogo()}>
            Montar minha lista <ArrowRight size={19} />
          </button>
        </section>

        <section id="como-funciona" className="home-secao home-como">
          <div className="home-titulo-central">
            <span className="home-etiqueta">Simples do começo ao fim</span>
            <h2>Seu orçamento em três passos</h2>
            <p>Você escolhe com calma e nossa equipe cuida do restante.</p>
          </div>
          <div className="home-passos">
            <article>
              <span>01</span>
              <div>
                <h3>Escolha os materiais</h3>
                <p>
                  Navegue pelos departamentos e adicione tudo o que precisa.
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Envie seus dados</h3>
                <p>
                  Informe o contato e os detalhes da sua obra. Não precisa criar
                  conta.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Receba a proposta</h3>
                <p>
                  Retornamos com valores, disponibilidade, frete e prazo de
                  entrega.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section id="sobre" className="home-secao home-sobre">
          <div className="home-sobre-foto">
            <img src="/frenteloja.png" alt="Loja Comercial Pancotti" />
            <span>Atendimento local e próximo</span>
          </div>
          <div className="home-sobre-texto">
            <span className="home-etiqueta">Sobre a Pancotti</span>
            <h2>Experiência de loja física com a praticidade do digital.</h2>
            <p>
              A Comercial Pancotti atende quem constrói, reforma e trabalha
              todos os dias no canteiro. Aqui você encontra orientação próxima e
              um catálogo feito para agilizar sua compra.
            </p>
            <ul>
              <li>
                <CircleCheck size={19} /> Equipe que entende de obra
              </li>
              <li>
                <CircleCheck size={19} /> Quantidades ajustadas à sua
                necessidade
              </li>
              <li>
                <CircleCheck size={19} /> Orçamento com frete e prazo
              </li>
            </ul>
            <a href="#contato">
              Conheça nossa loja <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="duvidas" className="home-secao home-duvidas">
          <div>
            <span className="home-etiqueta">Dúvidas frequentes</span>
            <h2>Informação clara antes de comprar.</h2>
            <p>
              Ainda ficou com alguma dúvida? Nossa equipe está pronta para
              ajudar.
            </p>
            <a href="#contato">
              <MessageCircle size={17} /> Falar com a equipe
            </a>
          </div>
          <div className="home-perguntas">
            {DUVIDAS.map(([pergunta, resposta]) => (
              <details key={pergunta}>
                <summary>
                  {pergunta} <ChevronDown size={19} />
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
