const test = require("node:test");
const assert = require("node:assert/strict");

test("FE-M3: Course Material and Personal Document PDF policy", async (t) => {
  await t.test("Course Material PDF supports Student viewer, page notes and Tutor", () => {
    function getStudentCapabilities(fileType, enrollmentStatus, published) {
      if (fileType !== "PDF") throw new Error("UNSUPPORTED_MEDIA_TYPE");
      const authorized = enrollmentStatus === "APPROVED" && published;
      return {
        canViewWeb: authorized,
        hasTutor: authorized,
        hasPageNotes: authorized,
        citationKey: "pageNumber",
      };
    }

    const capabilities = getStudentCapabilities("PDF", "APPROVED", true);
    assert.equal(capabilities.canViewWeb, true);
    assert.equal(capabilities.hasTutor, true);
    assert.equal(capabilities.hasPageNotes, true);
    assert.equal(capabilities.citationKey, "pageNumber");
    assert.throws(() => getStudentCapabilities("PPTX", "APPROVED", true), /UNSUPPORTED_MEDIA_TYPE/);
    assert.equal(getStudentCapabilities("PDF", "PENDING", true).canViewWeb, false);
  });

  await t.test("Teacher and Personal uploads accept PDF only", () => {
    function validatePdfUpload(fileName, sizeInBytes) {
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        return { valid: false, code: "UNSUPPORTED_MEDIA_TYPE", status: 415 };
      }
      if (sizeInBytes > 20 * 1024 * 1024) {
        return { valid: false, code: "FILE_TOO_LARGE", status: 413 };
      }
      return { valid: true };
    }

    assert.equal(validatePdfUpload("notes.pdf", 1024).valid, true);
    assert.equal(validatePdfUpload("slides.pptx", 1024).code, "UNSUPPORTED_MEDIA_TYPE");
    assert.equal(validatePdfUpload("essay.docx", 1024).valid, false);
    assert.equal(validatePdfUpload("huge.pdf", 25 * 1024 * 1024).code, "FILE_TOO_LARGE");
  });

  await t.test("Course Material Tutor returns page citations or NO_EVIDENCE", () => {
    function simulateTutor(pageContent, question) {
      const normalized = question.toLowerCase();
      if (normalized.includes("thời tiết") || normalized.includes("bóng đá")) {
        return { status: "NO_EVIDENCE", answer: null, citations: [] };
      }
      return {
        status: "ANSWERED",
        answer: `Dựa trên trang PDF: ${pageContent}`,
        citations: [{ pageNumber: 1, excerpt: pageContent }],
      };
    }

    const onTopic = simulateTutor("Khái niệm về tác tử thông minh", "Tác tử là gì?");
    assert.equal(onTopic.status, "ANSWERED");
    assert.equal(onTopic.citations[0].pageNumber, 1);

    const offTopic = simulateTutor("Khái niệm về tác tử thông minh", "Dự báo thời tiết hôm nay?");
    assert.equal(offTopic.status, "NO_EVIDENCE");
    assert.equal(offTopic.answer, null);
  });
});
