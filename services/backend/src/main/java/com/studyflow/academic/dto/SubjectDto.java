package com.studyflow.academic.dto;

import com.studyflow.academic.domain.Subject;

public class SubjectDto {

    private String id;
    private String code;
    private String name;
    private int credits;
    private String description;
    private String status;

    public SubjectDto() {
    }

    public SubjectDto(String id, String code, String name, int credits, String description, String status) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.credits = credits;
        this.description = description;
        this.status = status;
    }

    public static SubjectDto fromEntity(Subject s) {
        if (s == null) {
            return null;
        }
        return new SubjectDto(
                s.getId(),
                s.getCode(),
                s.getName(),
                s.getCredits(),
                s.getDescription(),
                s.getStatus()
        );
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getCredits() {
        return credits;
    }

    public void setCredits(int credits) {
        this.credits = credits;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
