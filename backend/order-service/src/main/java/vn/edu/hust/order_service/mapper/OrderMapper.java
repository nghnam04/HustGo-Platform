package vn.edu.hust.order_service.mapper;

import vn.edu.hust.order_service.dto.OrderRequest;
import vn.edu.hust.order_service.dto.OrderResponse;
import vn.edu.hust.order_service.dto.OrderStatusHistoryResponse;
import vn.edu.hust.order_service.dto.PricingResult;
import vn.edu.hust.order_service.entity.Order;
import vn.edu.hust.order_service.entity.OrderStatusHistory;

public class OrderMapper {

    public static Order mapToOrder(OrderRequest request, String uploadedImageUrl, PricingResult pricing) {
        if (request == null) return null;

        return Order.builder()
                // Thông tin người nhận
                .receiverName(request.receiverName())
                .receiverPhone(request.receiverPhone())
                .receiverAddress(request.receiverAddress())
                .receiverProvince(request.receiverProvince())
                .receiverDistrict(request.receiverDistrict())
                .receiverWard(request.receiverWard())
                .receiverLat(request.receiverLat())
                .receiverLng(request.receiverLng())

                // Thông tin người gửi
                .senderName(request.senderName())
                .senderPhone(request.senderPhone())
                .senderAddress(request.senderAddress())
                .senderProvince(request.senderProvince())
                .senderDistrict(request.senderDistrict())
                .senderWard(request.senderWard())
                .senderLat(request.senderLat())
                .senderLng(request.senderLng())

                // Chi tiết hàng hóa
                .productName(request.productName())
                .weight(request.weight())
                .length(request.length())
                .width(request.width())
                .height(request.height())
                .codAmount(request.codAmount())
                .orderValue(request.orderValue())

                // Dịch vụ và hình ảnh
                .serviceCode(request.serviceCode())
                .paymentMethod(request.paymentMethod())
                // BỔ SUNG: Map paymentProvider
                .paymentProvider(request.paymentProvider())
                .imageUrl(uploadedImageUrl)
                .note(request.note())

                // Dữ liệu tài chính từ PricingService
                .weightConverted(pricing.weight())
                .shippingFee(pricing.shippingFee())
                .codFee(pricing.codFee())
                .insuranceFee(pricing.insuranceFee())
                .totalPrice(pricing.totalPrice())
                .finalAmountToCollect(pricing.finalCollect())
                .build();
    }


    public static OrderResponse mapToResponse(Order order, String paymentUrl) {
        if (order == null) return null;

        return OrderResponse.builder()
                .id(order.getId())
                .customerId(order.getCustomerId())
                .status(order.getStatus())
                .totalPrice(order.getTotalPrice())
                .finalAmountToCollect(order.getFinalAmountToCollect())
                .receiverAddress(order.getReceiverAddress())
                .imageUrl(order.getImageUrl())
                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())
                .proofImageUrl(order.getProofImageUrl())
                .failReason(order.getFailReason())
                .createdAt(order.getCreatedAt())
                .paymentUrl(paymentUrl)
                .build();
    }

    public static OrderResponse mapToResponse(Order order) {
        return mapToResponse(order, null);
    }

    public static OrderStatusHistoryResponse mapToHistoryResponse(OrderStatusHistory history) {
        if (history == null) return null;

        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getOldStatus(),
                history.getNewStatus(),
                history.getChangedBy(),
                history.getNote(),
                history.getCreatedAt()
        );
    }
}