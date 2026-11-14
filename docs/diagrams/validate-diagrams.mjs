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
import { validateSequenceContract } from "./sequence-contract.mjs";

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
    const split = imageName.match(/^(sequence-.*)-part-([12])\.png$/);
    if(split) {
      assert(sources.includes(`${split[1]}.puml`), `Missing canonical source for ${imageName}`);
      const png=await fs.readFile(path.join(directory,imageName));
      assert(png.subarray(1,4).toString()==="PNG" && png.readUInt32BE(16)>100 && png.readUInt32BE(20)>100, `Invalid split image: ${imageName}`);
      continue;
    }
    const sourceName = `${imageName.slice(0, -4)}.puml`;
    assert(sources.includes(sourceName), `Missing PUML source for ${imageName}`);
  }
}

// Manually exported reference files belong to the user. Validate the seven
// canonical exchange outputs without deleting or counting those references.
const xmiFiles = allFiles.filter(file => path.extname(file).toLowerCase() === ".xmi" && /^chuong-[23]-/.test(path.basename(file)));
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

const report = (await fs.readFile(path.join(root, "../bao-cao/chuong-3-thiet-ke-chi-tiet-va-cai-dat.md"), "utf8")).replaceAll("\r\n", "\n");
for (const [stem, classStem, xmiName, figure] of [
  ["sequence-10-personal-rag", "class-04-personal-rag", "chuong-3-sequence-personal-rag.xmi", 10],
  ["sequence-11-slide-tutor", "class-05-slide-tutor", "chuong-3-sequence-course-material-tutor.xmi", 11],
  ["sequence-12-quiz", "class-06-quiz", "chuong-3-sequence-quiz.xmi", 12],
]) {
  const source = await fs.readFile(path.join(root, "chuong-3", `${stem}.puml`), "utf8");
  const contract = validateSequenceContract(source);
  const xmi = xmiByName.get(xmiName);
  assert(source.includes("' ActivationPolicy: full"), `${stem}: missing full endpoint activation policy`);
  for (const [message] of xmi.matchAll(/<message\b[\s\S]*?<\/message>/g)) {
    assert(message.includes("<fromActivation>") && message.includes("<toActivation>"), `${stem}: message endpoint has no execution in XMI`);
  }
  assert.equal(count(xmi, /<message [^>]*messageSort="synchCall"/g), contract.calls, `${stem}: synchronous calls lost in XMI`);
  assert.equal(count(xmi, /<message [^>]*messageSort="reply"/g), contract.replies, `${stem}: replies lost in XMI`);
  assert.equal(count(xmi, /<message [^>]*messageSort="asynchCall"/g), contract.events, `${stem}: asynchronous messages lost in XMI`);
  const classSource = await fs.readFile(path.join(root, "chuong-3", `${classStem}.puml`), "utf8");
  const classes = new Map([...classSource.matchAll(/^class (\w+)[^\n]*\{\r?\n([\s\S]*?)^}/gm)].map(match => [match[1], match[2]]));
  const participants = new Map([...source.matchAll(/^(boundary|control|entity)\s+"(.*?)"\s+as\s+(\w+)$/gm)].map(match => [match[3], match[2].replace(/^«.*?»\\n/, "").replace(/^:/, "")]));
  for (const [alias, name] of participants) {
    if (alias !== "Model") assert(classes.has(name), `${stem}: ${name} is absent from the class diagram`);
  }
  for (const match of source.matchAll(/^\w+\s*(?:->>|->)\s*(\w+)\s*(?:\+\+)?\s*:\s*(\w+)\(/gm)) {
    const [, target, operation] = match;
    if (!participants.has(target) || target === "Model") continue;
    const body = classes.get(participants.get(target));
    assert(new RegExp(`[+\\-#]${operation}\\(`).test(body), `${stem}: ${participants.get(target)}.${operation} is absent from the class diagram`);
  }
  const narrative = report.split(`#### Diễn giải trình tự Hình 3.${figure}\n`)[1]?.split(/\n### /)[0];
  assert(narrative, `${stem}: missing report narrative`);
  const numbers = [...narrative.matchAll(/^(\d+)\. /gm)].map(match => Number(match[1]));
  assert.equal(numbers.length, contract.calls + contract.replies + contract.events, `${stem}: report message count differs`);
  assert(numbers.every((number, index) => number === index + 1), `${stem}: report numbering is not continuous`);
  console.log(`PASS ${stem}: ${contract.calls} paired calls/returns, ${contract.events} events; class/XMI/report aligned.`);
}

console.log(`PASS: ${pairs} PUML/PNG pairs and ${xmiFiles.length} XMI exchange files; no SVG, MMD or PDF artifacts.`);
