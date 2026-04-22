package vn.edu.hust.base_domain.dto;

import vn.edu.hust.base_domain.constant.OrderStatus;

import java.time.LocalDateTime;

public record OrderStatusChangedEvent(
        String orderId,
        String customerId,
        String shipperId,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        String currentHubId,
        Double receiverLat,
        Double receiverLng,
        LocalDateTime timestamp
) {}
