package vn.edu.hust.base_domain.constant;

public enum OrderStatus {
    PENDING,
    CREATED,
    COLLECTED,
    IN_TRANSIT,
    AT_HUB,
    PICKING,
    DELIVERING,
    COMPLETED,
    CANCELLED,
    RETURN_REQUESTED, // Shipper báo trả hàng, chờ Hub xác nhận nhận lại
    RETURNING         // Hub xác nhận đã nhận lại hàng từ Shipper
}
