// Exports ppt-build/script.html to a printable A4 PDF with page numbers.
// Run: node ppt-build/script-pdf.mjs
import { chromium } from '@playwright/test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = pathToFileURL(join(here, 'script.html')).href;
const out = resolve(here, '..', 'P2Shield_Presentation_Script.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(src, { waitUntil: 'load' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:8px;color:#8A94A3;padding:0 14mm;display:flex;justify-content:space-between">' +
    '<span>P2Shield &middot; TechKnights &middot; Presentation script</span>' +
    '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});
await browser.close();
console.log(`Saved ${out}`);
