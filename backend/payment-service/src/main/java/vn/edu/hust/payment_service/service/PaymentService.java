package vn.edu.hust.payment_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import vn.edu.hust.base_domain.dto.PaymentEvent;
import vn.edu.hust.payment_service.utils.PaymentUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final KafkaTemplate<String, PaymentEvent> kafkaTemplate;
    private final WebClient webClient;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.kafka.topics.payment-events}")
    private String paymentTopic;

    @Value("${payment.momo.endpoint}")
    private String momoEndpoint;

    @Value("${payment.momo.partner-code}")
    private String partnerCode;

    @Value("${payment.momo.access-key}")
    private String accessKey;

    @Value("${payment.momo.secret-key}")
    private String secretKey;

    @Value("${payment.momo.callback-url}")
    private String callbackUrl;

    @Value("${payment.frontend.redirect-url}")
    private String frontendRedirectUrl;

    @Value("${payment.mock.enabled:false}")
    private boolean mockEnabled;

    public Map<String, Object> initiatePayment(String orderId,
                                               String customerId,
                                               String method,
                                               BigDecimal totalPrice) {
        if (orderId == null || method == null) {
            return Map.of("status", "ERROR", "message", "Invalid input");
        }

        if ("COD".equalsIgnoreCase(method)) {
            publishPaymentEvent(orderId, customerId, "SUCCESS", BigDecimal.ZERO, "COD");
            return Map.of("status", "SUCCESS");
        }

        if (!"MOMO".equalsIgnoreCase(method)) {
            return Map.of("status", "ERROR", "message", "Invalid method");
        }

        return initiateMomoPayment(orderId, customerId, totalPrice);
    }

    @Retry(name = "${spring.application.name}", fallbackMethod = "fallbackMomo")
    @CircuitBreaker(name = "${spring.application.name}", fallbackMethod = "fallbackMomo")
    private Map<String, Object> initiateMomoPayment(String orderId,
                                                    String customerId,
                                                    BigDecimal totalPrice) {

        log.info("MOMO INIT START");

        String requestId = String.valueOf(System.currentTimeMillis());

        // unique MoMo orderId
        String paymentOrderId = orderId + "-" + requestId;

        // Chuẩn hoá số tiền
        BigDecimal amountDecimal = totalPrice.setScale(0, RoundingMode.HALF_UP);
        long amount = amountDecimal.longValueExact();
        String amountStr = String.valueOf(amount);

        String orderInfo = "PayOrder_" + orderId;

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + amountStr +
                "&extraData=" + customerId +
                "&ipnUrl=" + callbackUrl +
                "&orderId=" + paymentOrderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + callbackUrl +
                "&requestId=" + requestId +
                "&requestType=payWithATM";

        String signature = PaymentUtils.hmacSHA256(rawHash, secretKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("accessKey", accessKey);
        body.put("requestId", requestId);
        body.put("amount", amount);
        body.put("orderId", paymentOrderId);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", callbackUrl);
        body.put("ipnUrl", callbackUrl);
        body.put("extraData", customerId);
        body.put("requestType", "payWithATM");
        body.put("signature", signature);
        body.put("lang", "vi");

        try {
            Map res = webClient.post()
                    .uri(momoEndpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (res == null) {
                return Map.of("status", "ERROR", "message", "Null response");
            }

            if ("0".equals(String.valueOf(res.get("resultCode")))) {

                redisTemplate.opsForValue().set(
                        "momo_request:" + orderId,
                        requestId,
                        Duration.ofDays(1)
                );

                // Lưu mapping paymentOrderId → orderId gốc để callback tra cứu
                redisTemplate.opsForValue().set(
                        "momo_orderid_map:" + paymentOrderId,
                        orderId,
                        Duration.ofDays(1)
                );

                log.info("[MOMO SUCCESS] payment created OK");

                // Dev mock payment
                if (mockEnabled) {
                    log.warn("MOCK PAYMENT ENABLED");

                    String mockOrderId = paymentOrderId;

                    new Thread(() -> {
                        try {
                            Thread.sleep(5000);

                            Map<String, String> fakeCallback = new HashMap<>();
                            fakeCallback.put("orderId", mockOrderId);
                            fakeCallback.put("resultCode", "0");
                            fakeCallback.put("amount", amountStr);
                            fakeCallback.put("extraData", customerId);
                            fakeCallback.put("message", "Mock success");
                            fakeCallback.put("signature", "MOCK");

                            log.warn("[MOCK CALLBACK TRIGGER] {}", fakeCallback);

                            handlePaymentCallback(fakeCallback);

                        } catch (Exception e) {
                            log.error("[MOCK CALLBACK ERROR]", e);
                        }
                    }).start();
                }

                return Map.of(
                        "status", "PENDING",
                        "paymentUrl", res.get("payUrl"),
                        "orderId", orderId
                );
            }
            return Map.of("status", "FAILED", "momo_error", res);

        } catch (Exception e) {
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }

    // Callback từ MoMo sau khi khách thanh toán xong
    public void handlePaymentCallback(Map<String, String> payload) {

        log.info("MOMO CALLBACK");

        try {
            String paymentOrderId = payload.get("orderId");
            String receivedSignature = payload.get("signature");

            if (paymentOrderId == null) return;

            String redisKey = "payment:processed:" + paymentOrderId;

            Boolean first = redisTemplate.opsForValue()
                    .setIfAbsent(redisKey, "1", Duration.ofDays(1));

            if (Boolean.FALSE.equals(first)) {
                log.warn("[CALLBACK] Đã xử lý rồi, bỏ qua: {}", paymentOrderId);
                return;
            }

            String orderId = redisTemplate.opsForValue().get("momo_orderid_map:" + paymentOrderId);
            if (orderId == null) {
                orderId = paymentOrderId.replaceAll("-\\d{13}$", "");
                log.warn("[CALLBACK] Không tìm thấy Redis mapping, fallback orderId: {}", orderId);
            } else {
                log.info("[CALLBACK] Resolved orderId: {} ← paymentOrderId: {}", orderId, paymentOrderId);
            }

            String rawHash = "accessKey=" + accessKey +
                    "&amount=" + payload.getOrDefault("amount", "0") +
                    "&extraData=" + payload.getOrDefault("extraData", "") +
                    "&message=" + payload.getOrDefault("message", "") +
                    "&orderId=" + paymentOrderId +
                    "&orderInfo=" + payload.getOrDefault("orderInfo", "") +
                    "&orderType=" + payload.getOrDefault("orderType", "") +
                    "&partnerCode=" + payload.getOrDefault("partnerCode", "") +
                    "&payType=" + payload.getOrDefault("payType", "") +
                    "&requestId=" + payload.getOrDefault("requestId", "") +
                    "&responseTime=" + payload.getOrDefault("responseTime", "") +
                    "&resultCode=" + payload.getOrDefault("resultCode", "") +
                    "&transId=" + payload.getOrDefault("transId", "");

            String calc = PaymentUtils.hmacSHA256(rawHash, secretKey);

            // bỏ check signature nếu mock
            if (!"MOCK".equals(receivedSignature)) {
                if (calc == null || !calc.equals(receivedSignature)) {
                    log.error("[CALLBACK ERROR] INVALID SIGNATURE");
                    return;
                }
            }

            String status = "0".equals(payload.get("resultCode"))
                    ? "SUCCESS"
                    : "FAILED";

            BigDecimal amount = new BigDecimal(payload.getOrDefault("amount", "0"));
            
            publishPaymentEvent(
                    orderId,
                    payload.getOrDefault("extraData", ""),
                    status,
                    amount,
                    "MOMO"
            );

            log.info("[CALLBACK DONE] orderId={}", orderId);

        } catch (Exception e) {
            log.error("[CALLBACK EXCEPTION]", e);
        }
    }

    private void publishPaymentEvent(String orderId,
                                     String customerId,
                                     String status,
                                     BigDecimal amount,
                                     String method) {

        PaymentEvent event = new PaymentEvent(
                orderId,
                customerId,
                status,
                amount,
                method
        );

        kafkaTemplate.send(paymentTopic, orderId, event);
    }

    private Map<String, Object> fallbackMomo(String orderId,
                                             String customerId,
                                             BigDecimal totalPrice,
                                             Throwable ex) {
        log.error("[FALLBACK MOMO]", ex);
        return Map.of("status", "ERROR", "message", "Payment service down");
    }
}