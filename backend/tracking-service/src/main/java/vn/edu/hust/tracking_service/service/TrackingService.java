package vn.edu.hust.tracking_service.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.tracking_service.entity.TrackingStep;
import vn.edu.hust.tracking_service.repository.TrackingRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingService {

    private final TrackingRepository trackingRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String GEO_TRACKING_KEY = "ACTIVE_SHIPMENTS_LOCATIONS";

    @Transactional
    public void processTrackingUpdate(OrderStatusChangedEvent event) {
        //Lưu lịch sử hành trình lâu dài vào PostgreSQL
        TrackingStep step = TrackingStep.builder()
                .orderId(event.orderId())
                .status(event.newStatus().name())
                .lat(event.receiverLat())
                .lng(event.receiverLng())
                .timestamp(event.timestamp() != null ? event.timestamp() : LocalDateTime.now())
                .note("Trạng thái chuyển sang: " + event.newStatus())
                .build();
        trackingRepository.save(step);

        // Quản lý dữ liệu thời gian thực trên Redis Geo
        String status = event.newStatus().name();

        if ("COMPLETED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status)) {
            redisTemplate.opsForZSet().remove(GEO_TRACKING_KEY, event.orderId());
            log.info("Đã dọn dẹp dữ liệu Redis Geo cho đơn hàng kết thúc: {}", event.orderId());
        } else {
            if (event.receiverLat() != null && event.receiverLng() != null) {
                redisTemplate.opsForGeo().add(
                        GEO_TRACKING_KEY,
                        new Point(event.receiverLng(), event.receiverLat()),
                        event.orderId()
                );
                log.info("Đã cập nhật Redis Geo cho đơn hàng: {} [lng: {}, lat: {}]",
                        event.orderId(), event.receiverLng(), event.receiverLat());
            }
        }
    }

    public List<TrackingStep> getHistory(String orderId) {
        return trackingRepository.findByOrderIdOrderByTimestampDesc(orderId);
    }

    public Map<String, Object> getCurrentLocation(String orderId) {
        List<Point> positions = redisTemplate.opsForGeo().position(GEO_TRACKING_KEY, orderId);

        if (positions != null && !positions.isEmpty()) {
            Point p = positions.get(0);
            return Map.of(
                    "orderId", orderId,
                    "lng", p.getX(),
                    "lat", p.getY()
            );
        }
        return null;
    }
}