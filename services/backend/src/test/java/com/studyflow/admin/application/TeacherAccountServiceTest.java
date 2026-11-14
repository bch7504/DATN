package com.studyflow.admin.application;

import com.studyflow.admin.api.AdminModels;
import com.studyflow.admin.infrastructure.AdminJdbcStore;
import com.studyflow.auth.application.port.SecretHasher;
import com.studyflow.common.exception.ApiException;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Synthetic provisioning contracts; no actual accounts, passwords or external services. */
class TeacherAccountServiceTest {
    private final UUID actor=UUID.randomUUID(),subjectId=UUID.randomUUID();
    private final AdminJdbcStore store=mock(AdminJdbcStore.class);
    private final SecretHasher hasher=mock(SecretHasher.class);
    private ValidatorFactory factory;
    private TeacherAccountService service;
    /** Args: none. Output: fresh validator and service; errors: setup failure. */
    @BeforeEach void setUp() {
        factory=Validation.buildDefaultValidatorFactory();
        service=new TeacherAccountService(store,hasher,factory.getValidator(),Clock.fixed(Instant.EPOCH,ZoneOffset.UTC));
        when(store.subjectForTeacherCreation(subjectId)).thenReturn(Optional.of(new AdminModels.Subject(subjectId,"KTS","Kỹ thuật số",3,null,"ACTIVE")));
    }
    /** Args: none. Output: void; releases Validator resources. */
    @AfterEach void close() {factory.close();}
    /** Args: password. Output: synthetic valid request; errors: none. */
    private AdminModels.CreateTeacher input(String password) {return new AdminModels.CreateTeacher("Synthetic teacher","Teacher@Example.test","Teacher.Test",password,subjectId);}
    @Test void createsFixedRoleHashedPasswordAndOneSubjectWithSafeAudit() {
        when(hasher.hash("Synthetic123!")).thenReturn("encoded-test");
        when(store.user(any())).thenAnswer(call->Optional.of(new AdminModels.User(call.getArgument(0),"teacher@example.test","teacher.test","Synthetic teacher","TEACHER","ACTIVE",Instant.EPOCH,subjectId,"KTS","Kỹ thuật số")));
        var result=service.create(actor,input("Synthetic123!"),"req-test");
        assertThat(result.role()).isEqualTo("TEACHER");assertThat(result.subjectId()).isEqualTo(subjectId);
        verify(store).insertTeacher(eq(result.id()),eq("teacher@example.test"),eq("teacher.test"),eq("Synthetic teacher"),eq("encoded-test"),eq(subjectId),eq(Instant.EPOCH));
        verify(store).audit(actor,"TEACHER_CREATED","USER",result.id(),"SUCCESS","req-test",Instant.EPOCH);
        assertThat(input("Synthetic123!").toString()).doesNotContain("Synthetic123!");
    }
    @Test void rejectsInvalidPasswordEmailAndUtf8LengthBeforeWrites() {
        for(var input:java.util.List.of(input("short"),input("đ".repeat(40)),new AdminModels.CreateTeacher("T","invalid","valid.user","Synthetic123!",subjectId))) {
            assertThatThrownBy(()->service.create(actor,input,"req")).isInstanceOf(ApiException.class);
        }
        verify(store,never()).insertTeacher(any(),any(),any(),any(),any(),any(),any());verifyNoInteractions(hasher);
    }
    @Test void rejectsDuplicateAndInactiveSubjectWithoutHashing() {
        when(store.accountIdentifierExists(anyString(),anyString())).thenReturn(true);
        assertThatThrownBy(()->service.create(actor,input("Synthetic123!"),"req")).isInstanceOf(ApiException.class).hasMessageContaining("đã được sử dụng");
        when(store.subjectForTeacherCreation(subjectId)).thenReturn(Optional.of(new AdminModels.Subject(subjectId,"KTS","Kỹ thuật số",3,null,"INACTIVE")));
        assertThatThrownBy(()->service.create(actor,input("Synthetic123!"),"req")).isInstanceOf(ApiException.class).hasMessageContaining("không còn hoạt động");
        verifyNoInteractions(hasher);
    }
}
