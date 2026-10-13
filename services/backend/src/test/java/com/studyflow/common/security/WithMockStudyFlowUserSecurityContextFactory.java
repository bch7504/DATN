package com.studyflow.common.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

public class WithMockStudyFlowUserSecurityContextFactory implements WithSecurityContextFactory<WithMockStudyFlowUser> {

    @Override
    public SecurityContext createSecurityContext(WithMockStudyFlowUser annotation) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        UserPrincipal principal = UserPrincipal.builder()
                .id(annotation.id())
                .email(annotation.email())
                .displayName(annotation.displayName())
                .role(annotation.role())
                .build();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, "password", principal.getAuthorities()
        );
        context.setAuthentication(auth);
        return context;
    }
}
