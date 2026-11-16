package com.studyflow.academic.dev;

import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.auth.application.port.SecretHasher;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Synthetic local CLI contract; no user database or real email delivery. */
class LocalStudentAccountsBootstrapTest {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final AdminJdbcStore store=mock(AdminJdbcStore.class);
    private final SecretHasher hasher=mock(SecretHasher.class);

    /** Args: none. Output: void; verifies ten hashed STUDENT inserts with exact demo identities. */
    @Test void createsTenStudentsWithPtitEmailAndNoPlaintextPassword() {
        when(jdbc.queryForObject(anyString(),eq(Long.class))).thenReturn(1L);
        when(hasher.hash("Synthetic123!")).thenReturn("encoded-test");
        new LocalStudentAccountsBootstrap(jdbc,store,hasher,"Synthetic123!").run();
        for(char letter='a';letter<='j';letter++) {
            verify(jdbc).update(contains("'STUDENT','ACTIVE'"),any(UUID.class),
                    eq("student."+letter+"@stu.ptit.edu.vn"),eq("student."+letter+"@stu.ptit.edu.vn"),eq("encoded-test"),
                    eq("Sinh viên "+Character.toUpperCase(letter)));
        }
        verify(hasher,times(10)).hash("Synthetic123!");
    }

    /** Args: none. Output: void; invalid password must fail before any database side effect. */
    @Test void rejectsInvalidPasswordBeforeAccessingDatabase() {
        var runner=new LocalStudentAccountsBootstrap(jdbc,store,hasher,"short");
        assertThatThrownBy(()->runner.run()).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(jdbc,store,hasher);
    }

    /** Args: none. Output: void; conflicting login identifier cannot be replaced or hashed. */
    @Test void rejectsIdentityConflictWithoutCreatingAccount() {
        when(jdbc.queryForObject(anyString(),eq(Long.class))).thenReturn(1L);
        when(store.accountIdentifierExists(anyString(),anyString())).thenReturn(true);
        var runner=new LocalStudentAccountsBootstrap(jdbc,store,hasher,"Synthetic123!");
        assertThatThrownBy(()->runner.run()).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already used");
        verifyNoInteractions(hasher);
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
