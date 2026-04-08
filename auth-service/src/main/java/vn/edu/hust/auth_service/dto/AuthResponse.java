package vn.edu.hust.auth_service.dto;

import java.util.Set;

public record AuthResponse(
        String token,
        String userId,
        String email,
        String fullName,
        Set<String> roles
) {}
