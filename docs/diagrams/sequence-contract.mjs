/**
 * Check the call/return contract of the report's PlantUML sequence subset.
 * @param {string} source Complete local PlantUML source; notes are ignored.
 * @returns {{calls: number, replies: number, events: number}} Counts after every
 * synchronous call has returned to its caller and every branch has joined.
 * With `ActivationPolicy: full`, both message endpoints must have an execution;
 * explicit roots and asynchronous receivers may span several nested calls.
 * @throws {Error} Unknown lifeline, wrong continuation/return, incomplete branch,
 * unclosed call, unsupported message syntax, or unbalanced activation.
 * No files, network requests or application data are accessed.
 */
export function validateSequenceContract(source) {
  const participants = new Set([...source.matchAll(/^(?:actor|boundary|control|participant|entity|database|collections|queue)\s+(?:".*?"\s+as\s+)?(\w+)\s*$/gm)].map(match => match[1]));
  const calls = [];
  const frames = [];
  const activations = new Map();
  const fullActivations = source.includes("' ActivationPolicy: full");
  const counts = { calls: 0, replies: 0, events: 0 };
  let inNote = false;
  /** @returns {string} Stable snapshot of pending calls and executions. */
  const state = () => JSON.stringify({ calls, activations: [...activations].sort(([a], [b]) => a.localeCompare(b)) });
  /** @param {number} line Source line. @param {string} reason Failure. @returns {never} @throws {Error} Always. */
  const fail = (line, reason) => { throw new Error(`Sequence line ${line}: ${reason}`); };
  /** @param {string} alias Lifeline. @param {"root"|"call"} kind Execution origin. @returns {void} */
  const open = (alias, kind) => { activations.set(alias, [...(activations.get(alias) ?? []), kind]); };
  /** @param {string} alias Lifeline. @param {"root"|"call"} kind Expected origin. @param {number} line Source line. @returns {void} @throws {Error} Mismatched close. */
  const close = (alias, kind, line) => {
    const stack = activations.get(alias) ?? [];
    if (stack.at(-1) !== kind) fail(line, "activation close does not match its execution");
    if (stack.length === 1) activations.delete(alias);
    else activations.set(alias, stack.slice(0, -1));
  };

  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    const n = index + 1;
    if (line.startsWith("note ")) { inNote = true; continue; }
    if (inNote) { if (line === "end note") inNote = false; continue; }
    if (!line || line.startsWith("'")) continue;
    const execution = line.match(/^(activate|deactivate)\s+(\w+)$/);
    if (execution) {
      if (!participants.has(execution[2])) fail(n, "unknown execution lifeline");
      if (execution[1] === "activate") open(execution[2], "root");
      else close(execution[2], "root", n);
      continue;
    }
    if (/^(alt|opt|loop)\s/.test(line)) {
      frames.push({ operator: line.split(" ")[0], entry: state() });
      continue;
    }
    if (/^else(?:\s|$)/.test(line)) {
      const frame = frames.at(-1);
      if (!frame || frame.operator !== "alt") fail(n, "else without alt");
      if (state() !== frame.entry) fail(n, "branch leaves a call or activation unfinished");
      continue;
    }
    if (line === "end") {
      const frame = frames.pop();
      if (!frame || state() !== frame.entry) fail(n, "fragment does not restore its entry call/activation state");
      continue;
    }
    const match = line.match(/^(\w+)\s*(->>|-->|->)\s*(\w+)\s*(\+\+|--)?\s*:\s*(.+)$/);
    if (!match) {
      if (/\w\s*(?:-+>|<-+)\s*\w.*:/.test(line)) fail(n, "unsupported message syntax");
      continue;
    }
    const [, from, arrow, to, marker] = match;
    if (!participants.has(from) || !participants.has(to)) fail(n, "unknown lifeline");
    const pending = calls.at(-1);
    if (fullActivations && !activations.has(from)) fail(n, `${from} has no sender activation`);
    if (arrow === "-->") {
      if (!pending || pending.to !== from || pending.from !== to) fail(n, `return ${from} -> ${to} does not match the current call`);
      if ((marker === "--") !== pending.active) fail(n, "return must close exactly the activation opened by its call");
      calls.pop();
      if (marker === "--") close(from, "call", n);
      if (fullActivations && !activations.has(to)) fail(n, `${to} has no activation at the return endpoint`);
      counts.replies++;
    } else {
      if (pending && pending.to !== from) fail(n, `${from} continues while ${pending.to} still owes a return`);
      if (arrow === "->>") {
        if (marker === "--") fail(n, "asynchronous event cannot close a synchronous activation");
        if (marker === "++") open(to, "root");
        if (fullActivations && !activations.has(to)) fail(n, `${to} has no event receiver activation`);
        counts.events++;
      } else {
        if (marker === "--") fail(n, "call cannot close an activation");
        if (marker === "++") {
          open(to, "call");
        }
        if (fullActivations && !activations.has(to)) fail(n, `${to} has no call receiver activation`);
        calls.push({ from, to, active: marker === "++" });
        counts.calls++;
      }
    }
  }
  if (frames.length || calls.length || activations.size || inNote) fail(source.split(/\r?\n/).length, "unclosed fragment, call, activation or note");
  return counts;
}
