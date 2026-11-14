/**
 * Render PlantUML sources using the official browser engine.
 *
 * Args: node render-plantuml.mjs <dependency-prefix> [relative-stem] [output-relative-stem] [left,right,top,bottom].
 * Input: .puml files inside chuong-1/, chuong-2/ and chuong-3/ only.
 * Output: sibling .png files preserving per-diagram palettes; sources are never overwritten.
 * Exit: 0 on success, nonzero on failure; reruns replace generated PNG images only.
 * Errors: invalid paths, unavailable browser/package, syntax/render failures.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const diagramRoot = path.dirname(fileURLToPath(import.meta.url));
const dependencyPrefix = path.resolve(process.argv[2] ?? "");
const selectedStem = process.argv[3];
const selectedOutputStem = process.argv[4] === "--split" ? undefined : process.argv[4];
const customMargins = process.argv[5] === "--split" ? undefined : process.argv[5];
const splitSequence = process.argv.includes("--split");
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
 * @returns {Promise<string>} Rendered relative source name; writes one sibling PNG image.
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
    'const source = ' + JSON.stringify(source.includes("' Palette: sequence") ? largeSequenceSource(source) : source) + ';' +
    'renderToString(source.split("\\n"),' +
    'svg => { globalThis.result = svg; },' +
    'error => { globalThis.failure = String(error); }, {maxSvgSize:32768});<' + '/script>';
  await fs.writeFile(htmlPath, html, "utf8");
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => globalThis.result || globalThis.failure, { timeout: 120000 });
  const result = await page.evaluate(() => ({ svg: globalThis.result, error: globalThis.failure }));
  await fs.unlink(htmlPath);
  await fs.rmdir(temporaryDirectory);
  // PlantUML can return an SVG error page through its success callback.
  // Reject that page before it overwrites a report PNG.
  const renderedText = result.svg?.replace(/<[^>]*>/g, " ") ?? "";
  if (result.error || !result.svg?.includes("<svg") || /Syntax Error\?|\[From textarea \(line \d+\)\]/i.test(renderedText)) {
    throw new Error(path.basename(sourcePath) + ": " + (result.error || result.svg?.replace(/<[^>]*>/g, " ").slice(-2200) || "No SVG returned"));
  }
  let renderedSvg = result.svg;
  if (source.includes("' Palette: sequence") && !source.includes("' InteractionFrame: none")) {
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
      `<g data-sequence-frame="true" fill="none" stroke="#000000" stroke-width="1.50">` +
      `<rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}"/>` +
      `<path d="M${frameX},${frameY} H${frameX + 260} L${frameX + 245},${frameY + 30} H${frameX} Z" fill="#FFFFFF"/>` +
      `</g><text x="${frameX + 10}" y="${frameY + 21}" font-size="15" font-weight="bold" fill="#000000" font-family="Arial">sd ${escapedName}</text>`;
    renderedSvg = renderedSvg
      .replace(rawOpening, expandedOpening)
      .replace('<defs/>', `<defs/><g transform="translate(0 ${headerSpace})">`)
      .replace('</svg>', `</g>${interactionFrame}</svg>`);
  }
  // PlantUML's sequence renderer keeps #181818 for lifelines/activations even
  // when their skinparams are black. Normalize that built-in color only for
  // diagrams that explicitly opt into a strict black-and-white palette.
  if (source.includes("' Monochrome: true")) {
    renderedSvg = renderedSvg.replaceAll("#181818", "#000000");
  }
  if (source.includes("' Palette: sequence")) {
    const count=source.split("\n").filter(line=>/^\s*(actor|boundary|control|entity|participant)\b/.test(line)).length;
    renderedSvg=(await enlargeSequenceSymbols(page,renderedSvg,count)).markup;
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
    : source.includes("' Palette: sequence") ? [4, 4, 4, 4] : [100, 150, 80, 80];
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
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await page.setContent('<style>body{margin:0;background:white}</style>' + svgMarkup);
  await page.evaluate(() => document.fonts.ready);
  const svg = await page.$("svg");
  await svg.screenshot({ path: outputStem + ".png" });
  if (splitSequence && source.includes("' Palette: sequence")) {
    await exportSequenceHalves(page, renderedSvg, outputStem, marginValues, source, moduleUrl);
  }
  await page.close();
  return path.relative(diagramRoot, sourcePath);
}

/**
 * @param {import('puppeteer-core').Page} page Local renderer page.
 * @param {string} source Complete derived PUML, no external document content.
 * @param {string} moduleUrl Local PlantUML browser module URL.
 * @returns {Promise<string>} SVG markup in memory, no filesystem side effects.
 * @throws {Error} Renderer failure, timeout or invalid SVG/error page.
 */
async function renderSequenceSvg(page, source, moduleUrl) {
  const markup=await page.evaluate(async ({source,moduleUrl})=>{
    const {renderToString}=await import(moduleUrl);
    return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Sequence render timed out")),120000);
      renderToString(source.split("\n"),svg=>{clearTimeout(timer);resolve(svg);},error=>{clearTimeout(timer);reject(new Error(String(error)));},{maxSvgSize:32768});
    });
  },{source,moduleUrl});
  if(!markup.includes("<svg") || /Syntax Error\?|\[From textarea \(line \d+\)\]/i.test(markup)) throw new Error("Sequence could not be rendered");
  return markup;
}

/**
 * @param {string} source Canonical monochrome sequence PUML.
 * @returns {string} Derived layout with 26px text, wrapped participant labels and thicker strokes.
 * @throws {Error} None; message text and canonical source files remain unchanged.
 */
function largeSequenceSource(source) {
  const styled=source.replace(/^skinparam defaultFontSize \d+$/m,"skinparam defaultFontSize 26")
    .replace(/^autonumber$/m,"skinparam maxMessageSize 220\nskinparam ArrowThickness 2\nskinparam NoteFontSize 26\nskinparam SequenceGroupFontSize 26\nskinparam SequenceGroupHeaderFontSize 26\nskinparam ParticipantFontSize 26\nskinparam ActorFontSize 26\nautonumber");
  return styled.replace(/^(boundary|control|entity|participant)\s+"([^"]+)"(\s+as\s+\w+)\s*$/gm,(_,kind,label,alias)=>{
    const wrapped=label.split("\\n").map(part=>{
      if(part.length<=8 || part.includes(" ") || part.startsWith("«")) return part;
      const words=part.replace(/([a-z0-9])([A-Z])/g,"$1 $2").split(" ");
      const rows=[];
      for(const word of words.flatMap(word=>word.match(/.{1,8}/g) ?? [])) {
        if(rows.length && rows[rows.length-1].length+word.length<=8) rows[rows.length-1]+=word;
        else rows.push(word);
      }
      return rows.join("\\n");
    }).join("\\n");
    return `${kind} "${wrapped}"${alias}`;
  });
}

/**
 * @param {import('puppeteer-core').Page} page Local renderer page.
 * @param {string} markup Sequence SVG from the local PlantUML engine.
 * @param {number} symbolCount Required number of declared lifelines.
 * @returns {Promise<{markup:string,inner:string,x:number,y:number,width:number,height:number}>}
 * SVG with uniformly enlarged header symbols and tightly measured content bounds.
 * @throws {Error} Invalid SVG, unexpected symbol count or renderer warning.
 */
async function enlargeSequenceSymbols(page,markup,symbolCount) {
  await page.setContent('<style>body{margin:0;background:white}</style>'+markup);
  await page.evaluate(()=>document.fonts.ready);
  return await page.evaluate(symbolCount=>{
    const svg=document.querySelector("svg");
    if(!svg || svg.textContent.includes("Please use CSS style instead of skinparam")) throw new Error("Invalid report SVG or renderer warning");
    const firstMessage=[...svg.querySelectorAll("text")].find(text=>/^1\b/.test(text.textContent.trim()));
    if(!firstMessage || Number.parseFloat(getComputedStyle(firstMessage).fontSize)!==26) throw new Error("Sequence message font must be 26px");
    const firstY=Math.min(...[...svg.querySelectorAll("text")].filter(text=>/^\d+\b/.test(text.textContent.trim())).map(text=>text.getBBox().y));
    const shapes=[...svg.querySelectorAll("ellipse,circle,line,path,polygon,rect")].filter(element=>!element.closest("defs")).map(element=>({element,box:element.getBBox()}))
      .filter(({box})=>box.width<=100 && box.height<=120 && box.y+box.height<firstY-6 && box.width>0);
    const groups=[];
    for(const shape of shapes.sort((a,b)=>(a.box.x+a.box.width/2)-(b.box.x+b.box.width/2))) {
      const center=shape.box.x+shape.box.width/2;
      const last=groups[groups.length-1];
      if(last && Math.abs(last.center-center)<45) last.shapes.push(shape);
      else groups.push({center,shapes:[shape]});
    }
    if(groups.length!==symbolCount) throw new Error(`Header symbol count mismatch: ${groups.length}/${symbolCount}`);
    for(const group of groups) {
      const left=Math.min(...group.shapes.map(s=>s.box.x));
      const right=Math.max(...group.shapes.map(s=>s.box.x+s.box.width));
      const bottom=Math.max(...group.shapes.map(s=>s.box.y+s.box.height));
      const center=(left+right)/2;
      const wrapper=document.createElementNS(svg.namespaceURI,"g");
      wrapper.setAttribute("transform",`translate(${center} ${bottom}) scale(1.8) translate(${-center} ${-bottom})`);
      for(const shape of group.shapes) wrapper.append(shape.element);
      svg.append(wrapper);
    }
    const box=svg.getBBox();
    const x=Math.floor(box.x),y=Math.floor(box.y);
    const width=Math.ceil(box.x+box.width)-x,height=Math.ceil(box.y+box.height)-y;
    svg.setAttribute("viewBox",`${x} ${y} ${width} ${height}`);
    svg.setAttribute("width",String(width));svg.setAttribute("height",String(height));
    svg.style.removeProperty("width");svg.style.removeProperty("height");
    return {markup:svg.outerHTML,inner:svg.innerHTML,x,y,width,height};
  },symbolCount);
}

/**
 * Args: local browser page, original SVG, output stem, four nonnegative margins,
 * canonical PUML and the local PlantUML module URL.
 * Input: numbered sequence; messages/relationships must match the canonical source.
 * Output: Promise<void>; two tightly framed PNGs with identical canvas sizes,
 * 26px text and 1.8x symbols, plus vertically respaced steps. No repeated headers.
 * Optional PUML metadata ' Split PNG height fixes each part's pixel height at 2x;
 * it must be an even integer >=512. Errors rather than shrinking text or clipping.
 * Errors: invalid canvas/message count/geometry, unsafe cut or render failure.
 * Side effects: overwrites only the two derived PNGs; no derived PUML/SVG on disk.
 */
async function exportSequenceHalves(page, markup, outputStem, margins, source, moduleUrl) {
  const originalHeight=Number(markup.match(/viewBox="[\d.-]+ [\d.-]+ [\d.]+ ([\d.]+)"/)?.[1]);
  if(!Number.isFinite(originalHeight) || originalHeight<=0) throw new Error("Invalid original sequence canvas");
  const [left,right,top,bottom]=margins;
  const fixedPngHeight=Number(source.match(/^' Split PNG height:\s*(\d+)\s*$/m)?.[1] ?? 2*(originalHeight+top+bottom));
  if(!Number.isInteger(fixedPngHeight) || fixedPngHeight<512 || fixedPngHeight%2!==0) throw new Error("Split PNG height must be an even integer >=512");
  const bodyHeight=fixedPngHeight/2-top-bottom;
  if(bodyHeight<=0) throw new Error("Split PNG height is smaller than its margins");
  source=largeSequenceSource(source);
  const symbolCount=source.split("\n").filter(line=>/^\s*(actor|boundary|control|entity|participant)\b/.test(line)).length;
  const baseline=await enlargeSequenceSymbols(page,await renderSequenceSvg(page,source,moduleUrl),symbolCount);
  if(baseline.height>2*bodyHeight) throw new Error(`Large-font sequence needs more room: ${baseline.height} > ${2*bodyHeight}`);
  const bounds=await page.evaluate(({minimumCut,maximumCut,preferredCut})=>{
    const texts=[...document.querySelectorAll("svg text")].map(text=>{
      const box=text.getBBox();return {label:text.textContent.trim(),y:box.y,bottom:box.y+box.height};
    });
    let expectedStep=1;
    const rows=texts.filter(text=>/^\d+\b/.test(text.label)).sort((a,b)=>a.y-b.y).filter(text=>{
      if(Number(text.label.match(/^\d+/)[0])!==expectedStep) return false;
      expectedStep++;return true;
    });
    const candidates=rows.map((row,index)=>({index,cut:index===0 ? 0 : Math.round((rows[index-1].bottom+row.y)/2)}))
      .filter(({index,cut})=>index>=2 && index<=rows.length-2 && cut>=minimumCut && cut<=maximumCut)
      .sort((a,b)=>Math.abs(a.cut-preferredCut)-Math.abs(b.cut-preferredCut));
    for(const {index,cut} of candidates) {
      if(!texts.some(text=>text.y<cut && text.bottom>cut)) return {cut,splitIndex:index,rowCount:rows.length,first:rows[index].label};
    }
    throw new Error("No text-safe sequence split found");
  },{minimumCut:baseline.y+baseline.height-bodyHeight,maximumCut:baseline.y+bodyHeight,preferredCut:baseline.y+baseline.height/2});
  const gapCounts=[bounds.splitIndex-1,bounds.rowCount-bounds.splitIndex-1];
  if(gapCounts.some(count=>count<1)) throw new Error("Each sequence half needs at least two messages");
  const extraHeights=[bodyHeight-(bounds.cut-baseline.y),bodyHeight-(baseline.y+baseline.height-bounds.cut)];
  let messageIndex=0;
  const spacedSource=source.split("\n").map(line=>{
    if(!/^\s*\w+\s+-+>>?\s+\w+\b[^:]*:/.test(line)) return line;
    const index=messageIndex++,half=index<bounds.splitIndex ? 0 : 1;
    const localIndex=half===0 ? index : index-bounds.splitIndex;
    if(localIndex===0) return line;
    const extra=Math.round(extraHeights[half]*localIndex/gapCounts[half])-Math.round(extraHeights[half]*(localIndex-1)/gapCounts[half]);
    return `||${extra}||\n${line}`;
  }).join("\n");
  if(messageIndex!==bounds.rowCount) throw new Error("PUML messages do not match numbered SVG rows");
  const expanded=await enlargeSequenceSymbols(page,await renderSequenceSvg(page,spacedSource,moduleUrl),symbolCount);
  const cut=bounds.cut+extraHeights[0];
  if(expanded.x!==baseline.x || expanded.width!==baseline.width || Math.abs(expanded.height-2*bodyHeight)>1) throw new Error("Unexpected report layout geometry");
  await page.evaluate(cut=>{
    if([...document.querySelectorAll("svg text")].some(text=>{const box=text.getBBox();return box.y<cut && box.y+box.height>cut;})) throw new Error("Sequence split would cut text");
  },cut);
  const partHeights=[cut-expanded.y,expanded.y+expanded.height-cut];
  const width=expanded.width+left+right,height=Math.max(...partHeights)+top+bottom;
  const inner=expanded.inner.replaceAll("#181818","#000000");
  for(const part of [1,2]) {
    const startY=part===1 ? expanded.y : cut;
    const partHeight=partHeights[part-1];
    const fragment=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`+
      '<rect width="100%" height="100%" fill="white"/>'+
      `<svg x="${left}" y="${top}" width="${expanded.width}" height="${partHeight}" viewBox="${expanded.x} ${startY} ${expanded.width} ${partHeight}" overflow="hidden">${inner}</svg></svg>`;
    await page.setContent('<style>body{margin:0;background:white}</style>'+fragment);
    await page.evaluate(()=>document.fonts.ready);
    await (await page.$("svg")).screenshot({path:`${outputStem}-part-${part}.png`});
  }
  console.log("SPLIT",path.basename(outputStem),"font 26; symbols 1.8x; tight margins",margins.join(","),"part 2",bounds.first,"canvas",width,height);
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
