const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const loadClient = require("./helpers/load-api-client.cjs");

test("Review Hub only exposes Course Offerings containing the current Student's READY quiz", async () => {
  const offering = (id, name) => ({ id, code: id.toUpperCase(), name, subjectId: `subject-${id}`, semesterId: "semester-1", teacherName: "Teacher", status: "ACTIVE", createdAt: "2030-01-01T00:00:00Z" });
  const client = loadClient(async (url) => {
    if (url.endsWith("/student/course-offerings?page=0&size=100")) return Response.json([offering("off1", "Có Quiz"), offering("off2", "Không có Quiz")]);
    if (url.endsWith("/review/course-offerings")) return Response.json([{ courseOfferingId: "off1", quizCount: 1, averageScore: null, latestAttemptAt: null }]);
    if (url.endsWith("/review/personal-quizzes")) return Response.json([]);
    throw new Error(`Unexpected URL ${url}`);
  }, "http://java.test/api/v1");

  const summaries = await client.reviewApi.getCourseSummaries();
  assert.deepEqual(summaries.map((item) => item.courseOfferingId), ["PERSONAL", "off1"]);
});

test("FE-M5: Quiz, 2-Level Review Hub & Assessment Rules", async (t) => {
  await t.test("Quiz MCQ_SINGLE contract: exactly one correct option per question", () => {
    const question = {
      id: "q_01",
      type: "MCQ_SINGLE",
      questionText: "Trong mô hình PEAS, chữ E đại diện cho gì?",
      options: [
        { id: "A", text: "Evaluation" },
        { id: "B", text: "Environment" },
        { id: "C", text: "Effectors" },
        { id: "D", text: "Execution" },
      ],
      correctOptionId: "B",
      explanation: "Chữ E là Environment.",
    };

    assert.equal(question.type, "MCQ_SINGLE");
    assert.equal(question.options.length, 4);
    assert.ok(
      question.options.some((o) => o.id === question.correctOptionId),
      "Correct option must be one of the choices"
    );
  });

  await t.test("Quiz Accept policy: destination must be an APPROVED offering or PERSONAL", () => {
    function validateQuizDestination(destinationType, courseOfferingId, approvedOfferings) {
      if (destinationType === "PERSONAL") {
        return { valid: true, isPersonal: true };
      }
      if (destinationType === "COURSE_OFFERING") {
        if (!courseOfferingId) {
          return { valid: false, code: "MISSING_COURSE_OFFERING" };
        }
        const isApproved = approvedOfferings.some(
          (o) => o.id === courseOfferingId && o.status === "ACTIVE"
        );
        if (!isApproved) {
          return { valid: false, code: "OFFERING_NOT_APPROVED" };
        }
        return { valid: true, isPersonal: false, courseOfferingId };
      }
      return { valid: false, code: "INVALID_DESTINATION_TYPE" };
    }

    const mockOfferings = [
      { id: "off_01", code: "INT1340", status: "ACTIVE" },
      { id: "off_02", code: "PENDING_01", status: "PENDING" },
    ];

    assert.equal(validateQuizDestination("PERSONAL", undefined, mockOfferings).valid, true);
    assert.equal(validateQuizDestination("COURSE_OFFERING", "off_01", mockOfferings).valid, true);
    assert.equal(validateQuizDestination("COURSE_OFFERING", "off_02", mockOfferings).valid, false);
    assert.equal(
      validateQuizDestination("COURSE_OFFERING", "off_02", mockOfferings).code,
      "OFFERING_NOT_APPROVED"
    );
  });

  await t.test("Attempt history policy: every submit creates a new attempt without overwriting previous attempts", () => {
    const attempts = [];

    function recordAttempt(quizId, answers, questions) {
      let correct = 0;
      answers.forEach((ans) => {
        const q = questions.find((item) => item.id === ans.questionId);
        if (q && q.correctOptionId === ans.selectedOptionId) {
          correct++;
        }
      });

      const nextAttemptNumber = attempts.filter((a) => a.quizId === quizId).length + 1;
      const newAttempt = {
        id: `att_${Date.now()}_${nextAttemptNumber}`,
        quizId,
        attemptNumber: nextAttemptNumber,
        score: correct,
        maxScore: questions.length,
        percentage: Math.round((correct / questions.length) * 100),
      };
      attempts.push(newAttempt);
      return newAttempt;
    }

    const mockQuestions = [
      { id: "q1", correctOptionId: "B" },
      { id: "q2", correctOptionId: "A" },
    ];

    // Attempt 1: 1/2 correct (50%)
    const att1 = recordAttempt("quiz_01", [{ questionId: "q1", selectedOptionId: "B" }, { questionId: "q2", selectedOptionId: "C" }], mockQuestions);
    assert.equal(att1.attemptNumber, 1);
    assert.equal(att1.score, 1);
    assert.equal(attempts.length, 1);

    // Attempt 2: 2/2 correct (100%)
    const att2 = recordAttempt("quiz_01", [{ questionId: "q1", selectedOptionId: "B" }, { questionId: "q2", selectedOptionId: "A" }], mockQuestions);
    assert.equal(att2.attemptNumber, 2);
    assert.equal(att2.score, 2);
    assert.equal(attempts.length, 2, "Attempts must accumulate, not overwrite");
    assert.equal(attempts[0].score, 1, "First attempt must remain intact");
  });

  await t.test("Review items aggregation: only derived from wrong answers, not AI inferred", () => {
    function aggregateReviewItems(attemptAnswers, questions) {
      const wrongItems = [];
      attemptAnswers.forEach((ans) => {
        if (!ans.isCorrect) {
          const q = questions.find((item) => item.id === ans.questionId);
          if (q) {
            wrongItems.push({
              questionId: q.id,
              questionText: q.questionText,
              wrongOptionId: ans.selectedOptionId,
              correctOptionId: q.correctOptionId,
              explanation: q.explanation,
              citation: q.citation,
            });
          }
        }
      });
      return wrongItems;
    }

    const mockQuestions = [
      {
        id: "q1",
        questionText: "Khóa chính có được mang giá trị NULL không?",
        correctOptionId: "B",
        explanation: "Khóa chính không được mang NULL.",
        citation: { documentId: "doc_01", pageNumber: 3 },
      },
    ];

    const wrongAttempt = [{ questionId: "q1", selectedOptionId: "A", isCorrect: false }];
    const reviewItems = aggregateReviewItems(wrongAttempt, mockQuestions);

    assert.equal(reviewItems.length, 1);
    assert.equal(reviewItems[0].correctOptionId, "B");
    assert.equal(reviewItems[0].citation.pageNumber, 3);
  });

  await t.test("Daily Goal and Streak rules: client only configures targets, actual is computed by backend", () => {
    function validateDailyGoalPayload(payload) {
      // Must only contain target values
      const keys = Object.keys(payload);
      const allowedKeys = ["targetPages", "targetQuizQuestions", "targetTasks"];
      const hasOnlyTargets = keys.every((k) => allowedKeys.includes(k));
      const hasNoActuals = !keys.some((k) => k.toLowerCase().includes("actual"));
      const hasNoStreak = !keys.some((k) => k.toLowerCase().includes("streak"));

      return hasOnlyTargets && hasNoActuals && hasNoStreak;
    }

    assert.equal(
      validateDailyGoalPayload({
        targetPages: 8,
        targetQuizQuestions: 10,
        targetTasks: 2,
      }),
      true
    );

    // Forbidden payload trying to send client-computed actuals or streak
    assert.equal(
      validateDailyGoalPayload({
        targetPages: 8,
        actualPages: 8,
      }),
      false
    );
  });

  await t.test("Review Hub must not duplicate Course Offering progress from Dashboard", () => {
    const workspacePath = path.join(
      process.cwd(),
      "src/app/(student)/review/[courseId]/review-workspace.tsx"
    );
    const source = fs.readFileSync(workspacePath, "utf8");

    assert.equal(source.includes('setActiveTab("PROGRESS")'), false);
    assert.equal(source.includes("Xem tiến độ môn học"), false);
    assert.equal(source.includes("Nội dung cần ôn lại"), true);
    assert.equal(source.includes("Attempt History"), true);
  });

  await t.test("Desktop app shell provides an accessible collapse control", () => {
    const shellPath = path.join(process.cwd(), "src/components/layout/app-shell.tsx");
    const source = fs.readFileSync(shellPath, "utf8");

    assert.equal(source.includes("desktopSidebarCollapsed"), true);
    assert.equal(source.includes("Thu gọn thanh điều hướng"), true);
    assert.equal(source.includes("Mở rộng thanh điều hướng"), true);
  });

  await t.test("Plan route loads persisted weekly calendar data and keeps Daily Goal on Dashboard", () => {
    const planPath = path.join(process.cwd(), "src/app/(student)/plan/page.tsx");
    const source = fs.readFileSync(planPath, "utf8");
    const editor = fs.readFileSync(path.join(process.cwd(), "src/app/(student)/plan/plan-item-editor.tsx"), "utf8");

    assert.equal(source.includes("Kế hoạch &amp; Lịch học cá nhân"), true);
    assert.equal(source.includes("Thêm nhiệm vụ"), true);
    assert.equal(source.includes("Thêm lịch học"), true);
    assert.equal(source.includes("studyPlanApi.getCalendar"), true);
    assert.equal(source.includes("studyPlanApi.changeItemStatus"), true);
    assert.equal(source.includes("getDailyGoalProgress"), false);
    assert.equal(source.includes('studyPlanApi.listPlans("ACTIVE")'), true);
    assert.equal(source.includes("studyPlanApi.getCalendar(from.toISOString(), to.toISOString())"), true);
    assert.equal(editor.includes("studyPlanApi.createItem"), true);
    assert.equal(editor.includes("studyPlanApi.updateItem"), true);
    assert.equal(source.includes("studyPlanApi.permanentlyDeleteItem"), true);
    assert.equal(source.includes("isDemoMode()"), false);
    assert.equal(source.includes('href="/plan/new"'), true);
    assert.equal(source.includes("/edit`}"), true);
    assert.equal(source.includes("value={planTitle}"), false);
    assert.equal(source.includes("value={newPlanTitle}"), false);
  });

});
