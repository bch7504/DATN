const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../mvp.html'), 'utf8');
const start = html.indexOf('async function validateUploadFile(');
const end = html.indexOf('\n    /**', start);
assert.ok(start > 0 && end > start);
const validate = vm.runInNewContext(`(${html.slice(start, end).trim()})`, { TextDecoder, Uint8Array });

/**
 * Create a tiny synthetic upload fixture, without reading real user files.
 * @param {string} name Filename and extension, required.
 * @param {string} type Browser MIME, required; empty simulates unknown MIME.
 * @param {string} header File prefix, required.
 * @param {number} size Declared bytes, optional; defaults to prefix length.
 * @returns {object} File-shaped fixture exposing name/type/size/slice().arrayBuffer().
 * @throws {Error} No expected errors.
 */
function file(name, type, header, size = header.length) {
  const bytes = new TextEncoder().encode(header);
  return { name, type, size, slice: () => ({ arrayBuffer: async () => bytes.buffer }) };
}

test('personal upload accepts PDF and blocks DOCX, PPTX and disguised files', async () => {
  assert.equal(await validate(file('notes.PDF', 'application/pdf', '%PDF-'), 'personal'), null);
  assert.equal(await validate(file('notes.pdf', '', '%PDF-'), 'personal'), null);
  for (const input of [undefined, file('x.docx', '', 'PK\x03\x04'), file('x.pptx', '', 'PK\x03\x04'),
    file('x.pdf', 'application/pdf', 'hello'), file('x.pdf', 'text/plain', '%PDF-'),
    file('x.pdf', 'application/pdf', '%PDF-', 0), file('x.pdf', '', '%PDF-', 20 * 1024 * 1024 + 1)]) {
    assert.equal(typeof await validate(input, 'personal'), 'string');
  }
});

test('teacher upload accepts PDF/PPTX only, up to 50 MB', async () => {
  assert.equal(await validate(file('book.pdf', 'application/pdf', '%PDF-', 30 * 1024 * 1024), 'teacher'), null);
  assert.equal(await validate(file('lecture.pptx', '', 'PK\x03\x04'), 'teacher'), null);
  assert.equal(typeof await validate(file('x.docx', '', 'PK\x03\x04'), 'teacher'), 'string');
  assert.equal(typeof await validate(file('x.pptx', '', 'fake'), 'teacher'), 'string');
  assert.equal(typeof await validate(file('x.pdf', '', '%PDF-', 50 * 1024 * 1024 + 1), 'teacher'), 'string');
});

test('PDF class material is download-only; PPTX retains Student slide access', () => {
  const pdfRows = [...html.matchAll(/<tr data-material="pdf">([\s\S]*?)<\/tr>/g)];
  const slides = [...html.matchAll(/<tr data-material="pptx">([\s\S]*?)<\/tr>/g)];
  assert.ok(pdfRows.length > 0 && slides.length > 0);
  for (const [, row] of pdfRows) {
    assert.match(row, /data-download-pdf/);
    assert.doesNotMatch(row, /data-open-slide|data-page="slide-viewer"/);
  }
  for (const [, row] of slides) {
    assert.match(row, /data-open-slide/);
    assert.doesNotMatch(row, /data-download-pdf/);
  }
  assert.match(html, /accept="\.pdf,application\/pdf" id="personalFile"/);
  assert.match(html, /accept="\.pdf,\.pptx,[^"]+" id="teacherFile"/);
  assert.doesNotMatch(html, /\.docx|\.pdf,\.pdf|PDF lớp chỉ xem web/);
});

test('both HTML prototypes have valid inline JavaScript', () => {
  for (const filename of [path.join(__dirname, '../mvp.html'), path.join(__dirname, '../../../index.html')]) {
    const source = fs.readFileSync(filename, 'utf8');
    for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => new vm.Script(match[1], { filename }));
    }
  }
});
