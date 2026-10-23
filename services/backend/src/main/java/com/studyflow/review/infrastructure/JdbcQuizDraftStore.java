package com.studyflow.review.infrastructure;

import com.studyflow.review.domain.QuizDraftData;
import com.studyflow.review.domain.QuizDraftStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** PostgreSQL adapter for normalized Quiz drafts, questions, options and citations. */
@Repository
public class JdbcQuizDraftStore implements QuizDraftStore {
    private final JdbcTemplate jdbc;

    /** Args: application-schema JdbcTemplate. Input: configured datasource. Output: store adapter. Errors: none. */
    public JdbcQuizDraftStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public QuizDraftData save(QuizDraftData draft) {
        int inserted = jdbc.update("""
                INSERT INTO app.ai_quiz_drafts
                    (id, owner_id, mode, prompt, title, status, destination_type, course_offering_id, created_at, accepted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, draft.id(), draft.ownerId(), draft.mode(), draft.prompt(), draft.title(), draft.status(),
                draft.destinationType(), draft.courseOfferingId(), Timestamp.from(draft.createdAt()),
                draft.acceptedAt() == null ? null : Timestamp.from(draft.acceptedAt()));
        if (inserted == 0) {
            return findOwned(draft.ownerId(), draft.id())
                    .orElseThrow(() -> new IllegalStateException("Quiz idempotency identity belongs to another owner"));
        }
        for (UUID documentId : draft.sourceDocumentIds()) {
            jdbc.update("INSERT INTO app.ai_quiz_sources (quiz_id, document_id) VALUES (?, ?)", draft.id(), documentId);
        }
        for (int questionPosition = 0; questionPosition < draft.questions().size(); questionPosition++) {
            QuizDraftData.Question question = draft.questions().get(questionPosition);
            jdbc.update("""
                    INSERT INTO app.ai_quiz_questions
                        (id, quiz_id, position, question_text, explanation, correct_option_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, question.id(), draft.id(), questionPosition, question.questionText(),
                    question.explanation(), question.correctOptionIndex());
            for (int optionPosition = 0; optionPosition < question.options().size(); optionPosition++) {
                jdbc.update("INSERT INTO app.ai_quiz_options (question_id, position, option_text) VALUES (?, ?, ?)",
                        question.id(), optionPosition, question.options().get(optionPosition));
            }
            for (int citationPosition = 0; citationPosition < question.citations().size(); citationPosition++) {
                QuizDraftData.Citation citation = question.citations().get(citationPosition);
                jdbc.update("""
                        INSERT INTO app.ai_quiz_citations
                            (id, question_id, position, document_id, document_version, page_number, excerpt)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, UUID.randomUUID(), question.id(), citationPosition, citation.documentId(),
                        citation.documentVersion(), citation.pageNumber(), citation.excerpt());
            }
        }
        return draft;
    }

    @Override
    public Optional<QuizDraftData> findOwned(UUID ownerId, UUID quizId) {
        List<QuizDraftData> rows = jdbc.query("""
                SELECT id, owner_id, mode, prompt, title, status, destination_type,
                       course_offering_id, created_at, accepted_at
                FROM app.ai_quiz_drafts WHERE id = ? AND owner_id = ?
                """, (result, row) -> hydrate(result), quizId, ownerId);
        return rows.stream().findFirst();
    }

    @Override
    public QuizDraftData accept(UUID ownerId, UUID quizId, String destinationType, UUID offeringId, Instant acceptedAt) {
        int updated = jdbc.update("""
                UPDATE app.ai_quiz_drafts
                SET status = 'READY', destination_type = ?, course_offering_id = ?, accepted_at = ?
                WHERE id = ? AND owner_id = ? AND status = 'REVIEW_REQUIRED'
                """, destinationType, offeringId, Timestamp.from(acceptedAt), quizId, ownerId);
        if (updated != 1) throw new IllegalStateException("Quiz draft cannot be accepted");
        return findOwned(ownerId, quizId).orElseThrow();
    }

    @Override
    public void reject(UUID ownerId, UUID quizId) {
        int updated = jdbc.update("""
                UPDATE app.ai_quiz_drafts SET status = 'REJECTED'
                WHERE id = ? AND owner_id = ? AND status = 'REVIEW_REQUIRED'
                """, quizId, ownerId);
        if (updated != 1) throw new IllegalStateException("Quiz draft cannot be rejected");
    }

    @Override
    public QuizDraftData publish(UUID ownerId, UUID quizId, Instant publishedAt) {
        int updated = jdbc.update("""
                UPDATE app.ai_quiz_drafts SET status = 'PUBLISHED', accepted_at = ?
                WHERE id = ? AND owner_id = ? AND mode = 'COURSE_TEACHER'
                  AND status = 'REVIEW_REQUIRED' AND course_offering_id IS NOT NULL
                """, Timestamp.from(publishedAt), quizId, ownerId);
        if (updated != 1) throw new IllegalStateException("Teacher Quiz draft cannot be published");
        return findOwned(ownerId, quizId).orElseThrow();
    }

    private QuizDraftData hydrate(ResultSet result) throws SQLException {
        UUID quizId = result.getObject("id", UUID.class);
        List<UUID> sources = jdbc.query(
                "SELECT document_id FROM app.ai_quiz_sources WHERE quiz_id = ? ORDER BY document_id",
                (row, index) -> row.getObject("document_id", UUID.class), quizId);
        List<QuizDraftData.Question> questions = jdbc.query("""
                SELECT id, question_text, explanation, correct_option_index
                FROM app.ai_quiz_questions WHERE quiz_id = ? ORDER BY position
                """, (row, index) -> hydrateQuestion(row), quizId);
        Timestamp accepted = result.getTimestamp("accepted_at");
        return new QuizDraftData(
                quizId,
                result.getObject("owner_id", UUID.class),
                result.getString("mode"),
                result.getString("prompt"),
                result.getString("title"),
                result.getString("status"),
                result.getString("destination_type"),
                result.getObject("course_offering_id", UUID.class),
                sources,
                questions,
                result.getTimestamp("created_at").toInstant(),
                accepted == null ? null : accepted.toInstant());
    }

    private QuizDraftData.Question hydrateQuestion(ResultSet result) throws SQLException {
        UUID questionId = result.getObject("id", UUID.class);
        List<String> options = jdbc.query(
                "SELECT option_text FROM app.ai_quiz_options WHERE question_id = ? ORDER BY position",
                (row, index) -> row.getString("option_text"), questionId);
        List<QuizDraftData.Citation> citations = jdbc.query("""
                SELECT document_id, document_version, page_number, excerpt
                FROM app.ai_quiz_citations WHERE question_id = ? ORDER BY position
                """, (row, index) -> new QuizDraftData.Citation(
                row.getObject("document_id", UUID.class), row.getInt("document_version"),
                row.getInt("page_number"), row.getString("excerpt")), questionId);
        return new QuizDraftData.Question(
                questionId,
                result.getString("question_text"),
                new ArrayList<>(options),
                result.getInt("correct_option_index"),
                result.getString("explanation"),
                new ArrayList<>(citations));
    }
}
