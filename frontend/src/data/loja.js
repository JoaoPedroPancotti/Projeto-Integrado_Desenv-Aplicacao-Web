// frontend/src/data/loja.js
// Dados da loja e departamentos usados no header e nas páginas do site.
import { Package, BrickWall, Droplets, Zap, PaintRoller, Wrench } from 'lucide-react';

export const LOJA = {
  telefone: '(19) 99494-3399',
  whatsapp: '(19) 99494-3399',
  horario: 'Seg–Sex 7h às 18h · Sáb 7h às 12h',
};

export const linkTelefone = `tel:+55${LOJA.telefone.replace(/\D/g, '')}`;
export const linkWhatsapp = `https://wa.me/55${LOJA.whatsapp.replace(/\D/g, '')}`;

// "busca" é o termo usado para filtrar o catálogo
export const DEPARTAMENTOS = [
  { nome: 'Materiais básicos', descricao: 'Cimento, areia, brita, cal e argamassa', busca: 'cimento', foto: '/products/cimento-votoran-cp2-50kg.jpg', icone: Package },
  { nome: 'Tijolos e blocos', descricao: 'Cerâmicos, concreto e peças estruturais', busca: 'tijolo', foto: '/products/tijolo-baiano-6-furos.jpg', icone: BrickWall },
  { nome: 'Hidráulica', descricao: 'Tubos, conexões, registros e caixas d’água', busca: 'hidráulica', foto: '/products/tubo-pvc.jpg', icone: Droplets },
  { nome: 'Elétrica', descricao: 'Fios, disjuntores, tomadas e interruptores', busca: 'elétrica', foto: '/products/disjuntor.jpg', icone: Zap },
  { nome: 'Tintas e acabamento', descricao: 'Tintas, massas, pisos e revestimentos', busca: 'tinta', foto: '/products/tinta-acrilica.jpg', icone: PaintRoller },
  { nome: 'Ferragens e ferramentas', descricao: 'Pregos, parafusos e ferramentas', busca: 'ferramenta', foto: null, icone: Wrench },
];
