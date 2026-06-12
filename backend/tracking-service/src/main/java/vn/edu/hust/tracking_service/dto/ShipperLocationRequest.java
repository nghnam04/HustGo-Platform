package vn.edu.hust.tracking_service.dto;

public record ShipperLocationRequest(
        String orderId,
        double lat,
        double lng
) {
}
