package vn.edu.hust.order_service.dto;

import vn.edu.hust.base_domain.constant.PaymentMethod;

import java.math.BigDecimal;

public record RouteOrderPaymentDetail(
        String orderId,
        String receiverName,
        BigDecimal amountToCollect,
        PaymentMethod paymentMethod
) {
}