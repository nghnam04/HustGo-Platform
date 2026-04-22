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
import org.springframework.web.reactive.function.client.WebClientResponseException;
import vn.edu.hust.base_domain.dto.PaymentEvent;
import vn.edu.hust.payment_service.utils.PaymentUtils;

import java.time.Duration;
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

    public Map<String, Object> initiatePayment(String orderId, String method, Double totalPrice) {

        if (orderId == null || method == null) {
            return Map.of("status", "ERROR", "message", "Invalid input");
        }

        if ("COD".equalsIgnoreCase(method)) {
            publishPaymentEvent(orderId, "SUCCESS", 0.0, "COD");
            return Map.of("status", "SUCCESS");
        } else if ("MOMO".equalsIgnoreCase(method)) {
            return initiateMomoPayment(orderId, totalPrice);
        } else if (totalPrice == null || totalPrice <= 0) {
            return Map.of("status", "ERROR", "message", "Invalid totalPrice");
        }

        if (totalPrice == null || totalPrice <= 0) {
            return Map.of("status", "ERROR", "message", "Invalid totalPrice");
        }

        return initiateMomoPayment(orderId, totalPrice);
    }

    @Retry(name = "${spring.application.name}", fallbackMethod = "fallbackMomo")
    @CircuitBreaker(name = "${spring.application.name}", fallbackMethod = "fallbackMomo")
    private Map<String, Object> initiateMomoPayment(String orderId, double totalPrice) {
        String requestId = String.valueOf(System.currentTimeMillis());
        long amount = (long) totalPrice;

        String orderInfo = "Pay Order_" + orderId;
        String returnUrl = callbackUrl;
        String notifyUrl = callbackUrl;
        String extraData = "";
        String requestType = "captureWallet";

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&ipnUrl=" + notifyUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + returnUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        log.info("Raw Hash: {}", rawHash);
        String signature = PaymentUtils.hmacSHA256(rawHash, secretKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("accessKey", accessKey);
        body.put("requestId", requestId);
        body.put("amount", amount);
        body.put("orderId", orderId);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", returnUrl);
        body.put("ipnUrl", notifyUrl);
        body.put("extraData", extraData);
        body.put("requestType", requestType);
        body.put("signature", signature);
        body.put("lang", "vi");

        try {
            Map responseMomo = webClient.post()
                    .uri(momoEndpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (responseMomo != null && "0".equals(String.valueOf(responseMomo.get("resultCode")))) {

                // 🔥 LOGIC CHẶN LINK CŨ: Lưu lại requestId (orderId có chứa timestamp) mới nhất cho đơn hàng gốc này
                String originalIdForRedis = orderId.contains("-") ? orderId.split("-")[0] : orderId;
                redisTemplate.opsForValue().set("latest_payment_id:" + originalIdForRedis, orderId, Duration.ofDays(1));

                return Map.of(
                        "status", "PENDING",
                        "paymentUrl", responseMomo.get("payUrl"),
                        "orderId", orderId
                );
            } else {
                log.error("MoMo Rejected: {}", responseMomo);
                return Map.of("status", "FAILED", "momo_error", responseMomo);
            }
        } catch (WebClientResponseException e) {
            String errorBody = e.getResponseBodyAsString();
            log.error("MoMo 400 Detail: {}", errorBody);
            return Map.of("status", "ERROR", "momo_detail", errorBody);
        } catch (Exception e) {
            log.error("System Error: {}", e.getMessage());
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }

    public void handlePaymentCallback(Map<String, String> payload) {

        log.info("Callback payload: {}", payload);

        if (payload == null || !payload.containsKey("signature")) {
            log.error("Invalid payload or missing signature");
            return;
        }

        String rawOrderId = payload.get("orderId");
        if (rawOrderId == null) {
            log.error("Missing orderId");
            return;
        }

        String originalOrderId = rawOrderId.contains("-")
                ? rawOrderId.substring(0, rawOrderId.lastIndexOf("-"))
                : rawOrderId;

        // 🔥 IDEMPOTENT - Redis SETNX (atomic)
        String redisKey = "payment:processed:" + rawOrderId;

        Boolean success = redisTemplate.opsForValue()
                .setIfAbsent(redisKey, "true", Duration.ofDays(1));

        if (Boolean.FALSE.equals(success)) {
            log.warn("Duplicate callback ignored: {}", rawOrderId);
            return;
        }

        // VERIFY SIGNATURE
        String receivedSignature = payload.get("signature");

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + payload.get("amount") +
                "&extraData=" + payload.getOrDefault("extraData", "") +
                "&message=" + payload.getOrDefault("message", "") +
                "&orderId=" + rawOrderId +
                "&orderInfo=" + payload.getOrDefault("orderInfo", "") +
                "&orderType=" + payload.getOrDefault("orderType", "") +
                "&partnerCode=" + payload.get("partnerCode") +
                "&payType=" + payload.getOrDefault("payType", "") +
                "&requestId=" + payload.get("requestId") +
                "&responseTime=" + payload.get("responseTime") +
                "&resultCode=" + payload.get("resultCode") +
                "&transId=" + payload.getOrDefault("transId", "");

        String calculatedSignature = PaymentUtils.hmacSHA256(rawHash, secretKey);

        if (!calculatedSignature.equals(receivedSignature)) {
            log.error("Invalid signature!");
            return;
        }

        // 🔥 LOGIC CHẶN LINK CŨ: Kiểm tra xem rawOrderId này có phải là link mới nhất không
        String latestId = redisTemplate.opsForValue().get("latest_payment_id:" + originalOrderId);
        if (latestId != null && !latestId.equals(rawOrderId)) {
            log.warn("CẢNH BÁO: Khách hàng đã thanh toán bằng link CŨ! ID nhận được: {}, ID mới nhất: {}", rawOrderId, latestId);
            // Ở đây bạn có thể chọn publish một event FAILED để Order Service đánh dấu đơn hàng cần kiểm tra,
            // hoặc 그냥 return; để bỏ qua giao dịch này.
            // Nếu muốn bỏ qua hoàn toàn và không cập nhật trạng thái đơn hàng thì uncomment dòng return dưới đây:
            // return;
        }

        String status = "0".equals(payload.get("resultCode")) ? "SUCCESS" : "FAILED";

        double amount;
        try {
            amount = Double.parseDouble(payload.getOrDefault("amount", "0"));
        } catch (Exception e) {
            log.error("Invalid amount format");
            amount = 0;
        }

        publishPaymentEvent(originalOrderId, status, amount, "MOMO");
    }

    private void publishPaymentEvent(String orderId, String status, double amount, String method) {
        PaymentEvent event = new PaymentEvent(orderId, status, amount, method);
        kafkaTemplate.send(paymentTopic, orderId, event);
        log.info(">>> [KAFKA] Order {} status: {}", orderId, status);
    }

    private Map<String, Object> fallbackMomo(String orderId, double totalPrice, Throwable ex) {
        log.error("Fallback MoMo payment {}: {}", orderId, ex.getMessage());

        return Map.of(
                "status", "ERROR",
                "message", "Payment service unavailable"
        );
    }
}