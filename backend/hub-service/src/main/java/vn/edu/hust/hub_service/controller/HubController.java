package vn.edu.hust.hub_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
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
    public ResponseEntity<List<HubResponse>> getAllHubs() {
        return ResponseEntity.ok(hubService.getAllHubs());
    }

    // Xem chi tiết 1 Hub
    @GetMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<HubResponse> getHub(@PathVariable String id) {
        return ResponseEntity.ok(hubService.getHubById(id));
    }

    // Tạo mới Hub
    @PostMapping("/api/hubs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<HubResponse> createHub(@RequestBody HubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(hubService.createHub(request));
    }

    // Cập nhật Hub
    @PutMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<HubResponse> updateHub(@PathVariable String id, @RequestBody HubRequest request) {
        return ResponseEntity.ok(hubService.updateHub(id, request));
    }

    // Xóa Hub (Soft Delete)
    @DeleteMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> deleteHub(@PathVariable String id) {
        hubService.deleteHub(id);
        return ResponseEntity.ok("Đã xoá thành công Hub: " + id);
    }
}
