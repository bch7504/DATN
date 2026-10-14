package com.studyflow.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyRegistrationRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự")
        String email,

        @NotBlank(message = "Mã xác minh không được để trống")
        @Pattern(regexp = "^\\d{6}$", message = "Mã xác minh phải gồm đúng 6 chữ số")
        String verificationCode
) {
    @Override
    public String toString() {
        return "VerifyRegistrationRequest[email=" + email + ", verificationCode=<redacted>]";
    }
}
