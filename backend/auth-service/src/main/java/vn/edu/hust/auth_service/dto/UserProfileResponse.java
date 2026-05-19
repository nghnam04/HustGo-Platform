package vn.edu.hust.auth_service.dto;

import java.time.LocalDateTime;
import java.util.Set;

public record UserProfileResponse(
        String id,
        String username,
        String fullName,
        String email,
        String avatarUrl,
        Set<String> roles,
        LocalDateTime createdAt
) {
}