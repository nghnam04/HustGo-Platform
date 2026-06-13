package vn.edu.hust.order_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import vn.edu.hust.base_domain.constant.DeliveryResult;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.constant.RouteStatus;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.base_domain.dto.RouteCompletedEvent;
import vn.edu.hust.order_service.constant.ManifestStatus;
import vn.edu.hust.order_service.dto.*;
import vn.edu.hust.order_service.entity.*;
import vn.edu.hust.order_service.exception.OrderNotFoundException;
import vn.edu.hust.order_service.exception.OrderStatusException;
import vn.edu.hust.order_service.exception.HustGoException;
import vn.edu.hust.order_service.kafka.OrderProducer;
import vn.edu.hust.order_service.mapper.OrderMapper;
import vn.edu.hust.order_service.repository.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    @PersistenceContext
    private EntityManager entityManager;

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final FeedbackRepository feedbackRepository;
    private final RoutePaymentSettlementRepository settlementRepository;
    private final DeliveryRouteRepository routeRepository;
    private final TransferManifestRepository transferManifestRepository;
    private final CloudinaryService cloudinaryService;
    private final OrderProducer kafkaProducer;
    private final PricingService pricingService;
    private final WebClient.Builder webClientBuilder;
    private final TransactionTemplate transactionTemplate;

    @Value("${hubs.service-url}")
    private String HUB_SERVICE_URL;

    @Value("${routing.service-url}")
    private String ROUTING_SERVICE_URL;

    @Value("${payment.service-url}")
    private String PAYMENT_SERVICE_URL;

    // Customer
    // Tạo đơn hàng
    @Transactional
    public OrderResponse createOrder(OrderRequest request, String customerId) {
        if (request.codAmount() != null && request.orderValue() != null
                && request.codAmount().compareTo(request.orderValue()) > 0) {
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

        PricingResult pricing = pricingService.calculate(request);
        Order order = OrderMapper.mapToOrder(request, imageUrl, pricing);
        order.setCustomerId(customerId);
        order.setStatus(OrderStatus.PENDING);
        order.setFailCount(0);

        Order saved = orderRepository.save(order);
        recordHistory(saved.getId(), null, OrderStatus.PENDING, customerId, "Khách hàng tạo đơn");

        String paymentUrl = null;
        if (request.paymentMethod() == PaymentMethod.ONLINE_PAYMENT) {
            paymentUrl = callPaymentService(saved.getId(), saved.getTotalPrice());
        }

        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, null, OrderStatus.PENDING));
        return OrderMapper.mapToResponse(saved, paymentUrl);
    }

    public Page<OrderResponse> getOrdersByCustomer(String customerId, Pageable pageable) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable)
                .map(OrderMapper::mapToResponse);
    }

    @Transactional
    public OrderResponse updateOrder(String orderId, OrderRequest request, String customerId) {
        Order order = findOrderOrThrow(orderId);

        if (!order.getCustomerId().equals(customerId)) {
            throw new OrderStatusException("Bạn không có quyền chỉnh sửa đơn hàng này");
        }
        if (request.codAmount() != null && request.orderValue() != null
                && request.codAmount().compareTo(request.orderValue()) > 0) {
            throw new OrderStatusException("Số tiền COD không được lớn hơn giá trị hàng hóa");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderStatusException("Chỉ có thể chỉnh sửa đơn hàng khi chưa thanh toán (PENDING)");
        }

        if (request.imageFile() != null && !request.imageFile().isEmpty()) {
            try {
                order.setImageUrl(cloudinaryService.uploadImage(request.imageFile()));
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
        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, OrderStatus.PENDING, OrderStatus.PENDING));
        return OrderMapper.mapToResponse(saved, paymentUrl);
    }

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

        recordHistory(orderId, oldStatus, OrderStatus.CANCELLED, customerId, "Khách hàng tự hủy đơn");
        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.CANCELLED));
        return OrderMapper.mapToResponse(saved);
    }

    // Hub Admin

    // Xác nhâận khách gửi hàng tại Hub
    @Transactional
    public OrderResponse arriveHubCustomer(String orderId, ArriveAtHubRequest request, String adminId) {

        if (!verifyHubExists(request.hubId())) {
            throw new OrderStatusException("Kho không tồn tại: " + request.hubId());
        }

        Order order = findOrderOrThrow(orderId);

        boolean canCollect =
                (order.getPaymentMethod() == PaymentMethod.ONLINE_PAYMENT && order.getStatus() == OrderStatus.CREATED)
                        || (order.getPaymentMethod() == PaymentMethod.COD && order.getStatus() == OrderStatus.PENDING);

        if (!canCollect) {
            throw new OrderStatusException(
                    "Đơn không hợp lệ để nhận tại hub (PaymentMethod: " + order.getPaymentMethod()
                            + ", Status: " + order.getStatus() + ")"
            );
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.COLLECTED);
        order.setCurrentHubId(request.hubId());
        orderRepository.save(order);
        recordHistory(orderId, oldStatus, OrderStatus.COLLECTED, adminId, "Khách gửi hàng tại hub " + request.hubId());
        kafkaProducer.publishStatusChanged(buildStatusEvent(order, oldStatus, OrderStatus.COLLECTED));

        // Nếu là Hub đích thì chuyển AT_HUB
        String hubDistrict = getHubDistrict(request.hubId());
        String receiverDistrict = order.getReceiverDistrict() != null
                ? order.getReceiverDistrict().getDisplayName()
                : null;

        if (hubDistrict != null && hubDistrict.equals(receiverDistrict)) {
            log.info("Đơn {} cùng quận [{}] với hub {} → chuyển AT_HUB",
                    orderId, hubDistrict, request.hubId());
            order.setStatus(OrderStatus.AT_HUB);
            orderRepository.save(order);
            recordHistory(orderId, OrderStatus.COLLECTED, OrderStatus.AT_HUB, adminId,
                    "Cùng quận [" + hubDistrict + "] - không cần trung chuyển");
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, OrderStatus.COLLECTED, OrderStatus.AT_HUB));
        } else {
            log.info("Đơn {} khác quận (hub: {}, receiver: {}) → chờ tạo chuyến trung chuyển",
                    orderId, hubDistrict, receiverDistrict);
        }

        return OrderMapper.mapToResponse(order);
    }

    // Xác nhận nhập kho trung chuyển
    @Transactional
    public OrderResponse arriveHubTransfer(String orderId, ArriveAtHubRequest request, String adminId) {

        if (!verifyHubExists(request.hubId())) {
            throw new OrderStatusException("Kho không tồn tại: " + request.hubId());
        }

        Order order = findOrderOrThrow(orderId);

        if (order.getStatus() != OrderStatus.IN_TRANSIT) {
            throw new OrderStatusException("Chỉ nhận hàng trung chuyển khi đơn đang IN_TRANSIT (hiện tại: " + order.getStatus() + ")");
        }

        // Validate hub nhận đúng là hub đích của đơn
        if (order.getTargetHubId() != null && !order.getTargetHubId().equals(request.hubId())) {
            throw new OrderStatusException(
                    "Đơn này không được chuyển đến hub " + request.hubId()
                            + " (hub đích: " + order.getTargetHubId() + ")"
            );
        }

        OrderStatus old = order.getStatus();
        order.setStatus(OrderStatus.AT_HUB);
        order.setCurrentHubId(request.hubId());
        order.setTargetHubId(null);

        // Lấy adminId hub nguồn để notify rằng transfer đã đến đích
        String originAdminId = order.getOriginHubId() != null ? getManagerIdByHub(order.getOriginHubId()) : null;

        Order saved = orderRepository.save(order);
        recordHistory(orderId, old, OrderStatus.AT_HUB, adminId,
                "Nhập kho trung chuyển tại hub " + request.hubId());
        kafkaProducer.publishStatusChanged(buildStatusEvent(saved, old, OrderStatus.AT_HUB, originAdminId, null));

        return OrderMapper.mapToResponse(saved);
    }

    public Page<OrderResponse> getOrdersAtHub(String hubId, OrderStatus status, Pageable pageable) {
        if (status != null) {
            return orderRepository.findByCurrentHubIdAndStatus(hubId, status, pageable)
                    .map(OrderMapper::mapToResponse);
        }
        return orderRepository.findByCurrentHubId(hubId, pageable)
                .map(OrderMapper::mapToResponse);
    }

    public List<OrderResponse> getDeliveryOrdersByHub(String hubId) {
        List<DeliveryRoute> acceptedRoutes = routeRepository.findByHubIdAndStatus(hubId, RouteStatus.ACCEPTED);
        if (acceptedRoutes.isEmpty()) {
            return List.of();
        }

        List<String> routeIds = acceptedRoutes.stream().map(DeliveryRoute::getId).toList();
        List<Order> deliveryOrders = orderRepository.findByRouteIdIn(routeIds);

        return deliveryOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PICKING || o.getStatus() == OrderStatus.DELIVERING)
                .map(OrderMapper::mapToResponse)
                .toList();
    }

    public List<OrderResponse> getInTransitOrdersForHub(String hubId) {
        return orderRepository.findByTargetHubIdAndStatus(hubId, OrderStatus.IN_TRANSIT)
                .stream()
                .map(order -> {
                    String originHubName = null;
                    if (order.getOriginHubId() != null) {
                        Map<String, Object> hubInfo = getHubInfo(order.getOriginHubId());
                        if (hubInfo != null) {
                            originHubName = (String) hubInfo.get("name");
                        }
                    }
                    return OrderMapper.mapToResponseEnrichedForTransit(order, originHubName);
                })
                .toList();
    }

    // Tạo chuyến trung chuyển liên Hub
    @Transactional
    public TransferManifestResponse createTransferManifest(TransferManifestRequest request, String adminId) {

        if (!verifyHubExists(request.fromHubId()) || !verifyHubExists(request.toHubId())) {
            throw new OrderStatusException("Thông tin kho đi hoặc kho đến không hợp lệ");
        }

        if (request.fromHubId().equals(request.toHubId())) {
            throw new OrderStatusException("Kho đi và kho đến không được trùng nhau");
        }

        String adminHubId = getHubIdByManager(adminId);
        if (!request.fromHubId().equals(adminHubId)) {
            throw new OrderStatusException("Bạn chỉ được tạo chuyến trung chuyển từ kho của mình (hub của bạn: " + adminHubId + ")");
        }

        List<Order> orders = orderRepository.findCollectedOrdersForTransfer(request.orderIds(), request.fromHubId(), OrderStatus.COLLECTED);

        if (orders.isEmpty()) {
            throw new OrderStatusException("Không tìm thấy đơn hàng hợp lệ để luân chuyển (cần trạng thái COLLECTED tại hub " + request.fromHubId() + ")");
        }

        String manifestId = "MNF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Map<String, Object> fromHubInfo = getHubInfo(request.fromHubId());
        Map<String, Object> toHubInfo = getHubInfo(request.toHubId());
        String fromHubName = fromHubInfo != null ? (String) fromHubInfo.get("name") : request.fromHubId();
        String toHubName = toHubInfo != null ? (String) toHubInfo.get("name") : request.toHubId();

        String originAdminId = getManagerIdByHub(request.fromHubId());
        String destAdminId = getManagerIdByHub(request.toHubId());

        for (Order order : orders) {
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.IN_TRANSIT);
            order.setTargetHubId(request.toHubId());
            order.setOriginHubId(request.fromHubId());
            order.setCurrentHubId(null);
            order.setManifestId(manifestId);

            recordHistory(order.getId(), oldStatus, OrderStatus.IN_TRANSIT, adminId,
                    "Xuất kho trung chuyển [" + manifestId + "]: " + request.fromHubId() + " → " + request.toHubId());
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, oldStatus, OrderStatus.IN_TRANSIT, originAdminId, destAdminId));
        }
        orderRepository.saveAll(orders);

        // Lưu TransferManifest
        TransferManifest manifest = TransferManifest.builder()
                .id(manifestId)
                .fromHubId(request.fromHubId())
                .fromHubName(fromHubName)
                .toHubId(request.toHubId())
                .toHubName(toHubName)
                .createdBy(adminId)
                .orderCount(orders.size())
                .orderIds(orders.stream().map(Order::getId).collect(Collectors.toList()))
                .status(ManifestStatus.CREATED)
                .build();
        transferManifestRepository.save(manifest);

        List<String> processedIds = orders.stream().map(Order::getId).collect(Collectors.toList());
        log.info("Tạo chuyến trung chuyển {} ({} đơn): {} → {}", manifestId, processedIds.size(), request.fromHubId(), request.toHubId());

        return new TransferManifestResponse(
                manifestId, request.fromHubId(), fromHubName, request.toHubId(), toHubName,
                processedIds.size(), processedIds, LocalDateTime.now()
        );
    }

    // Phân đơn vào tuyến
    @Transactional
    public void assignOrdersToRoute(AssignRouteRequest request, String adminId, String currentHubId) {
        List<Order> orders = orderRepository.findAllById(request.orderIds());

        if (orders.isEmpty()) {
            throw new OrderStatusException("Không tìm thấy đơn hàng nào để phân tuyến");
        }

        if (orders.size() < 5 || orders.size() > 10) {
            throw new OrderStatusException("Mỗi tuyến cần từ 5 đến 10 đơn hàng (hiện tại: " + orders.size() + " đơn)");
        }

        for (Order order : orders) {
            if (!currentHubId.equals(order.getCurrentHubId())) {
                throw new OrderStatusException("Đơn " + order.getId() + " không thuộc kho " + currentHubId + " (đang ở: " + order.getCurrentHubId() + ")");
            }

            if (order.getStatus() != OrderStatus.AT_HUB) {
                throw new OrderStatusException("Đơn " + order.getId() + " cần trạng thái AT_HUB để phân tuyến (hiện tại: " + order.getStatus() + ")");
            }

            // Tránh phân tuyến lại đơn đã có route
            if (order.getRouteId() != null) {
                throw new OrderStatusException("Đơn " + order.getId() + " đã được phân vào tuyến " + order.getRouteId() + " trước đó");
            }
        }

        // Lấy tọa độ Hub
        log.info("Fetching hub info for hubId: {}", currentHubId);
        Map<String, Object> hubInfo = getHubInfo(currentHubId);
        if (hubInfo == null) {
            throw new OrderStatusException("Kho " + currentHubId + " không tồn tại trong hệ thống. Vui lòng kiểm tra lại ID kho hoặc liên hệ quản trị viên.");
        }
        if (!hubInfo.containsKey("lat") || !hubInfo.containsKey("lng")) {
            throw new OrderStatusException("Thông tin tọa độ của kho " + currentHubId + " chưa được cập nhật. Vui lòng liên hệ quản trị viên.");
        }

        Double hubLat = null;
        Double hubLng = null;
        try {
            Object latObj = hubInfo.get("lat");
            Object lngObj = hubInfo.get("lng");
            if (latObj instanceof Number) {
                hubLat = ((Number) latObj).doubleValue();
            } else if (latObj instanceof String) {
                hubLat = Double.parseDouble((String) latObj);
            }
            if (lngObj instanceof Number) {
                hubLng = ((Number) lngObj).doubleValue();
            } else if (lngObj instanceof String) {
                hubLng = Double.parseDouble((String) lngObj);
            }
        } catch (Exception e) {
            throw new OrderStatusException("Tọa độ Hub không hợp lệ: " + e.getMessage());
        }

        if (hubLat == null || hubLng == null) {
            throw new OrderStatusException("Không thể chuyển đổi tọa độ Hub thành số");
        }

        LocationPoint startPoint = new LocationPoint(currentHubId, hubLat, hubLng, (String) hubInfo.get("name"));

        List<LocationPoint> deliveryPoints = orders.stream()
                .filter(o -> o.getReceiverLat() != null && o.getReceiverLng() != null)
                .map(o -> new LocationPoint(o.getId(), o.getReceiverLat(), o.getReceiverLng(), o.getReceiverName()))
                .collect(Collectors.toList());

        if (deliveryPoints.isEmpty()) {
            throw new OrderStatusException("Không có đơn hàng nào có đủ thông tin tọa độ giao hàng. Vui lòng kiểm tra lại địa chỉ nhận hàng của các đơn");
        }

        if (deliveryPoints.size() < orders.size()) {
            log.warn("Một số đơn hàng không có tọa độ giao hàng, sẽ bỏ qua {} đơn", orders.size() - deliveryPoints.size());
        }

        OptimizationRequest optRequest = new OptimizationRequest(startPoint, deliveryPoints);
        OptimizedRouteResponse optResponse = null;
        try {
            optResponse = webClientBuilder.build()
                    .post()
                    .uri(ROUTING_SERVICE_URL + "/optimize")
                    .bodyValue(optRequest)
                    .retrieve()
                    .bodyToMono(OptimizedRouteResponse.class)
                    .block(Duration.ofSeconds(10));

            if (optResponse == null) {
                log.warn("Routing service trả về null response, sẽ tạo route mà không tối ưu");
            }
        } catch (Exception e) {
            log.error("Lỗi khi tối ưu tuyến đường từ routing-service: {}", e.getMessage(), e);
        }

        String routeId = "RTE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        String geoJson = null;
        if (optResponse != null && optResponse.getRouteGeometry() != null) {
            try {
                geoJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(optResponse.getRouteGeometry());
            } catch (Exception e) {
                log.warn("Không parse được geojson: {}", e.getMessage());
            }
        }

        DeliveryRoute route = DeliveryRoute.builder()
                .id(routeId)
                .hubId(currentHubId)
                .hubAdminId(adminId)
                .status(RouteStatus.PENDING)
                .totalDistanceMeters(optResponse != null ? optResponse.getTotalDistanceMeters() : 0.0)
                .totalDurationSeconds(optResponse != null ? optResponse.getTotalDurationSeconds() : 0.0)
                .routeGeometry(geoJson)
                .totalOrders(orders.size())
                .build();
        routeRepository.save(route);

        for (Order order : orders) {
            order.setRouteId(routeId);
            recordHistory(order.getId(), OrderStatus.AT_HUB, OrderStatus.AT_HUB, adminId,
                    "Hub Admin phân đơn vào tuyến tự động: " + routeId);
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, OrderStatus.AT_HUB, OrderStatus.AT_HUB, adminId));
        }

        orderRepository.saveAll(orders);
        log.info("Hub Admin {} phân {} đơn vào tuyến {} tại hub {}",
                adminId, orders.size(), routeId, currentHubId);
    }

    // Hubadmin xác nhận thu tiền từ Shipper
    @Transactional
    public RoutePaymentSummaryResponse confirmRoutePaymentCollection(String routeId, String adminId) {
        List<Order> completedOrders = orderRepository.findByRouteIdAndStatus(routeId, OrderStatus.COMPLETED);
        List<Order> returningOrders = orderRepository.findByRouteIdAndStatus(routeId, OrderStatus.RETURNING);

        if (completedOrders.isEmpty() && returningOrders.isEmpty()) {
            throw new OrderStatusException("Không có đơn COMPLETED hoặc RETURNING nào trong tuyến " + routeId);
        }

        // Tránh xác nhận trùng lặp
        if (settlementRepository.existsByRouteId(routeId)) {
            throw new OrderStatusException("Tuyến " + routeId + " đã được xác nhận thu tiền trước đó");
        }

        List<Order> settledOrders = new ArrayList<>(completedOrders);
        settledOrders.addAll(returningOrders);

        BigDecimal totalCollected = settledOrders.stream()
                .map(Order::getFinalAmountToCollect)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal hubRevenue = settledOrders.stream()
                .map(Order::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal codAmount = settledOrders.stream()
                .map(Order::getCodAmount)
                .filter(cod -> cod != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOnlinePrepaid = settledOrders.stream()
                .filter(o -> o.getPaymentMethod() == PaymentMethod.ONLINE_PAYMENT)
                .map(Order::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        RoutePaymentSettlement settlement = RoutePaymentSettlement.builder()
                .routeId(routeId)
                .hubAdminId(adminId)
                .totalCollected(totalCollected)
                .totalOnlinePrepaid(totalOnlinePrepaid)
                .hubRevenue(hubRevenue)
                .codAmount(codAmount)
                .orderCount(settledOrders.size())
                .settledAt(LocalDateTime.now())
                .build();
        settlementRepository.save(settlement);

        List<RouteOrderPaymentDetail> details = settledOrders.stream()
                .map(o -> new RouteOrderPaymentDetail(
                        o.getId(),
                        o.getReceiverName(),
                        o.getFinalAmountToCollect(),
                        o.getPaymentMethod()
                ))
                .collect(Collectors.toList());

        log.info("Hub Admin {} xác nhận thu tiền tuyến {}: {} đơn, tổng {}đ",
                adminId, routeId, settledOrders.size(), totalCollected);

        return new RoutePaymentSummaryResponse(routeId, settledOrders.size(), totalCollected, totalOnlinePrepaid, hubRevenue, codAmount, details, LocalDateTime.now());
    }

    // Tính doanh thu tháng của Hub
    public MonthlyRevenueResponse getMonthlyRevenueByHub(String hubId, int month, int year) {
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0, 0);
        LocalDateTime to = from.plusMonths(1);

        String hubAdminId = getHubAdminIdByHubId(hubId);

        List<RoutePaymentSettlement> settlements = settlementRepository.findByHubAdminIdAndSettledAtBetween(hubAdminId, from, to);

        BigDecimal hubRevenue = settlements.stream()
                .map(RoutePaymentSettlement::getHubRevenue)
                .filter(r -> r != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal codAmount = settlements.stream()
                .map(RoutePaymentSettlement::getCodAmount)
                .filter(c -> c != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int routeCount = settlements.size();
        int orderCount = settlements.stream().mapToInt(RoutePaymentSettlement::getOrderCount).sum();

        return new MonthlyRevenueResponse(month, year, hubRevenue, codAmount, hubRevenue, routeCount, orderCount);
    }

    // Doanh thu Hub theo filter
    public MonthlyRevenueResponse getHubRevenueByFilter(String hubId, String filter) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from;
        LocalDateTime to = now;

        switch (filter) {
            case "today":
                from = now.toLocalDate().atStartOfDay();
                to = from.plusDays(1);
                break;
            case "week":
                from = now.minusDays(7);
                break;
            case "month":
                from = LocalDateTime.of(now.getYear(), now.getMonthValue(), 1, 0, 0, 0);
                break;
            case "all":
            default:
                from = LocalDateTime.of(2000, 1, 1, 0, 0, 0);
                break;
        }

        String hubAdminId = getHubAdminIdByHubId(hubId);
        List<RoutePaymentSettlement> settlements = settlementRepository.findByHubAdminIdAndSettledAtBetween(hubAdminId, from, to);

        BigDecimal hubRevenue = settlements.stream()
                .map(RoutePaymentSettlement::getHubRevenue)
                .filter(r -> r != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal codAmount = settlements.stream()
                .map(RoutePaymentSettlement::getCodAmount)
                .filter(c -> c != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int routeCount = settlements.size();
        int orderCount = settlements.stream().mapToInt(RoutePaymentSettlement::getOrderCount).sum();

        int month = from.getMonthValue();
        int year = from.getYear();
        return new MonthlyRevenueResponse(month, year, hubRevenue, codAmount, hubRevenue, routeCount, orderCount);
    }


    // Doanh thu 12 tháng
    public List<MonthlyRevenueResponse> getMonthlyRevenueForChart(String hubId) {
        List<MonthlyRevenueResponse> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        String hubAdminId = getHubAdminIdByHubId(hubId);

        for (int i = 11; i >= 0; i--) {
            LocalDateTime from = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime to = from.plusMonths(1);

            List<RoutePaymentSettlement> settlements = settlementRepository.findByHubAdminIdAndSettledAtBetween(hubAdminId, from, to);

            BigDecimal hubRevenue = settlements.stream()
                    .map(RoutePaymentSettlement::getHubRevenue)
                    .filter(r -> r != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal codAmount = settlements.stream()
                    .map(RoutePaymentSettlement::getCodAmount)
                    .filter(c -> c != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int routeCount = settlements.size();
            int orderCount = settlements.stream().mapToInt(RoutePaymentSettlement::getOrderCount).sum();

            result.add(new MonthlyRevenueResponse(from.getMonthValue(), from.getYear(), hubRevenue, codAmount, hubRevenue, routeCount, orderCount));
        }

        return result;
    }

    // Doanh thu Hub theo ngày trong 1 tháng
    public List<DailyRevenueResponse> getDailyRevenueByHub(String hubId, int month, int year) {
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0, 0);
        LocalDateTime to = from.plusMonths(1);

        String hubAdminId = getHubAdminIdByHubId(hubId);

        List<RoutePaymentSettlement> settlements = settlementRepository.findByHubAdminIdAndSettledAtBetween(hubAdminId, from, to);

        java.time.LocalDate firstDay = java.time.LocalDate.of(year, month, 1);
        int daysInMonth = firstDay.lengthOfMonth();

        java.math.BigDecimal[] dailyCollected = new java.math.BigDecimal[daysInMonth];
        java.math.BigDecimal[] dailyOnline = new java.math.BigDecimal[daysInMonth];
        java.math.BigDecimal[] dailyHubRevenue = new java.math.BigDecimal[daysInMonth];
        java.math.BigDecimal[] dailyCodAmount = new java.math.BigDecimal[daysInMonth];
        int[] dailyOrders = new int[daysInMonth];

        for (int i = 0; i < daysInMonth; i++) {
            dailyCollected[i] = java.math.BigDecimal.ZERO;
            dailyOnline[i] = java.math.BigDecimal.ZERO;
            dailyHubRevenue[i] = java.math.BigDecimal.ZERO;
            dailyCodAmount[i] = java.math.BigDecimal.ZERO;
            dailyOrders[i] = 0;
        }

        for (RoutePaymentSettlement s : settlements) {
            if (s.getSettledAt() == null) continue;
            int day = s.getSettledAt().getDayOfMonth() - 1;
            if (day >= 0 && day < daysInMonth) {
                if (s.getTotalCollected() != null) {
                    dailyCollected[day] = dailyCollected[day].add(s.getTotalCollected());
                }
                if (s.getTotalOnlinePrepaid() != null) {
                    dailyOnline[day] = dailyOnline[day].add(s.getTotalOnlinePrepaid());
                }
                if (s.getHubRevenue() != null) {
                    dailyHubRevenue[day] = dailyHubRevenue[day].add(s.getHubRevenue());
                }
                if (s.getCodAmount() != null) {
                    dailyCodAmount[day] = dailyCodAmount[day].add(s.getCodAmount());
                }
                dailyOrders[day] += s.getOrderCount();
            }
        }

        List<DailyRevenueResponse> result = new java.util.ArrayList<>();
        for (int d = 0; d < daysInMonth; d++) {
            java.math.BigDecimal total = dailyCollected[d].add(dailyOnline[d]);
            result.add(new DailyRevenueResponse(
                    firstDay.plusDays(d),
                    dailyCollected[d],
                    dailyOnline[d],
                    dailyHubRevenue[d],
                    dailyCodAmount[d],
                    total,
                    dailyOrders[d]
            ));
        }
        return result;
    }


    // Doanh thu toàn hệ thống theo filter (ngày/tuần/tháng/all)
    public SystemRevenueResponse getSystemRevenueByFilter(String filter) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from;
        LocalDateTime to = now;

        switch (filter) {
            case "today":
                from = now.toLocalDate().atStartOfDay();
                to = from.plusDays(1);
                break;
            case "week":
                from = now.minusDays(7);
                break;
            case "month":
                from = LocalDateTime.of(now.getYear(), now.getMonthValue(), 1, 0, 0, 0);
                break;
            case "all":
            default:
                from = LocalDateTime.of(2000, 1, 1, 0, 0, 0);
                break;
        }

        List<RoutePaymentSettlement> settlements = settlementRepository.findBySettledAtBetween(from, to);

        // Tính tổng
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCod = BigDecimal.ZERO;
        int totalOrders = 0;
        Map<String, HubRevenueEntry> hubRevMap = new LinkedHashMap<>();

        for (RoutePaymentSettlement s : settlements) {
            String hubAdminId = s.getHubAdminId();
            if (hubAdminId == null) continue;

            // Cộng dồn vào hub
            HubRevenueEntry existing = hubRevMap.get(hubAdminId);
            BigDecimal hubRev = s.getHubRevenue() != null ? s.getHubRevenue() : BigDecimal.ZERO;
            BigDecimal hubCod = s.getCodAmount() != null ? s.getCodAmount() : BigDecimal.ZERO;
            int orderCount = s.getOrderCount() != null ? s.getOrderCount() : 0;

            if (existing != null) {
                hubRevMap.put(hubAdminId, new HubRevenueEntry(
                        existing.hubId(),
                        existing.hubName(),
                        existing.hubRevenue().add(hubRev),
                        existing.orderCount() + orderCount
                ));
            } else {
                String hubName = getHubNameByHubAdminId(hubAdminId);
                hubRevMap.put(hubAdminId, new HubRevenueEntry(hubAdminId, hubName, hubRev, orderCount));
            }

            totalRevenue = totalRevenue.add(hubRev);
            totalCod = totalCod.add(hubCod);
            totalOrders += orderCount;
        }

        List<HubRevenueEntry> hubEntries = new ArrayList<>(hubRevMap.values());
        return new SystemRevenueResponse(totalRevenue, totalCod, totalOrders, hubEntries);
    }

    /**
     * Doanh thu toàn hệ thống 12 tháng cho chart.
     */
    public List<SystemRevenueResponse> getSystemRevenueChart() {
        List<SystemRevenueResponse> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 11; i >= 0; i--) {
            LocalDateTime from = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime to = from.plusMonths(1);

            List<RoutePaymentSettlement> settlements = settlementRepository.findBySettledAtBetween(from, to);

            BigDecimal totalRevenue = BigDecimal.ZERO;
            BigDecimal totalCod = BigDecimal.ZERO;
            int totalOrders = 0;
            Map<String, HubRevenueEntry> hubRevMap = new LinkedHashMap<>();

            for (RoutePaymentSettlement s : settlements) {
                String hubAdminId = s.getHubAdminId();
                if (hubAdminId == null) continue;

                BigDecimal hubRev = s.getHubRevenue() != null ? s.getHubRevenue() : BigDecimal.ZERO;
                BigDecimal hubCod = s.getCodAmount() != null ? s.getCodAmount() : BigDecimal.ZERO;
                int orderCount = s.getOrderCount() != null ? s.getOrderCount() : 0;

                HubRevenueEntry existing = hubRevMap.get(hubAdminId);
                if (existing != null) {
                    hubRevMap.put(hubAdminId, new HubRevenueEntry(
                            existing.hubId(),
                            existing.hubName(),
                            existing.hubRevenue().add(hubRev),
                            existing.orderCount() + orderCount
                    ));
                } else {
                    String hubName = getHubNameByHubAdminId(hubAdminId);
                    hubRevMap.put(hubAdminId, new HubRevenueEntry(hubAdminId, hubName, hubRev, orderCount));
                }

                totalRevenue = totalRevenue.add(hubRev);
                totalCod = totalCod.add(hubCod);
                totalOrders += orderCount;
            }

            List<HubRevenueEntry> hubEntries = new ArrayList<>(hubRevMap.values());
            result.add(new SystemRevenueResponse(totalRevenue, totalCod, totalOrders, hubEntries));
        }

        return result;
    }

    private String getHubNameByHubAdminId(String hubAdminId) {
        try {
            // Lấy hubId trước
            String hubId = webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/" + hubAdminId + "/hub")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
            if (hubId != null && !hubId.isEmpty()) {
                // Lấy hub details - parse JSON đơn giản
                String hubJson = webClientBuilder.build()
                        .get()
                        .uri(HUB_SERVICE_URL + "/" + hubId)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block(Duration.ofSeconds(5));
                if (hubJson != null && hubJson.contains("name")) {
                    // Extract name từ JSON đơn giản
                    int nameStart = hubJson.indexOf("name");
                    int startQuote = hubJson.indexOf("\"", nameStart + 4);
                    int endQuote = hubJson.indexOf("\"", startQuote + 1);
                    if (startQuote > 0 && endQuote > startQuote) {
                        return hubJson.substring(startQuote + 1, endQuote);
                    }
                }
                return "Hub " + hubId;
            }
            return "Hub " + hubAdminId;
        } catch (Exception e) {
            log.error("Lỗi khi lấy tên hub cho admin {}: {}", hubAdminId, e.getMessage());
            return "Hub " + hubAdminId;
        }
    }


    // Doanh thu Shipper theo tháng
    public ShipperRevenueResponse getShipperRevenue(String shipperId, int month, int year) {
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0, 0);
        LocalDateTime to = from.plusMonths(1);

        List<Order> completedOrders = orderRepository.findCompletedByShipperIdAndDateRange(shipperId, from, to);

        BigDecimal totalBase = BigDecimal.ZERO;
        BigDecimal totalCod = BigDecimal.ZERO;

        for (Order o : completedOrders) {
            totalBase = totalBase.add(BigDecimal.valueOf(10000)); // 10k cứng mỗi đơn
            if (o.getCodAmount() != null) {
                totalCod = totalCod.add(o.getCodAmount().multiply(BigDecimal.valueOf(0.02))); // 2% COD
            }
        }

        BigDecimal totalEarnings = totalBase.add(totalCod);

        // Tính daily revenue
        LocalDate firstDay = LocalDate.of(year, month, 1);
        int daysInMonth = firstDay.lengthOfMonth();
        java.math.BigDecimal[] dailyBase = new java.math.BigDecimal[daysInMonth];
        java.math.BigDecimal[] dailyCod = new java.math.BigDecimal[daysInMonth];
        int[] dailyOrders = new int[daysInMonth];

        for (int i = 0; i < daysInMonth; i++) {
            dailyBase[i] = java.math.BigDecimal.ZERO;
            dailyCod[i] = java.math.BigDecimal.ZERO;
            dailyOrders[i] = 0;
        }

        for (Order o : completedOrders) {
            if (o.getUpdatedAt() == null) continue;
            int day = o.getUpdatedAt().getDayOfMonth() - 1;
            if (day >= 0 && day < daysInMonth) {
                dailyBase[day] = dailyBase[day].add(BigDecimal.valueOf(10000));
                if (o.getCodAmount() != null) {
                    dailyCod[day] = dailyCod[day].add(o.getCodAmount().multiply(BigDecimal.valueOf(0.02)));
                }
                dailyOrders[day]++;
            }
        }

        List<DailyShipperRevenue> dailyRevenue = new java.util.ArrayList<>();
        for (int d = 0; d < daysInMonth; d++) {
            dailyRevenue.add(new DailyShipperRevenue(
                    firstDay.plusDays(d),
                    dailyBase[d],
                    dailyCod[d],
                    dailyBase[d].add(dailyCod[d]),
                    dailyOrders[d]
            ));
        }

        return new ShipperRevenueResponse(month, year, totalBase, totalCod, totalEarnings, completedOrders.size(), dailyRevenue);
    }

    // Doanh thu Shipper theo filter
    public ShipperRevenueSummaryResponse getShipperRevenueByFilter(String shipperId, String filter) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from;
        LocalDateTime to = now;

        switch (filter) {
            case "today":
                from = now.toLocalDate().atStartOfDay();
                to = from.plusDays(1);
                break;
            case "week":
                from = now.minusDays(7);
                break;
            case "month":
                from = LocalDateTime.of(now.getYear(), now.getMonthValue(), 1, 0, 0, 0);
                break;
            case "all":
            default:
                from = LocalDateTime.of(2000, 1, 1, 0, 0, 0);
                break;
        }

        List<Order> completedOrders = orderRepository.findCompletedByShipperIdAndDateRange(shipperId, from, to);

        BigDecimal totalBase = BigDecimal.ZERO;
        BigDecimal totalCod = BigDecimal.ZERO;

        for (Order o : completedOrders) {
            totalBase = totalBase.add(BigDecimal.valueOf(10000));
            if (o.getCodAmount() != null) {
                totalCod = totalCod.add(o.getCodAmount().multiply(BigDecimal.valueOf(0.02)));
            }
        }

        BigDecimal totalEarnings = totalBase.add(totalCod);
        int month = from.getMonthValue();
        int year = from.getYear();

        return new ShipperRevenueSummaryResponse(month, year, totalBase, totalCod, totalEarnings, completedOrders.size());
    }


    // Doanh thu Shipper 12 tháng (chart)
    public List<ShipperRevenueSummaryResponse> getShipperMonthlyRevenueChart(String shipperId) {
        List<ShipperRevenueSummaryResponse> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 11; i >= 0; i--) {
            LocalDateTime from = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime to = from.plusMonths(1);

            List<Order> completedOrders = orderRepository.findCompletedByShipperIdAndDateRange(shipperId, from, to);

            BigDecimal totalBase = BigDecimal.ZERO;
            BigDecimal totalCod = BigDecimal.ZERO;

            for (Order o : completedOrders) {
                totalBase = totalBase.add(BigDecimal.valueOf(10000));
                if (o.getCodAmount() != null) {
                    totalCod = totalCod.add(o.getCodAmount().multiply(BigDecimal.valueOf(0.02)));
                }
            }

            BigDecimal totalEarnings = totalBase.add(totalCod);

            result.add(new ShipperRevenueSummaryResponse(from.getMonthValue(), from.getYear(), totalBase, totalCod, totalEarnings, completedOrders.size()));
        }

        return result;
    }

    // SUPER ADMIN
    // Lấy danh sách tất cả đơn hàng
    public Page<OrderResponse> getAllOrders(OrderStatus status, String customerId, Pageable pageable) {
        if (status != null && customerId != null) {
            return orderRepository.findByStatusAndCustomerId(status, customerId, pageable).map(order -> enrichOrderWithHubName(order));
        }
        if (status != null) {
            return orderRepository.findByStatus(status, pageable).map(order -> enrichOrderWithHubName(order));
        }
        if (customerId != null && !customerId.isBlank()) {
            return orderRepository.findByCustomerId(customerId, pageable).map(order -> enrichOrderWithHubName(order));
        }
        return orderRepository.findAll(pageable).map(order -> enrichOrderWithHubName(order));
    }

    private OrderResponse enrichOrderWithHubName(Order order) {
        String hubName = null;
        if (order.getCurrentHubId() != null) {
            Map<String, Object> hubInfo = getHubInfo(order.getCurrentHubId());
            if (hubInfo != null) {
                hubName = (String) hubInfo.get("name");
            }
        }
        return OrderMapper.mapToResponse(order, null, hubName);
    }


    // SHIPPER
    // Lấy danh sách đơn giao
    public List<OrderResponse> getOrdersByShipper(String shipperId, OrderStatus status) {
        List<Order> orders;
        if (status != null) {
            orders = orderRepository.findByShipperIdAndStatus(shipperId, status);
        } else {
            orders = orderRepository.findByShipperIdAndStatusIn(
                    shipperId,
                    List.of(OrderStatus.PICKING, OrderStatus.DELIVERING, OrderStatus.RETURNING, OrderStatus.COMPLETED)
            );
        }
        return orders.stream().map(order -> {
            String geometry = null;
            Integer routeTotalOrders = null;
            if (order.getRouteId() != null) {
                var routeOpt = routeRepository.findById(order.getRouteId());
                geometry = routeOpt.map(r -> r.getRouteGeometry()).orElse(null);
                routeTotalOrders = routeOpt.map(r -> r.getTotalOrders()).orElse(null);
            }
            return OrderMapper.mapToResponseEnriched(order, null, null, null, null, null, null, null, geometry, routeTotalOrders);
        }).collect(Collectors.toList());
    }

    // lấy tuyến khả dụng cho shipper
    public Page<OrderResponse> getAvailableRoutesForShipper(Double lat, Double lng, Pageable pageable) {
        List<Order> orders = orderRepository.findAvailableForShipper(OrderStatus.AT_HUB, pageable).getContent();

        final Double shipperLat = lat;
        final Double shipperLng = lng;
        final boolean hasLocation = shipperLat != null && shipperLng != null;

        // Map và lọc theo khoảng cách 5km
        List<OrderResponse> filteredResponses = orders.stream().map(order -> {
            String hubName = null;
            String hubAddress = null;
            String hubWard = null;
            String hubDistrict = null;
            Double hubLat = null;
            Double hubLng = null;
            if (order.getCurrentHubId() != null) {
                Map<String, Object> hubInfo = getHubInfo(order.getCurrentHubId());
                if (hubInfo != null) {
                    hubName = (String) hubInfo.get("name");
                    hubAddress = (String) hubInfo.get("address");
                    hubWard = (String) hubInfo.get("ward");
                    hubDistrict = hubInfo.get("district") != null ? hubInfo.get("district").toString() : null;
                    hubLat = hubInfo.get("lat") != null ? ((Number) hubInfo.get("lat")).doubleValue() : null;
                    hubLng = hubInfo.get("lng") != null ? ((Number) hubInfo.get("lng")).doubleValue() : null;

                    if (hasLocation && hubLat != null && hubLng != null) {
                        double distanceKm = calculateDistance(shipperLat, shipperLng, hubLat, hubLng);
                        if (distanceKm > 5.0) {
                            return null;
                        }
                    }
                }
            }
            return OrderMapper.mapToResponse(order, null, hubName, hubAddress, hubWard, hubDistrict, hubLat, hubLng);
        }).filter(response -> response != null).collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filteredResponses.size());
        List<OrderResponse> pageContent = start < filteredResponses.size()
                ? filteredResponses.subList(start, end) : List.of();

        return new PageImpl<>(pageContent, pageable, filteredResponses.size());
    }

    // Tính khoảng cách giữa 2 điểm theo công thức Haversine (km)
    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0; // Bán kính Trái Đất (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lngDistance = Math.toRadians(lng2 - lng1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Shipper nhận tuyến
    @Transactional
    public int shipperAcceptRoute(String routeId, String shipperId) {

        List<Order> existingOrders = orderRepository.findByRouteId(routeId);

        if (existingOrders.isEmpty()) {
            throw new OrderStatusException("Tuyến " + routeId + " không tồn tại hoặc không có đơn nào");
        }

        boolean alreadyTaken = existingOrders.stream()
                .anyMatch(o -> o.getShipperId() != null && !o.getShipperId().equals(shipperId));
        if (alreadyTaken) {
            throw new OrderStatusException("Tuyến " + routeId + " đã có shipper khác nhận rồi");
        }

        int updatedCount = orderRepository.bulkUpdateStatusByRoute(routeId, OrderStatus.PICKING, OrderStatus.AT_HUB);

        entityManager.flush();
        entityManager.clear();

        if (updatedCount == 0) {
            throw new OrderStatusException("Tuyến " + routeId + " không còn đơn AT_HUB để nhận ");
        }

        List<Order> orders = orderRepository.findByRouteId(routeId);
        String hubAdminId = routeRepository.findById(routeId)
                .map(DeliveryRoute::getHubAdminId)
                .orElse(null);
        for (Order order : orders) {
            order.setShipperId(shipperId);
            recordHistory(order.getId(), OrderStatus.AT_HUB, OrderStatus.PICKING, shipperId,
                    "Shipper nhận tuyến " + routeId);
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, OrderStatus.AT_HUB, OrderStatus.PICKING, hubAdminId));
        }
        orderRepository.saveAll(orders);

        routeRepository.findById(routeId).ifPresent(route -> {
            route.setStatus(RouteStatus.ACCEPTED);
            route.setShipperId(shipperId);
            routeRepository.save(route);
        });

        log.info("Shipper {} nhận tuyến {}: {} đơn chuyển PICKING", shipperId, routeId, updatedCount);
        return updatedCount;
    }

    // Lấy thông tin Route
    public DeliveryRoute getRouteInfo(String routeId) {
        return routeRepository.findById(routeId)
                .orElseThrow(() -> new OrderStatusException("Không tìm thấy tuyến: " + routeId));
    }


    // Shipper bắt đầu giao hàng
    @Transactional
    public int shipperStartDelivery(String routeId, String shipperId) {
        List<Order> orders = orderRepository.findByRouteId(routeId);

        if (orders.isEmpty()) {
            throw new OrderStatusException("Tuyến " + routeId + " không có đơn nào");
        }

        // Chỉ shipper được gán mới được bắt đầu giao
        boolean isAssigned = orders.stream().anyMatch(o -> shipperId.equals(o.getShipperId()));
        if (!isAssigned) {
            throw new OrderStatusException("Bạn không phải shipper được gán cho tuyến " + routeId);
        }

        // Kiểm tra tất cả đơn phải ở PICKING
        List<Order> notPickingOrders = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.PICKING)
                .collect(Collectors.toList());
        if (!notPickingOrders.isEmpty()) {
            throw new OrderStatusException("Tuyến có " + notPickingOrders.size() + " đơn chưa ở trạng thái PICKING, không thể bắt đầu giao");
        }

        int updatedCount = orderRepository.bulkUpdateStatusByRoute(routeId, OrderStatus.DELIVERING, OrderStatus.PICKING);

        if (updatedCount == 0) {
            throw new OrderStatusException("Không có đơn PICKING nào để bắt đầu giao trong tuyến " + routeId);
        }

        List<Order> updatedOrders = orderRepository.findByRouteId(routeId);
        for (Order order : updatedOrders) {
            recordHistory(order.getId(), OrderStatus.PICKING, OrderStatus.DELIVERING, shipperId,
                    "Shipper bắt đầu giao tuyến " + routeId);
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, OrderStatus.PICKING, OrderStatus.DELIVERING));
        }
        orderRepository.saveAll(updatedOrders);

        routeRepository.findById(routeId).ifPresent(route -> {
            route.setStatus(RouteStatus.IN_PROGRESS);
            routeRepository.save(route);
        });

        log.info("Shipper {} bắt đầu giao tuyến {}: {} đơn chuyển DELIVERING", shipperId, routeId, updatedCount);
        return updatedCount;
    }

    // Shipper cập nhật kết quả giao từng đơn
    public OrderResponse updateDeliveryStatus(String orderId, DeliveryStatusRequest request, String shipperId) {
        Order order = findOrderOrThrow(orderId);

        if (!shipperId.equals(order.getShipperId())) {
            throw new OrderStatusException("Bạn không phải shipper phụ trách đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.DELIVERING) {
            throw new OrderStatusException("Chỉ cập nhật kết quả giao khi đơn đang DELIVERING (hiện tại: " + order.getStatus() + ")");
        }

        OrderStatus oldStatus = order.getStatus();
        String note;

        if (request.result() == DeliveryResult.SUCCESS) {
            if (request.proofImageUrl() == null || request.proofImageUrl().isBlank()) {
                throw new OrderStatusException("Giao thành công cần có ảnh minh chứng");
            }
            // Validate thu tiền
            if (order.getCodAmount() != null && order.getCodAmount().compareTo(BigDecimal.ZERO) > 0
                    && !request.isMoneyCollected()) {
                throw new OrderStatusException("Vui lòng xác nhận đã thu đủ tiền mặt để hoàn tất đơn");
            }

            order.setStatus(OrderStatus.COMPLETED);
            order.setProofImageUrl(request.proofImageUrl());
            note = "Giao thành công, đã thu tiền: " + order.getFinalAmountToCollect() + "đ";

        } else {
            if (request.failReason() == null || request.failReason().isBlank()) {
                throw new OrderStatusException("Giao thất bại cần có lý do");
            }

            int newFailCount = (order.getFailCount() == null ? 0 : order.getFailCount()) + 1;
            order.setFailCount(newFailCount);
            order.setFailReason(request.failReason());
            note = "Giao thất bại lần " + newFailCount + ": " + request.failReason();
        }

        Order saved = transactionTemplate.execute(tx -> {
            return orderRepository.save(order);
        });

        recordHistory(orderId, oldStatus, saved.getStatus(), shipperId, note);
        String originHubAdminId = getManagerIdByHub(saved.getOriginHubId());
        kafkaProducer.publishStatusChanged(buildStatusEvent(
                saved, oldStatus, saved.getStatus(), originHubAdminId, null));

        checkAndUpdateRouteCompletion(saved.getRouteId());

        // Sau khi lưu thành công, fail lần 2 thì throw
        if (saved.getStatus() == OrderStatus.DELIVERING && saved.getFailCount() >= 2) {
            throw new OrderStatusException("Đơn đã thất bại 2 lần. Vui lòng trả hàng về Hub.");
        }

        return OrderMapper.mapToResponse(saved);
    }

    // Shipper trả đơn giao thất bại 2 lần về Hub
    @Transactional
    public OrderResponse returnOrderToHub(String orderId, ReturnToHubRequest request, String shipperId) {
        Order order = findOrderOrThrow(orderId);

        if (!shipperId.equals(order.getShipperId())) {
            throw new OrderStatusException("Bạn không phải shipper phụ trách đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.DELIVERING && order.getStatus() != OrderStatus.RETURNING) {
            throw new OrderStatusException("Chỉ trả hàng về hub khi đơn đang DELIVERING hoặc RETURNING (hiện tại: " + order.getStatus() + ")");
        }

        OrderStatus oldStatus = order.getStatus();
        String targetHubId = request.hubId();

        String targetHubAdminId = getManagerIdByHub(targetHubId);
        order.setStatus(OrderStatus.RETURNING);
        order.setCurrentHubId(targetHubId);
        recordHistory(orderId, oldStatus, OrderStatus.RETURNING, shipperId,
                "Shipper trả hàng về hub " + targetHubId + " (thất bại " + (order.getFailCount() == null ? 0 : order.getFailCount()) + " lần, chờ giao lại)");

        Order saved = orderRepository.save(order);
        entityManager.flush();
        entityManager.clear();
        log.info("Shipper {} trả đơn {} về hub {} (failCount: {})", shipperId, orderId, targetHubId, order.getFailCount());

        kafkaProducer.publishStatusChanged(buildStatusEvent(
                saved, oldStatus, OrderStatus.RETURNING, null, targetHubAdminId));

        checkAndUpdateRouteCompletion(saved.getRouteId());

        return OrderMapper.mapToResponse(saved);
    }

    // kafka consumer handler
    @Transactional
    public void handlePaymentCompleted(String orderId) {
        Order order = findOrderOrThrow(orderId);

        if (order.getStatus() == OrderStatus.PENDING) {
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.CREATED);
            Order saved = orderRepository.save(order);

            recordHistory(orderId, oldStatus, OrderStatus.CREATED, "PAYMENT_SERVICE", "Khách hàng thanh toán thành công");
            kafkaProducer.publishStatusChanged(buildStatusEvent(saved, oldStatus, OrderStatus.CREATED));
        }
    }

    // Private Helpers
    private Order findOrderOrThrow(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException("Không tìm thấy đơn hàng: " + id));
    }

    private void recordHistory(String orderId, OrderStatus oldStatus, OrderStatus newStatus,
                               String changedBy, String note) {
        historyRepository.save(OrderStatusHistory.builder()
                .orderId(orderId).oldStatus(oldStatus).newStatus(newStatus)
                .changedBy(changedBy).note(note).build());
    }

    private void checkAndUpdateRouteCompletion(String routeId) {
        if (routeId == null) return;
        List<Order> routeOrders = orderRepository.findByRouteId(routeId);
        if (routeOrders.isEmpty()) return;

        log.info("checkAndUpdateRouteCompletion for route {}, orders: {}",
                routeId,
                routeOrders.stream().map(o -> o.getId() + ":" + o.getStatus()).toList());

        boolean allDone = routeOrders.stream()
                .allMatch(o -> o.getStatus() == OrderStatus.COMPLETED || o.getStatus() == OrderStatus.RETURNING);

        log.info("Route {} - allDone={}, statuses: {}", routeId, allDone,
                routeOrders.stream().map(o -> o.getStatus().name()).toList());

        if (allDone) {
            routeRepository.findById(routeId).ifPresent(route -> {
                route.setStatus(RouteStatus.COMPLETED);
                route.setCompletedAt(LocalDateTime.now());
                routeRepository.save(route);

                // Auto tạo settlement khi tuyến hoàn thành
                autoCreateSettlement(route, routeOrders);

                int completedOrders = (int) routeOrders.stream().filter(o -> o.getStatus() == OrderStatus.COMPLETED).count();
                int returnedOrders = (int) routeOrders.stream().filter(o -> o.getStatus() == OrderStatus.RETURNING).count();
                RouteCompletedEvent routeEvent = new RouteCompletedEvent(
                        route.getId(),
                        route.getHubId(),
                        route.getHubAdminId(),
                        route.getShipperId(),
                        routeOrders.size(),
                        completedOrders,
                        returnedOrders,
                        route.getCompletedAt()
                );
                kafkaProducer.publishRouteCompleted(routeEvent);
                log.info("Đã gửi RouteCompletedEvent cho tuyến {}", route.getId());
            });
            log.info("Tuyến {} đã hoàn tất (tất cả các đơn đã xử lý xong).", routeId);
        }
    }

    private void autoCreateSettlement(DeliveryRoute route, List<Order> routeOrders) {
        log.info("autoCreateSettlement called for route {}, orders: {}",
                route.getId(),
                routeOrders.stream().map(o -> o.getId() + ":" + o.getStatus()).toList());

        if (settlementRepository.existsByRouteId(route.getId())) {
            log.info("Route {} đã có settlement", route.getId());
            return;
        }

        List<Order> settledOrders = routeOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.COMPLETED || o.getStatus() == OrderStatus.RETURNING)
                .toList();

        if (settledOrders.isEmpty()) {
            log.warn("Route {} không có đơn COMPLETED/RETURNING. Trạng thái: {}",
                    route.getId(),
                    routeOrders.stream().map(o -> o.getStatus().name()).toList());
            return;
        }

        log.info("Tạo settlement cho route {} với {} orders", route.getId(), settledOrders.size());

        BigDecimal totalCollected = settledOrders.stream()
                .map(Order::getFinalAmountToCollect)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal hubRevenue = settledOrders.stream()
                .map(Order::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal codAmount = settledOrders.stream()
                .map(Order::getCodAmount)
                .filter(cod -> cod != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOnlinePrepaid = settledOrders.stream()
                .filter(o -> o.getPaymentMethod() == PaymentMethod.ONLINE_PAYMENT)
                .map(Order::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        RoutePaymentSettlement settlement = RoutePaymentSettlement.builder()
                .routeId(route.getId())
                .hubAdminId(route.getHubAdminId())
                .totalCollected(totalCollected)
                .totalOnlinePrepaid(totalOnlinePrepaid)
                .hubRevenue(hubRevenue)
                .codAmount(codAmount)
                .orderCount(settledOrders.size())
                .settledAt(LocalDateTime.now())
                .build();
        settlementRepository.save(settlement);
        log.info("Auto tạo RoutePaymentSettlement cho tuyến {}: hubRevenue={}, codAmount={}, orderCount={}",
                route.getId(), hubRevenue, codAmount, settledOrders.size());
    }

    private OrderStatusChangedEvent buildStatusEvent(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        return buildStatusEvent(order, oldStatus, newStatus, null, null);
    }

    private OrderStatusChangedEvent buildStatusEvent(Order order, OrderStatus oldStatus, OrderStatus newStatus, String hubAdminId) {
        return buildStatusEvent(order, oldStatus, newStatus, null, hubAdminId);
    }

    private OrderStatusChangedEvent buildStatusEvent(Order order, OrderStatus oldStatus, OrderStatus newStatus, String originHubAdminId, String hubAdminId) {
        return new OrderStatusChangedEvent(
                order.getId(),
                order.getCustomerId(),
                order.getShipperId(),
                order.getRouteId(),
                order.getCurrentHubId(),
                oldStatus,
                newStatus,
                order.getCurrentHubId(),
                order.getReceiverLat(),
                order.getReceiverLng(),
                LocalDateTime.now(),
                originHubAdminId,
                hubAdminId,
                order.getFailCount()
        );
    }

    private boolean verifyHubExists(String hubId) {
        try {
            return Boolean.TRUE.equals(webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/" + hubId + "/exists")
                    .retrieve()
                    .bodyToMono(Boolean.class)
                    .block(Duration.ofSeconds(5)));
        } catch (Exception e) {
            log.error("Lỗi khi gọi Hub-Service để kiểm tra kho {}: {}", hubId, e.getMessage());
            return false;
        }
    }

    private String getHubDistrict(String hubId) {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/" + hubId + "/district")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.error("Lỗi khi lấy district của hub {}: {}", hubId, e.getMessage());
            return null;
        }
    }

    private Map<String, Object> getHubInfo(String hubId) {
        try {
            String url = HUB_SERVICE_URL + "/" + hubId;
            log.info("Calling Hub Service: {}", url);

            Map<String, Object> result =
                    webClientBuilder.build()
                            .get()
                            .uri(url)
                            .retrieve()
                            .bodyToMono(
                                    new ParameterizedTypeReference<Map<String, Object>>() {
                                    }
                            )
                            .block(Duration.ofSeconds(5));

            log.info("Hub info response = {}", result);
            return result;
        } catch (Exception e) {
            log.error("Hub call failed", e);
            return null;
        }
    }


    private String getHubIdByManager(String managerId) {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/manager/" + managerId)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.error("Lỗi khi lấy hub của manager {}: {}", managerId, e.getMessage());
            throw new OrderStatusException("Không thể xác định kho của bạn, vui lòng thử lại");
        }
    }

    private String getManagerIdByHub(String hubId) {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/" + hubId + "/manager")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.error("Lỗi khi lấy manager của hub {}: {}", hubId, e.getMessage());
            return null;
        }
    }

    private String getHubAdminIdByHubId(String hubId) {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri(HUB_SERVICE_URL + "/" + hubId + "/manager")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.error("Lỗi khi lấy hubAdminId của hub {}: {}", hubId, e.getMessage());
            throw new OrderStatusException("Không thể xác định hub admin, vui lòng thử lại");
        }
    }

    public OrderResponse getOrderById(String id) {
        return OrderMapper.mapToResponse(findOrderOrThrow(id));
    }

    public List<OrderStatusHistoryResponse> getOrderHistory(String id) {
        findOrderOrThrow(id);
        return historyRepository.findByOrderIdOrderByCreatedAtAsc(id).stream()
                .map(OrderMapper::mapToHistoryResponse).collect(Collectors.toList());
    }

    public PricingResult calculatePrice(OrderRequest request) {
        if (request.codAmount() != null && request.orderValue() != null
                && request.codAmount().compareTo(request.orderValue()) > 0) {
            throw new OrderStatusException("Số tiền COD không được lớn hơn giá trị hàng hóa");
        }
        return pricingService.calculate(request);
    }

    // Payment
    @Retry(name = "${spring.application.name}", fallbackMethod = "fallbackPayment")
    @CircuitBreaker(name = "${spring.application.name}", fallbackMethod = "fallbackPayment")
    private String callPaymentService(String orderId, BigDecimal totalPrice) {
        try {
            String requestId = orderId + "-" + System.currentTimeMillis();
            String url = PAYMENT_SERVICE_URL + requestId + "?method=MOMO&totalPrice=" + totalPrice;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = null, roles = null;
            if (auth != null && auth.isAuthenticated()) {
                userId = auth.getName();
                roles = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .reduce((a, b) -> a + "," + b).orElse("");
            }

            Map<String, Object> response = webClientBuilder.build()
                    .get().uri(url)
                    .header("X-User-Id", userId)
                    .header("X-User-Roles", roles)
                    .retrieve()
                    .onStatus(s -> s.isError(),
                            cr -> Mono.error(new HustGoException(HttpStatus.BAD_GATEWAY, "Lỗi Payment Service")))
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(10));

            if (response != null && response.containsKey("paymentUrl")) {
                return (String) response.get("paymentUrl");
            }
        } catch (Exception e) {
            log.error("Gọi Payment Service thất bại cho đơn {}: {}", orderId, e.getMessage(), e);
        }
        return null;
    }

    @Transactional
    public String getPaymentUrl(String orderId, String customerId) {
        Order order = findOrderOrThrow(orderId);

        if (!order.getCustomerId().equals(customerId)) {
            throw new OrderStatusException("Bạn không có quyền thanh toán đơn hàng này");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new OrderStatusException("Trạng thái đơn hàng không hợp lệ để lấy link thanh toán");
        }
        if (order.getPaymentMethod() != PaymentMethod.ONLINE_PAYMENT) {
            throw new OrderStatusException("Đơn hàng này không sử dụng phương thức thanh toán online");
        }

        String paymentUrl = callPaymentService(order.getId(), order.getTotalPrice());
        if (paymentUrl == null) {
            throw new OrderStatusException("Không thể khởi tạo link thanh toán lúc này, vui lòng thử lại sau");
        }
        return paymentUrl;
    }

    private String fallbackPayment(String orderId, BigDecimal totalPrice, Throwable ex) {
        log.error("Fallback Payment Service cho order {}: {}", orderId, ex.getMessage());
        return null;
    }

    // SCHEDULER
    @Transactional
    @Scheduled(cron = "0 30 1 * * *")
    public void cleanupCancelledOrders() {
        log.info("DỌN DẸP ĐƠN CANCELLED CŨ HƠN 6 THÁNG");
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);
            List<Order> ordersToDelete = orderRepository.findByStatusAndCreatedAtBefore(OrderStatus.CANCELLED, cutoffDate);
            if (ordersToDelete.isEmpty()) return;
            List<String> ids = ordersToDelete.stream().map(Order::getId).toList();
            historyRepository.deleteByOrderIdIn(ids);
            orderRepository.deleteByStatusAndCreatedAtBefore(OrderStatus.CANCELLED, cutoffDate);
            log.info("Đã xóa {} đơn CANCELLED", ids.size());
        } catch (Exception e) {
            log.error("Lỗi dọn dẹp đơn CANCELLED", e);
        }
    }

    @Transactional
    @Scheduled(cron = "0 0 * * * *")
    public void autoCancelExpiredOnlineOrders() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(1);
        List<Order> expiredOrders = orderRepository.findByPaymentMethodAndStatusAndCreatedAtBefore(
                PaymentMethod.ONLINE_PAYMENT, OrderStatus.PENDING, threshold);
        if (expiredOrders.isEmpty()) return;
        for (Order order : expiredOrders) {
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.CANCELLED);
            recordHistory(order.getId(), oldStatus, OrderStatus.CANCELLED,
                    "SYSTEM", "Hệ thống tự động hủy do quá hạn thanh toán 24h");
            kafkaProducer.publishStatusChanged(buildStatusEvent(order, oldStatus, OrderStatus.CANCELLED));
        }
        orderRepository.saveAll(expiredOrders);
    }

    @Transactional
    @Scheduled(cron = "0 35 1 * * *")
    public void cleanupCompletedOrders() {
        log.info("DỌN DẸP ĐƠN COMPLETED CŨ HƠN 6 THÁNG");
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);
            List<Order> ordersToDelete = orderRepository.findByStatusAndCreatedAtBefore(OrderStatus.COMPLETED, cutoffDate);
            if (ordersToDelete.isEmpty()) return;
            List<String> ids = ordersToDelete.stream().map(Order::getId).toList();

            // Soft-delete feedbacks trước
            LocalDateTime now = LocalDateTime.now();
            int feedbackCount = 0;
            for (String orderId : ids) {
                List<Feedback> feedbacks = feedbackRepository.findByOrderId(orderId);
                for (Feedback fb : feedbacks) {
                    if (fb.getDeletedAt() == null) {
                        fb.setDeletedAt(now);
                        feedbackRepository.save(fb);
                        feedbackCount++;
                    }
                }
            }
            log.info("Đã soft-delete {} feedbacks", feedbackCount);

            // Xóa history và order
            historyRepository.deleteByOrderIdIn(ids);
            orderRepository.deleteByStatusAndCreatedAtBefore(OrderStatus.COMPLETED, cutoffDate);
            log.info("Đã xóa {} đơn COMPLETED", ids.size());
        } catch (Exception e) {
            log.error("Lỗi dọn dẹp đơn COMPLETED", e);
        }
    }
}