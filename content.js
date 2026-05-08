'use strict';

start();

function start() {
  scanAll();
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
  window.addEventListener('resize', scheduleScan, true);
}

function startPolling() {
  window.setInterval(() => {
    cleanupGlobalResponsePanels();
    cleanupMisplacedSharePanels();
    const groups = document.querySelectorAll('[aria-label="Response actions"][role="group"]');
    for (const group of groups) {
      if (!group.querySelector(`[${state.panelAttribute}="true"]`)) {
        scanAll();
        return;
      }
    }
    const shareButtons = findShareButtons();
    if (shareButtons.some((button) => !button.parentElement.querySelector(`[${state.sharePanelAttribute}="true"]`))) scanAll();
  }, 500);
}

function scheduleScan() {
  clearTimeout(state.scanTimer);
  state.scanTimer = window.setTimeout(scanAll, 80);
}

function scanAll() {
  scanResponseActions();
  scanShareButtons();
  cleanupMisplacedSharePanels();
}

function scanResponseActions() {
  const groups = Array.from(document.querySelectorAll('[aria-label="Response actions"][role="group"]'));
  cleanupResponsePanels(groups);
  cleanupGlobalResponsePanels();
  for (const group of visiblePrimaryResponseGroups(groups)) injectPanel(group);
  cleanupGlobalResponsePanels();
}

function cleanupResponsePanels(groups) {
  for (const group of groups) {
    const panels = Array.from(group.querySelectorAll(`[${state.panelAttribute}="true"]`));
    for (const panel of panels.slice(1)) panel.remove();
  }
}

function visiblePrimaryResponseGroups(groups) {
  const seenTurns = new Set();
  const result = [];
  for (const group of groups) {
    if (!isVisible(group)) continue;
    const turn = findActionGroupTurn(group) || group;
    if (seenTurns.has(turn)) {
      removeResponsePanels(group);
      continue;
    }
    seenTurns.add(turn);
    result.push(group);
  }
  return result;
}

function findActionGroupTurn(group) {
  return group && group.closest('[data-testid^="conversation-turn-"], article');
}

function removeResponsePanels(root) {
  for (const panel of Array.from(root.querySelectorAll(`[${state.panelAttribute}="true"]`))) panel.remove();
}

function cleanupGlobalResponsePanels() {
  const panels = Array.from(document.querySelectorAll(`[${state.panelAttribute}="true"]`));
  const seen = new Set();
  for (const panel of panels) {
    const owner = findPanelOwner(panel);
    if (!owner) continue;
    if (seen.has(owner)) {
      panel.remove();
      continue;
    }
    seen.add(owner);
  }
}

function findPanelOwner(panel) {
  const group = panel.closest('[aria-label="Response actions"][role="group"]');
  if (group) return findActionGroupTurn(group) || group;
  return panel.closest('[data-testid^="conversation-turn-"], article') || panel.parentElement;
}

function scanShareButtons() {
  for (const button of findShareButtons()) injectSharePanel(button);
}

function findShareButtons() {
  return Array.from(document.querySelectorAll('button[data-testid="share-chat-button"]')).filter((button) => {
    if (button.closest(`[${state.sharePanelAttribute}="true"]`)) return false;
    if (button.closest('[aria-label="Response actions"][role="group"], [data-testid^="conversation-turn-"], article, [data-message-author-role]')) return false;
    return button.parentElement && isVisible(button);
  });
}

function cleanupMisplacedSharePanels() {
  const panels = Array.from(document.querySelectorAll(`[${state.sharePanelAttribute}="true"]`));
  for (const panel of panels) {
    const shareButton = panel.previousElementSibling;
    const valid = shareButton && shareButton.matches && shareButton.matches('button[data-testid="share-chat-button"]') && !shareButton.closest('[aria-label="Response actions"][role="group"], [data-testid^="conversation-turn-"], article, [data-message-author-role]');
    if (!valid) panel.remove();
  }
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

function injectSharePanel(shareButton) {
  if (!shareButton || !shareButton.parentElement) return;
  if (shareButton.parentElement.querySelector(`[${state.sharePanelAttribute}="true"]`)) return;
  const panel = document.createElement('span');
  panel.className = 'cgpt-export-ext-share-panel';
  panel.setAttribute(state.sharePanelAttribute, 'true');
  panel.appendChild(createFullButton('HTML', 'html'));
  panel.appendChild(createFullButton('PDF', 'pdf'));
  panel.appendChild(createFullButton('DOCX', 'docx'));
  shareButton.insertAdjacentElement('afterend', panel);
}

function createButton(label, type, content) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cgpt-export-ext-button';
  button.dataset.exportType = type;
  button.textContent = label;
  button.setAttribute('aria-label', `Export response as ${label}`);
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await runExport(content, type, button, label);
  }, true);
  return button;
}

function createFullButton(label, type) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cgpt-export-ext-button cgpt-export-ext-full-button';
  button.dataset.exportType = type;
  button.textContent = label;
  button.setAttribute('aria-label', `Export full conversation as ${label}`);
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await runFullExport(type, button, label);
  }, true);
  return button;
}

async function runExport(content, type, button, label) {
  setButtonState(button, 'loading');
  button.disabled = true;
  try {
    const title = getTitle();
    const clone = cloneForExport(content);
    if (type === 'html') await exportHtml(clone, title);
    if (type === 'pdf') await exportPdf(clone, title);
    if (type === 'docx') await exportDocx(clone, title);
    setButtonState(button, 'success');
    button.textContent = 'OK';
  } catch (error) {
    console.error(error);
    setButtonState(button, 'error');
    button.textContent = 'ERR';
  }
  window.setTimeout(() => {
    button.disabled = false;
    setButtonState(button, '');
    button.textContent = label;
  }, 1200);
}

async function runFullExport(type, button, label) {
  if (state.fullExportRunning) return;
  state.fullExportRunning = true;
  setButtonState(button, 'loading');
  button.disabled = true;
  let restoreScroll = null;
  try {
    restoreScroll = await loadFullConversation();
    const root = buildConversationExportRoot();
    if (restoreScroll) {
      restoreScroll();
      restoreScroll = null;
    }
    const title = sanitizeFileName(`${getTitle()} - full conversation`);
    const clone = cloneForExport(root);
    if (type === 'html') await exportHtml(clone, title);
    if (type === 'pdf') await exportPdf(clone, title);
    if (type === 'docx') await exportDocx(clone, title);
    setButtonState(button, 'success');
    button.textContent = 'OK';
  } catch (error) {
    console.error(error);
    setButtonState(button, 'error');
    button.textContent = 'ERR';
  }
  if (restoreScroll) restoreScroll();
  window.setTimeout(() => {
    button.disabled = false;
    setButtonState(button, '');
    button.textContent = label;
    state.fullExportRunning = false;
  }, 1200);
}

function setButtonState(button, value) {
  if (!value) {
    delete button.dataset.exportState;
    button.removeAttribute('aria-busy');
    return;
  }
  button.dataset.exportState = value;
  if (value === 'loading') button.setAttribute('aria-busy', 'true');
  else button.removeAttribute('aria-busy');
}

async function loadFullConversation() {
  const scrollTarget = findConversationScrollTarget();
  if (!scrollTarget) return null;
  const originalTop = scrollTopOf(scrollTarget);
  await expandHiddenConversationTurns();
  let stableRounds = 0;
  let lastTop = scrollTopOf(scrollTarget);
  let lastHeight = scrollHeightOf(scrollTarget);
  let lastCount = conversationMessageCount();
  for (let index = 0; index < 18 && stableRounds < 3; index += 1) {
    scrollToTop(scrollTarget);
    await wait(450);
    await expandHiddenConversationTurns();
    const nextTop = scrollTopOf(scrollTarget);
    const nextHeight = scrollHeightOf(scrollTarget);
    const nextCount = conversationMessageCount();
    if (nextTop === lastTop && nextHeight === lastHeight && nextCount === lastCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }
    lastTop = nextTop;
    lastHeight = nextHeight;
    lastCount = nextCount;
  }
  await expandHiddenConversationTurns();
  return () => scrollToPosition(scrollTarget, originalTop);
}

async function expandHiddenConversationTurns() {
  for (let round = 0; round < 8; round += 1) {
    const placeholders = Array.from(document.querySelectorAll('button.tm-chatgpt-hidden-placeholder')).filter((button) => {
      return button instanceof HTMLElement && isVisible(button);
    });
    if (!placeholders.length) return;
    for (const placeholder of placeholders) placeholder.click();
    await wait(80);
  }
}

function findConversationScrollTarget() {
  const firstMessage = document.querySelector('[data-message-author-role]');
  const candidates = [];
  let node = firstMessage && firstMessage.parentElement;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`) && node.scrollHeight > node.clientHeight + 20) candidates.push(node);
    node = node.parentElement;
  }
  return candidates[0] || document.scrollingElement || document.documentElement;
}

function scrollTopOf(target) {
  return target === document.scrollingElement || target === document.documentElement ? window.scrollY : target.scrollTop;
}

function scrollHeightOf(target) {
  return target === document.scrollingElement || target === document.documentElement ? document.documentElement.scrollHeight : target.scrollHeight;
}

function scrollToTop(target) {
  if (target === document.scrollingElement || target === document.documentElement) {
    scrollToPosition(target, 0);
  } else {
    target.scrollTop = 0;
  }
}

function scrollToPosition(target, top) {
  if (target === document.scrollingElement || target === document.documentElement) {
    window.scrollTo({ top, behavior: 'auto' });
    return;
  }
  target.scrollTop = top;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function conversationMessageCount() {
  return document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]').length;
}

function buildConversationExportRoot() {
  const messages = findConversationMessages();
  if (!messages.length) throw new Error('No conversation messages found');
  const root = document.createElement('div');
  root.className = 'cgpt-export-conversation';
  for (const message of messages) {
    const section = document.createElement('section');
    section.className = `cgpt-export-message cgpt-export-message-${message.role}`;
    const heading = document.createElement('h2');
    heading.textContent = message.role === 'user' ? 'User' : 'Assistant';
    section.appendChild(heading);
    section.appendChild(message.content.cloneNode(true));
    root.appendChild(section);
  }
  return root;
}

function findConversationMessages() {
  const roleNodes = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]')).filter((node) => {
    if (!isVisible(node)) return false;
    return !node.closest('template, [aria-hidden="true"]');
  });
  const seenTurns = new Set();
  const messages = [];
  for (const node of roleNodes) {
    const turn = node.closest('[data-testid^="conversation-turn-"], article') || node;
    if (seenTurns.has(turn)) continue;
    seenTurns.add(turn);
    const role = node.getAttribute('data-message-author-role');
    const content = buildTurnMessageContent(turn, role, node);
    if (!content || !normalizeText(content.textContent)) continue;
    messages.push({ role, content, top: turn.getBoundingClientRect().top + window.scrollY });
  }
  messages.sort((a, b) => a.top - b.top);
  return messages;
}

function buildTurnMessageContent(turn, role, fallbackNode) {
  const nodes = findTurnRoleNodes(turn, role, fallbackNode);
  if (nodes.length === 1) return findMessageContent(nodes[0]);
  const container = document.createElement('div');
  for (const node of nodes) {
    const content = findMessageContent(node);
    if (!content || !normalizeText(content.textContent)) continue;
    container.appendChild(content.cloneNode(true));
  }
  return container.childNodes.length ? container : findMessageContent(fallbackNode);
}

function findTurnRoleNodes(turn, role, fallbackNode) {
  const selector = `[data-message-author-role="${role}"]`;
  const nodes = [];
  if (turn.matches && turn.matches(selector)) nodes.push(turn);
  nodes.push(...Array.from(turn.querySelectorAll(selector)));
  const visibleNodes = nodes.filter((node) => {
    return node === fallbackNode || (isVisible(node) && !node.closest('template, [aria-hidden="true"]'));
  });
  return visibleNodes.filter((node) => {
    return !visibleNodes.some((other) => other !== node && other.contains(node));
  });
}

function findContentForActionGroup(group) {
  const turn = findActionGroupTurn(group);
  if (turn) {
    const assistant = turn.querySelector('[data-message-author-role="assistant"]');
    if (assistant) {
      const content = buildTurnMessageContent(turn, 'assistant', assistant);
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
  const markdowns = findMarkdownBlocks(root);
  if (markdowns.length === 1) return markdowns[0];
  if (markdowns.length > 1) return root;
  return root;
}

function findMarkdownBlocks(root) {
  const markdowns = Array.from(root.querySelectorAll('.markdown, [class*="markdown"]'));
  return markdowns.filter((node) => {
    if (node.closest('.cgpt-export-ext-panel, .cgpt-export-ext-share-panel')) return false;
    return !markdowns.some((other) => other !== node && other.contains(node));
  });
}
