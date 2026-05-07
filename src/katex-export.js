'use strict';

let standaloneKatexCssPromise = null;

function getKatexInstance() {
  if (typeof katex !== 'undefined') return katex;
  if (window.katex) return window.katex;
  return null;
}

function katexOptions(display, output) {
  return {
    displayMode: Boolean(display),
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output
  };
}

function renderKatexHtml(tex, display) {
  const instance = getKatexInstance();
  if (!instance) throw new Error('KaTeX is not available');
  return instance.renderToString(normalizeLatex(tex), katexOptions(display, 'htmlAndMathml'));
}

function renderKatexMathml(tex, display) {
  const instance = getKatexInstance();
  if (!instance) throw new Error('KaTeX is not available');
  return instance.renderToString(normalizeLatex(tex), katexOptions(display, 'mathml'));
}

function renderKatexFormulas(root) {
  for (const node of Array.from(root.querySelectorAll('[data-cgpt-formula="true"]'))) {
    const tex = node.getAttribute('data-tex') || node.textContent || '';
    const display = node.getAttribute('data-display') === 'true';
    if (!tex.trim()) continue;
    try {
      node.innerHTML = renderKatexHtml(tex, display);
    } catch (error) {
      node.textContent = latexToReadableText(tex);
    }
  }
}

async function getStandaloneKatexCss() {
  if (!standaloneKatexCssPromise) standaloneKatexCssPromise = fetchStandaloneKatexCss();
  try {
    return await standaloneKatexCssPromise;
  } catch (error) {
    standaloneKatexCssPromise = null;
    return '';
  }
}

async function fetchStandaloneKatexCss() {
  const response = await fetch(chrome.runtime.getURL('vendor/katex/katex.min.css'));
  if (!response.ok) throw new Error('Unable to load local KaTeX CSS');
  const css = await response.text();
  return inlineKatexCssFonts(css);
}

async function inlineKatexCssFonts(css) {
  const paths = Array.from(css.matchAll(/url\((['"]?)(fonts\/[^)'"]+)\1\)/g), (match) => match[2]);
  const uniquePaths = Array.from(new Set(paths));
  const replacements = new Map();
  for (const path of uniquePaths) {
    try {
      const response = await fetch(chrome.runtime.getURL(`vendor/katex/${path}`));
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      replacements.set(path, `data:${fontMimeType(path)};base64,${bytesToBase64(bytes)}`);
    } catch (error) {
      replacements.delete(path);
    }
  }
  return css.replace(/url\((['"]?)(fonts\/[^)'"]+)\1\)/g, (match, quote, path) => {
    return replacements.has(path) ? `url(${replacements.get(path)})` : match;
  });
}

function fontMimeType(path) {
  if (/\.woff2$/i.test(path)) return 'font/woff2';
  if (/\.woff$/i.test(path)) return 'font/woff';
  if (/\.ttf$/i.test(path)) return 'font/ttf';
  return 'application/octet-stream';
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
