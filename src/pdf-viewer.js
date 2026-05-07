'use strict';

const content = document.getElementById('cgpt-export-content');
const printButton = document.getElementById('cgpt-export-print-button');
const closeButton = document.getElementById('cgpt-export-close-button');
const labels = pdfUiText();

let rendered = false;
let printable = false;

document.documentElement.lang = labels.lang;
if (printButton) printButton.textContent = labels.print;
if (closeButton) closeButton.textContent = labels.close;

if (printButton) {
  printButton.addEventListener('click', () => {
    if (!printable) return;
    window.focus();
    window.print();
  });
}

if (closeButton) {
  closeButton.addEventListener('click', () => {
    window.close();
  });
}

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cgpt-export-render-pdf' || typeof data.body !== 'string') return;
  rendered = true;
  document.title = data.title || 'ChatGPT Exporter PDF';
  content.innerHTML = data.body;
  renderFormulas();
  window.requestAnimationFrame(() => {
    printable = true;
    if (printButton) printButton.disabled = false;
    window.focus();
    if (window.opener) window.opener.postMessage({ type: 'cgpt-export-render-pdf-ready' }, '*');
  });
});

window.setTimeout(() => {
  if (!rendered) content.textContent = 'PDF export data was not received. Close this tab and try again.';
}, 10000);

function renderFormulas() {
  for (const node of Array.from(content.querySelectorAll('[data-cgpt-formula="true"]'))) {
    const tex = node.getAttribute('data-tex') || node.textContent || '';
    const display = node.getAttribute('data-display') === 'true';
    if (!tex.trim()) continue;
    if (window.katex) {
      try {
        window.katex.render(tex, node, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
          trust: false
        });
        continue;
      } catch (error) {
        node.textContent = latexToReadableText(tex);
        continue;
      }
    }
    node.textContent = latexToReadableText(tex);
  }
}
