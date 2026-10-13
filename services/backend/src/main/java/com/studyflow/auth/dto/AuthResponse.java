package com.studyflow.auth.dto;

import com.studyflow.user.dto.UserSummaryDto;

public class AuthResponse {

    private String accessToken;
    private UserSummaryDto user;

    public AuthResponse() {
    }

    public AuthResponse(String accessToken, UserSummaryDto user) {
        this.accessToken = accessToken;
        this.user = user;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public UserSummaryDto getUser() {
        return user;
    }

    public void setUser(UserSummaryDto user) {
        this.user = user;
    }
}
