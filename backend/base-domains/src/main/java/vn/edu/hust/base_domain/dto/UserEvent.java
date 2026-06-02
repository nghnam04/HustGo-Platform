package vn.edu.hust.base_domain.dto;

import java.time.LocalDateTime;

public record UserEvent(
        String userId,
        String username,
        String action,
        String actorId,
        String message,
        LocalDateTime occurredAt
) {
}