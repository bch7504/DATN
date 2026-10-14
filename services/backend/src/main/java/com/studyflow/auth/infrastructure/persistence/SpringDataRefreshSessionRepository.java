package com.studyflow.auth.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataRefreshSessionRepository extends JpaRepository<RefreshSessionJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select refresh from RefreshSessionJpaEntity refresh where refresh.tokenHash = :tokenHash")
    Optional<RefreshSessionJpaEntity> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);
}
