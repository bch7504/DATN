package com.studyflow.auth.infrastructure.persistence;

import com.studyflow.auth.application.port.RegistrationChallengeStore;
import com.studyflow.auth.domain.RegistrationChallenge;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class RegistrationChallengeJpaStore implements RegistrationChallengeStore {

    private final SpringDataRegistrationChallengeRepository repository;

    RegistrationChallengeJpaStore(SpringDataRegistrationChallengeRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<RegistrationChallenge> findByEmailForUpdate(String email) {
        return repository.findByEmailForUpdate(email).map(RegistrationChallengeJpaEntity::toDomain);
    }

    @Override
    public RegistrationChallenge save(RegistrationChallenge challenge) {
        return repository.save(RegistrationChallengeJpaEntity.fromDomain(challenge)).toDomain();
    }
}
