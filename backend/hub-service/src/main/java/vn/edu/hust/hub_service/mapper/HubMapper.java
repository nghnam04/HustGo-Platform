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
                .ward(request.ward())
                .district(request.district())
                .province(request.province())
                .lat(request.lat())
                .lng(request.lng())
                .active(request.active())
                .build();
    }

    public static HubResponse toResponse(Hub hub) {
        return new HubResponse(
                hub.getId(),
                hub.getCode(),
                hub.getName(),
                hub.getAddress(),
                hub.getWard(),
                hub.getDistrict(),
                hub.getProvince(),
                hub.getLat(),
                hub.getLng(),
                hub.getManagerId(),
                hub.isActive(),
                hub.getCreatedAt(),
                hub.getUpdatedAt()
        );
    }
}