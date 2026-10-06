/**
 * CLI: node export-gallery.mjs <dependency-prefix>.
 * Input: three allowlisted report chapters and their local SVG references.
 * Output: index.html, chapter galleries and luong-use-case-studyflow.pdf here.
 * Side effects: replaces generated artifacts only; never edits the original report PDF.
 * Errors: missing captions/assets, invalid paths, missing browser/dependencies; exit nonzero.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const chapters = ['chuong-1-tong-quan-de-tai.md', 'chuong-2-phan-tich-va-thiet-ke-he-thong.md', 'chuong-3-thiet-ke-chi-tiet-va-cai-dat.md'];
/** @param {string} value Untrusted text. @returns {string} HTML-safe text. @throws {TypeError} Non-string input. */
function escapeHtml(value) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
/** @param {string} value Markdown prose. @returns {string} Plain display text. @throws {TypeError} Non-string input. */
function plain(value) { return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, ''); }
/** @typedef {{chapter:number,title:string,caption:string,description:string,relative:string,source:string,orientation:'portrait'|'landscape'}} Figure */
/** @returns {Promise<Figure[]>} Validated captioned report figures. @throws {Error} Invalid/missing local asset or caption. */
async function collectFigures() {
  const figures = [];
  for (const [index, chapter] of chapters.entries()) {
    const reportPath = path.join(root, '../bao-cao', chapter);
    const report = await fs.readFile(reportPath, 'utf8');
    const matches = [...report.matchAll(/!\[([^\]]*)\]\(([^)]+)\)\s*\n\s*\*([^*\n]+)\*\s*\n\s*([^\n]+)/g)];
    if (matches.length !== [...report.matchAll(/!\[/g)].length) throw new Error('Missing figure caption/explanation: ' + chapter);
    for (const match of matches) {
      const absolute = path.resolve(path.dirname(reportPath), match[2]);
      const relative = path.relative(root, absolute).replaceAll('\\', '/');
      if (relative.startsWith('..') || !relative.endsWith('.svg')) throw new Error('Out-of-scope figure');
      await fs.access(absolute);
      const svgMarkup = await fs.readFile(absolute, 'utf8');
      const size = svgMarkup.match(/<svg[^>]*width="([\d.]+)(?:px)?"[^>]*height="([\d.]+)(?:px)?"/);
      if (!size) throw new Error('Missing SVG dimensions: ' + relative);
      const orientation = Number(size[1]) / Number(size[2]) > 1.7 ? 'landscape' : 'portrait';
      const source = relative.slice(0, -4) + '.puml';
      await fs.access(path.join(root, source));
      const description = match[4].startsWith('**Thuyết minh')
        ? report.slice(match.index + match[0].length).split(/\n(?:---|###)/)[0].trim()
        : match[4];
      figures.push({ chapter: index + 1, title: plain(match[1]), caption: plain(match[3]), description: plain(description), relative, source, orientation });
    }
  }
  return figures;
}
/**
 * @param {Figure[]} figures Validated report figures.
 * @param {string} prefix Relative path from output gallery to diagram root.
 * @returns {string} Complete static printable HTML. @throws {TypeError} Invalid figure fields.
 */
function gallery(figures, prefix) {
  return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>StudyFlow — Bộ sơ đồ báo cáo</title>' +
      '<style>body{font:16px/1.5 Arial,sans-serif;color:#222;background:#eee;margin:0}header,section{padding:24px;max-width:1500px;margin:auto}section{margin:24px auto;background:white;border:1px solid #ccc}h1,h2{margin:0 0 12px}a{color:#333}figure{margin:16px 0}img{display:block;max-width:100%;max-height:760px;margin:auto;object-fit:contain}figcaption{text-align:center;font-weight:bold}p{white-space:pre-line}.files a{margin-right:18px}@page portrait{size:A4 portrait;margin:10mm}@page landscape{size:A4 landscape;margin:10mm}@media print{body{background:white;font-size:10pt}header,.files{display:none}section{break-after:page;border:0;margin:0;padding:0;box-sizing:border-box}section.portrait{page:portrait;height:277mm}section.landscape{page:landscape;height:190mm}section:last-child{break-after:auto}h2{font-size:13pt}figure{margin:8px 0}.portrait img{max-width:185mm;max-height:208mm}.landscape img{max-width:270mm;max-height:126mm}p{font-size:9pt;margin:6px 0}figcaption{font-size:10pt}}</style>' +
    '<header><h1>StudyFlow — Bộ sơ đồ báo cáo</h1><p>Thiết kế tham khảo màu theo từng loại biểu đồ Visual Paradigm; số hình theo ba chương Markdown hiện hành. Mở SVG để phóng to, PNG để chèn Word; PDF chỉ tổng hợp sơ đồ, không thay thế báo cáo gốc.</p><a href="' + prefix + 'README.md">Quy ước / đối chiếu PDF cũ</a> · <a href="' + prefix + 'luong-use-case-studyflow.pdf">Tải PDF sơ đồ</a></header>' +
    figures.map(f => '<section class="' + f.orientation + '"><h2>' + escapeHtml(f.caption) + '</h2><p>Chèn vào Chương ' + f.chapter + ' tại đoạn dẫn cùng số hình. Hình dưới thể hiện ' + escapeHtml(f.title.toLowerCase()) + '. Khổ ' + (f.orientation === 'landscape' ? 'ngang vì hình dài' : 'dọc vì hình ngắn hoặc vừa') + '.</p><figure><img src="' + prefix + encodeURI(f.relative) + '" alt="' + escapeHtml(f.title) + '"><figcaption>' + escapeHtml(f.caption) + '</figcaption></figure><p>' + escapeHtml(f.description) + '</p><p class="files"><a href="' + prefix + f.relative + '">SVG</a><a href="' + prefix + f.relative.slice(0,-4) + '.png">PNG</a><a href="' + prefix + f.source + '">Nguồn / chú giải</a></p></section>').join('') + '</html>';
}
const figures = await collectFigures();
await fs.writeFile(path.join(root, 'index.html'), gallery(figures, ''), 'utf8');
for (const chapter of [1, 2, 3]) await fs.writeFile(path.join(root, `chuong-${chapter}/index.html`), gallery(figures.filter(f => f.chapter === chapter), '../'), 'utf8');
const prefix = path.resolve(process.argv[2] ?? '');
const { default: puppeteer } = await import(pathToFileURL(path.join(prefix, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'networkidle0' });
  const failed = await page.evaluate(() => [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src));
  if (failed.length) throw new Error('Unloaded figures: ' + failed.join(', '));
  await page.pdf({ path: path.join(root, 'luong-use-case-studyflow.pdf'), preferCSSPageSize: true, printBackground: true });
  for (const figure of figures.filter(item => item.relative.includes('/erd-physical-'))) {
    const svgMarkup = await fs.readFile(path.join(root, figure.relative), 'utf8');
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
    await page.setContent('<style>body{margin:0;background:white}</style>' + svgMarkup);
    await page.evaluate(() => document.fonts.ready);
    const svg = await page.$('svg');
    if (!svg) throw new Error('Cannot rasterize ERD: ' + figure.relative);
    await svg.screenshot({ path: path.join(root, figure.relative.slice(0, -4) + '.png') });
  }
  console.log(`Exported ${figures.length} captioned figures and PDF`);
} finally { await browser.close(); }
