/**
 * Render PlantUML sources using the official browser engine.
 *
 * Args: node render-plantuml.mjs <dependency-prefix> [relative-stem] [output-relative-stem] [left,right,top,bottom].
 * Input: .puml files inside chuong-1/, chuong-2/ and chuong-3/ only.
 * Output: sibling .svg and .png files preserving per-diagram palettes; sources are never overwritten.
 * Exit: 0 on success, nonzero on failure; reruns replace generated images only.
 * Errors: invalid paths, unavailable browser/package, syntax/render failures.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const diagramRoot = path.dirname(fileURLToPath(import.meta.url));
const dependencyPrefix = path.resolve(process.argv[2] ?? "");
const selectedStem = process.argv[3];
const selectedOutputStem = process.argv[4];
const customMargins = process.argv[5];
const puppeteerModule = path.join(
  dependencyPrefix,
  "node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js",
);
const { default: puppeteer } = await import(pathToFileURL(puppeteerModule).href);
const plantumlRoot = path.join(dependencyPrefix, "node_modules/@plantuml/core");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** @returns {Promise<string[]>} Allowed sources. @throws {Error} Invalid selection. */
async function collectSources() {
  const chapters = ["chuong-1", "chuong-2", "chuong-3"];
  const files = [];
  for (const chapter of chapters) {
    const directory = path.join(diagramRoot, chapter);
    for (const entry of await fs.readdir(directory)) {
      if (entry.endsWith(".puml")) files.push(path.join(directory, entry));
    }
  }
  if (!selectedStem) return files.sort();
  const selected = path.resolve(diagramRoot, selectedStem + ".puml");
  if (!files.includes(selected)) throw new Error("Selected source is outside the allowlist");
  return [selected];
}

/**
 * @param {import('puppeteer-core').Browser} browser Local browser, already running.
 * @param {string} sourcePath Allowlisted absolute .puml source path.
 * @returns {Promise<string>} Rendered relative source name; writes sibling images.
 * @throws {Error} Invalid source, renderer failure or filesystem/browser error.
 */
async function renderSource(browser, sourcePath) {
  const source = await fs.readFile(sourcePath, "utf8");
  if (!source.trimStart().startsWith("@startuml")) throw new Error("Invalid PlantUML source: " + sourcePath);
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-puml-"));
  const htmlPath = path.join(temporaryDirectory, "render.html");
  const moduleUrl = pathToFileURL(path.join(plantumlRoot, "plantuml.js")).href;
  const vizUrl = pathToFileURL(path.join(plantumlRoot, "viz-global.js")).href;
  const html = '<!doctype html><meta charset="utf-8">' +
    '<script src="' + vizUrl + '"><' + '/script><script type="module">' +
    'import { renderToString } from "' + moduleUrl + '";' +
    'const source = ' + JSON.stringify(source) + ';' +
    'renderToString(source.split("\\n"),' +
    'svg => { globalThis.result = svg; },' +
    'error => { globalThis.failure = String(error); });<' + '/script>';
  await fs.writeFile(htmlPath, html, "utf8");
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => globalThis.result || globalThis.failure, { timeout: 120000 });
  const result = await page.evaluate(() => ({ svg: globalThis.result, error: globalThis.failure }));
  await fs.unlink(htmlPath);
  await fs.rmdir(temporaryDirectory);
  if (result.error || !result.svg?.includes("<svg") || result.svg.includes("Syntax Error?")) {
    throw new Error(path.basename(sourcePath) + ": " + (result.error || result.svg?.replace(/<[^>]*>/g, " ").slice(-2200) || "No SVG returned"));
  }
  let renderedSvg = result.svg;
  if (source.includes("' Palette: sequence")) {
    const interactionName = source.match(/^' Interaction:\s*(.+)$/m)?.[1]?.trim();
    if (!interactionName) throw new Error(path.basename(sourcePath) + ": missing sequence interaction name");
    const rawOpening = renderedSvg.match(/<svg\b[^>]*>/)?.[0];
    const rawWidth = rawOpening?.match(/\bwidth="([\d.]+)(?:px)?"/);
    const rawHeight = rawOpening?.match(/\bheight="([\d.]+)(?:px)?"/);
    const rawViewBox = rawOpening?.match(/\bviewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/);
    if (!rawOpening || !rawWidth || !rawHeight || !rawViewBox) {
      throw new Error(path.basename(sourcePath) + ": cannot build sequence interaction frame");
    }
    const headerSpace = 42;
    const frameX = Number(rawViewBox[1]) + 1;
    const frameY = Number(rawViewBox[2]) + 1;
    const frameWidth = Number(rawViewBox[3]) - 2;
    const frameHeight = Number(rawViewBox[4]) + headerSpace - 2;
    const expandedOpening = rawOpening
      .replace(rawWidth[0], `width="${Number(rawWidth[1])}"`)
      .replace(rawHeight[0], `height="${Number(rawHeight[1]) + headerSpace}"`)
      .replace(rawViewBox[0], `viewBox="${rawViewBox[1]} ${rawViewBox[2]} ${rawViewBox[3]} ${Number(rawViewBox[4]) + headerSpace}"`);
    const escapedName = interactionName
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const interactionFrame =
      `<g data-sequence-frame="true" fill="none" stroke="#222222" stroke-width="1.50">` +
      `<rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}"/>` +
      `<path d="M${frameX},${frameY} H${frameX + 260} L${frameX + 245},${frameY + 30} H${frameX} Z" fill="#FFFFFF"/>` +
      `</g><text x="${frameX + 10}" y="${frameY + 21}" font-size="15" font-weight="bold" fill="#111111" font-family="Arial">sd ${escapedName}</text>`;
    renderedSvg = renderedSvg
      .replace(rawOpening, expandedOpening)
      .replace('<defs/>', `<defs/><g transform="translate(0 ${headerSpace})">`)
      .replace('</svg>', `</g>${interactionFrame}</svg>`);
  }
  let outputStem = sourcePath.slice(0, -5);
  if (selectedOutputStem) {
    if (!selectedStem) throw new Error("A custom output requires one selected source");
    const requestedOutput = path.resolve(diagramRoot, selectedOutputStem);
    const relativeOutput = path.relative(diagramRoot, requestedOutput);
    if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
      throw new Error("Custom output is outside the diagrams directory");
    }
    outputStem = requestedOutput;
    await fs.mkdir(path.dirname(outputStem), { recursive: true });
  }
  // Keep a consistent white-space margin around every diagram so report
  // figures and their outer frames never sit flush against the image edge.
  const marginValues = customMargins
    ? customMargins.split(",").map(value => Number(value))
    : [100, 150, 80, 80];
  if (marginValues.length !== 4 || marginValues.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Margins must be four non-negative numbers: left,right,top,bottom");
  }
  const [marginLeft, marginRight, marginTop, marginBottom] = marginValues;
  const openingMatch = renderedSvg.match(/<svg\b[^>]*>/);
  const widthMatch = openingMatch?.[0].match(/\bwidth="([\d.]+)(?:px)?"/);
  const heightMatch = openingMatch?.[0].match(/\bheight="([\d.]+)(?:px)?"/);
  const viewBoxMatch = openingMatch?.[0].match(/\bviewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/);
  let svgMarkup = renderedSvg;
  if (openingMatch && widthMatch && heightMatch && viewBoxMatch) {
    const paddedX = Number(viewBoxMatch[1]) - marginLeft;
    const paddedY = Number(viewBoxMatch[2]) - marginTop;
    const paddedWidth = Number(viewBoxMatch[3]) + marginLeft + marginRight;
    const paddedHeight = Number(viewBoxMatch[4]) + marginTop + marginBottom;
    const paddedOpening = openingMatch[0]
      .replace(widthMatch[0], `width="${Number(widthMatch[1]) + marginLeft + marginRight}"`)
      .replace(heightMatch[0], `height="${Number(heightMatch[1]) + marginTop + marginBottom}"`)
      .replace(
        viewBoxMatch[0],
        `viewBox="${paddedX} ${paddedY} ${paddedWidth} ${paddedHeight}"`,
      );
    svgMarkup = renderedSvg
      .replace(openingMatch[0], paddedOpening)
      .replace(
        /(<svg\b[^>]*>)/,
        `$1<rect x="${paddedX}" y="${paddedY}" width="${paddedWidth}" height="${paddedHeight}" fill="#FFFFFF"/>`,
      );
  }
  if (source.includes("' Palette: activity")) {
    const partitionLines = [...svgMarkup.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="1\.50"\/>/g)]
      .map(match => ({ x: Number(match[1]), y1: Number(match[2]), y2: Number(match[3]) }))
      .filter(line => line.y2 > line.y1);
    if (partitionLines.length < 2) {
      throw new Error(path.basename(sourcePath) + ": activity swimlane boundaries were not found");
    }
    const frameLeft = Math.min(...partitionLines.map(line => line.x));
    const frameRight = Math.max(...partitionLines.map(line => line.x));
    const frameTop = Math.min(...partitionLines.map(line => line.y1));
    const frameBottom = Math.max(...partitionLines.map(line => line.y2));
    const headerBottom = frameTop + 28;
    const activityFrame =
      `<g data-activity-frame="true" fill="none" stroke="#000000" stroke-width="1.50">` +
      `<line x1="${frameLeft}" y1="${frameTop}" x2="${frameRight}" y2="${frameTop}"/>` +
      `<line x1="${frameLeft}" y1="${headerBottom}" x2="${frameRight}" y2="${headerBottom}"/>` +
      `<line x1="${frameLeft}" y1="${frameBottom}" x2="${frameRight}" y2="${frameBottom}"/>` +
      `</g>`;
    svgMarkup = svgMarkup.replace('</svg>', activityFrame + '</svg>');
  }
  await fs.writeFile(outputStem + ".svg", svgMarkup, "utf8");
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await page.setContent('<style>body{margin:0;background:white}</style>' + svgMarkup);
  await page.evaluate(() => document.fonts.ready);
  const svg = await page.$("svg");
  await svg.screenshot({ path: outputStem + ".png" });
  await page.close();
  return path.relative(diagramRoot, sourcePath);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--allow-file-access-from-files", "--no-sandbox"],
});
try {
  for (const source of await collectSources()) {
    console.log("RENDERED", await renderSource(browser, source));
  }
} finally {
  await browser.close();
}
