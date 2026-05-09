package vn.edu.hust.notification_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.base_domain.dto.PaymentEvent;
import vn.edu.hust.notification_service.dto.NotificationResponse;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "${app.kafka.topics.order-events:order-events}", groupId = "notification-group")
    public void consumeOrderEvent(OrderStatusChangedEvent event) {
        log.info("Nhận sự kiện Order => ID: {}, Status: {}", event.orderId(), event.newStatus());

        NotificationResponse response = NotificationResponse.builder()
                .type("ORDER")
                .status(event.newStatus().name())
                .message("Đơn hàng " + event.orderId() + " hiện đang: " + event.newStatus())
                .data(event)
                .build();

        if (event.customerId() != null) {
            messagingTemplate.convertAndSend("/topic/orders/" + event.customerId(), response);
            log.info("Đã đẩy thông báo WebSocket tới /topic/orders/{}", event.customerId());
        } else {
            log.warn("Không tìm thấy customerId trong OrderStatusChangedEvent, không thể gửi WebSocket!");
        }
    }

    @KafkaListener(topics = "${app.kafka.topics.payment-events:payment-events}", groupId = "notification-group")
    public void consumePayment(PaymentEvent event) {
        log.info("Nhận sự kiện thanh toán => OrderId: {}, Status: {}, Customer: {}",
                event.orderId(), event.status(), event.customerId());

        String statusMsg = "SUCCESS".equalsIgnoreCase(event.status()) ? "thành công" : "thất bại";

        NotificationResponse response = NotificationResponse.builder()
                .type("PAYMENT")
                .status(event.status())
                .message(String.format("Thanh toán cho đơn hàng %s đã %s.", event.orderId(), statusMsg))
                .data(event)
                .build();

        if (event.customerId() != null) {
            messagingTemplate.convertAndSend("/topic/payments/" + event.customerId(), response);
            log.info("Đã đẩy thông báo WebSocket tới /topic/payments/{}", event.customerId());
        } else {
            log.warn("Không tìm thấy customerId trong PaymentEvent, không thể gửi WebSocket!");
        }
    }
}