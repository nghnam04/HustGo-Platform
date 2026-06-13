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

                // Receiver
                .receiverName(request.receiverName())
                .receiverPhone(request.receiverPhone())
                .receiverAddress(request.receiverAddress())
                .receiverProvince(request.receiverProvince())
                .receiverDistrict(request.receiverDistrict())
                .receiverWard(request.receiverWard())
                .receiverLat(request.receiverLat())
                .receiverLng(request.receiverLng())

                // Sender
                .senderName(request.senderName())
                .senderPhone(request.senderPhone())
                .senderAddress(request.senderAddress())
                .senderProvince(request.senderProvince())
                .senderDistrict(request.senderDistrict())
                .senderWard(request.senderWard())
                .senderLat(request.senderLat())
                .senderLng(request.senderLng())

                // Product
                .productName(request.productName())
                .weight(request.weight())
                .length(request.length())
                .width(request.width())
                .height(request.height())

                // Money input
                .codAmount(request.codAmount())
                .orderValue(request.orderValue())

                // Service
                .serviceCode(request.serviceCode())
                .paymentMethod(request.paymentMethod())
                .paymentProvider(request.paymentProvider())
                .note(request.note())

                .imageUrl(uploadedImageUrl)

                // Fee
                .weightConverted(pricing.weight())
                .shippingFee(pricing.shippingFee())
                .codFee(pricing.codFee())
                .insuranceFee(pricing.insuranceFee())
                .surcharge(pricing.surcharge())
                .totalPrice(pricing.totalPrice())
                .finalAmountToCollect(pricing.finalCollect())

                .build();
    }

    public static OrderResponse mapToResponse(Order order, String paymentUrl, String currentHubName) {
        if (order == null) return null;

        return OrderResponse.builder()

                .id(order.getId())
                .customerId(order.getCustomerId())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())

                // Receiver
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .receiverProvince(order.getReceiverProvince())
                .receiverDistrict(
                        order.getReceiverDistrict() != null
                                ? order.getReceiverDistrict().getDisplayName()
                                : null
                )
                .receiverWard(order.getReceiverWard())
                .receiverLat(order.getReceiverLat())
                .receiverLng(order.getReceiverLng())

                // Sender
                .senderName(order.getSenderName())
                .senderPhone(order.getSenderPhone())
                .senderAddress(order.getSenderAddress())
                .senderProvince(order.getSenderProvince())
                .senderDistrict(
                        order.getSenderDistrict() != null
                                ? order.getSenderDistrict().getDisplayName()
                                : null
                )
                .senderWard(order.getSenderWard())
                .senderLat(order.getSenderLat())
                .senderLng(order.getSenderLng())

                // Product
                .productName(order.getProductName())
                .weight(order.getWeight())
                .length(order.getLength())
                .width(order.getWidth())
                .height(order.getHeight())

                // Fee
                .orderValue(order.getOrderValue())
                .codAmount(order.getCodAmount())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .finalAmountToCollect(order.getFinalAmountToCollect())

                .serviceCode(order.getServiceCode())

                // Payment
                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())
                .paymentUrl(paymentUrl)

                .note(order.getNote())

                // image
                .imageUrl(order.getImageUrl())
                .proofImageUrl(order.getProofImageUrl())

                // Delivery
                .routeId(order.getRouteId())
                .shipperId(order.getShipperId())
                .currentHubId(order.getCurrentHubId())
                .currentHubName(currentHubName)
                .currentHubLat(null)
                .currentHubLng(null)
                .originHubId(order.getOriginHubId())
                .targetHubId(order.getTargetHubId())
                .manifestId(order.getManifestId())
                .failReason(order.getFailReason())
                .failCount(order.getFailCount())

                .build();
    }

    public static OrderResponse mapToResponse(Order order, String paymentUrl, String currentHubName, String currentHubAddress, String currentHubWard, String currentHubDistrict, Double currentHubLat, Double currentHubLng) {
        if (order == null) return null;

        return OrderResponse.builder()

                .id(order.getId())
                .customerId(order.getCustomerId())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())

                // Receiver
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .receiverProvince(order.getReceiverProvince())
                .receiverDistrict(
                        order.getReceiverDistrict() != null
                                ? order.getReceiverDistrict().getDisplayName()
                                : null
                )
                .receiverWard(order.getReceiverWard())
                .receiverLat(order.getReceiverLat())
                .receiverLng(order.getReceiverLng())

                // Sender
                .senderName(order.getSenderName())
                .senderPhone(order.getSenderPhone())
                .senderAddress(order.getSenderAddress())
                .senderProvince(order.getSenderProvince())
                .senderDistrict(
                        order.getSenderDistrict() != null
                                ? order.getSenderDistrict().getDisplayName()
                                : null
                )
                .senderWard(order.getSenderWard())
                .senderLat(order.getSenderLat())
                .senderLng(order.getSenderLng())

                // Product
                .productName(order.getProductName())
                .weight(order.getWeight())
                .length(order.getLength())
                .width(order.getWidth())
                .height(order.getHeight())

                // Fee
                .orderValue(order.getOrderValue())
                .codAmount(order.getCodAmount())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .finalAmountToCollect(order.getFinalAmountToCollect())

                .serviceCode(order.getServiceCode())

                // Payment
                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())
                .paymentUrl(paymentUrl)

                .note(order.getNote())

                // Image
                .imageUrl(order.getImageUrl())
                .proofImageUrl(order.getProofImageUrl())

                // Delivery
                .routeId(order.getRouteId())
                .shipperId(order.getShipperId())
                .currentHubId(order.getCurrentHubId())
                .currentHubName(currentHubName)
                .currentHubAddress(currentHubAddress)
                .currentHubWard(currentHubWard)
                .currentHubDistrict(currentHubDistrict)
                .currentHubLat(currentHubLat)
                .currentHubLng(currentHubLng)
                .originHubId(order.getOriginHubId())
                .targetHubId(order.getTargetHubId())
                .manifestId(order.getManifestId())
                .failReason(order.getFailReason())
                .failCount(order.getFailCount())

                .build();
    }

    public static OrderResponse mapToResponse(Order order, String paymentUrl, String currentHubName, Double currentHubLat, Double currentHubLng) {
        return mapToResponse(order, paymentUrl, currentHubName, null, null, null, currentHubLat, currentHubLng);
    }

    public static OrderResponse mapToResponseEnriched(Order order, String paymentUrl, String currentHubName,
                                                      String currentHubAddress, String currentHubWard, String currentHubDistrict,
                                                      Double currentHubLat, Double currentHubLng, String routeGeometry, Integer routeTotalOrders) {
        if (order == null) return null;

        return OrderResponse.builder()

                .id(order.getId())
                .customerId(order.getCustomerId())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())

                // Receiver
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .receiverProvince(order.getReceiverProvince())
                .receiverDistrict(
                        order.getReceiverDistrict() != null
                                ? order.getReceiverDistrict().getDisplayName()
                                : null
                )
                .receiverWard(order.getReceiverWard())
                .receiverLat(order.getReceiverLat())
                .receiverLng(order.getReceiverLng())

                // Sender
                .senderName(order.getSenderName())
                .senderPhone(order.getSenderPhone())
                .senderAddress(order.getSenderAddress())
                .senderProvince(order.getSenderProvince())
                .senderDistrict(
                        order.getSenderDistrict() != null
                                ? order.getSenderDistrict().getDisplayName()
                                : null
                )
                .senderWard(order.getSenderWard())
                .senderLat(order.getSenderLat())
                .senderLng(order.getSenderLng())

                // Product
                .productName(order.getProductName())
                .weight(order.getWeight())
                .length(order.getLength())
                .width(order.getWidth())
                .height(order.getHeight())

                // Fee
                .orderValue(order.getOrderValue())
                .codAmount(order.getCodAmount())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .finalAmountToCollect(order.getFinalAmountToCollect())

                .serviceCode(order.getServiceCode())

                // Payment
                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())
                .paymentUrl(paymentUrl)

                .note(order.getNote())

                // Image
                .imageUrl(order.getImageUrl())
                .proofImageUrl(order.getProofImageUrl())

                // Delivery
                .routeId(order.getRouteId())
                .shipperId(order.getShipperId())
                .currentHubId(order.getCurrentHubId())
                .currentHubName(currentHubName)
                .currentHubAddress(currentHubAddress)
                .currentHubWard(currentHubWard)
                .currentHubDistrict(currentHubDistrict)
                .currentHubLat(currentHubLat)
                .currentHubLng(currentHubLng)
                .originHubId(order.getOriginHubId())
                .targetHubId(order.getTargetHubId())
                .manifestId(order.getManifestId())
                .failReason(order.getFailReason())
                .failCount(order.getFailCount())

                .routeGeometry(routeGeometry)

                .routeTotalOrders(routeTotalOrders)

                .build();
    }

    public static OrderResponse mapToResponse(Order order, String paymentUrl) {
        return mapToResponse(order, paymentUrl, null);
    }

    public static OrderResponse mapToResponse(Order order) {
        return mapToResponse(order, null, null);
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
    
    public static OrderResponse mapToResponseEnrichedForTransit(Order order, String originHubName) {
        if (order == null) return null;

        return OrderResponse.builder()
                .id(order.getId())
                .customerId(order.getCustomerId())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())

                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .receiverProvince(order.getReceiverProvince())
                .receiverDistrict(
                        order.getReceiverDistrict() != null
                                ? order.getReceiverDistrict().getDisplayName()
                                : null
                )
                .receiverWard(order.getReceiverWard())
                .receiverLat(order.getReceiverLat())
                .receiverLng(order.getReceiverLng())

                .senderName(order.getSenderName())
                .senderPhone(order.getSenderPhone())
                .senderAddress(order.getSenderAddress())
                .senderProvince(order.getSenderProvince())
                .senderDistrict(
                        order.getSenderDistrict() != null
                                ? order.getSenderDistrict().getDisplayName()
                                : null
                )
                .senderWard(order.getSenderWard())
                .senderLat(order.getSenderLat())
                .senderLng(order.getSenderLng())

                .productName(order.getProductName())
                .weight(order.getWeight())
                .length(order.getLength())
                .width(order.getWidth())
                .height(order.getHeight())

                .orderValue(order.getOrderValue())
                .codAmount(order.getCodAmount())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .finalAmountToCollect(order.getFinalAmountToCollect())

                .serviceCode(order.getServiceCode())

                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())

                .note(order.getNote())

                .imageUrl(order.getImageUrl())
                .proofImageUrl(order.getProofImageUrl())

                .routeId(order.getRouteId())
                .shipperId(order.getShipperId())
                .currentHubId(order.getCurrentHubId())
                .currentHubName(null)
                .originHubId(order.getOriginHubId())
                .originHubName(originHubName)
                .targetHubId(order.getTargetHubId())
                .manifestId(order.getManifestId())
                .failReason(order.getFailReason())
                .failCount(order.getFailCount())

                .build();
    }
}