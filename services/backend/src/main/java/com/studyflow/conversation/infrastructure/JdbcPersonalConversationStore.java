package com.studyflow.conversation.infrastructure;

import com.studyflow.conversation.domain.PersonalConversationData;
import com.studyflow.conversation.domain.PersonalConversationStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** PostgreSQL adapter for Personal Assistant conversations and citation history. */
@Repository
public class JdbcPersonalConversationStore implements PersonalConversationStore {
    private final JdbcTemplate jdbc;

    /** Args: configured application JdbcTemplate. Output: conversation store. Errors: none. */
    public JdbcPersonalConversationStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public PersonalConversationData create(PersonalConversationData conversation) {
        jdbc.update("""
                INSERT INTO app.personal_conversations (id, owner_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """, conversation.id(), conversation.ownerId(), conversation.title(),
                Timestamp.from(conversation.createdAt()), Timestamp.from(conversation.updatedAt()));
        for (PersonalConversationData.DocumentScope document : conversation.documents()) {
            jdbc.update("""
                    INSERT INTO app.personal_conversation_documents
                        (conversation_id, document_id, document_version) VALUES (?, ?, ?)
                    """, conversation.id(), document.documentId(), document.documentVersion());
        }
        return conversation;
    }

    @Override
    public List<PersonalConversationData> findByOwner(UUID ownerId) {
        return jdbc.query("""
                SELECT id, owner_id, title, created_at, updated_at
                FROM app.personal_conversations
                WHERE owner_id = ? AND deleted_at IS NULL
                ORDER BY updated_at DESC
                """, (result, row) -> hydrate(result), ownerId);
    }

    @Override
    public Optional<PersonalConversationData> findOwned(UUID ownerId, UUID conversationId) {
        return jdbc.query("""
                SELECT id, owner_id, title, created_at, updated_at
                FROM app.personal_conversations
                WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
                """, (result, row) -> hydrate(result), conversationId, ownerId).stream().findFirst();
    }

    @Override
    public PersonalConversationData.Message appendExchange(
            UUID conversationId,
            PersonalConversationData.Message userMessage,
            PersonalConversationData.Message assistantMessage,
            Instant updatedAt
    ) {
        insertMessage(conversationId, userMessage);
        insertMessage(conversationId, assistantMessage);
        jdbc.update("UPDATE app.personal_conversations SET updated_at = ? WHERE id = ? AND deleted_at IS NULL",
                Timestamp.from(updatedAt), conversationId);
        return assistantMessage;
    }

    @Override
    public boolean softDelete(UUID ownerId, UUID conversationId, Instant deletedAt) {
        return jdbc.update("""
                UPDATE app.personal_conversations SET deleted_at = ?, updated_at = ?
                WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
                """, Timestamp.from(deletedAt), Timestamp.from(deletedAt), conversationId, ownerId) == 1;
    }

    private void insertMessage(UUID conversationId, PersonalConversationData.Message message) {
        jdbc.update("""
                INSERT INTO app.personal_messages
                    (id, conversation_id, role, content, status, capability, quiz_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, message.id(), conversationId, message.role(), message.content(), message.status(),
                message.capability(), message.quizId(), Timestamp.from(message.createdAt()));
        for (int position = 0; position < message.citations().size(); position++) {
            PersonalConversationData.Citation citation = message.citations().get(position);
            jdbc.update("""
                    INSERT INTO app.personal_message_citations
                        (id, message_id, position, document_id, document_version, page_number, excerpt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, UUID.randomUUID(), message.id(), position, citation.documentId(),
                    citation.documentVersion(), citation.pageNumber(), citation.excerpt());
        }
    }

    private PersonalConversationData hydrate(ResultSet result) throws SQLException {
        UUID id = result.getObject("id", UUID.class);
        List<PersonalConversationData.DocumentScope> documents = jdbc.query("""
                SELECT document_id, document_version FROM app.personal_conversation_documents
                WHERE conversation_id = ? ORDER BY document_id
                """, (row, index) -> new PersonalConversationData.DocumentScope(
                row.getObject("document_id", UUID.class), row.getInt("document_version")), id);
        List<PersonalConversationData.Message> messages = jdbc.query("""
                SELECT id, role, content, status, capability, quiz_id, created_at
                FROM app.personal_messages WHERE conversation_id = ? ORDER BY created_at, id
                """, (row, index) -> hydrateMessage(row), id);
        return new PersonalConversationData(
                id,
                result.getObject("owner_id", UUID.class),
                result.getString("title"),
                documents,
                messages,
                result.getTimestamp("created_at").toInstant(),
                result.getTimestamp("updated_at").toInstant());
    }

    private PersonalConversationData.Message hydrateMessage(ResultSet result) throws SQLException {
        UUID messageId = result.getObject("id", UUID.class);
        List<PersonalConversationData.Citation> citations = jdbc.query("""
                SELECT document_id, document_version, page_number, excerpt
                FROM app.personal_message_citations WHERE message_id = ? ORDER BY position
                """, (row, index) -> new PersonalConversationData.Citation(
                row.getObject("document_id", UUID.class), row.getInt("document_version"),
                row.getInt("page_number"), row.getString("excerpt")), messageId);
        return new PersonalConversationData.Message(
                messageId,
                result.getString("role"),
                result.getString("content"),
                result.getString("status"),
                result.getString("capability"),
                result.getObject("quiz_id", UUID.class),
                citations,
                result.getTimestamp("created_at").toInstant());
    }
}
