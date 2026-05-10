package vn.edu.hust.tracking_service.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.tracking_service.entity.TrackingStep;
import vn.edu.hust.tracking_service.repository.TrackingRepository;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TrackingService {

    private final TrackingRepository trackingRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String REDIS_KEY_PREFIX = "order:location:";

    @Transactional
    public void processTrackingUpdate(OrderStatusChangedEvent event) {
        // 1. Lưu lịch sử vào Postgres
        TrackingStep step = TrackingStep.builder()
                .orderId(event.orderId())
                .status(event.newStatus().name())
                .lat(event.receiverLat())
                .lng(event.receiverLng())
                .timestamp(event.timestamp())
                .note("Trạng thái chuyển sang: " + event.newStatus())
                .build();
        trackingRepository.save(step);

        // 2. Cập nhật vị trí hiện tại vào Redis (TTL 24h)
        String redisKey = REDIS_KEY_PREFIX + event.orderId();
        Map<String, Object> locationData = Map.of(
                "lat", event.receiverLat(),
                "lng", event.receiverLng(),
                "status", event.newStatus().name(),
                "updatedAt", event.timestamp().toString()
        );
        redisTemplate.opsForValue().set(redisKey, locationData, Duration.ofHours(24));
    }

    public List<TrackingStep> getHistory(String orderId) {
        return trackingRepository.findByOrderIdOrderByTimestampDesc(orderId);
    }

    public Object getCurrentLocation(String orderId) {
        return redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + orderId);
    }
}
