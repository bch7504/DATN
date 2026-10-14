package com.studyflow.auth.application.port;

import com.studyflow.auth.application.SessionTokens;
import com.studyflow.user.domain.UserAccount;
import java.time.Instant;

public interface SessionTokenIssuer {
    SessionTokens issue(UserAccount user, Instant now);

    String hashRefreshToken(String rawToken);
}
