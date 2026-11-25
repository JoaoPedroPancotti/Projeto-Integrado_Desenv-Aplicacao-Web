// frontend/src/data/departamentos.js
// Departamentos da loja: menu do cabeçalho, vitrine da home e filtros do catálogo.
// "busca" é o termo usado para filtrar o catálogo (/catalogo?busca=...).
import { Package, BrickWall, Droplets, Zap, PaintRoller, Wrench } from 'lucide-react';

export const DEPARTAMENTOS = [
  {
    nome: 'Materiais básicos',
    descricao: 'Cimento, areia, brita, cal e argamassa',
    busca: 'cimento',
    foto: '/products/cimento-votoran-cp2-50kg.jpg',
    icone: Package,
    selo: 'Mais procurado',
  },
  {
    nome: 'Tijolos e blocos',
    descricao: 'Cerâmicos, concreto e peças estruturais',
    busca: 'tijolo',
    foto: '/products/tijolo-baiano-6-furos.jpg',
    icone: BrickWall,
  },
  {
    nome: 'Hidráulica',
    descricao: 'Tubos, conexões, registros e caixas d’água',
    busca: 'hidráulica',
    foto: '/products/tubo-pvc.jpg',
    icone: Droplets,
  },
  {
    nome: 'Elétrica',
    descricao: 'Fios, disjuntores, tomadas e interruptores',
    busca: 'elétrica',
    foto: '/products/disjuntor.jpg',
    icone: Zap,
  },
  {
    nome: 'Tintas e acabamento',
    nomeCurto: 'Tintas',
    descricao: 'Tintas, massas, pisos e revestimentos',
    busca: 'tinta',
    foto: '/products/tinta-acrilica.jpg',
    icone: PaintRoller,
  },
  {
    nome: 'Ferragens e ferramentas',
    nomeCurto: 'Ferramentas',
    descricao: 'Pregos, parafusos e ferramentas',
    busca: 'ferramenta',
    foto: null,
    icone: Wrench,
    itens: ['Pregos', 'Parafusos', 'Ferramentas manuais', 'Fixação'],
  },
];

// Filtros do catálogo: [rótulo, termo de busca]
export const FILTROS_CATALOGO = [
  ['Todos', ''],
  ...DEPARTAMENTOS.map(d => [d.nomeCurto || d.nome, d.busca]),
];
