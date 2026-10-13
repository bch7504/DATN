package com.studyflow.auth.application.port;

import com.studyflow.user.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountStore {
    boolean existsByEmail(String email);

    Optional<UserAccount> findByIdentifier(String identifier);

    Optional<UserAccount> findById(UUID id);

    Optional<UserAccount> findByIdForUpdate(UUID id);

    UserAccount save(UserAccount account);
}
