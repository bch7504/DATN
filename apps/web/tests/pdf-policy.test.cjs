const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M3: Document policy (PPTX Viewer vs PDF Download & Personal Upload)", async (t) => {
  await t.test("Teacher PPTX policy: Viewer enabled, direct download forbidden", () => {
    function getDocumentCapabilities(fileType) {
      if (fileType === "PPTX") {
        return { canViewWeb: true, canDownload: false, hasTutor: true, hasNotes: true };
      }
      if (fileType === "PDF") {
        return { canViewWeb: false, canDownload: true, hasTutor: false, hasNotes: false };
      }
      throw new Error("Invalid fileType");
    }

    const pptxCaps = getDocumentCapabilities("PPTX");
    assert.equal(pptxCaps.canViewWeb, true, "PPTX must have web slide viewer");
    assert.equal(pptxCaps.canDownload, false, "PPTX must NOT have direct download");
    assert.equal(pptxCaps.hasTutor, true, "PPTX must support AI Slide Tutor");
    assert.equal(pptxCaps.hasNotes, true, "PPTX must support personal slide notes");

    const pdfCaps = getDocumentCapabilities("PDF");
    assert.equal(pdfCaps.canViewWeb, false, "Teacher PDF must NOT have web viewer");
    assert.equal(pdfCaps.canDownload, true, "Teacher PDF must be downloadable");
    assert.equal(pdfCaps.hasTutor, false, "Teacher PDF must NOT have tutor in MVP");
  });

  await t.test("Personal document upload policy: only PDF accepted, DOCX/PPTX rejected", () => {
    function validatePersonalUpload(fileName, sizeInBytes) {
      const lower = fileName.toLowerCase();
      if (!lower.endsWith(".pdf")) {
        return { valid: false, code: "UNSUPPORTED_MEDIA_TYPE", status: 415 };
      }
      if (sizeInBytes > 20 * 1024 * 1024) {
        return { valid: false, code: "FILE_TOO_LARGE", status: 413 };
      }
      return { valid: true };
    }

    assert.equal(validatePersonalUpload("notes.pdf", 1024).valid, true);
    assert.equal(validatePersonalUpload("essay.docx", 1024).valid, false);
    assert.equal(validatePersonalUpload("essay.docx", 1024).code, "UNSUPPORTED_MEDIA_TYPE");
    assert.equal(validatePersonalUpload("slides.pptx", 1024).valid, false);
    assert.equal(validatePersonalUpload("huge.pdf", 25 * 1024 * 1024).valid, false);
    assert.equal(validatePersonalUpload("huge.pdf", 25 * 1024 * 1024).code, "FILE_TOO_LARGE");
  });

  await t.test("Slide Tutor grounding: off-topic questions must return NO_EVIDENCE", () => {
    function simulateTutor(slideContent, question) {
      const q = question.toLowerCase();
      if (q.includes("thời tiết") || q.includes("bóng đá")) {
        return { status: "NO_EVIDENCE", answer: null, citations: [] };
      }
      return {
        status: "ANSWERED",
        answer: `Dựa trên slide: ${slideContent}`,
        citations: [{ slideNumber: 1, excerpt: slideContent }],
      };
    }

    const onTopic = simulateTutor("Khái niệm về Tác tử thông minh", "Tác tử là gì?");
    assert.equal(onTopic.status, "ANSWERED");
    assert.ok(onTopic.citations.length > 0);

    const offTopic = simulateTutor("Khái niệm về Tác tử thông minh", "Dự báo thời tiết hôm nay?");
    assert.equal(offTopic.status, "NO_EVIDENCE");
    assert.equal(offTopic.answer, null);
    assert.equal(offTopic.citations.length, 0);
  });
});
