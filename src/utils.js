'use strict';

function directChild(parent, descendant) {
  if (!parent || !descendant || !parent.contains(descendant)) return null;
  let node = descendant;
  while (node && node.parentElement && node.parentElement !== parent) node = node.parentElement;
  return node && node.parentElement === parent ? node : null;
}

function isVisible(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getTitle() {
  const title = document.title.replace(/\s*[|–-]\s*ChatGPT.*$/i, '').trim();
  const value = title || `chatgpt-response-${state.fileCounter++}`;
  const name = sanitizeFileName(value, 95);
  return sanitizeFileName(`${name} - ${formatFileTimestamp(new Date())}`);
}

function sanitizeFileName(value, maxLength = 120) {
  return String(value || 'chatgpt-response').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, maxLength) || 'chatgpt-response';
}

function formatFileTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join('-');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeXmlText(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttribute(value) {
  return escapeXmlText(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
