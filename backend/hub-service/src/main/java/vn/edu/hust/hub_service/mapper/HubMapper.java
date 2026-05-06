package vn.edu.hust.hub_service.mapper;

import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
import vn.edu.hust.hub_service.entity.Hub;

public class HubMapper {
    public static Hub toEntity(HubRequest request) {
        return Hub.builder()
                .code(request.code())
                .name(request.name())
                .address(request.address())
                .district(request.district())
                .lat(request.lat())
                .lng(request.lng())
                .managerId(request.managerId())
                .active(true)
                .build();
    }

    public static HubResponse toResponse(Hub hub) {
        return new HubResponse(
                hub.getId(),
                hub.getCode(),
                hub.getName(),
                hub.getAddress(),
                hub.getDistrict(),
                hub.getLat(),
                hub.getLng(),
                hub.isActive(),
                hub.getManagerId()
        );
    }
}
