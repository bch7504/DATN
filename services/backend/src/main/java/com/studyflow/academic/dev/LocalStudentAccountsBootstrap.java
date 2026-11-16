package com.studyflow.academic.dev;

import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.auth.application.port.SecretHasher;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Explicitly enabled demo accounts; never registers real students or runs outside local. */
@Component
@Profile("local")
@ConditionalOnProperty(name="studyflow.local-student-accounts.enabled", havingValue="true")
public class LocalStudentAccountsBootstrap implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final AdminJdbcStore store;
    private final SecretHasher hasher;
    private final String initialPassword;

    /** Args: required app JDBC/store, password hasher and initial demo password (default StudyFlow@123).
     * Input: local configuration only. Output: runner; side effects: none. Errors: none. */
    public LocalStudentAccountsBootstrap(JdbcTemplate jdbc, AdminJdbcStore store, SecretHasher hasher,
            @Value("${studyflow.local-student-accounts.password:StudyFlow@123}") String initialPassword) {
        this.jdbc=jdbc;
        this.store=store;
        this.hasher=hasher;
        this.initialPassword=initialPassword;
    }

    /** Args: ignored startup arguments. Input: local database with an ACTIVE admin.local account;
     * initial password must contain at least 8 characters and at most 72 UTF-8 bytes.
     * Output: void; atomically creates missing student.a@stu.ptit.edu.vn..student.j@stu.ptit.edu.vn;
     * demo emails, ACTIVE/STUDENT role, verified local email and no automatic enrollments.
     * Existing legacy short usernames are renamed in place; UUID/password/resources stay unchanged.
     * Active refresh tokens are revoked only on rename. Retry is idempotent.
     * Errors: invalid initial password, missing Admin, conflicting identity/role or persistence failure;
     * the entire transaction rolls back and the startup caller must resolve the conflict before retry. */
    @Override
    @Transactional
    public void run(String... args) {
        if(initialPassword.length()<8 || initialPassword.getBytes(StandardCharsets.UTF_8).length>72) {
            throw new IllegalStateException("Local initial password must satisfy account constraints.");
        }
        Long admins=jdbc.queryForObject("SELECT COUNT(*) FROM app.users WHERE username='admin.local' AND role='ADMIN' AND status='ACTIVE'",Long.class);
        if(admins==null || admins!=1) throw new IllegalStateException("Local Admin is required.");
        for(char letter='a';letter<='j';letter++) {
            String legacyUsername="student."+letter;
            String email=legacyUsername+"@stu.ptit.edu.vn";
            String username=email;
            store.lockAccountIdentifiers(email,legacyUsername);
            var existing=jdbc.query("SELECT id FROM app.users WHERE lower(username) IN (?,?) AND lower(email)=? AND role='STUDENT'",
                    (rs,row)->(UUID)rs.getObject(1),username,legacyUsername,email);
            if(existing.size()>1) throw new IllegalStateException("Multiple local Student identities exist.");
            if(!existing.isEmpty()) {
                UUID id=existing.get(0);
                Long conflicts=jdbc.queryForObject("SELECT COUNT(*) FROM app.users WHERE id<>? AND (lower(username)=? OR lower(email)=?)",Long.class,id,email,email);
                if(conflicts!=null && conflicts>0) throw new IllegalStateException("Local Student identity is already used.");
                int renamed=jdbc.update("UPDATE app.users SET username=?,updated_at=NOW() WHERE id=? AND username<>?",username,id,username);
                if(renamed>0) jdbc.update("UPDATE app.refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL",id);
                continue;
            }
            if(store.accountIdentifierExists(email,username)) {
                throw new IllegalStateException("Local Student identity is already used.");
            }
            jdbc.update("""
                    INSERT INTO app.users(id,email,username,password_hash,full_name,time_zone,role,status,
                        email_verified_at,created_at,updated_at)
                    VALUES(?,?,?,?,?,'Asia/Ho_Chi_Minh','STUDENT','ACTIVE',NOW(),NOW(),NOW())
                    """,UUID.randomUUID(),email,username,hasher.hash(initialPassword),
                    "Sinh viên "+String.valueOf(letter).toUpperCase(Locale.ROOT));
        }
    }
}
