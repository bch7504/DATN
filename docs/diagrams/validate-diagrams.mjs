/**
 * CLI: node validate-diagrams.mjs (no arguments).
 * Input: allowlisted report/gallery files and diagrams under this directory only.
 * Output: summary to stdout, exit 0 if valid; no writes/network.
 * Errors: broken links, malformed sources/assets, duplicate or missing caption; exit nonzero.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const chapters = ['chuong-1-tong-quan-de-tai.md', 'chuong-2-phan-tich-va-thiet-ke-he-thong.md', 'chuong-3-thiet-ke-chi-tiet-va-cai-dat.md'];
let figures = 0, sources = 0, links = 0;
for (const file of chapters) {
  const absolute = path.join(root, '../bao-cao', file);
  const report = await fs.readFile(absolute, 'utf8');
  const captions = [...report.matchAll(/^\*Hình (\d+\.\d+)\./gm)].map(m => m[1]);
  assert.equal(new Set(captions).size, captions.length, 'Duplicate figure number');
  assert.equal(captions.length, [...report.matchAll(/!\[/g)].length, 'Missing caption');
  figures += captions.length;
  for (const link of report.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:|^#/.test(link[1])) continue;
    await fs.access(path.resolve(path.dirname(absolute), link[1].split('#')[0])); links++;
  }
}
for (const chapter of ['chuong-1', 'chuong-2', 'chuong-3']) {
  for (const file of await fs.readdir(path.join(root, chapter))) {
    if (!file.endsWith('.puml')) continue;
    const stem = path.join(root, chapter, file.slice(0,-5));
    const source = await fs.readFile(stem + '.puml', 'utf8');
    assert(source.trimStart().startsWith('@startuml') && source.trimEnd().endsWith('@enduml'), 'Invalid source');
    assert(source.includes("' Palette:"), 'Missing per-diagram palette');
    assert(!source.includes('skinparam monochrome true'), 'Obsolete forced monochrome style');
    assert(source.includes('skinparam linetype ortho'), 'Connectors must use straight/orthogonal segments: ' + file);
    const svg = await fs.readFile(stem + '.svg', 'utf8');
    assert(svg.includes('<svg') && !svg.includes('Syntax Error?'), 'Invalid rendered SVG');
    if (source.includes("' Palette: activity")) {
      assert(svg.includes('data-activity-frame="true"'), 'Activity diagram must contain a closed swimlane frame: ' + file);
    }
    if (source.includes("' Palette: sequence")) {
      assert(svg.includes('data-sequence-frame="true"'), 'Sequence diagram must contain an sd interaction frame: ' + file);
    }
    const expectedColor = file.startsWith('erd-')
      ? '#F2BB7B'
      : file === 'architecture-scope-01-pham-vi-studyflow.puml'
        ? '#F8FAFC'
        : '#7ACFF5';
    assert(svg.toUpperCase().includes(expectedColor), 'Expected Visual Paradigm reference palette: ' + file);
    const png = await fs.readFile(stem + '.png');
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert(png.readUInt32BE(16) > 100 && png.readUInt32BE(20) > 100, 'Empty PNG');
    sources++;
  }
}
for (const file of ['index.html', 'chuong-1/index.html', 'chuong-2/index.html', 'chuong-3/index.html']) {
  const absolute = path.join(root, file);
  const html = await fs.readFile(absolute, 'utf8');
  for (const link of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    await fs.access(path.resolve(path.dirname(absolute), decodeURI(link[1]))); links++;
  }
}
await fs.access(path.join(root, 'chuong-3/erd-physical-03-studyflow-overview.png'));
assert.equal(figures, 22, 'Unexpected report figure count');
assert.equal(sources, 22, 'Unexpected UML source count');
console.log(`PASS: ${figures} captioned figures, ${sources} UML/SVG/PNG sets, ${links} local links`);
