package com.studyflow.user.dto;

import com.studyflow.common.security.UserRole;
import com.studyflow.user.domain.User;

public class UserSummaryDto {

    private String id;
    private String email;
    private String displayName;
    private String username;
    private UserRole role;
    private String timeZone;
    private String status;

    public UserSummaryDto() {
    }

    public UserSummaryDto(String id, String email, String displayName, String username,
                          UserRole role, String timeZone, String status) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.username = username;
        this.role = role;
        this.timeZone = timeZone;
        this.status = status;
    }

    public static UserSummaryDto fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getUsername(),
                user.getRole(),
                user.getTimeZone(),
                user.getStatus()
        );
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
