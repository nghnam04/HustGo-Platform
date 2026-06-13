package vn.edu.hust.base_domain.dto;

import vn.edu.hust.base_domain.constant.FeedbackType;

public record FeedbackEvent(
        String action,           // NEW_FEEDBACK, UPDATED, DELETED
        String feedbackId,
        String orderId,
        String customerId,
        String shipperId,
        String hubAdminId,
        FeedbackType feedbackType,  // ORDER, SHIPPER, SERVICE
        Integer rating,          // 1-5
        String message,
        String deletedBy
) {
}