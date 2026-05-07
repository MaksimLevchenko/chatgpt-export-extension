'use strict';

function exportHtml(clone, title) {
  const html = buildStandaloneHtml(clone.innerHTML, title, false);
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${title}.html`);
}

function exportPdf(clone, title) {
  const html = buildStandaloneHtml(clone.innerHTML, title, true);
  const win = window.open('', '_blank');
  if (!win) throw new Error('Popup blocked');
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function buildStandaloneHtml(body, title, printMode) {
  const toolbar = printMode ? '<div class="cgpt-export-print-toolbar"><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></div>' : '';
  const autoPrint = printMode ? 'setTimeout(function(){window.focus();},400);' : '';
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
<style>
body{font-family:Arial,Helvetica,sans-serif;line-height:1.55;margin:40px;max-width:960px;color:#111827;background:#fff}
main{max-width:960px;margin:0 auto}
pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace}
pre{white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px;overflow-wrap:anywhere}
code{background:#f6f8fa;border-radius:4px;padding:1px 4px}
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
@page{margin:18mm}
@media print{body{margin:0}.cgpt-export-print-toolbar{display:none!important}main{max-width:none}}
</style>
</head>
<body>
${toolbar}
<main>${body}</main>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js"><\/script>
<script>
(function(){
function fallback(node, tex, display){node.textContent=display?'$$'+tex+'$$':'\\\\('+tex+'\\\\)'}
function render(){
  document.querySelectorAll('[data-cgpt-formula="true"]').forEach(function(node){
    var tex=node.getAttribute('data-tex')||node.textContent||'';
    var display=node.getAttribute('data-display')==='true';
    if(!tex.trim())return;
    if(window.katex){
      try{window.katex.render(tex,node,{displayMode:display,throwOnError:false,strict:'ignore',trust:false})}catch(error){fallback(node,tex,display)}
    }else{fallback(node,tex,display)}
  });
  ${autoPrint}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
<\/script>
</body>
</html>`;
}
