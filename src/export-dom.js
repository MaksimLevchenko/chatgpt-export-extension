'use strict';

function cloneForExport(content) {
  const clone = content.cloneNode(true);
  replaceFormulasWithPlaceholders(clone);
  removeUiElements(clone);
  removeUiCheckboxes(clone);
  removeUiTextArtifacts(clone);
  replaceCheckboxesWithText(clone);
  normalizeExportDom(clone);
  return clone;
}

function replaceCheckboxesWithText(root) {
  for (const checkbox of Array.from(root.querySelectorAll('input[type="checkbox"]'))) {
    const checked = checkbox.checked || checkbox.hasAttribute('checked') || checkbox.getAttribute('aria-checked') === 'true';
    const replacement = document.createElement('span');
    replacement.className = 'cgpt-export-checkbox';
    replacement.textContent = checked ? '☑' : '☐';
    checkbox.parentNode.replaceChild(replacement, checkbox);
  }
}

function removeUiElements(root) {
  const selectors = [
    'button',
    '[role="button"]',
    'svg[aria-hidden="true"]',
    '.sr-only',
    '[data-testid*="copy"]',
    '[aria-label*="Copy"]',
    '[aria-label*="Копировать"]',
    '[class*="copy"]',
    '[class*="clipboard"]',
    '[contenteditable="true"]',
    '.cgpt-export-ext-panel',
    '.cgpt-export-ext-share-panel',
    '.tm-chatgpt-status',
    '.tm-chatgpt-turn-unpin',
    '[data-tm-turn-unpin="1"]'
  ];
  for (const node of Array.from(root.querySelectorAll(selectors.join(',')))) node.remove();
}

function removeUiCheckboxes(root) {
  for (const checkbox of Array.from(root.querySelectorAll('input[type="checkbox"]'))) {
    if (isContentCheckbox(checkbox)) continue;
    const label = checkbox.closest('label');
    const removable = label && normalizeText(label.textContent).length <= 12 ? label : checkbox;
    removable.remove();
  }
}

function isContentCheckbox(checkbox) {
  if (!checkbox || checkbox.nodeType !== Node.ELEMENT_NODE) return false;
  if (checkbox.closest('li')) return true;
  const container = checkbox.closest('.markdown, [class*="markdown"]');
  return Boolean(container && normalizeText(container.textContent));
}

function removeUiTextArtifacts(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = removeUiTextArtifactValue(node.textContent);
    if (!normalizeText(next)) {
      node.remove();
    } else if (next !== node.textContent) {
      node.textContent = next;
    }
  }
}

function removeUiTextArtifactValue(value) {
  return String(value || '')
    .replace(/Show\s+more\s*Show\s+less/g, '')
    .replace(/Show\s+more/g, '')
    .replace(/Show\s+less/g, '');
}

function normalizeExportDom(root) {
  for (const node of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name;
      if (name === 'href' || name === 'src' || name === 'alt' || name === 'title' || name === 'colspan' || name === 'rowspan') continue;
      if (name === 'data-tex' || name === 'data-display' || name === 'data-cgpt-formula') continue;
      if (name === 'class') {
        node.setAttribute('class', keepClassNames(attribute.value));
        continue;
      }
      node.removeAttribute(name);
    }
  }
}

function keepClassNames(value) {
  return String(value || '').split(/\s+/).filter((name) => {
      if (!name) return false;
      if (name.startsWith('language-')) return true;
      return ['cgpt-export-formula', 'cgpt-export-formula-display', 'cgpt-export-formula-inline', 'cgpt-export-checkbox'].includes(name);
    }).join(' ');
}
