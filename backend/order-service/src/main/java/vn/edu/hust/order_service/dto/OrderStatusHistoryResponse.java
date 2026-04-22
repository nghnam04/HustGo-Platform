package vn.edu.hust.order_service.dto;

import vn.edu.hust.base_domain.constant.OrderStatus;

import java.time.LocalDateTime;

public record OrderStatusHistoryResponse(
        String id,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        String changedBy,
        String note,
        LocalDateTime createdAt
) {}
