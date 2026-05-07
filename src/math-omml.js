'use strict';

const naryOperators = new Set(['∑', '∏', '∫', '∬', '∭', '∮', '⋂', '⋃']);

function latexToOmml(tex, display) {
  const mathml = renderKatexMathml(tex, display);
  const math = parseMathml(mathml);
  if (!math) throw new Error('KaTeX did not return MathML');
  const body = mathmlChildrenToOmml(math);
  if (!body) throw new Error('MathML conversion produced empty OMML');
  if (display) {
    return `<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr><m:oMath>${body}</m:oMath></m:oMathPara>`;
  }
  return `<m:oMath>${body}</m:oMath>`;
}

function parseMathml(value) {
  const documentHtml = new DOMParser().parseFromString(String(value || ''), 'text/html');
  return documentHtml.querySelector('math');
}

function mathmlChildrenToOmml(node) {
  return Array.from(node.childNodes).map(mathmlNodeToOmml).join('');
}

function mathmlNodeToOmml(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return mathRunXml(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.localName.toLowerCase();
  if (tag === 'annotation') return '';
  if (tag === 'mrow') return rowOmml(node);
  if (tag === 'math' || tag === 'semantics' || tag === 'mstyle' || tag === 'mpadded' || tag === 'mphantom') return mathmlChildrenToOmml(node);
  if (tag === 'mi' || tag === 'mn' || tag === 'mo' || tag === 'mtext') return mathRunXml(normalizeMathToken(node.textContent));
  if (tag === 'mspace') return mathRunXml(' ');
  if (tag === 'mfrac') return fractionOmml(node);
  if (tag === 'msqrt') return radicalOmml(node, null);
  if (tag === 'mroot') return radicalOmml(node, elementChild(node, 1));
  if (tag === 'msub') return scriptOmml(node, 'm:sSub', [['m:e', 0], ['m:sub', 1]]);
  if (tag === 'msup') return scriptOmml(node, 'm:sSup', [['m:e', 0], ['m:sup', 1]]);
  if (tag === 'msubsup') return subSupOmml(node);
  if (tag === 'munder') return underOverOmml(node, false, true);
  if (tag === 'mover') return underOverOmml(node, true, false);
  if (tag === 'munderover') return underOverOmml(node, true, true);
  if (tag === 'mfenced') return fencedOmml(node);
  if (tag === 'menclose') return mathmlChildrenToOmml(node);
  if (tag === 'mtable') return matrixOmml(node);
  if (tag === 'mtr' || tag === 'mlabeledtr' || tag === 'mtd') return mathmlChildrenToOmml(node);
  return mathmlChildrenToOmml(node);
}

function fractionOmml(node) {
  const numerator = ommlArg(elementChild(node, 0));
  const denominator = ommlArg(elementChild(node, 1));
  return `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${numerator}</m:num><m:den>${denominator}</m:den></m:f>`;
}

function radicalOmml(node, degreeNode) {
  const base = degreeNode ? ommlArg(elementChild(node, 0)) : mathmlChildrenToOmml(node);
  const degree = degreeNode ? ommlArg(degreeNode) : '';
  return `<m:rad><m:deg>${degree}</m:deg><m:e>${base}</m:e></m:rad>`;
}

function scriptOmml(node, name, parts) {
  return `<${name}>${parts.map(([partName, index]) => `<${partName}>${ommlArg(elementChild(node, index))}</${partName}>`).join('')}</${name}>`;
}

function subSupOmml(node) {
  const base = elementChild(node, 0);
  const baseText = normalizeMathToken(base && base.textContent);
  if (naryOperators.has(baseText)) {
    return scriptOmml(node, 'm:sSubSup', [['m:e', 0], ['m:sub', 1], ['m:sup', 2]]);
  }
  return scriptOmml(node, 'm:sSubSup', [['m:e', 0], ['m:sub', 1], ['m:sup', 2]]);
}

function underOverOmml(node, hasOver, hasUnder) {
  const base = elementChild(node, 0);
  const baseText = normalizeMathToken(base && base.textContent);
  if (naryOperators.has(baseText)) {
    if (hasOver && hasUnder) return scriptOmml(node, 'm:sSubSup', [['m:e', 0], ['m:sub', 1], ['m:sup', 2]]);
    if (hasOver) return scriptOmml(node, 'm:sSup', [['m:e', 0], ['m:sup', 1]]);
    return scriptOmml(node, 'm:sSub', [['m:e', 0], ['m:sub', 1]]);
  }
  if (hasOver && hasUnder) return scriptOmml(node, 'm:sSubSup', [['m:e', 0], ['m:sub', 1], ['m:sup', 2]]);
  if (hasOver) return scriptOmml(node, 'm:sSup', [['m:e', 0], ['m:sup', 1]]);
  return scriptOmml(node, 'm:sSub', [['m:e', 0], ['m:sub', 1]]);
}

function fencedOmml(node) {
  const open = node.getAttribute('open') || '(';
  const close = node.getAttribute('close') || ')';
  return `<m:d><m:dPr><m:begChr m:val="${escapeXmlAttribute(open)}"/><m:endChr m:val="${escapeXmlAttribute(close)}"/></m:dPr><m:e>${mathmlChildrenToOmml(node)}</m:e></m:d>`;
}

function rowOmml(node) {
  const fenced = fencedRowOmml(node);
  return fenced || mathmlChildrenToOmml(node);
}

function fencedRowOmml(node) {
  const children = Array.from(node.children);
  if (children.length < 3) return '';
  const first = children[0];
  const last = children[children.length - 1];
  if (!isFenceOperator(first) || !isFenceOperator(last)) return '';
  const open = normalizeMathToken(first.textContent);
  const close = normalizeMathToken(last.textContent);
  const inner = children.slice(1, -1).map(mathmlNodeToOmml).join('');
  if (!inner) return '';
  return `<m:d><m:dPr><m:begChr m:val="${escapeXmlAttribute(open)}"/><m:endChr m:val="${escapeXmlAttribute(close)}"/></m:dPr><m:e>${inner}</m:e></m:d>`;
}

function isFenceOperator(node) {
  return Boolean(node && node.localName && node.localName.toLowerCase() === 'mo' && node.getAttribute('fence') === 'true');
}

function matrixOmml(node) {
  const rows = Array.from(node.children).filter((child) => ['mtr', 'mlabeledtr'].includes(child.localName.toLowerCase()));
  if (!rows.length) return '';
  const columnCount = Math.max(1, ...rows.map((row) => Array.from(row.children).filter((child) => child.localName.toLowerCase() === 'mtd').length));
  const rowsXml = rows.map((row) => {
    const cells = Array.from(row.children).filter((child) => child.localName.toLowerCase() === 'mtd');
    return `<m:mr>${cells.map((cell) => `<m:e>${mathmlChildrenToOmml(cell)}</m:e>`).join('')}</m:mr>`;
  }).join('');
  return `<m:m><m:mPr><m:baseJc m:val="center"/><m:mcs><m:mc><m:mcPr><m:count m:val="${columnCount}"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>${rowsXml}</m:m>`;
}

function ommlArg(node) {
  return node ? mathmlNodeToOmml(node) : '';
}

function elementChild(node, index) {
  return node && node.children ? node.children[index] || null : null;
}

function normalizeMathToken(value) {
  return String(value || '').replace(/\u2061|\u2062|\u2063|\u2064/g, '').replace(/\u00a0/g, ' ');
}

function mathRunXml(text) {
  const value = normalizeMathToken(text);
  if (!value) return '';
  return `<m:r><m:t>${escapeXmlText(value)}</m:t></m:r>`;
}
