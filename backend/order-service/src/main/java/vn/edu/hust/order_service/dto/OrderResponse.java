package vn.edu.hust.order_service.dto;

import lombok.Builder;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;

import java.time.LocalDateTime;

@Builder
public record OrderResponse(
        String id,
        String customerId,
        OrderStatus status,
        Double totalPrice,
        Double finalAmountToCollect,
        String receiverAddress,
        String imageUrl,
        PaymentMethod paymentMethod,
        String paymentProvider,
        String proofImageUrl,
        String failReason,
        LocalDateTime createdAt,
        String paymentUrl
) {
}
