/**
 * Generate exchangeable UML XMI from the canonical PlantUML report sources.
 *
 * Args: optional `--sequence-only`; when present, only the three Sequence XMI
 *       files are regenerated. Optional `--output-suffix=<text>` inserts a
 *       suffix before `.xmi`, useful when Visual Paradigm locks an imported
 *       target file. The default keeps generating all seven canonical files.
 * Input: seven allowlisted .puml files containing the current Use Case, Class
 *        and Sequence models. Sources must remain inside docs/diagrams.
 * Output: seven .xmi files in docs/diagrams/visual-paradigm; existing files
 *         with the same names are replaced. No source diagram is modified.
 * Errors: missing/invalid source or filesystem failure; caller should stop and
 *         keep the previous XMI files. The command is safe to retry.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(root, "visual-paradigm");
// The committed canonical Personal RAG XMI carries the Visual Paradigm
// profile/icon definitions. Reusing it keeps regeneration self-contained and
// avoids depending on a user's manually exported scratch project.
const vpSequenceTemplatePath = path.join(outputDirectory, "chuong-3-sequence-personal-rag.xmi");
let vpSequenceTemplate = null;
const specifications = [
  ["usecase", "chuong-2/use-case-01-tong-quat.puml", "chuong-2-use-case-tong-quat.xmi", "StudyFlow - Use Case tổng quát"],
  ["class", "chuong-3/class-04-personal-rag.puml", "chuong-3-class-personal-rag.xmi", "Personal Document Assistant"],
  ["class", "chuong-3/class-05-slide-tutor.puml", "chuong-3-class-course-material-tutor.xmi", "Course Material Tutor"],
  ["class", "chuong-3/class-06-quiz.puml", "chuong-3-class-quiz.xmi", "AI Quiz"],
  ["sequence", "chuong-3/sequence-10-personal-rag.puml", "chuong-3-sequence-personal-rag.xmi", "Personal Document Assistant"],
  ["sequence", "chuong-3/sequence-11-slide-tutor.puml", "chuong-3-sequence-course-material-tutor.xmi", "Course Material Tutor"],
  ["sequence", "chuong-3/sequence-12-quiz.puml", "chuong-3-sequence-quiz.xmi", "AI Quiz"],
];

/** @param {string} value Raw text. @returns {string} XML-safe text. */
function xml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** @param {string} value Name fragment. @returns {string} Stable XMI id. */
function id(value) {
  return `id_${value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

/**
 * @param {string} endId Association-end id.
 * @param {string | undefined} value PlantUML multiplicity.
 * @returns {string[]} XMI lower/upper value elements.
 */
function multiplicityElements(endId, value) {
  if (!value) return [];
  const [lower, upper = lower] = value.split("..");
  return [
    `        <lowerValue xmi:type="uml:LiteralInteger" xmi:id="${endId}_lower" value="${xml(lower)}"/>`,
    `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="${endId}_upper" value="${xml(upper)}"/>`,
  ];
}

/** @param {string} body Model body. @param {string} name Model name. @returns {string} Complete XMI document. */
function document(body, name) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" ` +
    `xmlns:uml="http://schema.omg.org/spec/UML/2.1">\n` +
    `  <uml:Model xmi:id="${id(name)}" name="${xml(name)}">\n${body}` +
    `  </uml:Model>\n</xmi:XMI>\n`;
}

/** @param {string} source PlantUML. @param {string} name Model name. @returns {string} Use Case XMI. */
function useCaseXmi(source, name) {
  const elements = new Map();
  for (const match of source.matchAll(/^\s*actor\s+(?:"([^"]+)"\s+as\s+)?([A-Za-z_]\w*)/gm)) {
    elements.set(match[2], { type: "Actor", name: match[1] ?? match[2] });
  }
  for (const match of source.matchAll(/^\s*usecase\s+"([^"]+)"\s+as\s+([A-Za-z_]\w*)/gm)) {
    elements.set(match[2], { type: "UseCase", name: match[1].replaceAll("\\n", " ") });
  }
  const lines = [];
  for (const [alias, element] of elements) {
    lines.push(`    <packagedElement xmi:type="uml:${element.type}" xmi:id="${id(alias)}" name="${xml(element.name)}"/>`);
  }
  let associationIndex = 0;
  for (const match of source.matchAll(/^\s*([A-Za-z_]\w*)\s+([-.<>\[\]a-z]+)\s+([A-Za-z_]\w*)\s*$/gm)) {
    if (match[2].includes("hidden") || !elements.has(match[1]) || !elements.has(match[3])) continue;
    const associationId = id(`association_${associationIndex++}_${match[1]}_${match[3]}`);
    lines.push(`    <packagedElement xmi:type="uml:Association" xmi:id="${associationId}" memberEnd="${associationId}_a ${associationId}_b">`);
    lines.push(`      <ownedEnd xmi:id="${associationId}_a" type="${id(match[1])}" association="${associationId}"/>`);
    lines.push(`      <ownedEnd xmi:id="${associationId}_b" type="${id(match[3])}" association="${associationId}"/>`);
    lines.push("    </packagedElement>");
  }
  return document(`${lines.join("\n")}\n`, name);
}

/** @param {string} source PlantUML. @param {string} name Model name. @returns {string} Class XMI. */
function classXmi(source, name) {
  const classes = new Map();
  for (const match of source.matchAll(/^class\s+([A-Za-z_]\w*)(?:\s+<<([^>]+)>>)?\s*\{([\s\S]*?)^\}/gm)) {
    classes.set(match[1], { stereotype: match[2] ?? "", body: match[3] });
  }
  const parsedMembers = new Map();
  const visibilityBySymbol = new Map([["+", "public"], ["-", "private"], ["#", "protected"], ["~", "package"]]);
  for (const [className, definition] of classes) {
    const members = [];
    for (const rawLine of definition.body.split(/\r?\n/)) {
      const member = rawLine.trim();
      if (!/^[+\-#~]/.test(member)) continue;
      const visibility = visibilityBySymbol.get(member[0]);
      const cleaned = member.slice(1).trim();
      const operation = cleaned.match(/^([^()]+)\((.*)\)\s*(?::\s*(.+))?$/);
      if (operation) {
        const parameters = operation[2].trim() === "" ? [] : operation[2].split(",").map((parameter, index) => {
          const separator = parameter.indexOf(":");
          const parameterName = separator < 0 ? `arg${index + 1}` : parameter.slice(0, separator).trim();
          const parameterType = separator < 0 ? "Any" : parameter.slice(separator + 1).trim();
          return { name: parameterName, type: parameterType };
        });
        const returnType = operation[3]?.trim() ?? "void";
        members.push({ kind: "operation", name: operation[1].trim(), visibility, parameters, returnType });
        continue;
      }
      const attribute = cleaned.match(/^([^:]+):\s*(.+)$/);
      if (!attribute) continue;
      const attributeType = attribute[2].trim();
      members.push({ kind: "attribute", name: attribute[1].trim(), visibility, type: attributeType });
    }
    parsedMembers.set(className, members);
  }

  const primitiveTypeMap = new Map([
    ["String", "String"], ["Integer", "Integer"], ["Boolean", "Boolean"],
  ]);
  const typeDescriptor = typeName => {
    const parsed = typeName.match(/^(.*?)(\?)?(?:\[([^\]]*)\])?$/);
    const base = parsed?.[1]?.trim() || typeName;
    const optional = Boolean(parsed?.[2]);
    const arrayRange = parsed?.[3];
    let lower;
    let upper;
    if (arrayRange !== undefined) {
      if (arrayRange === "") [lower, upper] = ["0", "*"];
      else if (arrayRange.includes("..")) [lower, upper] = arrayRange.split("..");
      else [lower, upper] = [arrayRange, arrayRange];
    } else if (optional) [lower, upper] = ["0", "1"];
    if (classes.has(base)) return { attribute: ` type="${id(base)}"`, typeElement: "", lower, upper };
    const primitive = primitiveTypeMap.get(base);
    const xmiType = primitive ? "uml:PrimitiveType" : "uml:DataType";
    const href = primitive
      ? `http://schema.omg.org/spec/UML/2.1/uml.xml#${primitive}`
      : `urn:studyflow:types#${encodeURIComponent(base)}`;
    return { attribute: "", typeElement: `<type xmi:type="${xmiType}" href="${xml(href)}"/>`, lower, upper };
  };
  const typeChildren = (ownerId, descriptor) => {
    const children = [];
    if (descriptor.typeElement) children.push(`        ${descriptor.typeElement}`);
    if (descriptor.lower !== undefined) {
      children.push(`        <lowerValue xmi:type="uml:LiteralInteger" xmi:id="${ownerId}_lower" value="${xml(descriptor.lower)}"/>`);
      children.push(`        <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="${ownerId}_upper" value="${xml(descriptor.upper)}"/>`);
    }
    return children;
  };
  const lines = [];
  for (const [className, definition] of classes) {
    lines.push(`    <packagedElement xmi:type="uml:Class" xmi:id="${id(className)}" name="${xml(className)}">`);
    if (definition.stereotype) {
      lines.push(`      <ownedComment xmi:id="${id(`${className}_stereotype`)}" body="stereotype: ${xml(definition.stereotype)}"/>`);
    }
    let memberIndex = 0;
    for (const member of parsedMembers.get(className)) {
      const memberId = id(`${className}_${member.kind}_${memberIndex++}`);
      if (member.kind === "attribute") {
        const descriptor = typeDescriptor(member.type);
        lines.push(`      <ownedAttribute xmi:id="${memberId}" name="${xml(member.name)}" visibility="${member.visibility}"${descriptor.attribute}>`);
        lines.push(...typeChildren(memberId, descriptor));
        lines.push("      </ownedAttribute>");
        continue;
      }
      lines.push(`      <ownedOperation xmi:id="${memberId}" name="${xml(member.name)}" visibility="${member.visibility}">`);
      member.parameters.forEach((parameter, parameterIndex) => {
        const parameterId = `${memberId}_parameter_${parameterIndex}`;
        const descriptor = typeDescriptor(parameter.type);
        lines.push(`        <ownedParameter xmi:id="${parameterId}" name="${xml(parameter.name)}" direction="in"${descriptor.attribute}>`);
        lines.push(...typeChildren(parameterId, descriptor).map(line => `  ${line}`));
        lines.push("        </ownedParameter>");
      });
      if (member.returnType !== "void") {
        const returnId = `${memberId}_return`;
        const descriptor = typeDescriptor(member.returnType);
        lines.push(`        <ownedParameter xmi:id="${returnId}" name="return" direction="return"${descriptor.attribute}>`);
        lines.push(...typeChildren(returnId, descriptor).map(line => `  ${line}`));
        lines.push("        </ownedParameter>");
      }
      lines.push("      </ownedOperation>");
    }
    lines.push("    </packagedElement>");
  }
  let relationshipIndex = 0;
  const relationshipPattern = /^\s*([A-Za-z_]\w*)(?:\s+"([^"]+)")?\s+([.o*<>|\-]+)\s+(?:"([^"]+)"\s+)?([A-Za-z_]\w*)(?:\s*:\s*(.+))?$/gm;
  for (const match of source.matchAll(relationshipPattern)) {
    const [, sourceName, sourceMultiplicity, connector, targetMultiplicity, targetName, label] = match;
    if (!classes.has(sourceName) || !classes.has(targetName) || connector.includes("hidden")) continue;
    const relationshipId = id(`relationship_${relationshipIndex++}_${sourceName}_${targetName}`);
    if (connector.includes("..")) {
      lines.push(`    <packagedElement xmi:type="uml:Dependency" xmi:id="${relationshipId}" name="${xml(label?.trim() ?? "")}" client="${id(sourceName)}" supplier="${id(targetName)}"/>`);
      continue;
    }

    const sourceEndId = `${relationshipId}_source`;
    const targetEndId = `${relationshipId}_target`;
    const aggregation = connector.includes("*") ? "composite" : connector.includes("o") ? "shared" : "none";
    lines.push(`    <packagedElement xmi:type="uml:Association" xmi:id="${relationshipId}" name="${xml(label?.trim() ?? "")}" memberEnd="${sourceEndId} ${targetEndId}">`);
    lines.push(`      <ownedEnd xmi:id="${sourceEndId}" type="${id(sourceName)}" association="${relationshipId}" aggregation="${aggregation}">`);
    lines.push(...multiplicityElements(sourceEndId, sourceMultiplicity));
    lines.push("      </ownedEnd>");
    lines.push(`      <ownedEnd xmi:id="${targetEndId}" type="${id(targetName)}" association="${relationshipId}">`);
    lines.push(...multiplicityElements(targetEndId, targetMultiplicity));
    lines.push("      </ownedEnd>");
    lines.push("    </packagedElement>");
  }
  return document(`${lines.join("\n")}\n`, name);
}

/**
 * Parse the subset of PlantUML used by the three report sequence diagrams.
 *
 * @param {string} source Canonical PlantUML sequence source.
 * @returns {{participants: Array<object>, messages: Array<object>, frames: Array<object>}}
 * Parsed lifelines, messages and combined fragments. Notes and styling commands
 * are intentionally ignored because they are presentation-only in the PNG.
 * @throws {Error} When a message references an unknown participant or a frame
 * is not closed. The caller must keep the previous XMI in that case.
 */
function parseSequence(source) {
  const participants = [];
  const participantByAlias = new Map();
  const participantPattern = /^(actor|boundary|control|participant|entity|database|collections|queue)\s+(?:"([\s\S]*?)"\s+as\s+|)([A-Za-z_]\w*)\s*$/gm;
  for (const match of source.matchAll(participantPattern)) {
    const rawName = (match[2] ?? match[3]).replaceAll("\\n", " ");
    const displayName = rawName.replace(/^[«<][^»>]+[»>]\s*/, "").replace(/^:/, "").trim();
    const participant = {
      alias: match[3],
      kind: match[1],
      name: displayName,
      index: participants.length,
      activations: [],
    };
    participants.push(participant);
    participantByAlias.set(participant.alias, participant);
  }

  const messages = [];
  const frames = [];
  const frameStack = [];
  const activeActivationByAlias = new Map();
  const sourceLines = source.split(/\r?\n/);
  let inNote = false;

  for (const rawLine of sourceLines) {
    const line = rawLine.trim();
    if (line.startsWith("note ")) { inNote = true; continue; }
    if (inNote) {
      if (line === "end note") inNote = false;
      continue;
    }
    const frameStart = line.match(/^(alt|loop|opt)\s+(.+)$/);
    if (frameStart) {
      const frame = {
        operator: frameStart[1],
        start: messages.length,
        end: null,
        operands: [{ guard: frameStart[2].trim(), start: messages.length, end: null }],
      };
      frames.push(frame);
      frameStack.push(frame);
      continue;
    }
    const elseMatch = line.match(/^else(?:\s+(.+))?$/);
    if (elseMatch) {
      const frame = frameStack.at(-1);
      if (!frame || frame.operator !== "alt") throw new Error(`Unexpected else in ${line}`);
      frame.operands.at(-1).end = messages.length;
      frame.operands.push({ guard: (elseMatch[1] ?? "Nhánh thay thế").trim(), start: messages.length, end: null });
      continue;
    }
    if (line === "end") {
      const frame = frameStack.pop();
      if (!frame) throw new Error("Unexpected end in sequence source");
      frame.end = messages.length;
      frame.operands.at(-1).end = messages.length;
      continue;
    }
    const deactivateMatch = line.match(/^deactivate\s+([A-Za-z_]\w*)$/);
    if (deactivateMatch) {
      const activation = activeActivationByAlias.get(deactivateMatch[1]);
      if (activation) activation.end = Math.max(messages.length - 1, activation.start);
      activeActivationByAlias.delete(deactivateMatch[1]);
      continue;
    }

    const messageMatch = line.match(/^([A-Za-z_]\w*)\s*(-->|->|<--|<-)\s*([A-Za-z_]\w*)\s*(\+\+|--)?\s*:\s*(.+)$/);
    if (!messageMatch) continue;
    let [, from, arrow, to, activationMarker = "", label] = messageMatch;
    if (arrow.startsWith("<")) {
      [from, to] = [to, from];
      arrow = arrow === "<--" ? "-->" : "->";
    }
    if (!participantByAlias.has(from) || !participantByAlias.has(to)) {
      throw new Error(`Unknown participant in message: ${line}`);
    }
    const message = {
      index: messages.length,
      from,
      to,
      label: label.trim(),
      reply: arrow === "-->",
      fromActivation: activeActivationByAlias.get(from)?.id,
      toActivation: activeActivationByAlias.get(to)?.id,
    };
    if (activationMarker === "++") {
      const activation = {
        id: id(`activation_${to}_${messages.length}`),
        start: messages.length,
        end: null,
      };
      participantByAlias.get(to).activations.push(activation);
      activeActivationByAlias.set(to, activation);
      message.toActivation = activation.id;
    }
    messages.push(message);
    if (activationMarker === "--") {
      const activation = activeActivationByAlias.get(from);
      if (activation) activation.end = message.index;
      activeActivationByAlias.delete(from);
    }
  }
  if (frameStack.length) throw new Error("Unclosed combined fragment in sequence source");
  for (const participant of participants) {
    for (const activation of participant.activations) {
      if (activation.end == null) activation.end = Math.min(messages.length - 1, activation.start + 2);
    }
  }
  return { participants, messages, frames };
}

/** @param {string} value Identifier fragment. @returns {string} VP-safe id. */
function vpId(value) {
  return id(value).replace(/^id_/, "sf_");
}

/**
 * @param {object} participant Parsed participant.
 * @returns {string | null} Visual Paradigm robustness stereotype id.
 */
function robustnessStereotype(participant) {
  if (participant.kind === "boundary") return "InteractionLifeLine_boundary_id";
  if (participant.kind === "control") return "InteractionLifeLine_control_id";
  if (["entity", "database", "collections", "queue"].includes(participant.kind)) return "InteractionLifeLine_entity_id";
  return null;
}

/**
 * @param {number} zOrder Z-order.
 * @param {boolean} parentFrame Include parent frame.
 * @param {string} interactionId Interaction id.
 * @param {{alignment?: number, showClassifier?: boolean}} [options] Shape-specific VP presentation settings.
 * @returns {string} Common VP shape properties.
 */
function vpShapeProperties(zOrder, parentFrame, interactionId, options = {}) {
  const alignment = options.alignment ?? 9;
  return `          <properties>\n` +
    `            <azOrder value="${zOrder}"/>\n` +
    `            <abackground value="Cr:255,255,255,255"/>\n` +
    `            <aforeground value="Cr:0,0,0,255"/>\n` +
    `            <aselectable value="true"/>\n` +
    `            <arequestResetCaption value="false"/>\n` +
    `            <arequestResetCaptionSize value="false"/>\n` +
    `            <arequestResetCaptionFitWidth value="false"/>\n` +
    `            <amodelElementNameAlignment value="${alignment}"/>\n` +
    `            <apresentationOption value="4"/>\n` +
    `            <aprimitiveShapeType value="0"/>\n` +
    `            <ashowStereotypeIconName value="0"/>\n` +
    `            <ashowAllocatedFrom value="0"/>\n` +
    `            <ashowAllocatedTo value="0"/>\n` +
    `            <aoverrideAppearanceWithStereotypeIcon value="true"/>\n` +
    `            <ashowTaggedValues value="0"/>\n` +
    `            <arequestSetSizeOption value="0"/>\n` +
    `            <aparentConnectorHeaderLength value="40"/>\n` +
    `            <aparentConnectorLineLength value="10"/>\n` +
    `            <aconnectToPoint value="true"/>\n` +
    `            <aparentConnectorDTheta value="0.0"/>\n` +
    `            <aconnectionPointType value="2"/>\n` +
    `            <acoverConnector value="false"/>\n` +
    `            <arequestDefaultSize value="false"/>\n` +
    `            <arequestFitSize value="false"/>\n` +
    `            <arequestFitSizeFromCenter value="false"/>\n` +
    (parentFrame ? `            <aparentFrame value="${interactionId}"/>\n` : "") +
    (options.showClassifier ? `            <ashowClassifier value="true"/>\n` : "") +
    `          </properties>`;
}

/**
 * Generate a Visual Paradigm-flavoured XMI document containing both the UML
 * interaction model and its editable diagram view.
 *
 * @param {string} source Canonical PlantUML.
 * @param {string} name Diagram/model name.
 * @returns {string} XMI 2.1 document importable by Visual Paradigm.
 * @throws {Error} When the supported PlantUML subset cannot be parsed.
 */
function sequenceXmi(source, name) {
  const { participants, messages, frames } = parseSequence(source);
  const modelId = vpId(`${name}_model`);
  const collaborationId = vpId(`${name}_collaboration`);
  const interactionId = vpId(`${name}_interaction`);
  const diagramId = vpId(`${name}_diagram`);
  // Keep the editable Visual Paradigm canvas compact enough that robustness
  // icons remain legible when the whole diagram is fitted to a report page.
  // Long captions wrap below the icon instead of forcing a 4K-wide canvas.
  const participantSpacing = 145;
  const firstX = 110;
  const headerY = 40;
  const messageStartY = 140;
  const messageSpacing = 42;
  const totalHeight = Math.max(560, messageStartY + messages.length * messageSpacing + 120);
  const totalWidth = Math.max(1000, firstX * 2 + (participants.length - 1) * participantSpacing);
  const positionByAlias = new Map(participants.map(participant => [participant.alias, firstX + participant.index * participantSpacing]));
  const lifelineViewId = alias => vpId(`view_lifeline_${alias}`);
  const lifelineId = alias => vpId(`lifeline_${alias}`);
  const messageId = message => vpId(`message_${message.index}_${message.from}_${message.to}`);
  const messageY = messageIndex => messageStartY + messageIndex * messageSpacing;

  const model = [];
  model.push(`  <uml:Model name="${xml(name)}" xmi:id="${modelId}">`);
  model.push(`    <ownedMember xmi:id="${collaborationId}" xmi:type="uml:Collaboration">`);
  model.push(`      <ownedBehavior name="${xml(name)}" xmi:id="${interactionId}" xmi:type="uml:Interaction">`);
  for (const participant of participants) {
    const stereotype = robustnessStereotype(participant);
    const coveredEvents = messages.flatMap(message => {
      const result = [];
      if (message.from === participant.alias) result.push(`${messageId(message)}_send`);
      if (message.to === participant.alias) result.push(`${messageId(message)}_receive`);
      return result;
    });
    model.push(`        <lifeline name="${xml(participant.name)}" represents="${lifelineId(participant.alias)}_represents" xmi:id="${lifelineId(participant.alias)}" xmi:type="uml:Lifeline">`);
    model.push(`          <xmi:Extension extender="Visual Paradigm">`);
    model.push(`            <active xmi:value="false"/><stopped xmi:value="false"/><multiObject xmi:value="false"/>`);
    if (participant.activations.length) {
      model.push(`            <activation><xmi:Extension extender="Visual Paradigm"><vpumlChildModels>`);
      for (const activation of participant.activations) {
        model.push(`              <vpumlModel id="${activation.id}" modelType="Activation"><properties><property name="name" type="string" value="Activation"/><property name="modelType" type="string" value="Activation"/><property name="qualityScore" type="int" value="-1"/></properties></vpumlModel>`);
      }
      model.push(`            </vpumlChildModels></xmi:Extension></activation>`);
    }
    model.push(`            <lifeline/><qualityScore value="-1"/>`);
    if (stereotype) model.push(`            <appliedStereotype xmi:value="${stereotype}"/>`);
    model.push(`          </xmi:Extension>`);
    for (const eventId of coveredEvents) model.push(`          <coveredBy xmi:idref="${eventId}"/>`);
    model.push(`        </lifeline>`);
    model.push(`        <ownedAttribute name="${xml(participant.name)}" xmi:id="${lifelineId(participant.alias)}_represents"/>`);
  }
  for (const message of messages) {
    const currentMessageId = messageId(message);
    model.push(`        <message name="${xml(message.label)}" receiveEvent="${currentMessageId}_receive" sendEvent="${currentMessageId}_send" xmi:id="${currentMessageId}" xmi:type="uml:Message">`);
    if (message.reply) model.push(`          <signature name="Return" xmi:id="${currentMessageId}_type" xmi:type="uml:ReplyAction"><xmi:Extension extender="Visual Paradigm"><iteration xmi:value="false"/><asynshronous xmi:value="false"/><qualityScore value="-1"/></xmi:Extension></signature>`);
    else model.push(`          <signature xmi:id="${currentMessageId}_type" xmi:type="uml:Action"/>`);
    model.push(`          <xmi:Extension extender="Visual Paradigm"><number xmi:value="${message.index + 1}"/><asynshronous xmi:value="false"/>`);
    if (message.fromActivation) model.push(`            <fromActivation><activation xmi:value="${message.fromActivation}"/></fromActivation>`);
    if (message.toActivation) model.push(`            <toActivation><activation xmi:value="${message.toActivation}"/></toActivation>`);
    model.push(`            <qualityScore value="-1"/></xmi:Extension>`);
    model.push(`        </message>`);
    model.push(`        <fragment covered="${lifelineId(message.from)}" message="${currentMessageId}" xmi:id="${currentMessageId}_send" xmi:type="uml:EventOccurrence"><xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension></fragment>`);
    model.push(`        <fragment covered="${lifelineId(message.to)}" message="${currentMessageId}" xmi:id="${currentMessageId}_receive" xmi:type="uml:EventOccurrence"><xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension></fragment>`);
  }
  frames.forEach((frame, frameIndex) => {
    const frameId = vpId(`frame_${frameIndex}_${frame.operator}`);
    model.push(`        <fragment interactionOperator="${frame.operator}" name="${frame.operator.toUpperCase()}" xmi:id="${frameId}" xmi:type="uml:CombinedFragment">`);
    frame.operands.forEach((operand, operandIndex) => {
      const operandId = `${frameId}_operand_${operandIndex}`;
      const guardId = `${operandId}_guard`;
      model.push(`          <ownedMember name="${xml(operand.guard)}" xmi:id="${operandId}" xmi:type="uml:InteractionOperand">`);
      model.push(`            <guard name="[${xml(operand.guard)}]" xmi:id="${guardId}" xmi:type="uml:InteractionConstraint"><specification body="${xml(operand.guard)}" xmi:id="${guardId}_spec" xmi:type="uml:OpaqueExpression"/><xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension></guard>`);
      model.push(`            <xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension>`);
      model.push(`          </ownedMember>`);
    });
    model.push(`          <xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension>`);
    model.push(`        </fragment>`);
  });
  model.push(`        <xmi:Extension extender="Visual Paradigm"><qualityScore value="-1"/></xmi:Extension>`);
  model.push(`      </ownedBehavior>`);
  model.push(`    </ownedMember>`);
  for (const stereotype of ["boundary", "control", "entity"]) {
    model.push(`    <ownedMember name="${stereotype}" xmi:id="InteractionLifeLine_${stereotype}_id" xmi:type="uml:Stereotype"><xmi:Extension extender="Visual Paradigm"><baseType value="InteractionLifeLine"/><qualityScore value="-1"/></xmi:Extension></ownedMember>`);
  }
  model.push(`  </uml:Model>`);

  const diagram = [];
  diagram.push(`  <uml:Diagram diagramType="InteractionDiagram" documentation="" name="${xml(name)}" toolName="Visual Paradigm" xmi:id="${diagramId}">`);
  diagram.push(`    <xmi:Extension extender="Visual Paradigm"><properties>`);
  diagram.push(`      <ashowShapeStereotypeIconName value="false"/><aeditable value="true"/><agridVisible value="false"/><adiagramBackground value="Cr:255,255,255,255"/><aconnectorStyle value="1"/><amodelElementNameAlignment value="4"/><azoomRatio value="1.0"/><amaximized value="true"/><ax value="0"/><ay value="0"/><awidth value="${totalWidth}"/><aheight value="${totalHeight}"/><a_rootFrame value="${interactionId}"/><aautoExtendActivations value="false"/><ashowSequenceNumbers value="true"/><ashowActivations value="true"/><adisplayLifeLinesAsRobustnessAnalysisIcon value="1"/><ashowMessageName value="true"/><ashowDiagramFrame value="false"/>`);
  diagram.push(`    </properties></xmi:Extension>`);
  diagram.push(`    <uml:Diagram.element>`);
  let zOrder = 1000;
  for (const participant of participants) {
    const x = positionByAlias.get(participant.alias) - 50;
    diagram.push(`      <uml:DiagramElement geometry="${x},${headerY},100,${totalHeight - 100}" preferredShapeType="InteractionLifeLine" subject="${lifelineId(participant.alias)}" xmi:id="${lifelineViewId(participant.alias)}">`);
    diagram.push(`        <xmi:Extension extender="Visual Paradigm"><captionBounds value="${x - 20},${headerY + 2},140,48"/><captionInternalWidth value="-2147483648"/><captionInternalHeight value="-2147483648"/><captionVisible value="true"/><captionSide value="1"/>`);
    diagram.push(vpShapeProperties(zOrder--, true, interactionId, { alignment: 1, showClassifier: true }));
    diagram.push(`        </xmi:Extension><elementFill color1="Cr:255,255,255,255" color2="" style="1" transparency="0" type="1"/><elementFont bold="false" color="Cr:0,0,0,255" italic="false" name="Arial" size="13" style="0"/><elementLine color="Cr:0,0,0,255" style="1" transparency="0" weight="1.0"/>`);
    diagram.push(`      </uml:DiagramElement>`);
  }
  for (const participant of participants) {
    const x = positionByAlias.get(participant.alias) - 4;
    for (const activation of participant.activations) {
      const startY = messageY(activation.start);
      // Visual Paradigm report convention: show a short execution segment at
      // the receiving call, not one bar stretching through the whole diagram.
      // The semantic message/return links remain unchanged in the XMI model.
      const visualEndIndex = Math.min(activation.end, activation.start + 1);
      const endY = messageY(visualEndIndex) + 18;
      diagram.push(`      <uml:DiagramElement geometry="${x},${startY},8,${Math.max(28, endY - startY)}" preferredShapeType="Activation" subject="${activation.id}" xmi:id="${vpId(`view_${activation.id}`)}">`);
      diagram.push(`        <xmi:Extension extender="Visual Paradigm"><captionBounds value="0,0,8,12"/><captionVisible value="false"/><captionSide value="7"/>${vpShapeProperties(zOrder--, false, interactionId)}</xmi:Extension><elementFill color1="Cr:255,255,255,255" color2="" style="1" transparency="0" type="1"/><elementFont bold="false" color="Cr:0,0,0,255" italic="false" name="Arial" size="11" style="0"/><elementLine color="Cr:0,0,0,255" style="1" transparency="0" weight="1.0"/>`);
      diagram.push(`      </uml:DiagramElement>`);
    }
  }
  for (const message of messages) {
    const fromX = positionByAlias.get(message.from);
    const toX = positionByAlias.get(message.to);
    const y = messageY(message.index);
    const geometry = fromX === toX
      ? `${fromX},${y};${fromX + 38},${y};${fromX + 38},${y + 22};${fromX},${y + 22};`
      : `${fromX},${y};${toX},${y};`;
    const captionX = fromX === toX ? fromX + 40 : Math.min(fromX, toX) + Math.abs(toX - fromX) / 2 - 110;
    diagram.push(`      <uml:DiagramElement fromDiagramElement="${lifelineViewId(message.from)}" geometry="${geometry}" preferredShapeType="Message" subject="${messageId(message)}" toDiagramElement="${lifelineViewId(message.to)}" xmi:id="${vpId(`view_${messageId(message)}`)}">`);
    diagram.push(`        <xmi:Extension extender="Visual Paradigm"><captionBounds value="${Math.round(captionX)},${y - 20},220,18"/><captionInternalWidth value="-2147483648"/><captionInternalHeight value="-2147483648"/><captionVisible value="true"/><captionSide value="1"/><properties><azOrder value="${zOrder--}"/><abackground value="Cr:0,0,0,255"/><aforeground value="Cr:0,0,0,255"/><aselectable value="true"/><amodelElementNameAlignment value="9"/><aconnectorStyle value="3"/><aconnectorLineJumps value="0"/><aconnectorLabelOrientation value="4"/><auseFromShapeCenter value="true"/><auseToShapeCenter value="true"/><afromPinType value="1"/><atoPinType value="1"/><ashowConnectorName value="2"/><apaintThroughLabel value="2"/><ashowMessageName value="0"/></properties></xmi:Extension><elementFont bold="false" color="Cr:0,0,0,255" italic="false" name="Arial" size="11" style="0"/><elementLine color="Cr:0,0,0,255" style="1" transparency="0" weight="1.0"/>`);
    diagram.push(`      </uml:DiagramElement>`);
  }
  frames.forEach((frame, frameIndex) => {
    const relevantMessages = messages.slice(frame.start, frame.end);
    const participantIndexes = relevantMessages.flatMap(message => [participantByAliasIndex(participants, message.from), participantByAliasIndex(participants, message.to)]).filter(index => index >= 0);
    const minIndex = participantIndexes.length ? Math.min(...participantIndexes) : 0;
    const maxIndex = participantIndexes.length ? Math.max(...participantIndexes) : participants.length - 1;
    const left = positionByAlias.get(participants[minIndex].alias) - 75;
    const right = positionByAlias.get(participants[maxIndex].alias) + 75;
    const top = Math.max(90, messageY(frame.start) - 30);
    const bottom = frame.end > frame.start ? messageY(frame.end - 1) + 32 : top + 80;
    const frameId = vpId(`frame_${frameIndex}_${frame.operator}`);
    diagram.push(`      <uml:DiagramElement geometry="${left},${top},${right - left},${bottom - top}" preferredShapeType="CombinedFragment" subject="${frameId}" xmi:id="${vpId(`view_${frameId}`)}">`);
    diagram.push(`        <xmi:Extension extender="Visual Paradigm"><captionBounds value="${left + 4},${top + 2},140,18"/><captionVisible value="true"/><captionSide value="12"/>${vpShapeProperties(zOrder--, false, interactionId)}</xmi:Extension><elementFill color1="Cr:255,255,255,0" color2="" style="1" transparency="100" type="1"/><elementFont bold="true" color="Cr:0,0,0,255" italic="false" name="Arial" size="11" style="0"/><elementLine color="Cr:0,0,0,255" style="1" transparency="0" weight="1.0"/>`);
    diagram.push(`      </uml:DiagramElement>`);
    frame.operands.forEach((operand, operandIndex) => {
      const operandTop = operandIndex === 0 ? top + 18 : Math.max(top + 18, messageY(operand.start) - 20);
      const operandBottom = operand.end > operand.start ? messageY(operand.end - 1) + 24 : operandTop + 44;
      const operandId = `${frameId}_operand_${operandIndex}`;
      diagram.push(`      <uml:DiagramElement geometry="${left},${operandTop},${right - left},${Math.max(40, operandBottom - operandTop)}" preferredShapeType="InteractionOperand" subject="${operandId}" xmi:id="${vpId(`view_${operandId}`)}">`);
      diagram.push(`        <xmi:Extension extender="Visual Paradigm"><captionBounds value="${left + 48},${operandTop + 2},${Math.min(420, right - left - 60)},18"/><captionVisible value="true"/><captionSide value="1"/>${vpShapeProperties(zOrder--, false, interactionId)}</xmi:Extension><elementFill color1="Cr:255,255,255,0" color2="" style="1" transparency="100" type="1"/><elementFont bold="false" color="Cr:0,0,0,255" italic="false" name="Arial" size="11" style="0"/><elementLine color="Cr:0,0,0,255" style="1" transparency="0" weight="1.0"/>`);
      diagram.push(`      </uml:DiagramElement>`);
    });
  });
  diagram.push(`    </uml:Diagram.element>`);
  diagram.push(`  </uml:Diagram>`);

  if (vpSequenceTemplate) {
    const modelWithProfiles = [model[0], vpSequenceTemplate.profileContent, ...model.slice(1)];
    return `${vpSequenceTemplate.prefix}${modelWithProfiles.join("\n")}\n${diagram.join("\n")}\n</xmi:XMI>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.0" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">\n` +
    `  <xmi:Documentation exporter="Visual Paradigm" exporterVersion="7.0.2"/>\n` +
    `${model.join("\n")}\n${diagram.join("\n")}\n</xmi:XMI>\n`;
}

/** @param {Array<object>} participants Participants. @param {string} alias Alias. @returns {number} Participant index or -1. */
function participantByAliasIndex(participants, alias) {
  return participants.findIndex(participant => participant.alias === alias);
}

const cliArguments = process.argv.slice(2);
const sequenceOnly = cliArguments.includes("--sequence-only");
const suffixArgument = cliArguments.find(argument => argument.startsWith("--output-suffix="));
const outputSuffix = suffixArgument?.slice("--output-suffix=".length) ?? "";
if (outputSuffix && !/^[A-Za-z0-9_-]+$/.test(outputSuffix)) {
  throw new Error("Output suffix may contain only letters, digits, underscore or hyphen");
}
const unknownArguments = cliArguments.filter(argument => argument !== "--sequence-only" && argument !== suffixArgument);
if (unknownArguments.length) throw new Error(`Unknown arguments: ${unknownArguments.join(", ")}`);

try {
  const template = await fs.readFile(vpSequenceTemplatePath, "utf8");
  const modelStart = template.indexOf("<uml:Model");
  const modelOpenEnd = template.indexOf(">", modelStart) + 1;
  const collaborationMatch = /<ownedMember\b[^>]*xmi:type="uml:Collaboration"[^>]*>/.exec(template.slice(modelOpenEnd));
  const firstCollaboration = collaborationMatch ? modelOpenEnd + collaborationMatch.index : -1;
  if (modelStart < 0 || modelOpenEnd <= modelStart || firstCollaboration < 0) {
    throw new Error("Visual Paradigm template is missing the model/profile boundary");
  }
  vpSequenceTemplate = {
    prefix: template.slice(0, modelStart),
    profileContent: template.slice(modelOpenEnd, firstCollaboration).trimEnd(),
  };
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.warn("WARN: Visual Paradigm sequence template not found; generating portable XMI without embedded VP icon profiles.");
}

await fs.mkdir(outputDirectory, { recursive: true });
for (const [kind, sourceRelative, outputName, modelName] of specifications) {
  if (sequenceOnly && kind !== "sequence") continue;
  const sourcePath = path.resolve(root, sourceRelative);
  const relative = path.relative(root, sourcePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Source outside allowlist: ${sourceRelative}`);
  const source = await fs.readFile(sourcePath, "utf8");
  if (!source.trimStart().startsWith("@startuml") || !source.trimEnd().endsWith("@enduml")) {
    throw new Error(`Invalid PlantUML source: ${sourceRelative}`);
  }
  const result = kind === "usecase" ? useCaseXmi(source, modelName)
    : kind === "class" ? classXmi(source, modelName)
      : sequenceXmi(source, modelName);
  const effectiveOutputName = outputSuffix ? outputName.replace(/\.xmi$/i, `${outputSuffix}.xmi`) : outputName;
  await fs.writeFile(path.join(outputDirectory, effectiveOutputName), result, "utf8");
  console.log(`GENERATED ${effectiveOutputName}`);
}
