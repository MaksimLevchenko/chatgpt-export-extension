'use strict';

function replaceFormulasWithPlaceholders(root) {
  const nodes = Array.from(root.querySelectorAll('.katex-display, .katex, mjx-container, math, script[type^="math/tex"]')).filter((node) => {
    if (!isTopFormulaNode(node)) return false;
    const info = extractFormula(node);
    return Boolean(info && info.tex);
  });
  for (const node of nodes) {
    const info = extractFormula(node);
    if (!info || !info.tex || !node.parentNode) continue;
    const replacement = document.createElement(info.display ? 'div' : 'span');
    replacement.className = info.display ? 'cgpt-export-formula cgpt-export-formula-display' : 'cgpt-export-formula cgpt-export-formula-inline';
    replacement.setAttribute('data-cgpt-formula', 'true');
    replacement.setAttribute('data-tex', info.tex);
    replacement.setAttribute('data-display', info.display ? 'true' : 'false');
    replacement.textContent = info.display ? `$$${info.tex}$$` : `\\(${info.tex}\\)`;
    node.parentNode.replaceChild(replacement, node);
  }
  replaceDelimitedFormulasWithPlaceholders(root);
}

function replaceDelimitedFormulasWithPlaceholders(root) {
  const textNodes = [];
  collectFormulaTextNodes(root, textNodes);
  for (const node of textNodes) replaceFormulaTextNode(node);
}

function collectFormulaTextNodes(node, output) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    if (hasFormulaDelimiter(node.textContent || '')) output.push(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches('pre, code, script, style, textarea, [data-cgpt-formula="true"]')) return;
  for (const child of Array.from(node.childNodes)) collectFormulaTextNodes(child, output);
}

function hasFormulaDelimiter(value) {
  return /(\$\$|\\\[|\\\()/.test(String(value || ''));
}

function replaceFormulaTextNode(node) {
  const text = node.textContent || '';
  const parts = splitFormulaText(text);
  if (parts.length === 1 && parts[0].type === 'text') return;
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.type === 'text') {
      if (part.value) fragment.appendChild(document.createTextNode(part.value));
      continue;
    }
    fragment.appendChild(createFormulaPlaceholder(part.tex, part.display));
  }
  node.parentNode.replaceChild(fragment, node);
}

function splitFormulaText(text) {
  const parts = [];
  let index = 0;
  const pattern = /(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\))/g;
  let match;
  while ((match = pattern.exec(text))) {
    const before = text.slice(index, match.index);
    const tex = normalizeLatex(match[2] || match[3] || match[4] || '');
    const display = Boolean(match[2] || match[3]);
    if (before) parts.push({ type: 'text', value: before });
    if (tex) parts.push({ type: 'formula', tex, display });
    else parts.push({ type: 'text', value: match[0] });
    index = match.index + match[0].length;
  }
  const after = text.slice(index);
  if (after) parts.push({ type: 'text', value: after });
  return parts.length ? parts : [{ type: 'text', value: text }];
}

function createFormulaPlaceholder(tex, display) {
  const replacement = document.createElement('span');
  replacement.className = display ? 'cgpt-export-formula cgpt-export-formula-display' : 'cgpt-export-formula cgpt-export-formula-inline';
  replacement.setAttribute('data-cgpt-formula', 'true');
  replacement.setAttribute('data-tex', tex);
  replacement.setAttribute('data-display', display ? 'true' : 'false');
  replacement.textContent = display ? `$$${tex}$$` : `\\(${tex}\\)`;
  return replacement;
}

function isTopFormulaNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.closest('pre, code')) return false;
  const parent = node.parentElement ? node.parentElement.closest('.katex-display, .katex, mjx-container, math, script[type^="math/tex"]') : null;
  if (!parent) return true;
  if (parent === node) return true;
  return false;
}

function extractFormula(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  const dataTex = node.getAttribute('data-tex') || node.getAttribute('data-cgpt-formula-tex');
  if (dataTex && dataTex.trim()) return { tex: normalizeLatex(dataTex), display: isDisplayFormula(node) };
  if (node.matches('script[type^="math/tex"]')) {
    const tex = normalizeLatex(node.textContent || '');
    if (!tex) return null;
    return { tex, display: String(node.getAttribute('type') || '').toLowerCase().includes('display') };
  }
  const selectors = [
    'annotation[encoding="application/x-tex"]',
    'annotation[encoding="application/x-latex"]',
    'annotation[encoding="TeX"]',
    '.katex-mathml annotation',
    'semantics annotation'
  ];
  for (const selector of selectors) {
    const annotation = node.matches(selector) ? node : node.querySelector(selector);
    if (annotation && annotation.textContent.trim()) {
      const tex = normalizeLatex(annotation.textContent);
      if (tex) return { tex, display: isDisplayFormula(node) };
    }
  }
  const math = node.matches('math') ? node : node.querySelector('math');
  if (math) {
    const annotation = math.querySelector('annotation');
    if (annotation && annotation.textContent.trim()) {
      const tex = normalizeLatex(annotation.textContent);
      if (tex) return { tex, display: isDisplayFormula(node) };
    }
    const alt = math.getAttribute('alttext') || math.getAttribute('altText') || math.getAttribute('data-semantic-speech');
    if (alt && alt.trim()) {
      const tex = normalizeLatex(alt);
      if (tex) return { tex, display: isDisplayFormula(node) };
    }
  }
  const aria = node.getAttribute('aria-label');
  if (aria && looksLikeFormula(aria)) return { tex: normalizeLatex(aria), display: isDisplayFormula(node) };
  const html = node.querySelector('.katex-html');
  if (html && html.textContent.trim()) {
    const tex = normalizeVisibleFormulaText(html.textContent);
    if (tex && looksLikeFormula(tex)) return { tex, display: isDisplayFormula(node) };
  }
  const text = normalizeVisibleFormulaText(node.textContent || '');
  if (text && looksLikeFormula(text)) return { tex: text, display: isDisplayFormula(node) };
  return null;
}

function isDisplayFormula(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.classList.contains('katex-display')) return true;
  if (node.closest('.katex-display')) return true;
  if (node.matches('mjx-container[display="true"]')) return true;
  if (node.closest('mjx-container[display="true"]')) return true;
  if (node.matches('script[type^="math/tex"]')) return String(node.getAttribute('type') || '').toLowerCase().includes('display');
  return false;
}

function normalizeLatex(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\$([\s\S]*)\$$/, '$1').replace(/^\\\(([\s\S]*)\\\)$/g, '$1').replace(/^\\\[([\s\S]*)\\\]$/g, '$1').trim();
}

function normalizeVisibleFormulaText(value) {
  let text = String(value || '').replace(/\u00a0/g, ' ').replace(/[\r\n\t]+/g, ' ');
  while (text.includes('  ')) text = text.replace(/  /g, ' ');
  return text.trim();
}

function looksLikeFormula(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/\\[A-Za-z]+/.test(text)) return true;
  if (/[=+\-*/^_<>≤≥≈∑∫√παβγδθλμσφω∞]/.test(text)) return true;
  if (/\b(frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|alpha|beta|gamma|delta|theta|lambda|pi)\b/.test(text)) return true;
  return false;
}
