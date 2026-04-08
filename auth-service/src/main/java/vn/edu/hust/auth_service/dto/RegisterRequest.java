package vn.edu.hust.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.edu.hust.auth_service.constant.RoleEnum;

public record RegisterRequest(
        @NotBlank
        String username,

        @NotBlank
        @Email
        String email,

        @NotBlank String password,
        @NotBlank String fullName,
        @NotNull RoleEnum role
) {}
