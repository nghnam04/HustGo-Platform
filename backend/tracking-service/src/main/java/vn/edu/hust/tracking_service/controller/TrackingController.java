package vn.edu.hust.tracking_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.tracking_service.service.TrackingService;

import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    @PreAuthorize("hasAnyRole('CUSTOMER', 'SHIPPER', 'HUB_ADMIN', 'SUPER_ADMIN')")
    @GetMapping("/{orderId}/history")
    public ResponseEntity<?> getHistory(@PathVariable String orderId) {
        return ResponseEntity.ok(trackingService.getHistory(orderId));
    }

    @PreAuthorize("hasAnyRole('CUSTOMER', 'SHIPPER', 'HUB_ADMIN', 'SUPER_ADMIN')")
    @GetMapping("/{orderId}/current")
    public ResponseEntity<?> getCurrentLocation(@PathVariable String orderId) {
        Map<String, Object> location = trackingService.getCurrentLocation(orderId);
        if (location == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(location);
    }
}