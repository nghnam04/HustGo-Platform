package vn.edu.hust.hub_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.base_domain.dto.PageResponse;
import vn.edu.hust.hub_service.dto.AssignManagerRequest;
import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
import vn.edu.hust.hub_service.service.HubService;

@RestController
@RequiredArgsConstructor
public class HubController {

    private final HubService hubService;

    // ==================== Internal API ====================

    @GetMapping("/api/internal/hubs/{id}/exists")
    public boolean checkExists(@PathVariable String id) {
        return hubService.existsById(id);
    }

    // ==================== Super Admin API ====================

    // Lấy danh sách tất cả Hub
    @GetMapping("/api/hubs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PageResponse<HubResponse>> getAllHubs(
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(
                hubService.getAllHubs(pageNo, pageSize, sortBy, sortDir, keyword)
        );
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
    public ResponseEntity<HubResponse> createHub(
            @RequestBody HubRequest request,
            @AuthenticationPrincipal String actorId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(hubService.createHub(request, actorId));
    }

    // Gán quản lý cho Hub
    @PatchMapping("/api/hubs/{id}/assign-manager")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<HubResponse> assignManager(
            @PathVariable String id,
            @RequestBody AssignManagerRequest request,
            @AuthenticationPrincipal String actorId
    ) {
        return ResponseEntity.ok(
                hubService.assignManager(id, request.managerId(), actorId)
        );
    }

    // Cập nhật Hub
    @PutMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<HubResponse> updateHub(
            @PathVariable String id,
            @RequestBody HubRequest request,
            @AuthenticationPrincipal String actorId
    ) {
        return ResponseEntity.ok(hubService.updateHub(id, request, actorId));
    }

    // Xóa Hub (Soft Delete)
    @DeleteMapping("/api/hubs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> deleteHub(
            @PathVariable String id,
            @AuthenticationPrincipal String actorId
    ) {
        hubService.deleteHub(id, actorId);
        return ResponseEntity.ok("Đã xoá thành công Hub: " + id);
    }

    // ==================== Hub Admin API ====================

    @GetMapping("/api/hubs/me")
    @PreAuthorize("hasRole('HUB_ADMIN')")
    public ResponseEntity<HubResponse> getMyHub(
            @AuthenticationPrincipal String adminId
    ) {
        return ResponseEntity.ok(hubService.getHubByManager(adminId));
    }
}