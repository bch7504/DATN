package com.studyflow.user.api;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 2, max = 100, message = "Tên hiển thị phải có từ 2 đến 100 ký tự")
        @Pattern(regexp = ".*\\S.*", message = "Tên hiển thị không được chỉ chứa khoảng trắng")
        String displayName,

        @Size(min = 1, max = 64, message = "Múi giờ phải có từ 1 đến 64 ký tự")
        @Pattern(regexp = ".*\\S.*", message = "Múi giờ không được chỉ chứa khoảng trắng")
        String timeZone
) {
}
