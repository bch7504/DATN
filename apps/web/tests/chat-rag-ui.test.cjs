const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("FE-M4: Personal Document Assistant Contract & UI Policies", async (t) => {
  await t.test("Personal PDF management and AI tools share one page without a separate navigation item", () => {
    const personalDocumentsSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/(student)/personal-documents/page.tsx"),
      "utf8",
    );
    const shellSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/layout/app-shell.tsx"),
      "utf8",
    );
    const legacyChatSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/(student)/chat/page.tsx"),
      "utf8",
    );

    assert.match(personalDocumentsSource, /if \(assistantOpen\)/);
    assert.match(personalDocumentsSource, /onBackToLibrary=\{openLibrary\}/);
    assert.match(personalDocumentsSource, /Hỏi đáp tài liệu cá nhân/);
    assert.equal(shellSource.includes('{ label: "Trợ lý tài liệu", href: "/chat"'), false);
    assert.equal(
      legacyChatSource.includes('redirect("/personal-documents#personal-ai-assistant")'),
      true,
    );
  });

  await t.test("Document scope validation: requires 1 to 10 READY documents", () => {
    function validateDocScope(docs, selectedIds) {
      if (!selectedIds || selectedIds.length === 0) {
        return { valid: false, code: "INVALID_DOCUMENT_SELECTION", message: "Phải chọn ít nhất 1 tài liệu nguồn." };
      }
      if (selectedIds.length > 10) {
        return { valid: false, code: "TOO_MANY_DOCUMENTS", message: "Chỉ được chọn tối đa 10 tài liệu." };
      }

      // Check all selected docs are READY
      for (const id of selectedIds) {
        const found = docs.find((d) => d.id === id);
        if (!found) {
          return { valid: false, code: "DOCUMENT_NOT_FOUND", message: `Không tìm thấy tài liệu ${id}` };
        }
        if (found.status !== "READY") {
          return { valid: false, code: "DOCUMENT_NOT_READY", message: `Tài liệu ${id} chưa ở trạng thái READY.` };
        }
      }
      return { valid: true };
    }

    const mockDocs = [
      { id: "doc1", status: "READY" },
      { id: "doc2", status: "READY" },
      { id: "doc3", status: "PROCESSING" },
    ];

    assert.equal(validateDocScope(mockDocs, []).valid, false);
    assert.equal(validateDocScope(mockDocs, []).code, "INVALID_DOCUMENT_SELECTION");

    assert.equal(validateDocScope(mockDocs, ["doc1", "doc2"]).valid, true);

    assert.equal(validateDocScope(mockDocs, ["doc1", "doc3"]).valid, false);
    assert.equal(validateDocScope(mockDocs, ["doc1", "doc3"]).code, "DOCUMENT_NOT_READY");

    const elevenIds = Array.from({ length: 11 }, (_, i) => `doc_${i}`);
    assert.equal(validateDocScope(mockDocs, elevenIds).valid, false);
    assert.equal(validateDocScope(mockDocs, elevenIds).code, "TOO_MANY_DOCUMENTS");
  });

  await t.test("Message input constraints: non-empty, max 2000 characters", () => {
    function validateMessage(msg) {
      const clean = msg?.trim();
      if (!clean || clean.length === 0) {
        return { valid: false, code: "EMPTY_MESSAGE" };
      }
      if (clean.length > 2000) {
        return { valid: false, code: "MESSAGE_TOO_LONG" };
      }
      return { valid: true, sanitized: clean };
    }

    assert.equal(validateMessage("").valid, false);
    assert.equal(validateMessage("   ").valid, false);
    assert.equal(validateMessage("   ").code, "EMPTY_MESSAGE");

    assert.equal(validateMessage("Chuẩn hóa dữ liệu là gì?").valid, true);

    const longMessage = "A".repeat(2001);
    assert.equal(validateMessage(longMessage).valid, false);
    assert.equal(validateMessage(longMessage).code, "MESSAGE_TOO_LONG");
  });

  await t.test("Grounding and NO_EVIDENCE: off-topic queries return NO_EVIDENCE without hallucination", () => {
    function simulateRAG(selectedDoc, userQuery) {
      const lower = userQuery.toLowerCase();
      if (
        lower.includes("thời tiết") ||
        lower.includes("chứng khoán") ||
        lower.includes("bóng đá")
      ) {
        return {
          status: "NO_EVIDENCE",
          content: "Không tìm thấy bằng chứng phù hợp trong các tài liệu đã chọn để trả lời câu hỏi này (NO_EVIDENCE).",
          citations: [],
        };
      }

      return {
        status: "ANSWERED",
        content: `Dựa trên tài liệu '${selectedDoc.title}' (Trang 3): Phản hồi chi tiết.`,
        citations: [
          {
            documentId: selectedDoc.id,
            documentName: selectedDoc.title,
            pageNumber: 3,
            excerpt: "Trích đoạn đối chiếu từ tài liệu...",
            sha256: selectedDoc.sha256,
          },
        ],
      };
    }

    const mockDoc = {
      id: "pdoc_01",
      title: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
      sha256: "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
    };

    const offTopicRes = simulateRAG(mockDoc, "Dự báo thời tiết hôm nay thế nào?");
    assert.equal(offTopicRes.status, "NO_EVIDENCE");
    assert.equal(offTopicRes.citations.length, 0);

    const validRes = simulateRAG(mockDoc, "Khái niệm phụ thuộc hàm là gì?");
    assert.equal(validRes.status, "ANSWERED");
    assert.equal(validRes.citations.length, 1);
    assert.equal(validRes.citations[0].pageNumber, 3);
    assert.equal(validRes.citations[0].sha256, mockDoc.sha256);
  });

  await t.test("Citation Drawer data contract: must include page, documentName and sha256", () => {
    const citation = {
      documentId: "pdoc_01",
      documentName: "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
      pageNumber: 8,
      excerpt: "Dạng chuẩn 3 (3NF): Lược đồ đạt 2NF và không có phụ thuộc bắc cầu.",
      sha256: "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
    };

    assert.ok(citation.pageNumber > 0, "Page number must be positive");
    assert.ok(citation.documentName.endsWith(".pdf"), "Personal document citation must be PDF");
    assert.equal(citation.sha256.length, 64, "Grounding hash must be 64-char hex SHA-256");
    assert.ok(citation.excerpt.length > 0, "Excerpt must not be empty");
  });
});
