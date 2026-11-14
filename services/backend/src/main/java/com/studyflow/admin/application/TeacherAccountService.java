package com.studyflow.admin.application;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.auth.application.port.SecretHasher;
import com.studyflow.common.exception.ApiException;
import com.studyflow.common.exception.ValidationException;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin account provisioning; password, subject assignment and audit commit atomically. */
@Service
public class TeacherAccountService {
    private final AdminJdbcStore store;
    private final SecretHasher hasher;
    private final Validator validator;
    private final Clock clock;

    /** Args: required app store, hasher, Bean Validator and clock. Output: service; errors: none. */
    public TeacherAccountService(AdminJdbcStore store, SecretHasher hasher, Validator validator, Clock clock) {
        this.store=store; this.hasher=hasher; this.validator=validator; this.clock=clock;
    }

    /**
     * Args: authenticated Admin UUID, full account input and safe request trace.
     * Input: valid unique email/username, password 8..72 UTF-8 bytes, existing ACTIVE subject.
     * Output: safe ACTIVE/TEACHER User with one subject; inserts account and audit atomically.
     * Errors: 422 INVALID_TEACHER_ACCOUNT, 404 SUBJECT_NOT_FOUND,
     * 409 SUBJECT_INACTIVE/ACCOUNT_IDENTIFIER_EXISTS; no plaintext password in output/audit.
     */
    @Transactional
    public AdminModels.User create(UUID actor, AdminModels.CreateTeacher input, String traceId) {
        if (input==null || !validator.validate(input).isEmpty()
                || input.fullName().strip().isEmpty() || input.password().isBlank()
                || input.password().getBytes(StandardCharsets.UTF_8).length>72) {
            throw new ValidationException("INVALID_TEACHER_ACCOUNT", "Kiểm tra họ tên, email, tên đăng nhập, mật khẩu và môn phụ trách.");
        }
        String email=input.email().strip().toLowerCase(Locale.ROOT);
        String username=input.username().strip().toLowerCase(Locale.ROOT);
        AdminModels.Subject subject=store.subjectForTeacherCreation(input.subjectId()).orElseThrow(
                ()->new ApiException(HttpStatus.NOT_FOUND,"SUBJECT_NOT_FOUND","Không tìm thấy môn học."));
        if (!"ACTIVE".equals(subject.status())) throw new ApiException(HttpStatus.CONFLICT,"SUBJECT_INACTIVE","Môn học không còn hoạt động.");
        store.lockAccountIdentifiers(email,username);
        if (store.accountIdentifierExists(email,username)) throw duplicate();
        UUID id=UUID.randomUUID();
        try {
            store.insertTeacher(id,email,username,input.fullName().strip(),hasher.hash(input.password()),subject.id(),clock.instant());
        } catch (DuplicateKeyException error) { throw duplicate(); }
        store.audit(actor,"TEACHER_CREATED","USER",id,"SUCCESS",traceId,clock.instant());
        return store.user(id).orElseThrow();
    }

    /** Args: none. Output: conflict without identifying private account fields; errors: none. */
    private static ApiException duplicate() {
        return new ApiException(HttpStatus.CONFLICT,"ACCOUNT_IDENTIFIER_EXISTS","Email hoặc tên đăng nhập đã được sử dụng.");
    }
}
