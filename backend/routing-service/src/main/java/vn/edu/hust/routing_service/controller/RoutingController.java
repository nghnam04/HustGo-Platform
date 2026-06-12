package vn.edu.hust.routing_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.routing_service.dto.OptimizationRequest;
import vn.edu.hust.routing_service.dto.OptimizedRouteResponse;
import vn.edu.hust.routing_service.service.RouteOptimizationService;

@RestController
@RequestMapping("/api/routing")
@RequiredArgsConstructor
public class RoutingController {

    private final RouteOptimizationService routeOptimizationService;

    // Tối ưu tuyến đường
    @PreAuthorize("hasAnyRole('HUB_ADMIN', 'SUPER_ADMIN')")
    @PostMapping("/optimize")
    public ResponseEntity<OptimizedRouteResponse> getOptimizedRoute(
            @RequestBody OptimizationRequest request) {
        if (request.getStartPoint() == null || request.getDeliveryPoints() == null
                || request.getDeliveryPoints().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(routeOptimizationService.optimizeDeliveryRoute(request));
    }

    // Shipper xem trước tuyến đường tối ưu trước khi nhận đơn
    @PreAuthorize("hasAnyRole('SHIPPER', 'HUB_ADMIN')")
    @PostMapping("/route-preview")
    public ResponseEntity<OptimizedRouteResponse> getRoutePreview(
            @RequestBody OptimizationRequest request) {
        if (request.getStartPoint() == null || request.getDeliveryPoints() == null
                || request.getDeliveryPoints().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(routeOptimizationService.optimizeDeliveryRoute(request));
    }
}