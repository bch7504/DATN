package com.studyflow.material.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Public Student question; document identity and page come only from the URL. */
public record CourseMaterialTutorRequest(
        @NotBlank(message = "Câu hỏi không được để trống")
        @Size(max = 2000, message = "Câu hỏi không được vượt quá 2000 ký tự")
        String question
) { }
