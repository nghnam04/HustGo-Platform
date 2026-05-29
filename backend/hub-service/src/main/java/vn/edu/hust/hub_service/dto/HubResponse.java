package vn.edu.hust.hub_service.dto;

import vn.edu.hust.base_domain.constant.HanoiDistrict;

import java.time.LocalDateTime;

public record HubResponse(

        String id,
        String code,
        String name,

        String address,
        String ward,
        HanoiDistrict district,
        String province,

        Double lat,
        Double lng,

        String managerId,

        boolean active,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}