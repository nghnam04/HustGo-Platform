package vn.edu.hust.order_service.dto;

import vn.edu.hust.base_domain.constant.FeedbackType;

import java.time.LocalDateTime;

public record FeedbackResponse(
    String id,
    String orderId,
    String customerId,
    String shipperId,
    String routeId,
    String hubAdminId,
    FeedbackType type,
    String content,
    Integer rating,
    LocalDateTime createdAt
) {}