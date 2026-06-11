package vn.edu.hust.base_domain.constant;

public enum RouteStatus {
    PENDING, // Vừa gán tuyến
    ACCEPTED, // Shipper nhận tuyến
    IN_PROGRESS, // Shipper giao tuyến
    COMPLETED // Shipper hoàn thành giao tuyến
}
