package vn.edu.hust.tracking_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.tracking_service.service.TrackingService;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingConsumer {

    private final TrackingService trackingService;

    @KafkaListener(topics = "${app.kafka.topics.order-events}", groupId = "tracking-group")
    public void consume(OrderStatusChangedEvent event) {
        log.info("Nhận sự kiện tracking cho đơn hàng: {}", event.orderId());
        trackingService.processTrackingUpdate(event);
    }
}
