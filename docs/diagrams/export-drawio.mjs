/**
 * Export allowlisted PlantUML sources to editable Draw.io documents.
 *
 * Args: node export-drawio.mjs [relative-source]. The optional source must
 * match one item in SOURCES; when omitted, every available source is exported.
 * Input: UTF-8 .puml files below docs/diagrams and, for the full export only,
 * the last committed version of an allowlisted source missing from the worktree.
 * Output: a sibling .drawio file for each selected source; existing generated
 * files are replaced. Exit status is 0 on success and nonzero on invalid input
 * or file/parsing errors.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  "chuong-1/architecture-scope-01-pham-vi-studyflow.puml",
  "chuong-2/use-case-01-tong-quat.puml",
  "chuong-3/component-01-kien-truc-he-thong.puml",
  "chuong-3/class-entity-02-studyflow-overview.puml",
  "chuong-3/erd-physical-03-studyflow-overview.puml",
  "chuong-3/class-04-personal-rag.puml",
  "chuong-3/class-05-slide-tutor.puml",
  "chuong-3/class-06-quiz.puml",
  "chuong-3/activity-07-personal-rag.puml",
  "chuong-3/activity-08-slide-tutor.puml",
  "chuong-3/activity-09-quiz-generation.puml",
  "chuong-3/sequence-10-personal-rag.puml",
  "chuong-3/sequence-11-slide-tutor.puml",
  "chuong-3/sequence-12-quiz.puml",
  "chuong-3/sequence-14-document-indexing.puml",
  "chuong-3/state-machine-15-quiz-lifecycle.puml",
];

function readSource(relative) {
  const input = path.join(root, relative);
  if (fs.existsSync(input)) return { input, source: fs.readFileSync(input, "utf8"), fallback: false };
  try {
    const repositoryRoot = path.resolve(root, "..", "..");
    const gitPath = `docs/diagrams/${relative.replaceAll("\\", "/")}`;
    return {
      input,
      source: execFileSync("git", ["show", `HEAD:${gitPath}`], { cwd: repositoryRoot, encoding: "utf8" }),
      fallback: true,
    };
  } catch {
    return null;
  }
}

const xml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const clean = (value) => String(value ?? "")
  .replaceAll("\\n", "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ")
  .trim();

function parse(source) {
  const lines = source.split(/\r?\n/);
  const nodes = new Map();
  const edges = [];
  const messages = [];
  const participants = [];
  let block = null;

  const addNode = (id, label, kind, body = [], stereotype = "") => {
    if (!id || kind === "package" || id === "left" || id === "right" || id === "top" || id === "bottom") return;
    const prior = nodes.get(id);
    const resolvedKind = prior && kind === "rectangle" ? prior.kind : kind;
    nodes.set(id, {
      id,
      label: clean(label || id),
      kind: resolvedKind,
      body: body.length ? body : prior?.body ?? [],
      stereotype: clean(stereotype || prior?.stereotype || ""),
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("'") || line.startsWith("skinparam") || line.startsWith("@") || line.startsWith("hide ") || line.startsWith("title ")) continue;

    if (block) {
      if (line === "}") {
        addNode(block.id, block.label, block.kind, block.body, block.stereotype);
        block = null;
      } else if (!line.startsWith("note ") && !line.startsWith("end note")) {
        block.body.push(clean(line.replace(/^[-+/#~]/, "")));
      }
      continue;
    }

    const quoted = line.match(/^(actor|usecase|rectangle|component|database|cloud|folder|queue|class|interface|enum|state|participant|boundary|control|entity|collections|package)\s+"([^"]+)"(?:\s+as\s+([A-Za-z_][\w]*))?(?:\s+<<([^>]+)>>)?(?:\s+#[A-Fa-f0-9]+)?\s*(\{)?$/i);
    if (quoted) {
      const kind = quoted[1].toLowerCase();
      const id = quoted[3] || quoted[2].replace(/\W+/g, "_");
      if (["participant", "boundary", "control", "entity", "collections"].includes(kind) && !participants.includes(id)) participants.push(id);
      if (quoted[5] && ["class", "interface", "enum", "entity"].includes(kind)) block = { id, label: quoted[2], kind, body: [], stereotype: quoted[4] || "" };
      else addNode(id, quoted[2], kind, [], quoted[4] || "");
      continue;
    }

    const simple = line.match(/^(actor|participant|boundary|control|entity|collections|class|interface|enum|state|component|database)\s+([A-Za-z_][\w]*)(?:\s+<<([^>]+)>>)?(?:\s+#[A-Fa-f0-9]+)?\s*(\{)?$/i);
    if (simple) {
      const kind = simple[1].toLowerCase();
      const id = simple[2];
      if (["participant", "boundary", "control", "entity", "collections"].includes(kind) && !participants.includes(id)) participants.push(id);
      if (simple[4] && ["class", "interface", "enum", "entity"].includes(kind)) block = { id, label: id, kind, body: [], stereotype: simple[3] || "" };
      else addNode(id, id, kind, [], simple[3] || "");
      continue;
    }

    if (line.includes("[hidden]")) continue;
    const edge = line.match(/^([A-Za-z_][\w]*)(?:\s+"[^"]+")?\s+([-.<>|o{}\[\]A-Za-z0-9*]+)\s+(?:"[^"]+"\s+)?([A-Za-z_][\w]*)(?:\s*:\s*(.+))?$/);
    if (edge && /[-.][^ ]*[->o*]/.test(edge[2])) {
      const [, from, arrow, to, label = ""] = edge;
      addNode(from, from, "rectangle");
      addNode(to, to, "rectangle");
      const item = { from, to, label: clean(label), dashed: arrow.includes(".."), arrow };
      edges.push(item);
      if (participants.includes(from) && participants.includes(to)) messages.push(item);
    }
  }

  return { nodes: [...nodes.values()], edges, participants, messages };
}

function nodeStyle(kind, stereotype = "") {
  const common = "whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=13;align=center;verticalAlign=middle;shadow=0;";
  if (kind === "actor") return `${common}shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;outlineConnect=0;fillColor=#7ACFF5;strokeColor=#1F2937;`;
  if (kind === "usecase") return `${common}ellipse;fillColor=#DDF3FC;strokeColor=#1F2937;`;
  if (["database"].includes(kind)) return `${common}shape=cylinder3;boundedLbl=1;backgroundOutline=1;fillColor=#E8F3DC;strokeColor=#526B36;`;
  if (["entity"].includes(kind)) return `${common}swimlane;horizontal=1;startSize=28;fillColor=#F5B879;swimlaneFillColor=#FFF7ED;strokeColor=#6B4423;fontStyle=1;`;
  if (["class", "interface", "enum"].includes(kind)) {
    return `${common}swimlane;horizontal=1;startSize=28;fillColor=#FFFFFF;swimlaneFillColor=#FFFFFF;strokeColor=#000000;fontStyle=1;`;
  }
  if (kind === "state") return `${common}rounded=1;arcSize=18;fillColor=#7ACFF5;strokeColor=#1F2937;`;
  if (["package", "rectangle"].includes(kind)) return `${common}rounded=1;arcSize=8;fillColor=#F8FAFC;strokeColor=#64748B;`;
  return `${common}rounded=1;arcSize=12;fillColor=#DDF3FC;strokeColor=#1F2937;`;
}

function dimensions(node) {
  const bodyLines = node.body.length;
  const width = node.kind === "actor" ? 90 : Math.max(170, Math.min(310, 90 + node.label.length * 4));
  const height = node.kind === "actor" ? 90 : bodyLines ? Math.max(90, 48 + bodyLines * 18) : node.kind === "usecase" ? 72 : 76;
  return { width, height };
}

function graphLayout(parsed) {
  const ids = new Set(parsed.nodes.map((node) => node.id));
  const layer = Object.fromEntries(parsed.nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < parsed.nodes.length; pass += 1) {
    let changed = false;
    for (const edge of parsed.edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
      const next = Math.min(7, layer[edge.from] + 1);
      if (next > layer[edge.to] && layer[edge.to] <= layer[edge.from]) {
        layer[edge.to] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const groups = new Map();
  for (const node of parsed.nodes) {
    const rank = layer[node.id] ?? 0;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(node);
  }

  const maxPerRow = parsed.nodes.length > 22 ? 5 : parsed.nodes.length > 12 ? 4 : 3;
  const positions = new Map();
  let y = 150;
  let canvasWidth = 1100;
  for (const rank of [...groups.keys()].sort((a, b) => a - b)) {
    const group = groups.get(rank);
    for (let offset = 0; offset < group.length; offset += maxPerRow) {
      const row = group.slice(offset, offset + maxPerRow);
      const rowWidths = row.map((node) => dimensions(node).width);
      const total = rowWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, row.length - 1) * 70;
      canvasWidth = Math.max(canvasWidth, total + 240);
      let x = Math.max(120, (canvasWidth - total) / 2);
      let rowHeight = 0;
      row.forEach((node, index) => {
        const size = dimensions(node);
        positions.set(node.id, { x, y, ...size });
        x += size.width + 70;
        rowHeight = Math.max(rowHeight, size.height);
      });
      y += rowHeight + 120;
    }
  }
  return { positions, width: canvasWidth, height: y + 100 };
}

function graphCells(parsed) {
  const layout = graphLayout(parsed);
  const cells = [];
  let id = 2;
  const ids = new Map();
  for (const node of parsed.nodes) {
    const cellId = String(id++);
    ids.set(node.id, cellId);
    const position = layout.positions.get(node.id);
    const value = node.body.length
      ? xml(`<b>${node.label}</b><br><hr>${node.body.join("<br>")}`)
      : xml(node.label);
    cells.push(`<mxCell id="${cellId}" value="${value}" style="${nodeStyle(node.kind, node.stereotype)}" vertex="1" parent="1"><mxGeometry x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" as="geometry"/></mxCell>`);
  }
  for (const edge of parsed.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeColor=#1F2937;fontFamily=Arial;fontSize=12;${edge.dashed ? "dashed=1;" : ""}`;
    cells.push(`<mxCell id="${id++}" value="${xml(edge.label)}" style="${style}" edge="1" parent="1" source="${ids.get(edge.from)}" target="${ids.get(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  return { cells, ...layout };
}

function sequenceCells(parsed) {
  const participants = parsed.participants.filter((id, index, all) => all.indexOf(id) === index);
  if (participants.length < 2 || parsed.messages.length < 1) return null;
  const width = Math.max(1100, 260 + participants.length * 210);
  const height = 300 + parsed.messages.length * 78;
  const cells = [];
  const headerIds = new Map();
  let id = 2;

  participants.forEach((participant, index) => {
    const node = parsed.nodes.find((item) => item.id === participant);
    const x = 140 + index * 210;
    const headerId = String(id++);
    headerIds.set(participant, { id: headerId, x });
    cells.push(`<mxCell id="${headerId}" value="${xml(node?.label ?? participant)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#7ACFF5;strokeColor=#1F2937;fontFamily=Arial;fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="120" width="150" height="54" as="geometry"/></mxCell>`);
    cells.push(`<mxCell id="${id++}" value="" style="shape=line;html=1;strokeColor=#1F2937;dashed=1;direction=south;" vertex="1" parent="1"><mxGeometry x="${x + 74}" y="174" width="1" height="${height - 250}" as="geometry"/></mxCell>`);
  });

  parsed.messages.forEach((message, index) => {
    const from = headerIds.get(message.from);
    const to = headerIds.get(message.to);
    if (!from || !to) return;
    const y = 220 + index * 78;
    const sourceId = String(id++);
    const targetId = String(id++);
    cells.push(`<mxCell id="${sourceId}" value="" style="opacity=0;" vertex="1" parent="1"><mxGeometry x="${from.x + 73}" y="${y}" width="2" height="2" as="geometry"/></mxCell>`);
    cells.push(`<mxCell id="${targetId}" value="" style="opacity=0;" vertex="1" parent="1"><mxGeometry x="${to.x + 73}" y="${y}" width="2" height="2" as="geometry"/></mxCell>`);
    cells.push(`<mxCell id="${id++}" value="${xml(message.label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;strokeColor=#1F2937;fontFamily=Arial;fontSize=12;${message.dashed ? "dashed=1;" : ""}" edge="1" parent="1" source="${sourceId}" target="${targetId}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  return { cells, width, height };
}

function activityCells(source) {
  const lines = source.split(/\r?\n/);
  const lanes = [];
  const nodes = [];
  const edges = [];
  const stack = [];
  let lane = "System";
  let previous = null;
  let pendingLabel = "";
  let noteDepth = 0;

  const ensureLane = (name) => {
    if (!lanes.includes(name)) lanes.push(name);
  };
  ensureLane(lane);

  const add = (label, kind) => {
    const node = { id: `activity-${nodes.length + 1}`, label: clean(label), kind, lane, order: nodes.length };
    nodes.push(node);
    if (previous) edges.push({ from: previous.id, to: node.id, label: pendingLabel });
    previous = node;
    pendingLabel = "";
    return node;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("note ")) { noteDepth += 1; continue; }
    if (line === "end note") { noteDepth = Math.max(0, noteDepth - 1); continue; }
    if (noteDepth || !line || line.startsWith("'") || line.startsWith("@") || line.startsWith("skinparam")) continue;
    const laneMatch = line.match(/^\|(.+)\|$/);
    if (laneMatch) { lane = clean(laneMatch[1]); ensureLane(lane); continue; }
    if (line === "start") { add("", "start"); continue; }
    if (line === "stop" || line === "end") { add("", "end"); previous = null; continue; }
    const action = line.match(/^:(.+);$/);
    if (action) { add(action[1], "action"); continue; }
    const decision = line.match(/^if \((.+)\) then \((.+)\)$/);
    if (decision) {
      const item = add(decision[1], "decision");
      stack.push({ decision: item, ends: [] });
      previous = item;
      pendingLabel = decision[2];
      continue;
    }
    const alternate = line.match(/^(?:elseif \((.+)\)|else)(?: \((.+)\))?$/);
    if (alternate && stack.length) {
      const current = stack[stack.length - 1];
      if (previous && previous.id !== current.decision.id) current.ends.push(previous);
      previous = current.decision;
      pendingLabel = clean(alternate[1] || alternate[2] || "Khác");
      continue;
    }
    if (line === "endif" && stack.length) {
      const current = stack.pop();
      if (previous && previous.id !== current.decision.id) current.ends.push(previous);
      const merge = { id: `activity-${nodes.length + 1}`, label: "", kind: "merge", lane, order: nodes.length };
      nodes.push(merge);
      for (const branchEnd of current.ends) edges.push({ from: branchEnd.id, to: merge.id, label: "" });
      previous = merge;
    }
  }

  const laneWidth = 340;
  const width = Math.max(1100, lanes.length * laneWidth + 200);
  const height = Math.max(900, 280 + nodes.length * 105);
  const cells = [];
  let id = 2;
  const ids = new Map();
  const laneX = new Map(lanes.map((name, index) => [name, 100 + index * laneWidth]));

  lanes.forEach((name) => {
    const x = laneX.get(name);
    cells.push(`<mxCell id="${id++}" value="${xml(name)}" style="swimlane;html=1;horizontal=1;startSize=42;fillColor=#7ACFF5;swimlaneFillColor=#FFFFFF;strokeColor=#1F2937;fontFamily=Arial;fontSize=14;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="120" width="${laneWidth}" height="${height - 220}" as="geometry"/></mxCell>`);
  });

  nodes.forEach((node) => {
    const cellId = String(id++);
    ids.set(node.id, cellId);
    const x = laneX.get(node.lane) + 70;
    const y = 200 + node.order * 105;
    if (node.kind === "start") {
      cells.push(`<mxCell id="${cellId}" value="" style="ellipse;html=1;aspect=fixed;fillColor=#111111;strokeColor=#111111;" vertex="1" parent="1"><mxGeometry x="${x + 80}" y="${y}" width="24" height="24" as="geometry"/></mxCell>`);
    } else if (node.kind === "end") {
      cells.push(`<mxCell id="${cellId}" value="" style="ellipse;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#111111;strokeWidth=2;" vertex="1" parent="1"><mxGeometry x="${x + 77}" y="${y}" width="30" height="30" as="geometry"/></mxCell>`);
    } else if (["decision", "merge"].includes(node.kind)) {
      cells.push(`<mxCell id="${cellId}" value="${xml(node.label)}" style="rhombus;whiteSpace=wrap;html=1;fillColor=#7ACFF5;strokeColor=#1F2937;fontFamily=Arial;fontSize=12;" vertex="1" parent="1"><mxGeometry x="${x + 55}" y="${y}" width="80" height="64" as="geometry"/></mxCell>`);
    } else {
      cells.push(`<mxCell id="${cellId}" value="${xml(node.label)}" style="rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#7ACFF5;strokeColor=#1F2937;fontFamily=Arial;fontSize=13;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="200" height="64" as="geometry"/></mxCell>`);
    }
  });

  edges.forEach((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) return;
    cells.push(`<mxCell id="${id++}" value="${xml(edge.label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeColor=#1F2937;fontFamily=Arial;fontSize=12;" edge="1" parent="1" source="${ids.get(edge.from)}" target="${ids.get(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  return { cells, width, height };
}

function componentArchitectureCells(parsed) {
  const width = 1500;
  const height = 1320;
  const cells = [];
  let id = 2;
  const ids = new Map();
  const positions = {
    user: { x: 650, y: 125, width: 200, height: 105 },
    web: { x: 570, y: 335, width: 360, height: 90 },
    java: { x: 570, y: 535, width: 360, height: 105 },
    ai: { x: 570, y: 685, width: 360, height: 105 },
    appdb: { x: 220, y: 900, width: 280, height: 110 },
    aidb: { x: 610, y: 900, width: 280, height: 110 },
    storage: { x: 1000, y: 900, width: 280, height: 110 },
    model: { x: 590, y: 1135, width: 320, height: 95 },
  };

  cells.push(`<mxCell id="${id++}" value="StudyFlow Platform" style="swimlane;html=1;horizontal=1;startSize=38;fillColor=#F8FAFC;swimlaneFillColor=#FFFFFF;strokeColor=#64748B;fontFamily=Arial;fontSize=15;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="100" y="280" width="1300" height="790" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${id++}" value="Backend services" style="swimlane;html=1;horizontal=1;startSize=34;fillColor=#E8F0FE;swimlaneFillColor=#FFFFFF;strokeColor=#64748B;fontFamily=Arial;fontSize=14;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="420" y="470" width="660" height="350" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${id++}" value="Platform data &amp; file storage" style="swimlane;html=1;horizontal=1;startSize=34;fillColor=#E8F3DC;swimlaneFillColor=#FFFFFF;strokeColor=#64748B;fontFamily=Arial;fontSize=14;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="160" y="850" width="1180" height="190" as="geometry"/></mxCell>`);

  for (const node of parsed.nodes) {
    const position = positions[node.id];
    if (!position || ["platform", "backend", "data"].includes(node.id)) continue;
    const cellId = String(id++);
    ids.set(node.id, cellId);
    cells.push(`<mxCell id="${cellId}" value="${xml(node.label)}" style="${nodeStyle(node.kind, node.stereotype)}fontSize=14;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" as="geometry"/></mxCell>`);
  }

  for (const edge of parsed.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    cells.push(`<mxCell id="${id++}" value="${xml(edge.label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeColor=#1F2937;fontFamily=Arial;fontSize=12;" edge="1" parent="1" source="${ids.get(edge.from)}" target="${ids.get(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  return { cells, width, height };
}

function documentXml(title, sourceRelative, model) {
  const cells = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
    `<mxCell id="title" value="${xml(title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Arial;fontSize=22;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="100" y="45" width="${model.width - 200}" height="40" as="geometry"/></mxCell>`,
    `<mxCell id="source" value="Nguồn đồng bộ: ${xml(sourceRelative)} · Bố cục layer từ trên xuống" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Arial;fontSize=11;fontColor=#64748B;" vertex="1" parent="1"><mxGeometry x="100" y="88" width="${model.width - 200}" height="24" as="geometry"/></mxCell>`,
    ...model.cells,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="StudyFlow exporter" version="24.7.17">\n  <diagram id="studyflow" name="Page-1">\n    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${model.width}" pageHeight="${model.height}" background="#FFFFFF" math="0" shadow="0">\n      <root>\n        ${cells.join("\n        ")}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
}

const selectedSource = process.argv[2];
const requestedSources = selectedSource ? [selectedSource.replaceAll("\\", "/")] : SOURCES;
if (selectedSource && !SOURCES.includes(requestedSources[0])) {
  throw new Error(`Selected source is outside the allowlist: ${selectedSource}`);
}

for (const relative of requestedSources) {
  const loaded = readSource(relative);
  if (!loaded) {
    console.warn(`SKIP missing source: ${relative}`);
    continue;
  }
  const { input, source, fallback } = loaded;
  const parsed = parse(source);
  const isSequence = path.basename(relative).startsWith("sequence-");
  const isActivity = path.basename(relative).startsWith("activity-");
  const isComponentArchitecture = path.basename(relative) === "component-01-kien-truc-he-thong.puml";
  const model = isComponentArchitecture
    ? componentArchitectureCells(parsed)
    : isActivity
      ? activityCells(source)
      : isSequence
        ? sequenceCells(parsed) ?? graphCells(parsed)
        : graphCells(parsed);
  const title = path.basename(relative, ".puml").replaceAll("-", " ");
  const output = input.replace(/\.puml$/i, ".drawio");
  fs.writeFileSync(output, documentXml(title, relative, model), "utf8");
  console.log(`WROTE ${path.relative(root, output)} (${parsed.nodes.length} nodes, ${parsed.edges.length} edges${fallback ? ", source from HEAD" : ""})`);
}
