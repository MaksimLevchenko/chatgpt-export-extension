'use strict';

async function exportDocx(clone, title) {
  const documentXml = buildDocumentXml(clone);
  const files = {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': rootRelsXml(),
    'word/document.xml': documentXml,
    'word/styles.xml': stylesXml(),
    'word/numbering.xml': numberingXml(),
    'word/settings.xml': settingsXml(),
    'word/_rels/document.xml.rels': documentRelsXml(),
    'docProps/core.xml': coreXml(title),
    'docProps/app.xml': appXml()
  };
  const blob = new Blob([createZip(files)], { type: mimeDocx });
  downloadBlob(blob, `${title}.docx`);
}

function buildDocumentXml(root) {
  const body = convertChildren(root, { list: [] });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
<w:body>
${body || paragraphXml([runXml(root.textContent || '')])}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;
}

function convertChildren(node, ctx) {
  let xml = '';
  let runs = [];
  for (const child of Array.from(node.childNodes)) {
    if (isIgnorable(child)) continue;
    if (isBlock(child) || isStructuredContainer(child)) {
      if (runs.length) {
        xml += paragraphXml(runs);
        runs = [];
      }
      xml += blockXml(child, ctx);
    } else {
      runs.push(...inlineRuns(child, ctx, {}));
    }
  }
  if (runs.length) xml += paragraphXml(runs);
  return xml;
}

function isIgnorable(node) {
  if (!node) return true;
  if (node.nodeType === Node.COMMENT_NODE) return true;
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, '').length === 0;
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  return node.matches('script, style, template, noscript');
}

function isBlock(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (isCodeBlock(node)) return true;
  if (node.matches('p,pre,blockquote,ul,ol,li,table,thead,tbody,tfoot,tr,h1,h2,h3,h4,h5,h6,hr,section,article,main,figure,figcaption,details,summary,div.cgpt-export-formula-display')) return true;
  const display = window.getComputedStyle(node).display;
  return ['block', 'list-item', 'table', 'table-row-group', 'table-header-group', 'table-footer-group', 'table-row', 'flex', 'grid'].includes(display);
}

function isCodeBlock(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (!node.matches('code') || node.closest('pre')) return false;
  return /[\r\n]/.test(node.textContent || '') || Array.from(node.classList).some((name) => name.startsWith('language-'));
}

function isStructuredContainer(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.matches('pre,code,table,ul,ol')) return false;
  return Boolean(node.querySelector('table,thead,tbody,tfoot,tr,ul,ol,pre,blockquote,p,h1,h2,h3,h4,h5,h6,hr,div.cgpt-export-formula-display'));
}

function blockXml(node, ctx) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.matches('[data-cgpt-formula="true"]')) return paragraphXml([equationRunXml(node.getAttribute('data-tex') || node.textContent || '', true)], { style: 'EquationBlock' });
  const tag = node.tagName.toLowerCase();
  if (tag === 'h1') return paragraphXml(inlineChildren(node, ctx, { bold: true }), { style: 'Heading1' });
  if (tag === 'h2') return paragraphXml(inlineChildren(node, ctx, { bold: true }), { style: 'Heading2' });
  if (tag === 'h3') return paragraphXml(inlineChildren(node, ctx, { bold: true }), { style: 'Heading3' });
  if (tag === 'h4' || tag === 'h5' || tag === 'h6') return paragraphXml(inlineChildren(node, ctx, { bold: true }), { style: 'Heading4' });
  if (tag === 'p') return paragraphXml(inlineChildren(node, ctx, {}));
  if (tag === 'pre' || isCodeBlock(node)) return preXml(node);
  if (tag === 'blockquote') return blockquoteXml(node, ctx);
  if (tag === 'ul') return listXml(node, ctx, 'bullet');
  if (tag === 'ol') return listXml(node, ctx, 'decimal');
  if (tag === 'li') return listItemXml(node, ctx);
  if (tag === 'table') return tableXml(node, ctx);
  if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') return tableXml(node.closest('table'), ctx);
  if (tag === 'tr') return tableXml(node.closest('table'), ctx);
  if (tag === 'hr') return paragraphXml([], { border: true });
  return convertChildren(node, ctx);
}

function inlineChildren(node, ctx, format) {
  let runs = [];
  for (const child of Array.from(node.childNodes)) runs.push(...inlineRuns(child, ctx, format));
  return runs;
}

function inlineRuns(node, ctx, format) {
  if (!node) return [];
  if (node.nodeType === Node.TEXT_NODE) return [runXml(node.textContent, format)];
  if (node.nodeType !== Node.ELEMENT_NODE || isIgnorable(node)) return [];
  if (node.matches('[data-cgpt-formula="true"]')) return [equationRunXml(node.getAttribute('data-tex') || node.textContent || '', node.getAttribute('data-display') === 'true')];
  const tag = node.tagName.toLowerCase();
  if (isCodeBlock(node)) return [runXml(getCodeText(node), { code: true })];
  const next = { ...format };
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;
  if (tag === 'u') next.underline = true;
  if (tag === 's' || tag === 'del' || tag === 'strike') next.strike = true;
  if (tag === 'code' && !node.closest('pre')) next.code = true;
  if (tag === 'sup') next.superscript = true;
  if (tag === 'sub') next.subscript = true;
  if (tag === 'br') return ['<w:r><w:br/></w:r>'];
  if (tag === 'img') return [runXml(node.getAttribute('alt') || '[image]', { italic: true })];
  if (tag === 'a') return inlineChildren(node, ctx, { ...next, underline: true });
  if (isBlock(node) || isStructuredContainer(node)) return [runXml(normalizeStructuredText(node), next)];
  return inlineChildren(node, ctx, next);
}

function preXml(node) {
  const text = getCodeText(node);
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map((line) => paragraphXml([runXml(line || ' ', { code: true })], { style: 'CodeBlock' })).join('');
}

function getCodeText(node) {
  const code = ((node && node.matches && node.matches('code') ? node : node && node.querySelector && node.querySelector('code')) || node);
  const text = code.textContent || '';
  if (/[\r\n]/.test(text)) return text;
  return reconstructCodeText(code) || text;
}

function reconstructCodeText(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
  const brText = textWithBreaks(node);
  if (/[\r\n]/.test(brText)) return brText;
  const rootTextNodes = Array.from(node.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE && child.textContent.replace(/\s+/g, '').length);
  const elementChildren = Array.from(node.children).filter((child) => child.textContent && child.textContent.trim());
  if (rootTextNodes.length || elementChildren.length < 2) return brText;
  if (!looksLikeCodeLines(elementChildren)) return brText;
  return elementChildren.map((child) => textWithBreaks(child).replace(/\n+$/g, '')).join('\n');
}

function looksLikeCodeLines(nodes) {
  const values = nodes.map((node) => textWithBreaks(node));
  const total = values.reduce((sum, value) => sum + value.length, 0);
  if (total / values.length >= 8) return true;
  return values.some((value) => /^\s+/.test(value) || /\s{2,}/.test(value));
}

function textWithBreaks(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  return Array.from(node.childNodes).map(textWithBreaks).join('');
}

function blockquoteXml(node, ctx) {
  const xml = convertChildren(node, ctx);
  if (xml) return xml.replace(/<w:p>/g, '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>');
  return paragraphXml([runXml(normalizeText(node.textContent), { italic: true })], { style: 'Quote' });
}

function listXml(node, ctx, kind) {
  const level = ctx.list.length;
  ctx.list.push(kind);
  let xml = '';
  for (const item of Array.from(node.children).filter((child) => child.tagName && child.tagName.toLowerCase() === 'li')) xml += listItemXml(item, ctx, level, kind);
  ctx.list.pop();
  return xml;
}

function listItemXml(node, ctx, level, kind) {
  const numId = kind === 'decimal' ? 2 : 1;
  let runs = [];
  let rest = '';
  for (const child of Array.from(node.childNodes)) {
    if (isIgnorable(child)) continue;
    if (child.nodeType === Node.ELEMENT_NODE && (child.matches('ul,ol,table') || isStructuredContainer(child))) {
      rest += blockXml(child, ctx);
    } else if (isBlock(child) && child.nodeType === Node.ELEMENT_NODE && !child.matches('p')) {
      rest += blockXml(child, ctx);
    } else {
      runs.push(...inlineRuns(child, ctx, {}));
    }
  }
  return paragraphXml(runs.length ? runs : [runXml('')], { numId, ilvl: level || 0 }) + rest;
}

function tableXml(table, ctx) {
  if (!table || table.nodeType !== Node.ELEMENT_NODE) return '';
  const rows = directRows(table);
  if (!rows.length) return '';
  const colCount = Math.max(1, ...rows.map((row) => Array.from(row.children).filter((cell) => cell.matches('td,th')).reduce((sum, cell) => sum + Math.max(1, Number(cell.getAttribute('colspan') || 1)), 0)));
  const width = Math.floor(9024 / colCount);
  const grid = Array.from({ length: colCount }).map(() => `<w:gridCol w:w="${width}"/>`).join('');
  const rowsXml = rows.map((row, index) => tableRowXml(row, ctx, width, index === 0)).join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rowsXml}</w:tbl>`;
}

function directRows(table) {
  return Array.from(table.querySelectorAll('tr')).filter((row) => row.closest('table') === table);
}

function tableRowXml(row, ctx, width, header) {
  const cells = Array.from(row.children).filter((cell) => cell.matches('td,th'));
  const trPr = header ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
  return `<w:tr>${trPr}${cells.map((cell) => tableCellXml(cell, ctx, width, header || cell.tagName.toLowerCase() === 'th')).join('')}</w:tr>`;
}

function tableCellXml(cell, ctx, width, header) {
  const colspan = Math.max(1, Number(cell.getAttribute('colspan') || 1));
  const gridSpan = colspan > 1 ? `<w:gridSpan w:val="${colspan}"/>` : '';
  const shading = header ? '<w:shd w:val="clear" w:color="auto" w:fill="F6F8FA"/>' : '';
  const inner = convertChildren(cell, ctx) || paragraphXml([runXml('')]);
  return `<w:tc><w:tcPr><w:tcW w:w="${width * colspan}" w:type="dxa"/>${gridSpan}${shading}</w:tcPr>${inner}</w:tc>`;
}

function paragraphXml(runs, options = {}) {
  const props = [];
  if (options.style) props.push(`<w:pStyle w:val="${escapeXmlAttribute(options.style)}"/>`);
  if (typeof options.numId === 'number') props.push(`<w:numPr><w:ilvl w:val="${Math.max(0, options.ilvl || 0)}"/><w:numId w:val="${options.numId}"/></w:numPr>`);
  if (options.border) props.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D0D7DE"/></w:pBdr>');
  return `<w:p>${props.length ? `<w:pPr>${props.join('')}</w:pPr>` : ''}${(runs || []).join('')}</w:p>`;
}

function runXml(text, format = {}) {
  const props = [];
  if (format.bold) props.push('<w:b/>');
  if (format.italic) props.push('<w:i/>');
  if (format.underline) props.push('<w:u w:val="single"/>');
  if (format.strike) props.push('<w:strike/>');
  if (format.code) props.push('<w:rStyle w:val="CodeChar"/>');
  if (format.math) props.push('<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="Cambria Math"/>');
  if (format.superscript) props.push('<w:vertAlign w:val="superscript"/>');
  if (format.subscript) props.push('<w:vertAlign w:val="subscript"/>');
  return `<w:r>${props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''}${runTextXml(text)}</w:r>`;
}

function runTextXml(text) {
  const lines = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map((line, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXmlText(line)}</w:t>`).join('');
}

function equationRunXml(tex, display) {
  try {
    return latexToOmml(tex, display);
  } catch (error) {
    return runXml(latexToReadableText(tex), { math: true });
  }
}

function normalizeStructuredText(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return normalizeText(node && node.textContent);
  if (!node.matches('table')) return normalizeText(node.textContent);
  return directRows(node).map((row) => {
    return Array.from(row.children).filter((cell) => cell.matches('td,th')).map((cell) => normalizeText(cell.textContent)).join(' | ');
  }).join(' ');
}
