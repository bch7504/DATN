package com.studyflow.material.infrastructure;

import com.studyflow.material.domain.CourseMaterialTutorConversation;
import com.studyflow.material.domain.CourseMaterialTutorConversationStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** PostgreSQL adapter for persistent Course Material Tutor conversations. */
@Repository
public class JdbcCourseMaterialTutorConversationStore implements CourseMaterialTutorConversationStore {
    private final JdbcTemplate jdbc;

    /** Args: application JdbcTemplate. Output: initialized store. Errors: none. */
    public JdbcCourseMaterialTutorConversationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<CourseMaterialTutorConversation> findByScope(
            UUID studentId,
            UUID documentId,
            int documentVersion,
            UUID courseOfferingId
    ) {
        return jdbc.query("""
                SELECT id, student_id, document_id, document_version, course_offering_id,
                       created_at, updated_at
                FROM app.course_material_tutor_conversations
                WHERE student_id = ? AND document_id = ? AND document_version = ?
                  AND course_offering_id = ?
                """, (row, index) -> hydrate(row), studentId, documentId, documentVersion,
                courseOfferingId).stream().findFirst();
    }

    @Override
    public CourseMaterialTutorConversation findOrCreate(CourseMaterialTutorConversation conversation) {
        jdbc.update("""
                INSERT INTO app.course_material_tutor_conversations
                    (id, student_id, document_id, document_version, course_offering_id,
                     created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, document_id, document_version, course_offering_id)
                DO NOTHING
                """, conversation.id(), conversation.studentId(), conversation.documentId(),
                conversation.documentVersion(), conversation.courseOfferingId(),
                Timestamp.from(conversation.createdAt()), Timestamp.from(conversation.updatedAt()));
        return findByScope(conversation.studentId(), conversation.documentId(),
                conversation.documentVersion(), conversation.courseOfferingId())
                .orElseThrow(() -> new IllegalStateException(
                        "Course Material Tutor conversation was not persisted."));
    }

    @Override
    public CourseMaterialTutorConversation.Message appendExchange(
            UUID conversationId,
            CourseMaterialTutorConversation.Message userMessage,
            CourseMaterialTutorConversation.Message assistantMessage,
            Instant updatedAt
    ) {
        insertMessage(conversationId, userMessage);
        insertMessage(conversationId, assistantMessage);
        jdbc.update("""
                UPDATE app.course_material_tutor_conversations SET updated_at = ? WHERE id = ?
                """, Timestamp.from(updatedAt), conversationId);
        return assistantMessage;
    }

    private void insertMessage(UUID conversationId, CourseMaterialTutorConversation.Message message) {
        jdbc.update("""
                INSERT INTO app.course_material_tutor_messages
                    (id, conversation_id, role, page_number, content, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, message.id(), conversationId, message.role(), message.pageNumber(),
                message.content(), message.status(), Timestamp.from(message.createdAt()));
        for (int position = 0; position < message.citations().size(); position++) {
            CourseMaterialTutorConversation.Citation citation = message.citations().get(position);
            jdbc.update("""
                    INSERT INTO app.course_material_tutor_message_citations
                        (id, message_id, position, document_id, document_version, page_number, excerpt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, UUID.randomUUID(), message.id(), position, citation.documentId(),
                    citation.documentVersion(), citation.pageNumber(), citation.excerpt());
        }
    }

    private CourseMaterialTutorConversation hydrate(ResultSet row) throws SQLException {
        UUID conversationId = row.getObject("id", UUID.class);
        List<CourseMaterialTutorConversation.Message> messages = jdbc.query("""
                SELECT id, role, page_number, content, status, created_at
                FROM app.course_material_tutor_messages
                WHERE conversation_id = ? ORDER BY created_at, id
                """, (messageRow, index) -> hydrateMessage(messageRow), conversationId);
        return new CourseMaterialTutorConversation(
                conversationId,
                row.getObject("student_id", UUID.class),
                row.getObject("document_id", UUID.class),
                row.getInt("document_version"),
                row.getObject("course_offering_id", UUID.class),
                messages,
                row.getTimestamp("created_at").toInstant(),
                row.getTimestamp("updated_at").toInstant());
    }

    private CourseMaterialTutorConversation.Message hydrateMessage(ResultSet row) throws SQLException {
        UUID messageId = row.getObject("id", UUID.class);
        List<CourseMaterialTutorConversation.Citation> citations = jdbc.query("""
                SELECT document_id, document_version, page_number, excerpt
                FROM app.course_material_tutor_message_citations
                WHERE message_id = ? ORDER BY position
                """, (citationRow, index) -> new CourseMaterialTutorConversation.Citation(
                citationRow.getObject("document_id", UUID.class),
                citationRow.getInt("document_version"),
                citationRow.getInt("page_number"),
                citationRow.getString("excerpt")), messageId);
        return new CourseMaterialTutorConversation.Message(
                messageId,
                row.getString("role"),
                row.getInt("page_number"),
                row.getString("content"),
                row.getString("status"),
                citations,
                row.getTimestamp("created_at").toInstant());
    }
}
