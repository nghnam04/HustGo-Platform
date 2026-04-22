package vn.edu.hust.order_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import vn.edu.hust.base_domain.constant.DeliveryResult;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.order_service.dto.*;
import vn.edu.hust.order_service.entity.Order;
import vn.edu.hust.order_service.entity.OrderStatusHistory;
import vn.edu.hust.order_service.exception.OrderNotFoundException;
import vn.edu.hust.order_service.exception.OrderStatusException;
import vn.edu.hust.order_service.kafka.OrderProducer;
import vn.edu.hust.order_service.mapper.OrderMapper;
import vn.edu.hust.order_service.repository.OrderRepository;
import vn.edu.hust.order_service.repository.OrderStatusHistoryRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final CloudinaryService cloudinaryService;
    private final OrderProducer kafkaProducer;
    private final PricingService pricingService;
    private final WebClient.Builder webClientBuilder;

    // CUSTOMER

    // Tạo đơn hàng
    @Transactional
    public OrderResponse createOrder(OrderRequest request, String customerId) {
        if (request.codAmount() != null && request.orderValue() != null
                && request.codAmount() > request.orderValue()) {
            throw new OrderStatusException("Số tiền COD không được lớn hơn giá trị hàng hóa");
        }

        String imageUrl = null;
        if (request.imageFile() != null && !request.imageFile().isEmpty()) {
            try {
                imageUrl = cloudinaryService.uploadImage(request.imageFile());
            } catch (Exception e) {
                log.warn("Lỗi upload ảnh lên Cloudinary: {}", e.getMessage());
            }
        }

        // Tính toán cước phí
        PricingResult pricing = pricingService.calculate(request);

        Order order = OrderMapper.mapToOrder(request, imageUrl, pricing);

        order.setCustomerId(customerId);
        order.setStatus(OrderStatus.PENDING);

        Order saved = orderRepository.save(order);
        recordHistory(saved.getId(), null, OrderStatus.PENDING, customerId, "Khách hàng tạo đơn");

        String paymentUrl = null;
        if (request.paymentMethod() == PaymentMethod.ONLINE_PAYMENT) {
            paymentUrl = callPaymentService(saved.getId(), saved.getTotalPrice());
        }

        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, null, OrderStatus.PENDING));

        return OrderMapper.mapToResponse(saved, paymentUrl);
    }

    // Xem danh sách đơn hàng của chính mình
    public Page<OrderResponse> getOrdersByCustomer(String customerId, Pageable pageable) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable)
                .map(OrderMapper::mapToResponse);
    }

    // Chỉnh sửa đơn hàng
    @Transactional
    public OrderResponse updateOrder(String orderId, OrderRequest request, String customerId) {
        Order order = findOrderOrThrow(orderId);

        if (!order.getCustomerId().equals(customerId)) {
            throw new OrderStatusException("Bạn không có quyền chỉnh sửa đơn hàng này");
        }

        if (request.codAmount() != null && request.orderValue() != null
                && request.codAmount() > request.orderValue()) {
            throw new OrderStatusException("Số tiền COD không được lớn hơn giá trị hàng hóa");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderStatusException("Chỉ có thể chỉnh sửa đơn hàng khi chưa thanh toán (PENDING)");
        }

        if (request.imageFile() != null && !request.imageFile().isEmpty()) {
            try {
                String newImageUrl = cloudinaryService.uploadImage(request.imageFile());
                order.setImageUrl(newImageUrl);
            } catch (Exception e) {
                log.warn("Lỗi cập nhật ảnh lên Cloudinary: {}", e.getMessage());
            }
        }

        order.setReceiverName(request.receiverName());
        order.setReceiverPhone(request.receiverPhone());
        order.setReceiverAddress(request.receiverAddress());
        order.setReceiverLat(request.receiverLat());
        order.setReceiverLng(request.receiverLng());

        order.setWeight(request.weight());
        order.setNote(request.note());
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentProvider(request.paymentProvider());

        // Tính toán cập nhật lại cước phí
        PricingResult pricing = pricingService.calculate(request);
        order.setWeightConverted(pricing.weight());
        order.setShippingFee(pricing.shippingFee());
        order.setCodFee(pricing.codFee());
        order.setInsuranceFee(pricing.insuranceFee());
        order.setSurcharge(pricing.surcharge());
        order.setTotalPrice(pricing.totalPrice());
        order.setFinalAmountToCollect(pricing.finalCollect());

        Order saved = orderRepository.save(order);

        String paymentUrl = null;
        if (request.paymentMethod() == PaymentMethod.ONLINE_PAYMENT) {
            paymentUrl = callPaymentService(saved.getId(), saved.getTotalPrice());
        }

        recordHistory(orderId, OrderStatus.PENDING, OrderStatus.PENDING, customerId, "Khách hàng cập nhật thông tin đơn hàng");
        return OrderMapper.mapToResponse(saved, paymentUrl);
    }

    // Huỷ đơn hàng
    @Transactional
    public OrderResponse cancelOrder(String orderId, String customerId) {
        Order order = findOrderOrThrow(orderId);

        if (!order.getCustomerId().equals(customerId)) {
            throw new OrderStatusException("Bạn không có quyền hủy đơn hàng này");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderStatusException("Chỉ có thể hủy đơn khi ở trạng thái PENDING");
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        Order saved = orderRepository.save(order);

        recordHistory(orderId, oldStatus, OrderStatus.CANCELLED, customerId, "Khách hàng tự hủy");
        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.CANCELLED));

        return OrderMapper.mapToResponse(saved);
    }

    // ================= HUB ADMIN =================

    @Transactional
    public OrderResponse arriveAtHub(String orderId, ArriveAtHubRequest request, String adminId) {
        Order order = findOrderOrThrow(orderId);

        // LOGIC MỚI: Xác nhận khách gửi hàng (Drop-off) hoặc nhận từ trung chuyển
        if (order.getStatus() == OrderStatus.CREATED || order.getStatus() == OrderStatus.PENDING) {
            // Kiểm tra điều kiện COLLECTED như yêu cầu:
            // 1. ONLINE_PAYMENT thì phải CREATED (đã thanh toán)
            // 2. COD thì có thể PENDING
            boolean canCollect = (order.getPaymentMethod() == PaymentMethod.ONLINE_PAYMENT && order.getStatus() == OrderStatus.CREATED)
                    || (order.getPaymentMethod() == PaymentMethod.COD && order.getStatus() == OrderStatus.PENDING);

            if (!canCollect) {
                throw new OrderStatusException("Đơn hàng thanh toán ONLINE chưa hoàn tất hoặc không hợp lệ để nhận tại kho");
            }

            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.COLLECTED);
            order.setCurrentHubId(request.hubId());
            Order saved = orderRepository.save(order);
            recordHistory(orderId, oldStatus, OrderStatus.COLLECTED, adminId, "Nhân viên kho nhận hàng từ khách");
            kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.COLLECTED));
            return OrderMapper.mapToResponse(saved);

        } else if (order.getStatus() == OrderStatus.IN_TRANSIT) {
            // Nhập kho đích từ trung chuyển
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.AT_HUB);
            order.setCurrentHubId(request.hubId());
            order.setDestinationWard(request.destinationWard());
            Order saved = orderRepository.save(order);
            recordHistory(orderId, oldStatus, OrderStatus.AT_HUB, adminId, "Nhập kho đích: " + request.hubId());
            kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.AT_HUB));
            return OrderMapper.mapToResponse(saved);
        } else {
            throw new OrderStatusException("Trạng thái đơn hàng không hợp lệ để nhập kho");
        }
    }

    // ================= SUPER ADMIN =================

    @Transactional
    public TransferManifestResponse createTransferManifest(TransferManifestRequest request, String adminId) {
        List<Order> orders = orderRepository.findCollectedOrdersForTransfer(request.orderIds(), request.fromHubId());

        if (orders.isEmpty()) throw new OrderStatusException("Không tìm thấy đơn hàng hợp lệ để luân chuyển");

        String manifestId = "MNF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        for (Order order : orders) {
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.IN_TRANSIT);
            order.setTargetHubId(request.toHubId());
            order.setCurrentHubId(null);

            recordHistory(order.getId(), oldStatus, OrderStatus.IN_TRANSIT, adminId, "Xuất kho trung chuyển: " + manifestId);
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, oldStatus, OrderStatus.IN_TRANSIT));
        }
        orderRepository.saveAll(orders);

        List<String> processedIds = orders.stream().map(Order::getId).collect(Collectors.toList());

        return new TransferManifestResponse(manifestId, request.fromHubId(), request.toHubId(), processedIds.size(), processedIds, LocalDateTime.now());
    }

    // ================= SHIPPER =================

    @Transactional
    public void shipperPickupRoute(String routeId, String shipperId) {
        int updatedCount = orderRepository.bulkUpdateStatusByRoute(routeId, OrderStatus.AT_HUB, OrderStatus.PICKING);

        if (updatedCount == 0) throw new OrderStatusException("Route không hợp lệ hoặc đã được xử lý");

        List<Order> orders = orderRepository.findByRouteId(routeId);

        for (Order order : orders) {
            order.setShipperId(shipperId);

            recordHistory(order.getId(), OrderStatus.AT_HUB, OrderStatus.PICKING, shipperId, "Shipper lấy hàng đi giao");
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, OrderStatus.AT_HUB, OrderStatus.PICKING));

            // TỰ ĐỘNG CHUYỂN SANG DELIVERING KHI SHIPPER XÁC NHẬN LẤY HÀNG
            order.setStatus(OrderStatus.DELIVERING);
        }
        orderRepository.saveAll(orders);
    }

    @Transactional
    public OrderResponse updateDeliveryStatus(String orderId, DeliveryStatusRequest request, String shipperId) {
        Order order = findOrderOrThrow(orderId);

        if (!shipperId.equals(order.getShipperId())) {
            throw new OrderStatusException("Bạn không phải shipper phụ trách đơn hàng này");
        }

        OrderStatus oldStatus = order.getStatus();
        OrderStatus newStatus;

        if (request.result() == DeliveryResult.SUCCESS) {
            // LOGIC MỚI: Nếu là COD, shipper phải xác nhận đã thu đủ tiền
            if (order.getPaymentMethod() == PaymentMethod.COD && !request.isMoneyCollected()) {
                throw new OrderStatusException("Vui lòng xác nhận đã thu đủ tiền mặt (COD) để hoàn tất đơn");
            }
            newStatus = OrderStatus.COMPLETED;
        } else {
            newStatus = OrderStatus.CANCELLED;
        }

        order.setStatus(newStatus);
        if (request.proofImageUrl() != null) order.setProofImageUrl(request.proofImageUrl());
        if (request.failReason() != null) order.setFailReason(request.failReason());

        Order saved = orderRepository.save(order);

        String note = (newStatus == OrderStatus.COMPLETED) ? "Giao thành công" : "Giao thất bại: " + request.failReason();

        recordHistory(orderId, oldStatus, newStatus, shipperId, note);

        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, newStatus));

        return OrderMapper.mapToResponse(saved);
    }

    // ---KAFKA CONSUMER HANDLER---
    @Transactional
    public void handlePaymentCompleted(String orderId) {
        Order order = findOrderOrThrow(orderId);

        if (order.getStatus() == OrderStatus.PENDING) {
            OrderStatus oldStatus = order.getStatus();

            order.setStatus(OrderStatus.CREATED);
            Order saved = orderRepository.save(order);

            recordHistory(orderId, oldStatus, OrderStatus.CREATED, "PAYMENT_SERVICE", "Thanh toán thành công");
            kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.CREATED));
        }
    }

    // ---PRIVATE HELPERS & GETTERS---

    private Order findOrderOrThrow(String id) {
        return orderRepository.findById(id).orElseThrow(() -> new OrderNotFoundException("Không tìm thấy đơn hàng: " + id));
    }

    private void recordHistory(String orderId, OrderStatus oldStatus, OrderStatus newStatus, String changedBy, String note) {
        historyRepository.save(OrderStatusHistory.builder()
                .orderId(orderId).oldStatus(oldStatus).newStatus(newStatus)
                .changedBy(changedBy).note(note).build());
    }

    private OrderStatusChangedEvent buildStatusEvent(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        return new OrderStatusChangedEvent(
                order.getId(), order.getCustomerId(), order.getShipperId(),
                oldStatus, newStatus, order.getCurrentHubId(),
                order.getReceiverLat(), order.getReceiverLng(), LocalDateTime.now()
        );
    }

    public OrderResponse getOrderById(String id) {
        return OrderMapper.mapToResponse(findOrderOrThrow(id));
    }

    public List<OrderStatusHistoryResponse> getOrderHistory(String id) {
        findOrderOrThrow(id);

        return historyRepository.findByOrderIdOrderByCreatedAtAsc(id).stream()
                .map(OrderMapper::mapToHistoryResponse).collect(Collectors.toList());
    }

    @Retry(name = "${spring.application.name}", fallbackMethod = "fallbackPayment")
    @CircuitBreaker(name = "${spring.application.name}", fallbackMethod = "fallbackPayment")
    private String callPaymentService(String orderId, Double totalPrice) {
        try {
            String requestId = orderId + "-" + System.currentTimeMillis();
            String url = "http://payment-service/api/payments/initiate/"
                    + requestId
                    + "?method=MOMO"
                    + "&totalPrice=" + totalPrice;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            String userId = null;
            String roles = null;

            if (auth != null && auth.isAuthenticated()) {
                userId = auth.getName(); // chính là customerId
                roles = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .reduce((a, b) -> a + "," + b)
                        .orElse("");
            }

            log.info("Đang gọi Payment Service để lấy link thanh toán: {}", url);

            Map<String, Object> response = webClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("X-User-Id", userId)
                    .header("X-User-Roles", roles)
                    .retrieve()
                    .onStatus(status -> status.isError(),
                            clientResponse -> {
                                log.error("Payment Service trả về lỗi: {}", clientResponse.statusCode());
                                return Mono.error(new RuntimeException("Payment Service error"));
                            })
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(10));

            if (response != null) {
                log.info("Response từ Payment Service: {}", response);

                if (response.containsKey("paymentUrl")) {
                    String paymentUrl = (String) response.get("paymentUrl");
                    return paymentUrl;
                } else {
                    log.warn("Payment Service không trả về trường 'paymentUrl'. Response: {}", response);
                }
            }
        } catch (Exception e) {
            log.error("Gọi Payment Service thất bại cho đơn hàng {}: {}", orderId, e.getMessage(), e);
        }
        return null;
    }

    private String fallbackPayment(String orderId, Double totalPrice, Throwable ex) {
        log.error("Fallback Payment Service cho order {}: {}", orderId, ex.getMessage());
        return null;
    }

    // Schedule
    @Transactional
    @Scheduled(cron = "0 0 0 * * *") // Chạy mỗi ngày vào lúc 00:00
    public void cleanupCancelledOrders() {
        log.info("Cronjob dọn dẹp nửa đêm: Bắt đầu xóa TOÀN BỘ đơn hàng trạng thái CANCELLED");

        try {
            // Tìm tất cả đơn hàng đang bị CANCELLED để lấy ID
            List<Order> ordersToDelete = orderRepository.findByStatus(OrderStatus.CANCELLED);

            if (!ordersToDelete.isEmpty()) {
                List<String> ids = ordersToDelete.stream().map(Order::getId).toList();

                // Xóa lịch sử trạng thái của các đơn này trước
                historyRepository.deleteByOrderIdIn(ids);
                orderRepository.deleteByStatus(OrderStatus.CANCELLED);

                log.info("Dọn dẹp hoàn tất: Đã xóa {} đơn hàng CANCELLED ", ids.size());
            } else {
                log.info("Không có đơn hàng nào bị CANCELLED để xóa");
            }
        } catch (Exception e) {
            log.error("Lỗi khi chạy dọn dẹp định kỳ: {}", e.getMessage());
        }
    }
}