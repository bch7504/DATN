package com.studyflow.common.security;

import org.springframework.security.test.context.support.WithSecurityContext;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockStudyFlowUserSecurityContextFactory.class)
public @interface WithMockStudyFlowUser {
    String id() default "usr_test_01";
    String email() default "test@ptit.edu.vn";
    String displayName() default "Nguyễn Văn Test";
    UserRole role() default UserRole.STUDENT;
}
