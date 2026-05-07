'use strict';

start();

function start() {
  scanResponseActions();
  startPolling();
  const observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label', 'data-testid', 'data-state', 'class', 'style']
  });
  document.addEventListener('mouseover', scheduleScan, true);
  document.addEventListener('mousemove', scheduleScan, true);
  document.addEventListener('focusin', scheduleScan, true);
  document.addEventListener('click', scheduleScan, true);
  document.addEventListener('scroll', scheduleScan, true);
  window.addEventListener('focus', scheduleScan, true);
}

function startPolling() {
  window.setInterval(() => {
    const groups = document.querySelectorAll('[aria-label="Response actions"][role="group"]');
    for (const group of groups) {
      if (!group.querySelector(`[${state.panelAttribute}="true"]`)) {
        scanResponseActions();
        return;
      }
    }
  }, 500);
}

function scheduleScan() {
  clearTimeout(state.scanTimer);
  state.scanTimer = window.setTimeout(scanResponseActions, 80);
}

function scanResponseActions() {
  const groups = Array.from(document.querySelectorAll('[aria-label="Response actions"][role="group"]'));
  for (const group of groups) injectPanel(group);
}

function injectPanel(group) {
  if (!group || group.querySelector(`[${state.panelAttribute}="true"]`)) return;
  const content = findContentForActionGroup(group);
  if (!content) return;
  group.style.pointerEvents = 'auto';
  group.style.maskPosition = '0% 0%';
  const panel = document.createElement('span');
  panel.className = 'cgpt-export-ext-panel';
  panel.setAttribute(state.panelAttribute, 'true');
  panel.appendChild(createButton('HTML', 'html', content));
  panel.appendChild(createButton('PDF', 'pdf', content));
  panel.appendChild(createButton('DOCX', 'docx', content));
  const moreButton = group.querySelector('[aria-label="More actions"], [aria-haspopup="menu"]');
  const badButton = group.querySelector('[data-testid="bad-response-turn-action-button"], [aria-label="Bad response"], [aria-label="Не нравится"], [aria-label="Плохой ответ"]');
  if (moreButton) {
    const child = directChild(group, moreButton);
    group.insertBefore(panel, child || moreButton);
    return;
  }
  if (badButton) {
    const child = directChild(group, badButton);
    (child || badButton).insertAdjacentElement('afterend', panel);
    return;
  }
  group.appendChild(panel);
}

function createButton(label, type, content) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cgpt-export-ext-button';
  button.textContent = label;
  button.setAttribute('aria-label', `Export response as ${label}`);
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await runExport(content, type, button, label);
  }, true);
  return button;
}

async function runExport(content, type, button, label) {
  button.disabled = true;
  button.textContent = '...';
  try {
    const title = getTitle();
    const clone = cloneForExport(content);
    if (type === 'html') exportHtml(clone, title);
    if (type === 'pdf') exportPdf(clone, title);
    if (type === 'docx') await exportDocx(clone, title);
    button.textContent = 'OK';
  } catch (error) {
    console.error(error);
    button.textContent = 'ERR';
  }
  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = label;
  }, 1200);
}

function findContentForActionGroup(group) {
  const turn = group.closest('[data-testid^="conversation-turn-"], article');
  if (turn) {
    const assistant = turn.querySelector('[data-message-author-role="assistant"]');
    if (assistant) {
      const content = findMessageContent(assistant);
      if (content) return content;
    }
    const markdown = turn.querySelector('.markdown, [class*="markdown"]');
    if (markdown && !markdown.closest('[data-message-author-role="user"]')) return markdown;
  }
  const groupRect = group.getBoundingClientRect();
  const candidates = Array.from(document.querySelectorAll('[data-message-author-role="assistant"] .markdown, [data-message-author-role="assistant"] [class*="markdown"], article .markdown, article [class*="markdown"]')).filter((node) => {
    if (!isVisible(node)) return false;
    if (node.closest('[data-message-author-role="user"]')) return false;
    const rect = node.getBoundingClientRect();
    return rect.bottom <= groupRect.top + 30;
  });
  candidates.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  return candidates[0] || null;
}

function findMessageContent(root) {
  if (!root) return null;
  if (root.matches && root.matches('.markdown, [class*="markdown"]')) return root;
  const markdown = root.querySelector('.markdown, [class*="markdown"]');
  if (markdown) return markdown;
  return root;
}
