package com.studyflow.enrollment.dev;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.courseoffering.domain.CourseOfferingRepository;
import com.studyflow.enrollment.domain.CourseEnrollmentRepository;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class DevSampleStudentSeederGuardTest {

    /** No args; verifies a remote PostgreSQL connection fails before reading or writing class data. */
    @Test
    void refusesRemotePostgreSQLBeforeReadingOrWritingClassData() throws Exception {
        DataSource nonLocalDatabase = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(nonLocalDatabase.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getURL()).thenReturn("jdbc:postgresql://remote.example.invalid:5432/studyflow");
        CourseOfferingRepository untouchedOfferings = mock(CourseOfferingRepository.class);
        CourseEnrollmentRepository untouchedEnrollments = mock(CourseEnrollmentRepository.class);
        UserAccountStore untouchedUsers = mock(UserAccountStore.class);
        DevSampleStudentSeeder guardedSeeder = new DevSampleStudentSeeder(nonLocalDatabase, untouchedOfferings,
                untouchedEnrollments, untouchedUsers, mock(PasswordEncoder.class));

        assertThatThrownBy(() -> guardedSeeder.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("loopback PostgreSQL");
        verifyNoInteractions(untouchedOfferings, untouchedEnrollments, untouchedUsers);
    }

    /** No args; verifies a loopback PostgreSQL URL is an allowed input without inserting fixtures. */
    @Test
    void acceptsLoopbackPostgreSQLConnection() throws Exception {
        DataSource localDatabase = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(localDatabase.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getURL()).thenReturn("jdbc:postgresql://localhost:5432/studyflow?currentSchema=app");
        CourseOfferingRepository emptyOfferings = mock(CourseOfferingRepository.class);
        when(emptyOfferings.findAll()).thenReturn(List.of());
        DevSampleStudentSeeder guardedSeeder = new DevSampleStudentSeeder(localDatabase, emptyOfferings,
                mock(CourseEnrollmentRepository.class), mock(UserAccountStore.class), mock(PasswordEncoder.class));

        guardedSeeder.run(new DefaultApplicationArguments(new String[0]));

        verify(emptyOfferings).findAll();
    }
}
