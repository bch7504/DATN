package com.studyflow.auth.application.port;

import com.studyflow.auth.domain.RefreshSession;
import java.util.Optional;

public interface RefreshSessionStore {
    Optional<RefreshSession> findByTokenHashForUpdate(String tokenHash);

    RefreshSession save(RefreshSession session);
}
