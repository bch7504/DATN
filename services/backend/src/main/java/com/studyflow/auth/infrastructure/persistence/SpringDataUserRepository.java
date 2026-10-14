package com.studyflow.auth.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataUserRepository extends JpaRepository<UserJpaEntity, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select account from UserJpaEntity account
            where lower(account.email) = lower(:identifier)
               or lower(account.username) = lower(:identifier)
            """)
    Optional<UserJpaEntity> findByIdentifier(@Param("identifier") String identifier);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from UserJpaEntity account where account.id = :id")
    Optional<UserJpaEntity> findByIdForUpdate(@Param("id") UUID id);
}
