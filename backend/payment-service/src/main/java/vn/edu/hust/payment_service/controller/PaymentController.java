package vn.edu.hust.payment_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.payment_service.service.PaymentService;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/initiate/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, Object>> initiatePayment(
            @PathVariable String orderId,
            @RequestParam String method,
            @RequestParam Double totalPrice,
            @AuthenticationPrincipal String userId) {

        Map<String, Object> result = paymentService.initiatePayment(orderId, method, totalPrice);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/callback")
    public ResponseEntity<String> paymentCallback(@RequestBody Map<String, String> payload) {
        paymentService.handlePaymentCallback(payload);
        return ResponseEntity.ok("OK");
    }
}