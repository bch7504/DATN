package com.studyflow.review.dto;

import com.studyflow.review.application.QuizSummaryDTO;
import com.studyflow.review.application.WrongAnswerReviewItemDTO;
import java.util.List;
import java.util.UUID;

public record CourseOfferingReviewOverviewResponse(
        UUID courseOfferingId,
        List<QuizSummaryDTO> quizzes,
        List<WrongAnswerReviewItemDTO> reviewItems
) {}
