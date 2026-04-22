package vn.edu.hust.base_domain.dto;

import lombok.Builder;

@Builder
public record PaymentEvent(
        String orderId,
        String status,
        Double amount,
        String paymentMethod
) {}
