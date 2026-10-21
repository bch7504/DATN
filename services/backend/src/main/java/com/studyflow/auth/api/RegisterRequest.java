package com.studyflow.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Tên hiển thị không được để trống")
        @Size(min = 2, max = 100, message = "Tên hiển thị phải có từ 2 đến 100 ký tự")
        String displayName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 12, message = "Mật khẩu phải có từ 6 đến 12 ký tự")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "Mật khẩu phải có chữ thường, chữ hoa và chữ số"
        )
        String password
) {
    @Override
    public String toString() {
        return "RegisterRequest[displayName=" + displayName + ", email=" + email + ", password=<redacted>]";
    }
}
