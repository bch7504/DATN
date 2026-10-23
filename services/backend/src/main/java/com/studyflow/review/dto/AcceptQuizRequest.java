package com.studyflow.review.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record AcceptQuizRequest(
        @NotBlank(message = "Destination type is required")
        String destinationType,
        UUID courseOfferingId
) {}
