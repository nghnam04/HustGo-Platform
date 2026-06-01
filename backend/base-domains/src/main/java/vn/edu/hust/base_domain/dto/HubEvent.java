package vn.edu.hust.base_domain.dto;

import java.time.LocalDateTime;

public record HubEvent(
        String hubId,
        String hubCode,
        String hubName,
        String action,
        String managerId,
        String actorId,
        LocalDateTime occurredAt
) {
}