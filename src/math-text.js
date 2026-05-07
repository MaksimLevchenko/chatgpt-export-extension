'use strict';

const latexCommandText = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  omega: 'ω',
  infty: '∞',
  infinity: '∞',
  int: '∫',
  sum: '∑',
  prod: '∏',
  sqrt: '√',
  cdot: '·',
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  sim: '∼',
  to: '→',
  rightarrow: '→',
  leftarrow: '←'
};

const subscriptText = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ'
};

const superscriptText = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ'
};

function latexToReadableText(value) {
  let text = normalizeLatex(String(value || ''));
  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)');
  text = text.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
  text = text.replace(/\\([A-Za-z]+)/g, (match, name) => latexCommandText[name] || match.replace(/^\\/, ''));
  text = replaceScriptGroups(text, '_', subscriptText);
  text = replaceScriptGroups(text, '^', superscriptText);
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text || normalizeLatex(value);
}

function replaceScriptGroups(text, marker, map) {
  const escaped = marker === '^' ? '\\^' : '_';
  const groupPattern = new RegExp(`${escaped}\\{([^{}]+)\\}`, 'g');
  const singlePattern = new RegExp(`${escaped}([^\\s{}])`, 'g');
  return text.replace(groupPattern, (match, value) => scriptText(value, map)).replace(singlePattern, (match, value) => scriptText(value, map));
}

function scriptText(value, map) {
  return Array.from(String(value || '')).map((char) => map[char] || char).join('');
}

function mathTextStandaloneScript() {
  return `
var latexCommandText=${JSON.stringify(latexCommandText)};
var subscriptText=${JSON.stringify(subscriptText)};
var superscriptText=${JSON.stringify(superscriptText)};
function normalizeLatexText(value){
  return String(value||'').replace(/\\u00a0/g,' ').replace(/\\s+/g,' ').replace(/^\\$\\$([\\s\\S]*)\\$\\$/,'$1').replace(/^\\$([\\s\\S]*)\\$$/,'$1').replace(/^\\\\\\(([\\s\\S]*)\\\\\\)$/g,'$1').replace(/^\\\\\\[([\\s\\S]*)\\\\\\]$/g,'$1').trim();
}
function scriptText(value,map){return Array.from(String(value||'')).map(function(char){return map[char]||char}).join('')}
function replaceScriptGroups(text,marker,map){
  var escaped=marker==='^'?'\\\\^':'_';
  var groupPattern=new RegExp(escaped+'\\\\{([^{}]+)\\\\}','g');
  var singlePattern=new RegExp(escaped+'([^\\\\s{}])','g');
  return text.replace(groupPattern,function(match,value){return scriptText(value,map)}).replace(singlePattern,function(match,value){return scriptText(value,map)});
}
function latexToReadableText(value){
  var text=normalizeLatexText(String(value||''));
  text=text.replace(/\\\\frac\\s*\\{([^{}]+)\\}\\s*\\{([^{}]+)\\}/g,'($1)/($2)');
  text=text.replace(/\\\\sqrt\\s*\\{([^{}]+)\\}/g,'√($1)');
  text=text.replace(/\\\\([A-Za-z]+)/g,function(match,name){return latexCommandText[name]||match.replace(/^\\\\/,'')});
  text=replaceScriptGroups(text,'_',subscriptText);
  text=replaceScriptGroups(text,'^',superscriptText);
  text=text.replace(/[{}]/g,'').replace(/\\s+/g,' ').trim();
  return text||normalizeLatexText(value);
}
`;
}
