package com.studyflow.auth.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataRegistrationChallengeRepository
        extends JpaRepository<RegistrationChallengeJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select challenge from RegistrationChallengeJpaEntity challenge where lower(challenge.email) = lower(:email)")
    Optional<RegistrationChallengeJpaEntity> findByEmailForUpdate(@Param("email") String email);
}
