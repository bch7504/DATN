package com.studyflow.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Email hoặc tên đăng nhập không được để trống")
        @Size(max = 254, message = "Thông tin đăng nhập không được vượt quá 254 ký tự")
        String identifier,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(max = 72, message = "Mật khẩu không được vượt quá 72 ký tự")
        String password
) {
    @Override
    public String toString() {
        return "LoginRequest[identifier=<redacted>, password=<redacted>]";
    }
}
