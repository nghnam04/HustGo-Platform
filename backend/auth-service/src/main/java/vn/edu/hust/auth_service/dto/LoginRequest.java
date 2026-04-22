package vn.edu.hust.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Tên đăng nhập hoặc email không được để trống")
        String emailOrUsername,

        @NotBlank(message = "Mật khẩu không được để trống")
        String password
) {
}