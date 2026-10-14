package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.auth.application.port.RefreshSessionStore;
import com.studyflow.auth.domain.RefreshSession;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class RefreshSessionJpaStore implements RefreshSessionStore {

    private final SpringDataRefreshSessionRepository repository;

    RefreshSessionJpaStore(SpringDataRefreshSessionRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<RefreshSession> findByTokenHashForUpdate(String tokenHash) {
        return repository.findByTokenHashForUpdate(tokenHash).map(RefreshSessionJpaEntity::toDomain);
    }

    @Override
    public RefreshSession save(RefreshSession session) {
        return repository.save(RefreshSessionJpaEntity.fromDomain(session)).toDomain();
    }
}
