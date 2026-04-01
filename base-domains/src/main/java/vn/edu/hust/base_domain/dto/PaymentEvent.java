package vn.edu.hust.base_domain.dto;

public record PaymentEvent(
        String orderId,
        String status,
        Double amount,
        String paymentMethod
) {}
