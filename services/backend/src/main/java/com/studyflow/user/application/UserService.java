package com.studyflow.user.application;

import com.studyflow.common.exception.ResourceNotFoundException;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import com.studyflow.user.dto.UpdateProfileRequest;
import com.studyflow.user.dto.UserSummaryDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getCurrentUserProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng."));
        return UserSummaryDto.fromEntity(user);
    }

    @Transactional
    public UserSummaryDto updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng."));

        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            user.setFullName(request.getDisplayName().trim());
        }
        if (request.getTimeZone() != null && !request.getTimeZone().isBlank()) {
            user.setTimeZone(request.getTimeZone().trim());
        }
        user.setUpdatedAt(Instant.now());

        User saved = userRepository.save(user);
        return UserSummaryDto.fromEntity(saved);
    }
}
