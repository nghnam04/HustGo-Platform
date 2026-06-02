package vn.edu.hust.auth_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.UserEvent;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.user-events:user-events}")
    private String userEventsTopic;

    public void publishUserEvent(UserEvent event) {
        try {
            kafkaTemplate.send(userEventsTopic, event.userId(), event);
            log.info("Đã đẩy UserEvent lên Kafka => userId: {}, action: {}", event.userId(), event.action());
        } catch (Exception e) {
            log.error("Lỗi khi đẩy UserEvent lên Kafka => userId: {}, action: {}", event.userId(), event.action(), e);
        }
    }
}