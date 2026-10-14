package com.studyflow.user.presentation;

import com.studyflow.common.security.SecurityUtils;
import com.studyflow.user.application.UserService;
import com.studyflow.user.dto.UpdateProfileRequest;
import com.studyflow.user.dto.UserSummaryDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final UserService userService;

    public MeController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<UserSummaryDto> getCurrentUser() {
        String userId = SecurityUtils.getCurrentUserId();
        UserSummaryDto profile = userService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(profile);
    }

    @PatchMapping
    public ResponseEntity<UserSummaryDto> updateCurrentUser(@Valid @RequestBody UpdateProfileRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        UserSummaryDto updated = userService.updateProfile(userId, request);
        return ResponseEntity.ok(updated);
    }
}
