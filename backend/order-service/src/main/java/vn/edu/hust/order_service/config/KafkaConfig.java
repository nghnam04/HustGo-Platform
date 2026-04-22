package vn.edu.hust.order_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Value("${app.kafka.topics.order-events}")
    private String orderTopicName;

    @Value("${app.kafka.topics.payment-events}")
    private String paymentTopicName;

    // Bắn các thay đổi trạng thái đơn hàng (Producer)
    @Bean
    public NewTopic orderEventsTopic() {
        return TopicBuilder.name(orderTopicName)
                .partitions(3)
                .replicas(1)
                .build();
    }

    // Nhận kết quả thanh toán (Consumer)
    @Bean
    public NewTopic paymentEventsTopic() {
        return TopicBuilder.name(paymentTopicName)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
