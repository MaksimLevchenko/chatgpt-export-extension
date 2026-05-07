'use strict';

async function exportHtml(clone, title) {
  renderKatexFormulas(clone);
  const html = buildStandaloneHtml(clone.innerHTML, title, await getStandaloneKatexCss());
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${title}.html`);
}

async function exportPdf(clone, title) {
  const win = window.open('', '_blank');
  if (!win) throw new Error('Popup blocked');
  win.document.open();
  win.document.write(buildLoadingHtml(title));
  win.document.close();
  renderKatexFormulas(clone);
  const html = buildStandaloneHtml(clone.innerHTML, title, await getStandaloneKatexCss(), true);
  win.document.open();
  win.document.write(html);
  win.document.close();
  attachPrintToolbar(win);
  win.focus();
}

function buildStandaloneHtml(body, title, katexCss, printMode = false) {
  const labels = pdfUiText();
  const toolbar = printMode ? `<div class="cgpt-export-print-toolbar"><button type="button" id="cgpt-export-print-button">${escapeHtml(labels.print)}</button><button type="button" id="cgpt-export-close-button">${escapeHtml(labels.close)}</button></div>` : '';
  return `<!doctype html>
<html lang="${escapeHtml(labels.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${katexCss}
body{font-family:Arial,Helvetica,sans-serif;line-height:1.55;margin:40px;max-width:960px;color:#111827;background:#fff}
main{max-width:960px;margin:0 auto}
pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace}
pre{white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px;overflow-wrap:anywhere}
code{background:#f6f8fa;border-radius:4px;padding:1px 4px;white-space:break-spaces}
pre code{background:transparent;padding:0}
table{border-collapse:collapse;width:100%;margin:14px 0;break-inside:auto}
tr{break-inside:avoid;break-after:auto}
th,td{border:1px solid #d0d7de;padding:6px 8px;vertical-align:top}
th{background:#f6f8fa;font-weight:700}
blockquote{border-left:4px solid #d0d7de;padding-left:12px;color:#57606a;margin-left:0}
img{max-width:100%}
.cgpt-export-checkbox{display:inline-block;margin-right:.35em;font-family:Arial,Helvetica,sans-serif}
.cgpt-export-formula-display{display:block;text-align:center;margin:14px 0;overflow-x:auto;overflow-y:hidden;padding:6px 0}
.cgpt-export-formula-inline{display:inline-block;vertical-align:middle}
.cgpt-export-print-toolbar{position:fixed;top:12px;right:12px;display:flex;gap:8px;background:#fff;border:1px solid #d0d7de;border-radius:10px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:9999}
.cgpt-export-print-toolbar button{border:1px solid #d0d7de;border-radius:8px;background:#fff;padding:8px 10px;cursor:pointer}
.cgpt-export-print-toolbar button:disabled{opacity:.55;cursor:default}
@page{margin:18mm}
@media print{body{margin:0}.cgpt-export-print-toolbar{display:none!important}main{max-width:none}}
</style>
</head>
<body>
${toolbar}
<main>${body}</main>
</body>
</html>`;
}

function buildLoadingHtml(title) {
  const labels = pdfUiText();
  return `<!doctype html><html lang="${escapeHtml(labels.lang)}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,Helvetica,sans-serif;margin:40px">${escapeHtml(labels.preparing)}</body></html>`;
}

function attachPrintToolbar(win) {
  const printButton = win.document.getElementById('cgpt-export-print-button');
  const closeButton = win.document.getElementById('cgpt-export-close-button');
  if (printButton) printButton.addEventListener('click', () => { win.focus(); win.print(); });
  if (closeButton) closeButton.addEventListener('click', () => win.close());
}
