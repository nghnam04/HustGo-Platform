package vn.edu.hust.order_service.dto;

import lombok.Builder;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.constant.ServiceCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record OrderResponse(

        String id,
        String customerId,
        OrderStatus status,

        // Receiver
        String receiverName,
        String receiverPhone,
        String receiverAddress,
        String receiverProvince,
        String receiverDistrict,
        String receiverWard,
        Double receiverLat,
        Double receiverLng,

        // Sender
        String senderName,
        String senderPhone,
        String senderAddress,
        String senderProvince,
        String senderDistrict,
        String senderWard,
        Double senderLat,
        Double senderLng,

        // Product
        String productName,
        Double weight,
        Integer length,
        Integer width,
        Integer height,

        // Fee
        BigDecimal orderValue,
        BigDecimal codAmount,
        BigDecimal shippingFee,
        BigDecimal totalPrice,
        BigDecimal finalAmountToCollect,

        ServiceCode serviceCode,

        // Payment
        PaymentMethod paymentMethod,
        String paymentProvider,
        String paymentUrl,


        String note,

        // Image
        String imageUrl,
        String proofImageUrl,

        // Delivery
        String routeId,
        String shipperId,
        String currentHubId,
        String currentHubName,
        String currentHubAddress,
        String currentHubWard,
        String currentHubDistrict,
        Double currentHubLat,
        Double currentHubLng,
        String originHubId,
        String originHubName,
        String targetHubId,
        String manifestId,
        String failReason,
        Integer failCount,

        String routeGeometry,

        Integer routeTotalOrders,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}