package vn.edu.hust.hub_service.dto;

import java.time.LocalDateTime;

public record HubResponse(

        String id,
        String code,
        String name,

        String address,
        String ward,
        String district,
        String province,

        Double lat,
        Double lng,

        String managerId,

        boolean active,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}