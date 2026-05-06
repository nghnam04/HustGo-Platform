package vn.edu.hust.auth_service.dto;

import java.util.Set;

public record UserResponse(
        String id,
        String username,
        String email,
        String fullName,
        String avatarUrl,
        Set<String> roles,
        java.time.LocalDateTime createdAt
) {
}
