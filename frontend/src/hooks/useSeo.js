// frontend/src/hooks/useSeo.js
// Atualiza título, descrição, canonical, robots, Open Graph e JSON-LD por página.
// As tags já existem no index.html; aqui só trocamos o conteúdo (sem duplicar).
import { useEffect } from 'react';

export const SITE_URL = 'https://comercialpancotti.com.br';
const SUFIXO = 'Comercial Pancotti';

function definirMeta(seletor, atributo, valor, criar) {
  let el = document.head.querySelector(seletor);
  if (!el) {
    el = document.createElement(criar.tag);
    Object.entries(criar.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute(atributo, valor);
}

const meta = (nome, valor) =>
  definirMeta(`meta[name="${nome}"]`, 'content', valor, { tag: 'meta', attrs: { name: nome } });
const og = (propriedade, valor) =>
  definirMeta(`meta[property="${propriedade}"]`, 'content', valor, { tag: 'meta', attrs: { property: propriedade } });

/**
 * @param {object} opcoes
 * @param {string} opcoes.titulo      título curto da página (o sufixo da marca é adicionado)
 * @param {string} opcoes.descricao   meta description (até ~155 caracteres)
 * @param {string} [opcoes.caminho]   caminho canônico, ex.: "/catalogo"
 * @param {boolean} [opcoes.noindex]  true para páginas privadas
 * @param {object} [opcoes.jsonLd]    dados estruturados extras desta página
 */
export default function useSeo({ titulo, descricao, caminho = '/', noindex = false, jsonLd }) {
  const jsonTexto = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const tituloCompleto = titulo ? `${titulo} | ${SUFIXO}` : document.title;
    const url = `${SITE_URL}${caminho === '/' ? '/' : caminho}`;

    document.title = tituloCompleto;
    if (descricao) meta('description', descricao);
    meta('robots', noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    definirMeta('link[rel="canonical"]', 'href', url, { tag: 'link', attrs: { rel: 'canonical' } });

    og('og:url', url);
    og('og:title', tituloCompleto);
    if (descricao) og('og:description', descricao);
    meta('twitter:title', tituloCompleto);
    if (descricao) meta('twitter:description', descricao);

    let script;
    if (jsonTexto) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoPagina = 'true';
      script.textContent = jsonTexto;
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [titulo, descricao, caminho, noindex, jsonTexto]);
}
