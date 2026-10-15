const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");

/** Loads actual application client source, not a reimplementation.
 * @param {typeof fetch} transport Test-controlled fetch; may target an isolated Java test server.
 * @param {string} baseUrl Required test API URL; never read from local environment files.
 * @returns {typeof import('../../src/lib/api-client')} Client using the provided transport.
 * @throws {Error} On unexpected imports or invalid source. No filesystem writes.
 */
module.exports = function loadApiClient(transport, baseUrl) {
  const source = fs.readFileSync(path.join(__dirname, "../../src/lib/api-client.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Headers, FormData, URLSearchParams, crypto: webcrypto, fetch: transport,
    require(name) {
      if (name === "./env") return { getApiUrl: () => baseUrl, isDemoMode: () => false };
      if (name === "./demo-data") return { DEMO_USERS: { STUDENT: { id: "test-only" } } };
      throw new Error(`Unexpected runtime import: ${name}`);
    },
  });
  return exports;
};
