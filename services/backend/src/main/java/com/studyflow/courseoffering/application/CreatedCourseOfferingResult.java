package com.studyflow.courseoffering.application;

import com.studyflow.courseoffering.domain.CourseOffering;

/**
 * Result DTO containing the persisted CourseOffering and raw Join Code.
 */
public class CreatedCourseOfferingResult {

    private final CourseOffering offering;
    private final String rawJoinCode;

    public CreatedCourseOfferingResult(CourseOffering offering, String rawJoinCode) {
        this.offering = offering;
        this.rawJoinCode = rawJoinCode;
    }

    public CourseOffering getOffering() {
        return offering;
    }

    public String getRawJoinCode() {
        return rawJoinCode;
    }
}
