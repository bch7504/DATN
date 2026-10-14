package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.auth.application.port.UserAccountStore;
import com.studyflow.user.domain.UserAccount;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class UserAccountJpaStore implements UserAccountStore {

    private final SpringDataUserRepository repository;

    UserAccountJpaStore(SpringDataUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean existsByEmail(String email) {
        return repository.existsByEmailIgnoreCase(email);
    }

    @Override
    public Optional<UserAccount> findByIdentifier(String identifier) {
        return repository.findByIdentifier(identifier).map(UserJpaEntity::toDomain);
    }

    @Override
    public Optional<UserAccount> findById(UUID id) {
        return repository.findById(id).map(UserJpaEntity::toDomain);
    }

    @Override
    public Optional<UserAccount> findByIdForUpdate(UUID id) {
        return repository.findByIdForUpdate(id).map(UserJpaEntity::toDomain);
    }

    @Override
    public List<UserAccount> findAllByIdIn(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return repository.findAllById(ids).stream().map(UserJpaEntity::toDomain).toList();
    }

    @Override
    public UserAccount save(UserAccount account) {
        return repository.save(UserJpaEntity.fromDomain(account)).toDomain();
    }
}
