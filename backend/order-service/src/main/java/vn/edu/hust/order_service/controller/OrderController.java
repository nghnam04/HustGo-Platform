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
import vn.edu.hust.order_service.dto.*;
import vn.edu.hust.order_service.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

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
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable String id,
            @AuthenticationPrincipal String customerId) {
        return ResponseEntity.ok(orderService.cancelOrder(id, customerId));
    }

    // ================= COMMON (XEM ĐƠN & LỊCH SỬ) =================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'HUB_ADMIN', 'SUPER_ADMIN', 'SHIPPER')")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'HUB_ADMIN', 'SUPER_ADMIN', 'SHIPPER')")
    public ResponseEntity<List<OrderStatusHistoryResponse>> getOrderHistory(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderHistory(id));
    }

    // ================= HUB ADMIN =================

    @PatchMapping("/{id}/arrive-hub")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<OrderResponse> arriveAtHub(
            @PathVariable String id,
            @RequestBody ArriveAtHubRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(orderService.arriveAtHub(id, request, adminId));
    }

    // ================= SUPER ADMIN =================

    @PostMapping("/transfer")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TransferManifestResponse> createTransferManifest(
            @RequestBody @Valid TransferManifestRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createTransferManifest(request, adminId));
    }

    // ---SHIPPER---

    @PatchMapping("/route/{routeId}/pickup")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<Void> shipperPickupRoute(
            @PathVariable String routeId,
            @AuthenticationPrincipal String shipperId) {
        orderService.shipperPickupRoute(routeId, shipperId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/delivery-status")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<OrderResponse> updateDeliveryStatus(
            @PathVariable String id,
            @RequestBody @Valid DeliveryStatusRequest request,
            @AuthenticationPrincipal String shipperId) {
        return ResponseEntity.ok(orderService.updateDeliveryStatus(id, request, shipperId));
    }
}