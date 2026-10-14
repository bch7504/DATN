package com.studyflow.courseoffering.application;

import com.studyflow.courseoffering.domain.CourseOffering;

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

    public CourseOffering offering() {
        return offering;
    }

    public String rawJoinCode() {
        return rawJoinCode;
    }
}
