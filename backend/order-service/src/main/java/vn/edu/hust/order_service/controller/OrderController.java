package vn.edu.hust.order_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.order_service.dto.*;
import vn.edu.hust.order_service.entity.DeliveryRoute;
import vn.edu.hust.order_service.service.CloudinaryService;
import vn.edu.hust.order_service.service.OrderService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final CloudinaryService cloudinaryService;

    // ---CUSTOMER---
    // Tạo đơn hàng mới
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @ModelAttribute OrderRequest request,
            @AuthenticationPrincipal String customerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request, customerId));
    }

    // Xem danh sách đơn hàng của chính mình
    @GetMapping("/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Page<OrderResponse>> getMyOrders(
            @AuthenticationPrincipal String customerId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId, pageable));
    }

    // Chỉnh sửa đơn hàng
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable String id,
            @Valid @ModelAttribute OrderRequest request,
            @AuthenticationPrincipal String customerId) {
        return ResponseEntity.ok(orderService.updateOrder(id, request, customerId));
    }

    // Huỷ đơn hàng
    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable String id,
            @AuthenticationPrincipal String customerId) {
        return ResponseEntity.ok(orderService.cancelOrder(id, customerId));
    }

    // Tính giá
    @PostMapping("/calculate-price")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<PricingResult> calculatePrice(
            @Valid @ModelAttribute OrderRequest request) {

        PricingResult result = orderService.calculatePrice(request);
        return ResponseEntity.ok(result);
    }

    // ---HUB ADMIN---

    // Xác nhận đơn hàng khách gửi
    @PatchMapping("/{id}/hub/pickup")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<OrderResponse> arriveHubCustomer(
            @PathVariable String id,
            @RequestBody ArriveAtHubRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(orderService.arriveHubCustomer(id, request, adminId));
    }

    // Xác nhận nhập kho trung chuyển
    @PatchMapping("/{id}/hub/receive-transfer")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<OrderResponse> arriveHubTransfer(
            @PathVariable String id,
            @RequestBody ArriveAtHubRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(orderService.arriveHubTransfer(id, request, adminId));
    }

    // Xem tồn kho tại Hub
    @GetMapping("/hub/{hubId}")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<Page<OrderResponse>> getInventoryAtHub(
            @PathVariable String hubId,
            @RequestParam(required = false) OrderStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(orderService.getOrdersAtHub(hubId, status, pageable));
    }

    // Lấy các đơn PICKING/DELIVERING của hub
    @GetMapping("/hub/{hubId}/delivery-orders")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getDeliveryOrdersByHub(@PathVariable String hubId) {
        return ResponseEntity.ok(orderService.getDeliveryOrdersByHub(hubId));
    }

    // Lấy các đơn IN_TRANSIT đang chờ nhập kho tại hub đích
    @GetMapping("/hub/{hubId}/in-transit")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getInTransitOrdersForHub(@PathVariable String hubId) {
        return ResponseEntity.ok(orderService.getInTransitOrdersForHub(hubId));
    }

    // Tạo chuyến trung chuyển từ 1 Hub đi các Hub khác
    @PostMapping("/transfer")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<TransferManifestResponse> createTransferManifest(
            @RequestBody @Valid TransferManifestRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createTransferManifest(request, adminId));
    }

    // Phân tuyến giao hàng cho Shipper
    @PostMapping("/hub/{hubId}/assign-route")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<Map<String, String>> assignOrdersToRoute(
            @PathVariable String hubId,
            @RequestBody @Valid AssignRouteRequest request,
            @AuthenticationPrincipal String adminId) {
        orderService.assignOrdersToRoute(request, adminId, hubId);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Đã phân " + request.orderIds().size() + " đơn vào tuyến mới thành công"
        ));
    }

    // Xác nhận thu tiền tuyến giao hàng
    @PostMapping("/hub/route/{routeId}/confirm-payment-collection")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<RoutePaymentSummaryResponse> confirmPaymentCollection(
            @PathVariable String routeId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(orderService.confirmRoutePaymentCollection(routeId, adminId));
    }

    // Doanh thu tháng của hub
    @GetMapping("/hub/{hubId}/monthly-revenue")
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MonthlyRevenueResponse> getMonthlyRevenue(
            @PathVariable String hubId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(orderService.getMonthlyRevenueByHub(hubId, month, year));
    }

    // Doanh thu hub theo filter (ngày/tuần/tháng/all)
    @GetMapping("/hub/{hubId}/revenue")
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MonthlyRevenueResponse> getHubRevenueByFilter(
            @PathVariable String hubId,
            @RequestParam String filter) {
        return ResponseEntity.ok(orderService.getHubRevenueByFilter(hubId, filter));
    }

    // Doanh thu theo ngày trong tháng của hub (chart)
    @GetMapping("/hub/{hubId}/daily-revenue")
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<DailyRevenueResponse>> getDailyRevenue(
            @PathVariable String hubId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(orderService.getDailyRevenueByHub(hubId, month, year));
    }

    // Doanh thu hub 12 tháng (chart)
    @GetMapping("/hub/{hubId}/monthly-revenue-chart")
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<MonthlyRevenueResponse>> getMonthlyRevenueForChart(
            @PathVariable String hubId) {
        return ResponseEntity.ok(orderService.getMonthlyRevenueForChart(hubId));
    }

    // Doanh thu shipper theo tháng
    @GetMapping("/shipper/{shipperId}/revenue")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<ShipperRevenueResponse> getShipperRevenue(
            @PathVariable String shipperId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(orderService.getShipperRevenue(shipperId, month, year));
    }

    // Doanh thu shipper theo filter (ngày/tuần/tháng/all)
    @GetMapping("/shipper/{shipperId}/revenue-by-filter")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<ShipperRevenueSummaryResponse> getShipperRevenueByFilter(
            @PathVariable String shipperId,
            @RequestParam String filter) {
        return ResponseEntity.ok(orderService.getShipperRevenueByFilter(shipperId, filter));
    }

    // Doanh thu shipper 12 tháng (chart)
    @GetMapping("/shipper/{shipperId}/monthly-revenue-chart")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<List<ShipperRevenueSummaryResponse>> getShipperMonthlyRevenueChart(
            @PathVariable String shipperId) {
        return ResponseEntity.ok(orderService.getShipperMonthlyRevenueChart(shipperId));
    }

    // ---COMMON---

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<OrderStatusHistoryResponse>> getOrderHistory(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderHistory(id));
    }

    // ---SUPER ADMIN---

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<OrderResponse>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String customerId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(
                orderService.getAllOrders(status, customerId, pageable)
        );
    }

    // Doanh thu toàn hệ thống theo filter (ngày/tuần/tháng/all)
    @GetMapping("/system/revenue")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<SystemRevenueResponse> getSystemRevenueByFilter(
            @RequestParam String filter) {
        return ResponseEntity.ok(orderService.getSystemRevenueByFilter(filter));
    }

    // Doanh thu toàn hệ thống 12 tháng (chart)
    @GetMapping("/system/monthly-revenue-chart")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<SystemRevenueResponse>> getSystemRevenueChart() {
        return ResponseEntity.ok(orderService.getSystemRevenueChart());
    }

    // ---SHIPPER---

    // Xem lịch sử đơn giao
    @GetMapping("/shipper/my-orders")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<List<OrderResponse>> getMyShipperOrders(
            @AuthenticationPrincipal String shipperId,
            @RequestParam(required = false) OrderStatus status) {
        return ResponseEntity.ok(orderService.getOrdersByShipper(shipperId, status));
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        try {
            String url = cloudinaryService.uploadImage(file);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Lấy danh sách tuyến khả dụng cho Shipper
    @GetMapping("/shipper/available-routes")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<Page<OrderResponse>> getAvailableRoutes(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @PageableDefault(size = 100) Pageable pageable) {
        return ResponseEntity.ok(orderService.getAvailableRoutesForShipper(lat, lng, pageable));
    }

    // Shipper nhận tuyến giao hàng
    @PatchMapping("/route/{routeId}/accept")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<Map<String, Object>> shipperAcceptRoute(
            @PathVariable String routeId,
            @AuthenticationPrincipal String shipperId) {
        int orderCount = orderService.shipperAcceptRoute(routeId, shipperId);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Bạn đã nhận tuyến " + routeId + " thành công",
                "orderCount", orderCount
        ));
    }

    // Lấy thông tin route
    @GetMapping("/route/{routeId}")
    @PreAuthorize("hasAnyRole('SHIPPER', 'HUB_ADMIN', 'ADMIN')")
    public ResponseEntity<DeliveryRoute> getRouteInfo(@PathVariable String routeId) {
        return ResponseEntity.ok(orderService.getRouteInfo(routeId));
    }

    // Shipper bắt đầu giao hàng
    @PatchMapping("/route/{routeId}/start-delivery")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<Map<String, Object>> shipperStartDelivery(
            @PathVariable String routeId,
            @AuthenticationPrincipal String shipperId) {
        int orderCount = orderService.shipperStartDelivery(routeId, shipperId);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Bắt đầu giao " + orderCount + " đơn trong tuyến " + routeId,
                "orderCount", orderCount
        ));
    }

    // Shipper cập nhật trạng thái giao hàng từng đơn
    @PatchMapping("/{id}/delivery-status")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<OrderResponse> updateDeliveryStatus(
            @PathVariable String id,
            @RequestBody @Valid DeliveryStatusRequest request,
            @AuthenticationPrincipal String shipperId) {
        return ResponseEntity.ok(orderService.updateDeliveryStatus(id, request, shipperId));
    }

    // Shipper trả hàng về Hub nếu không giao được
    @PatchMapping("/{id}/return-to-hub")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<OrderResponse> returnOrderToHub(
            @PathVariable String id,
            @RequestBody ReturnToHubRequest request,
            @AuthenticationPrincipal String shipperId) {
        return ResponseEntity.ok(orderService.returnOrderToHub(id, request, shipperId));
    }

    // ---PAYMENT---
    @GetMapping("/{id}/payment-url")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, String>> getPaymentUrl(
            @PathVariable String id,
            @AuthenticationPrincipal String customerId) {
        String paymentUrl = orderService.getPaymentUrl(id, customerId);
        return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
    }
}