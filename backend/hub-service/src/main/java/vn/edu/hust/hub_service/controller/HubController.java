package vn.edu.hust.hub_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.hub_service.entity.Hub;
import vn.edu.hust.hub_service.service.HubService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class HubController {
    private final HubService hubService;

    // Internal API
    @GetMapping("/api/internal/hubs/{id}/exists")
    public boolean checkExists(@PathVariable String id) {
        return hubService.existsById(id);
    }

    // Super Admin API
    // Lấy danh sách tất cả Hub
    @GetMapping("/api/hubs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Hub>> getAllHubs() {
        return ResponseEntity.ok(hubService.getAllHubs());
    }

    // Xem chi tiết 1 Hub
    @GetMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Hub> getHub(@PathVariable String id) {
        return ResponseEntity.ok(hubService.getHubById(id));
    }

    // Tạo mới Hub
    @PostMapping("/api/hubs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Hub> createHub(@RequestBody Hub hub) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(hubService.createHub(hub));
    }

    // Cập nhật Hub
    @PutMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Hub> updateHub(@PathVariable String id, @RequestBody Hub hub) {
        return ResponseEntity.ok(hubService.updateHub(id, hub));
    }

    // Xóa Hub (Soft Delete)
    @DeleteMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteHub(@PathVariable String id) {
        hubService.deleteHub(id);
        return ResponseEntity.noContent().build();
    }
}
