package com.studyflow.auth.application.port;

import com.studyflow.auth.domain.RegistrationChallenge;
import java.util.Optional;

public interface RegistrationChallengeStore {
    Optional<RegistrationChallenge> findByEmailForUpdate(String email);

    RegistrationChallenge save(RegistrationChallenge challenge);
}
