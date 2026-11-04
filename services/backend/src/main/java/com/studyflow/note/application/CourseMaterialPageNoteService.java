package com.studyflow.note.application;

import com.studyflow.document.application.CourseMaterialLibraryService;
import com.studyflow.common.exception.ValidationException;
import com.studyflow.note.api.PageNoteResponse;
import com.studyflow.note.domain.CourseMaterialPageNote;
import com.studyflow.note.domain.CourseMaterialPageNoteRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns private Student notes after reusing the Course Material slide authorization policy. */
@Service
public class CourseMaterialPageNoteService {
    private final CourseMaterialPageNoteRepository notes;
    private final CourseMaterialLibraryService materials;
    private final Clock clock;

    public CourseMaterialPageNoteService(CourseMaterialPageNoteRepository notes,
                                         CourseMaterialLibraryService materials,
                                         Clock clock) {
        this.notes = notes;
        this.materials = materials;
        this.clock = clock;
    }

    /**
     * Args: authenticated studentId, SLIDE_PDF documentId and positive pageNumber.
     * Input: current authorized slide scope. Output: owner note or empty response. Errors: material access errors.
     */
    @Transactional(readOnly = true)
    public PageNoteResponse get(UUID studentId, UUID documentId, int pageNumber) {
        materials.authorizeTutor(studentId, documentId, pageNumber);
        return notes.findByStudentIdAndDocumentIdAndPageNumber(studentId, documentId, pageNumber)
                .map(this::response)
                .orElseGet(() -> new PageNoteResponse(documentId, pageNumber, "", null));
    }

    /**
     * Args: authenticated studentId, SLIDE_PDF documentId, positive pageNumber and content <=5,000 chars.
     * Input: current authorized slide scope. Output: saved note, or empty response after clearing.
     * Errors: material access errors or IllegalArgumentException if caller bypasses DTO validation.
     * Side effect: inserts, updates or deletes only the authenticated Student's note.
     */
    @Transactional
    public PageNoteResponse save(UUID studentId, UUID documentId, int pageNumber, String content) {
        materials.authorizeTutor(studentId, documentId, pageNumber);
        if (content == null || content.length() > 5000) {
            throw new ValidationException("INVALID_NOTE_CONTENT",
                    "Ghi chú phải có tối đa 5.000 ký tự.");
        }
        var existing = notes.findByStudentIdAndDocumentIdAndPageNumber(studentId, documentId, pageNumber);
        if (content.isBlank()) {
            existing.ifPresent(notes::delete);
            return new PageNoteResponse(documentId, pageNumber, "", null);
        }
        Instant now = clock.instant();
        CourseMaterialPageNote note = existing.orElseGet(() -> new CourseMaterialPageNote(
                UUID.randomUUID(), studentId, documentId, pageNumber, content, now));
        if (existing.isPresent()) note.replaceContent(content, now);
        return response(notes.save(note));
    }

    private PageNoteResponse response(CourseMaterialPageNote note) {
        return new PageNoteResponse(note.getDocumentId(), note.getPageNumber(),
                note.getContent(), note.getUpdatedAt());
    }
}
