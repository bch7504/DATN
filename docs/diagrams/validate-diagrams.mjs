/**
 * Validate the canonical StudyFlow diagram pairs.
 *
 * Args: none.
 * Input: .puml and .png files inside chuong-1/, chuong-2/ and chuong-3/.
 * Output: summary to stdout and exit code 0; this command has no side effects.
 * Errors: missing pair, invalid PlantUML/PNG/XMI, or a forbidden legacy format.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const chapters = ["chuong-1", "chuong-2", "chuong-3"];
const forbiddenExtensions = new Set([".svg", ".mmd", ".pdf"]);

/**
 * @param {string} directory Absolute allowlisted directory.
 * @returns {Promise<string[]>} Absolute file paths below the directory.
 */
async function listFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

const allFiles = await listFiles(root);
for (const file of allFiles) {
  assert(
    !forbiddenExtensions.has(path.extname(file).toLowerCase()),
    `Legacy diagram format is not allowed: ${path.relative(root, file)}`,
  );
}

let pairs = 0;
for (const chapter of chapters) {
  const directory = path.join(root, chapter);
  const files = await fs.readdir(directory);
  const sources = files.filter(file => file.endsWith(".puml")).sort();
  const images = files.filter(file => file.endsWith(".png")).sort();
  assert(sources.length > 0, `No PlantUML source in ${chapter}`);

  for (const sourceName of sources) {
    const stem = sourceName.slice(0, -5);
    const source = await fs.readFile(path.join(directory, sourceName), "utf8");
    assert(source.trimStart().startsWith("@startuml"), `Invalid source start: ${sourceName}`);
    assert(source.trimEnd().endsWith("@enduml"), `Invalid source end: ${sourceName}`);
    assert(source.includes("' Palette:"), `Missing palette declaration: ${sourceName}`);
    assert(source.includes("skinparam linetype ortho"), `Connectors must be orthogonal: ${sourceName}`);

    const imageName = `${stem}.png`;
    assert(images.includes(imageName), `Missing PNG for ${sourceName}`);
    const png = await fs.readFile(path.join(directory, imageName));
    assert.equal(png.subarray(1, 4).toString(), "PNG", `Invalid PNG signature: ${imageName}`);
    assert(png.readUInt32BE(16) > 100, `PNG width is too small: ${imageName}`);
    assert(png.readUInt32BE(20) > 100, `PNG height is too small: ${imageName}`);
    pairs++;
  }

  for (const imageName of images) {
    const sourceName = `${imageName.slice(0, -4)}.puml`;
    assert(sources.includes(sourceName), `Missing PUML source for ${imageName}`);
  }
}

const xmiFiles = allFiles.filter(file => path.extname(file).toLowerCase() === ".xmi");
assert.equal(xmiFiles.length, 7, "Expected seven Visual Paradigm XMI exchange files");
for (const file of xmiFiles) {
  const content = await fs.readFile(file, "utf8");
  assert(content.startsWith("<?xml"), `Invalid XML declaration: ${path.relative(root, file)}`);
  assert(content.includes('xmi:version="2.1"'), `Visual Paradigm requires XMI 2.1: ${path.relative(root, file)}`);
  assert(content.includes("<xmi:XMI") && content.includes("<uml:Model"), `Invalid XMI model: ${path.relative(root, file)}`);
  assert(content.trimEnd().endsWith("</xmi:XMI>"), `Incomplete XMI document: ${path.relative(root, file)}`);
}

const xmiByName = new Map();
for (const file of xmiFiles) xmiByName.set(path.basename(file), await fs.readFile(file, "utf8"));
const count = (content, pattern) => [...content.matchAll(pattern)].length;
const useCaseXmi = xmiByName.get("chuong-2-use-case-tong-quat.xmi");
assert.equal(count(useCaseXmi, /xmi:type="uml:Actor"/g), 3, "Use Case XMI must contain three actors");
assert.equal(count(useCaseXmi, /xmi:type="uml:UseCase"/g), 16, "Use Case XMI must contain sixteen use cases");
assert.equal(count(useCaseXmi, /xmi:type="uml:Association"/g), 16, "Use Case XMI must exclude hidden layout links");

for (const name of [
  "chuong-3-class-personal-rag.xmi",
  "chuong-3-class-course-material-tutor.xmi",
  "chuong-3-class-quiz.xmi",
]) {
  const content = xmiByName.get(name);
  assert(count(content, /xmi:type="uml:Class"/g) > 20, `${name} is missing classes`);
  assert(count(content, /xmi:type="uml:Association"/g) > 10, `${name} is missing associations`);
  assert(count(content, /xmi:type="uml:Dependency"/g) > 10, `${name} is missing dependencies`);
  assert(count(content, /<ownedAttribute /g) > 10, `${name} is missing attributes`);
  assert(count(content, /<ownedParameter [^>]* direction="in"/g) > 10, `${name} is missing operation parameters`);
  assert(content.includes('href="http://schema.omg.org/spec/UML/2.1/uml.xml#String"'), `${name} is missing primitive String references`);
  assert(content.includes('href="http://schema.omg.org/spec/UML/2.1/uml.xml#Integer"'), `${name} is missing primitive Integer references`);
  assert(content.includes('href="urn:studyflow:types#UUID"'), `${name} is missing UUID references`);
  assert(!content.includes('<packagedElement xmi:type="uml:DataType"'), `${name} must not add supporting data types as top-level elements`);
  assert(!content.includes('<packagedElement xmi:type="uml:PrimitiveType"'), `${name} must not add primitive types as top-level elements`);
}

for (const [name, minimumMessages] of [
  ["chuong-3-sequence-personal-rag.xmi", 40],
  ["chuong-3-sequence-course-material-tutor.xmi", 25],
  ["chuong-3-sequence-quiz.xmi", 35],
]) {
  const content = xmiByName.get(name);
  assert(count(content, /<lifeline /g) > 10, `${name} is missing lifelines`);
  assert(count(content, /<message /g) >= minimumMessages, `${name} is missing sequence messages`);
}

console.log(`PASS: ${pairs} PUML/PNG pairs and ${xmiFiles.length} XMI exchange files; no SVG, MMD or PDF artifacts.`);
