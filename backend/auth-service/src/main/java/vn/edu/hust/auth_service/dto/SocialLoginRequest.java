package vn.edu.hust.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.edu.hust.auth_service.constant.AuthProvider;

public record SocialLoginRequest(
        @NotNull
        AuthProvider provider,

        @NotBlank
        String token
) {}
