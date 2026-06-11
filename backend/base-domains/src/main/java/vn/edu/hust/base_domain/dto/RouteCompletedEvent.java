package vn.edu.hust.base_domain.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RouteCompletedEvent(
    String routeId,
    String hubId,
    String hubAdminId,
    String shipperId,
    int totalOrders,
    int completedOrders,
    int returnedOrders,
    LocalDateTime completedAt
) {}
