package vn.edu.hust.payment_service.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.payment_service.service.PaymentService;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${payment.frontend.redirect-url}")
    private String frontendRedirectUrl;

    @GetMapping("/initiate/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, Object>> initiatePayment(
            @PathVariable String orderId,
            @RequestParam String method,
            @RequestParam BigDecimal totalPrice,
            @AuthenticationPrincipal String userId) {

        Map<String, Object> result =
                paymentService.initiatePayment(orderId, userId, method, totalPrice);

        return ResponseEntity.ok(result);
    }

    // Momo redirect callback (client-side)
    @GetMapping("/callback")
    public ResponseEntity<Void> paymentCallback(HttpServletRequest request) {

        Map<String, String> payload = new HashMap<>();

        request.getParameterMap()
                .forEach((k, v) -> payload.put(k, v[0]));

        log.info("MOMO REDIRECT CALLBACK");
        log.info("payload = {}", payload);

        paymentService.handlePaymentCallback(payload);

        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, frontendRedirectUrl)
                .build();
    }

    // Momo IPN callback (server-side)
    @PostMapping("/callback")
    public ResponseEntity<String> paymentIpnCallback(
            @RequestBody Map<String, String> payload) {

        log.info("MOMO IPN CALLBACK");
        log.info("payload = {}", payload);

        paymentService.handlePaymentCallback(payload);

        return ResponseEntity.ok("OK");
    }
}