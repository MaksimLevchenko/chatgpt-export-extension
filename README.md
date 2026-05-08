# ChatGPT Exporter

Chrome/Chromium Manifest V3 extension for exporting individual ChatGPT responses or a full ChatGPT conversation to HTML, PDF and DOCX.

## Install locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `chatgpt-export-extension` folder.
5. Open or reload ChatGPT.

## Usage

Open a ChatGPT conversation. Each assistant response should show three buttons in the response action bar:

- HTML
- PDF
- DOCX

The buttons are inserted after Bad response and before More actions.

The conversation header should also show export buttons next to Share. These buttons attempt to scroll up and load earlier messages before exporting the full conversation that is available in the page DOM.

## Export behavior

HTML uses standalone markup and renders formulas through the bundled local KaTeX runtime. If KaTeX cannot render a formula, it falls back to readable mathematical text instead of raw delimiters.

PDF opens a print-ready export page, renders formulas through the bundled local KaTeX runtime, then enables Print. Use Chrome's print dialog to print or choose Save as PDF.

DOCX is generated locally in the browser. Formulas are converted from TeX through KaTeX MathML into native Word equation markup when possible; unsupported formulas fall back to readable mathematical text.

## Files

- `manifest.json`
- `pdf-viewer.html`
- `vendor/katex/`
- `content.js`
- `content.css`
- `src/state.js`
- `src/utils.js`
- `src/formulas.js`
- `src/math-text.js`
- `src/katex-export.js`
- `src/math-omml.js`
- `src/export-dom.js`
- `src/html-export.js`
- `src/pdf-viewer.css`
- `src/pdf-viewer.js`
- `src/zip.js`
- `src/docx-templates.js`
- `src/docx-export.js`
