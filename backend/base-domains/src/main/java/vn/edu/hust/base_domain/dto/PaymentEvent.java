package vn.edu.hust.base_domain.dto;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PaymentEvent(
        String orderId,
        String customerId,
        String status,
        BigDecimal amount,
        String paymentMethod
) {
}
