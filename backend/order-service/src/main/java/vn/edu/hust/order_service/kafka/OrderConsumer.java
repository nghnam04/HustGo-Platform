package vn.edu.hust.order_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.PaymentEvent;
import vn.edu.hust.order_service.service.OrderService;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderConsumer {

    private final OrderService orderService;

    @KafkaListener(topics = "${app.kafka.topics.payment-events}", groupId = "order-service-group")
    public void listenPaymentEvents(PaymentEvent event) {
        log.info("Nhận được sự kiện thanh toán cho đơn hàng: {} với trạng thái: {}",
                event.orderId(), event.status());

        if ("SUCCESS".equalsIgnoreCase(event.status())) {
            orderService.handlePaymentCompleted(event.orderId());
        } else {
            log.warn("Thanh toán thất bại cho đơn hàng: {}", event.orderId());
        }
    }
}