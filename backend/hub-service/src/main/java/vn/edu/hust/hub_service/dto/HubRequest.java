package vn.edu.hust.hub_service.dto;

import vn.edu.hust.base_domain.constant.HanoiDistrict;

public record HubRequest(
        String code,
        String name,
        String address,
        HanoiDistrict district,
        Double lat,
        Double lng,
        String managerId
) {
}
