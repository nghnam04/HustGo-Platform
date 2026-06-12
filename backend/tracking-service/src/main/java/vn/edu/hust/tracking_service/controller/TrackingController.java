package vn.edu.hust.tracking_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.tracking_service.dto.ShipperLocationRequest;
import vn.edu.hust.tracking_service.service.TrackingService;

import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    // Lịch sử tracking của đơn
    @GetMapping("/{orderId}/history")
    public ResponseEntity<?> getHistory(@PathVariable String orderId) {
        return ResponseEntity.ok(trackingService.getHistory(orderId));
    }

    // Vị trí đích của đơn hàng
    @GetMapping("/{orderId}/destination")
    public ResponseEntity<?> getOrderDestination(@PathVariable String orderId) {
        Map<String, Object> dest = trackingService.getOrderDestination(orderId);
        return dest != null ? ResponseEntity.ok(dest) : ResponseEntity.notFound().build();
    }

    // Lấy danh sách shipper đang ở gần hub
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    @GetMapping("/shippers/nearby")
    public ResponseEntity<?> getNearbyShippers(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") double radiusKm) {

        return ResponseEntity.ok(
                trackingService.findNearbyShippers(lat, lng, radiusKm)
        );
    }

    // Vị trí realtime shipper đang giao đơn
    @GetMapping("/{orderId}/shipper-location")
    public ResponseEntity<?> getShipperLocationByOrder(@PathVariable String orderId) {
        Map<String, Object> loc = trackingService.getShipperLocationByOrder(orderId);
        return loc != null ? ResponseEntity.ok(loc) : ResponseEntity.notFound().build();
    }

    // Shipper push vị trí của mình
    @PreAuthorize("hasRole('SHIPPER')")
    @PostMapping("/shipper/{shipperId}/location")
    public ResponseEntity<Void> updateShipperLocation(
            @PathVariable String shipperId,
            @RequestBody ShipperLocationRequest request,
            @AuthenticationPrincipal String currentShipperId) {
        if (!shipperId.equals(currentShipperId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        trackingService.updateShipperLocation(shipperId, request.orderId(), request.lat(), request.lng());
        return ResponseEntity.ok().build();
    }
}