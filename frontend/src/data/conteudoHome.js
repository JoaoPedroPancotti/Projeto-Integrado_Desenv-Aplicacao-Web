// frontend/src/data/conteudoHome.js
// Textos fixos da página inicial.
import { Search, ClipboardList, MessageCircle } from 'lucide-react';

// Exemplo ilustrativo do cartão "Minha lista" na faixa amarela: [foto, nome, quantidade]
export const LISTA_EXEMPLO = [
  ['/products/cimento-votoran-cp2-50kg.jpg', 'Cimento CP II 50 kg', '20 sc'],
  ['/products/areia-fina-lavada.jpg', 'Areia fina lavada', '3 m³'],
  ['/products/tijolo-baiano-6-furos.jpg', 'Tijolo baiano 6 furos', '1.000 un'],
];

// Seção "Como funciona": [ícone, título, texto]
export const PASSOS = [
  [Search, 'Escolha os materiais', 'Navegue pelos departamentos ou busque pelo nome e adicione à sua lista.'],
  [ClipboardList, 'Envie seus dados', 'Informe seu contato e os detalhes da obra. Não é preciso criar conta.'],
  [MessageCircle, 'Receba a proposta', 'Retornamos com valores, disponibilidade, frete e prazo de entrega.'],
];

// Perguntas frequentes: [pergunta, resposta]
export const DUVIDAS = [
  [
    'Preciso criar uma conta para pedir orçamento?',
    'Não. Basta escolher os produtos no catálogo e informar seu nome e telefone ao finalizar.',
  ],
  [
    'Por que os preços não aparecem no site?',
    'Os valores variam conforme a quantidade e a entrega. Por isso enviamos o preço certo junto com o orçamento.',
  ],
  [
    'Vocês fazem entrega?',
    'Sim, entregamos na nossa região. O valor do frete e o prazo são informados no orçamento.',
  ],
  [
    'Posso pedir quantidades fracionadas?',
    'Sim. Materiais como areia e brita podem ser pedidos por metro, e outros itens por quilo ou unidade.',
  ],
];
