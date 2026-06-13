package vn.edu.hust.order_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.base_domain.dto.RouteCompletedEvent;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderProducer {

    private final KafkaTemplate<String, OrderStatusChangedEvent> kafkaTemplate;
    private final KafkaTemplate<String, RouteCompletedEvent> routeKafkaTemplate;

    @Value("${app.kafka.topics.order-events}")
    private String orderEventsTopic;

    @Value("${app.kafka.topics.route-events}")
    private String routeEventsTopic;

    public void publishStatusChanged(OrderStatusChangedEvent event) {
        log.info("Chuẩn bị gửi Kafka Event - Đơn hàng: {} chuyển sang trạng thái: {}",
                event.orderId(), event.newStatus());

        Message<OrderStatusChangedEvent> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, orderEventsTopic)
                .setHeader(KafkaHeaders.KEY, event.orderId())
                .build();

        kafkaTemplate.send(message);
        log.info("Đã gửi thành công Kafka Event cho đơn hàng: {}", event.orderId());
    }

    public void publishRouteCompleted(RouteCompletedEvent event) {
        log.info("Chuẩn bị gửi Kafka Event - Tuyến {} hoàn thành", event.routeId());

        Message<RouteCompletedEvent> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, routeEventsTopic)
                .setHeader(KafkaHeaders.KEY, event.routeId())
                .build();

        routeKafkaTemplate.send(message);
        log.info("Đã gửi thành công Kafka Event cho tuyến: {}", event.routeId());
    }
}