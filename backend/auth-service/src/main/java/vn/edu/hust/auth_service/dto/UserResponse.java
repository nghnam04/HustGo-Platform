package vn.edu.hust.auth_service.dto;

import java.time.LocalDateTime;
import java.util.Set;

public record UserResponse(
        String id,
        String username,
        String email,
        String fullName,
        String avatarUrl,
        Set<String> roles,
        LocalDateTime createdAt
) {
}
