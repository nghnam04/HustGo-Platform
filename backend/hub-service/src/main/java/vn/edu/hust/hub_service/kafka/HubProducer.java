package vn.edu.hust.hub_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.HubEvent;

@Slf4j
@Service
@RequiredArgsConstructor
public class HubProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.hub-events:hub-events}")
    private String hubEventsTopic;

    public void publishHubEvent(HubEvent event) {
        try {
            kafkaTemplate.send(hubEventsTopic, event.hubId(), event);
            log.info("Đã đẩy HubEvent lên Kafka => hubId: {}, action: {}", event.hubId(), event.action());
        } catch (Exception e) {
            log.error("Lỗi khi đẩy HubEvent lên Kafka => hubId: {}, action: {}", event.hubId(), event.action(), e);
        }
    }
}