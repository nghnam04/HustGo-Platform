package vn.edu.hust.order_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.order_service.dto.FeedbackRequest;
import vn.edu.hust.order_service.dto.FeedbackResponse;
import vn.edu.hust.order_service.service.FeedbackService;

import java.util.List;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (String) authentication.getPrincipal();
    }

    // Tạo feedback
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<FeedbackResponse> createFeedback(
            @RequestBody FeedbackRequest request) {
        String customerId = getCurrentUserId();
        FeedbackResponse response = feedbackService.createFeedback(customerId, request);
        return ResponseEntity.ok(response);
    }

    // Customer xem feedback của mình
    @GetMapping("/my-feedbacks")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<FeedbackResponse>> getMyFeedbacks() {
        String customerId = getCurrentUserId();
        List<FeedbackResponse> feedbacks = feedbackService.getFeedbacksByCustomer(customerId);
        return ResponseEntity.ok(feedbacks);
    }

    // Lấy tất cả Feedback
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<FeedbackResponse>> getAllFeedbacks() {
        List<FeedbackResponse> feedbacks = feedbackService.getAllFeedbacks();
        return ResponseEntity.ok(feedbacks);
    }

    // Lấy feedback theo order ID
    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'SHIPPER', 'HUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<FeedbackResponse>> getFeedbacksByOrder(@PathVariable String orderId) {
        List<FeedbackResponse> feedbacks = feedbackService.getFeedbacksByOrder(orderId);
        return ResponseEntity.ok(feedbacks);
    }

    // Cập nhật Feedback
    @PutMapping("/{feedbackId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<FeedbackResponse> updateFeedback(
            @PathVariable String feedbackId,
            @RequestBody FeedbackRequest request) {
        String customerId = getCurrentUserId();
        FeedbackResponse response = feedbackService.updateFeedback(feedbackId, customerId, request);
        return ResponseEntity.ok(response);
    }

    // Xóa feedback
    @DeleteMapping("/{feedbackId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteFeedback(@PathVariable String feedbackId) {
        String username = getCurrentUserId();
        boolean isSuperAdmin = userHasRole("SUPER_ADMIN");
        feedbackService.deleteFeedback(feedbackId, username, isSuperAdmin);
        return ResponseEntity.noContent().build();
    }

    private boolean userHasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    // Lấy feedback theo ID
    @GetMapping("/{feedbackId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'SUPER_ADMIN')")
    public ResponseEntity<FeedbackResponse> getFeedbackById(@PathVariable String feedbackId) {
        FeedbackResponse response = feedbackService.getFeedbackById(feedbackId);
        return ResponseEntity.ok(response);
    }
}