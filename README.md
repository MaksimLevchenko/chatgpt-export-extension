# ChatGPT Exporter

Chrome/Chromium Manifest V3 extension for exporting individual ChatGPT responses to HTML, PDF and DOCX.

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

## Export behavior

HTML uses standalone markup and re-renders formulas through KaTeX from stored TeX.

PDF opens a print-ready export page. Use Print / Save PDF.

DOCX is generated locally in the browser without external libraries. Formulas are preserved as readable TeX text to avoid hangs on complex LaTeX.

## Files

- `manifest.json`
- `content.js`
- `content.css`
- `src/state.js`
- `src/utils.js`
- `src/formulas.js`
- `src/export-dom.js`
- `src/html-export.js`
- `src/zip.js`
- `src/docx-templates.js`
- `src/docx-export.js`
