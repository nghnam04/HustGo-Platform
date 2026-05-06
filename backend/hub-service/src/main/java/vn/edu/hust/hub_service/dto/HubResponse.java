package vn.edu.hust.hub_service.dto;

import vn.edu.hust.base_domain.constant.HanoiDistrict;

public record HubResponse(
        String id,
        String code,
        String name,
        String address,
        HanoiDistrict district,
        Double lat,
        Double lng,
        boolean active,
        String managerId
) {
}
