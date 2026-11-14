package com.studyflow.academic.dev;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.application.TeacherAccountService;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Opt-in local setup only; never runs in dev/production or resets existing passwords. */
@Component @Profile("local")
@ConditionalOnProperty(name="studyflow.local-teacher-accounts.enabled",havingValue="true")
public class LocalTeacherAccountsBootstrap implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final AdminJdbcStore store;
    private final TeacherAccountService accounts;
    private final String initialPassword;
    /** Args: app JDBC/store, provisioning service and local-only initial password.
     * Output: runner; errors: none. The configured password is never logged. */
    public LocalTeacherAccountsBootstrap(JdbcTemplate jdbc,AdminJdbcStore store,TeacherAccountService accounts,
            @Value("${studyflow.local-teacher-accounts.password:StudyFlow@123}") String initialPassword) {
        this.jdbc=jdbc;this.store=store;this.accounts=accounts;this.initialPassword=initialPassword;
    }
    /** Args: ignored startup arguments. Input: existing local Admin, seven seeded subjects and optional teacher.local.
     * Output: void; atomically creates missing local Teachers, renames the KTS identity preserving UUID/password,
     * and transfers only empty classes of other subjects. Existing passwords/resources are never reset/deleted.
     * Errors: missing Admin/catalog, identity conflict, nonempty cross-subject class or persistence failure.
     * Retry: idempotent by username/subject; enable explicitly with --studyflow.local-teacher-accounts.enabled=true. */
    @Override @Transactional
    public void run(String... args) {
        UUID admin=jdbc.query("SELECT id FROM app.users WHERE username='admin.local' AND role='ADMIN' AND status='ACTIVE'",
                (rs,row)->(UUID)rs.getObject(1)).stream().findFirst().orElseThrow(()->new IllegalStateException("Local Admin is required."));
        UUID legacy=jdbc.query("SELECT id FROM app.users WHERE username IN ('teacher.local','teacher.kts.local') AND role='TEACHER' AND lower(email) LIKE '%@studyflow.local' ORDER BY username",
                (rs,row)->(UUID)rs.getObject(1)).stream().findFirst().orElse(null);
        for(String[] seed:List.of(new String[]{"GT2","gt2"},new String[]{"KTCT","ktct"},new String[]{"KTS","kts"},
                new String[]{"ENG-C1","engc1"},new String[]{"THCS2","thcs2"},new String[]{"VL-TN1","vltn1"},new String[]{"XSTK","xstk"})) {
            UUID subject=jdbc.query("SELECT id FROM app.subjects WHERE code=? AND status='ACTIVE'",(rs,row)->(UUID)rs.getObject(1),seed[0]).stream().findFirst().orElseThrow();
            String username="teacher."+seed[1]+".local";
            UUID id=jdbc.query("SELECT id FROM app.users WHERE username=? AND role='TEACHER'",(rs,row)->(UUID)rs.getObject(1),username).stream().findFirst().orElse(null);
            if("KTS".equals(seed[0]) && id==null && legacy!=null) {
                if(store.accountIdentifierExists(username+"@studyflow.local",username)) throw new IllegalStateException("KTS local identity is already used.");
                jdbc.update("UPDATE app.users SET username=?,email=?,full_name='Giảng viên Kỹ thuật số',teacher_subject_id=?,updated_at=NOW() WHERE id=?",username,username+"@studyflow.local",subject,legacy);
                jdbc.update("UPDATE app.refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL",legacy);
                id=legacy;
            }
            if(id==null) {
                String title=store.subject(subject).orElseThrow().name();
                id=accounts.create(admin,new AdminModels.CreateTeacher("Giảng viên "+title,username+"@studyflow.local",username,initialPassword,subject),"local-teacher-setup").id();
            } else {
                jdbc.update("UPDATE app.users SET teacher_subject_id=? WHERE id=? AND (teacher_subject_id IS NULL OR teacher_subject_id=?)",subject,id,subject);
                if(!subject.equals(store.user(id).orElseThrow().subjectId())) throw new IllegalStateException("Existing local Teacher has another subject.");
            }
            if(legacy!=null && !legacy.equals(id)) {
                jdbc.update("""
                    UPDATE app.course_offerings o SET teacher_id=?,updated_at=NOW() WHERE teacher_id=? AND subject_id=?
                    AND NOT EXISTS(SELECT 1 FROM app.document_publications p WHERE p.course_offering_id=o.id AND p.status='PUBLISHED')
                    AND NOT EXISTS(SELECT 1 FROM app.course_assignments a WHERE a.course_offering_id=o.id)
                    AND NOT EXISTS(SELECT 1 FROM app.quizzes q WHERE q.course_offering_id=o.id)
                    AND NOT EXISTS(SELECT 1 FROM app.ai_quiz_drafts q WHERE q.course_offering_id=o.id)
                    """,id,legacy,subject);
            }
        }
        if(legacy!=null) {
            Long remaining=jdbc.queryForObject("SELECT COUNT(*) FROM app.course_offerings o JOIN app.subjects s ON s.id=o.subject_id WHERE o.teacher_id=? AND s.code<>'KTS'",Long.class,legacy);
            if(remaining!=null && remaining>0) throw new IllegalStateException("Other-subject classes contain resources; local account setup rolled back instead of deleting/transferring them.");
        }
    }
}
