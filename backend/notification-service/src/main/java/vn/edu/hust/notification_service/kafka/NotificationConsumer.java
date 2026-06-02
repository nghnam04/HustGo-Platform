package vn.edu.hust.notification_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.HubEvent;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.base_domain.dto.PaymentEvent;
import vn.edu.hust.base_domain.dto.UserEvent;
import vn.edu.hust.notification_service.dto.NotificationResponse;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    // ================= ORDER =================

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

    // ================= PAYMENT =================

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

    // ================= HUB =================

    @KafkaListener(
            topics = "${app.kafka.topics.hub-events:hub-events}",
            groupId = "notification-group",
            containerFactory = "hubKafkaListenerContainerFactory"
    )
    public void consumeHubEvent(HubEvent event) {
        log.info("Nhận sự kiện Hub => hubId: {}, action: {}, actor: {}",
                event.hubId(), event.action(), event.actorId());

        String message = buildHubMessage(event);

        NotificationResponse response = NotificationResponse.builder()
                .type("HUB")
                .status(event.action())
                .message(message)
                .data(event)
                .build();

        if (event.actorId() != null) {
            messagingTemplate.convertAndSend("/topic/hubs/" + event.actorId(), response);
            log.info("Đã đẩy thông báo WebSocket tới /topic/hubs/{}", event.actorId());
        } else {
            log.warn("Không tìm thấy actorId trong HubEvent, không thể gửi WebSocket!");
        }
    }

    // ================= USER =================

    @KafkaListener(
            topics = "${app.kafka.topics.user-events:user-events}",
            groupId = "notification-group",
            containerFactory = "userKafkaListenerContainerFactory"
    )
    public void consumeUserEvent(UserEvent event) {

        log.info(
                "Nhận UserEvent => userId: {}, action: {}",
                event.userId(),
                event.action()
        );

        NotificationResponse response = NotificationResponse.builder()
                .type("USER")
                .status(event.action())
                .message(event.message())
                .data(event)
                .build();

        if (event.userId() != null) {

            messagingTemplate.convertAndSend(
                    "/topic/users/" + event.userId(),
                    response
            );

            log.info(
                    "Đã đẩy WebSocket tới /topic/users/{}",
                    event.userId()
            );

        } else {

            log.warn(
                    "UserEvent không có userId, không thể gửi WebSocket"
            );
        }
    }

    private String buildHubMessage(HubEvent event) {
        String hubInfo = event.hubName() + " (" + event.hubCode() + ")";
        return switch (event.action()) {
            case "CREATED" -> "Hub " + hubInfo + " đã được tạo thành công";
            case "UPDATED" -> "Hub " + hubInfo + " đã được cập nhật";
            case "DELETED" -> "Hub " + hubInfo + " đã bị vô hiệu hóa";
            case "MANAGER_ASSIGNED" -> "Hub " + hubInfo + " đã được gán quản lý mới";
            default -> "Hub " + hubInfo + " có cập nhật mới: " + event.action();
        };
    }
}