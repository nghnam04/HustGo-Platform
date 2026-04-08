package vn.edu.hust.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank
        String emailOrUsername,

        @NotBlank
        String password
) {}
