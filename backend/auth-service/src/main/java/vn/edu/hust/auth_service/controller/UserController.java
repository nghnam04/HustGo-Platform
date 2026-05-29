package vn.edu.hust.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.dto.ChangePasswordRequest;
import vn.edu.hust.auth_service.dto.UpdateProfileRequest;
import vn.edu.hust.auth_service.dto.UserProfileResponse;
import vn.edu.hust.auth_service.dto.UserResponse;
import vn.edu.hust.auth_service.service.UserService;
import vn.edu.hust.base_domain.dto.PageResponse;

import java.util.Set;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> getMyProfile(@AuthenticationPrincipal String userId) {
        UserProfileResponse profile = userService.getMyProfile(userId);
        return ResponseEntity.ok(profile);
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @AuthenticationPrincipal String userId,
            @Valid @ModelAttribute UpdateProfileRequest request) {

        UserProfileResponse updatedProfile = userService.updateMyProfile(userId, request);
        return ResponseEntity.ok(updatedProfile);
    }

    @PatchMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> changePassword(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ChangePasswordRequest request) {

        userService.changePassword(userId, request);
        return ResponseEntity.ok("Thay đổi mật khẩu thành công!");
    }

    // Kiểm tra role Hub Admin của user để gán cho Hub
    @GetMapping("/internal/{id}/hub-admin")
    public ResponseEntity<Boolean> isHubAdmin(@PathVariable String id) {
        return ResponseEntity.ok(userService.isHubAdmin(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PageResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(userService.getAllUsers(pageNo, pageSize, sortBy, sortDir, keyword, role));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> getUser(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PatchMapping("/{id}/roles")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateRoles(
            @PathVariable String id,
            @RequestBody Set<RoleEnum> roles) {
        return ResponseEntity.ok(userService.updateUserRoles(id, roles));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("Đã xoá thành công User: " + id);
    }
}