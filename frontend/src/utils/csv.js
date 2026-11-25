// frontend/src/utils/csv.js
import { hojeISO } from './numeros';

// Planilha CSV que abre direto no Excel em português (separador ";" e vírgula decimal).
// colunas: [['Título', linha => valor], ...]
export function baixarCSV(nomeArquivo, colunas, linhas) {
  const celula = v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return String(Math.round(v * 10000) / 10000).replace('.', ',');
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [colunas.map(c => c[0]), ...linhas.map(l => colunas.map(([, ler]) => ler(l)))]
    .map(linha => linha.map(celula).join(';'))
    .join('\r\n');
  // BOM no início para o Excel reconhecer UTF-8
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${nomeArquivo}-${hojeISO()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
