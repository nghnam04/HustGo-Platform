package vn.edu.hust.tracking_service.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.*;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.dto.OrderStatusChangedEvent;
import vn.edu.hust.tracking_service.entity.TrackingStep;
import vn.edu.hust.tracking_service.repository.TrackingRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingService {

    private final TrackingRepository trackingRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    // Key Redis lưu vị trí REALTIME của shipper: "SHIPPER_LOCATION:{shipperId}"
    private static final String SHIPPER_LOCATION_KEY = "SHIPPER_LOCATION:";

    // Key Redis lưu vị trí tọa độ đích của đơn hàng (tĩnh): "ORDER_DEST:{orderId}"
    private static final String ORDER_DEST_KEY = "ORDER_DEST:";


    // Ghi lại lịch sử Tracking vào Database
    @Transactional
    public void processTrackingUpdate(OrderStatusChangedEvent event) {
        String locationName = resolveLocationName(event);
        String note = buildNote(event);

        TrackingStep step = TrackingStep.builder()
                .orderId(event.orderId())
                .shipperId(event.shipperId())
                .status(event.newStatus().name())
                .locationName(locationName)
                .lat(event.receiverLat())
                .lng(event.receiverLng())
                .note(note)
                .timestamp(event.timestamp() != null ? event.timestamp() : LocalDateTime.now())
                .build();
        trackingRepository.save(step);

        // Lưu tọa độ đích đơn hàng vào Redis (TTL 7 ngày)
        if (event.receiverLat() != null && event.receiverLng() != null) {
            String destKey = ORDER_DEST_KEY + event.orderId();
            redisTemplate.opsForHash().put(destKey, "lat", event.receiverLat());
            redisTemplate.opsForHash().put(destKey, "lng", event.receiverLng());
            redisTemplate.opsForHash().put(destKey, "status", event.newStatus().name());
            redisTemplate.expire(destKey, 7, TimeUnit.DAYS);
        }

        log.info("Tracking step saved: orderId={}, status={}", event.orderId(), event.newStatus());
    }


    // Shipper push vị trí realtime của mình lên
    public void updateShipperLocation(String shipperId, String orderId, double lat, double lng) {
        redisTemplate.opsForGeo().add(
                "ACTIVE_SHIPPERS",
                new Point(lng, lat),
                shipperId
        );

        String key = SHIPPER_LOCATION_KEY + shipperId;
        redisTemplate.opsForHash().put(key, "lat", String.valueOf(lat));
        redisTemplate.opsForHash().put(key, "lng", String.valueOf(lng));
        redisTemplate.opsForHash().put(key, "orderId", orderId);
        redisTemplate.opsForHash().put(key, "updatedAt", LocalDateTime.now().toString());
        redisTemplate.expire(key, 1, TimeUnit.HOURS);

        log.info("Shipper {} realtime location updated: [{}, {}], orderId: {}", shipperId, lat, lng, orderId);
    }


    // Lấy vị trí realtime shipper đang giao đơn
    public Map<String, Object> getShipperLocationByOrder(String orderId) {
        TrackingStep latest = trackingRepository
                .findFirstByOrderIdAndStatusOrderByTimestampDesc(orderId, "DELIVERING");

        if (latest == null || latest.getShipperId() == null) return null;

        return getShipperLocation(latest.getShipperId());
    }


    // Lấy vị trí realtime shipper theo shipperId
    public Map<String, Object> getShipperLocation(String shipperId) {
        String key = SHIPPER_LOCATION_KEY + shipperId;
        Map<Object, Object> data = redisTemplate.opsForHash().entries(key);
        if (data == null || data.isEmpty()) return null;

        return Map.of(
                "shipperId", shipperId,
                "lat", Double.parseDouble(String.valueOf(data.get("lat"))),
                "lng", Double.parseDouble(String.valueOf(data.get("lng"))),
                "orderId", data.getOrDefault("orderId", ""),
                "updatedAt", data.getOrDefault("updatedAt", "")
        );
    }

    public List<TrackingStep> getHistory(String orderId) {
        return trackingRepository.findByOrderIdOrderByTimestampDesc(orderId);
    }


    // Lấy vị trí nhận của đơn
    public Map<String, Object> getOrderDestination(String orderId) {
        String key = ORDER_DEST_KEY + orderId;
        Map<Object, Object> data = redisTemplate.opsForHash().entries(key);
        if (data == null || data.isEmpty()) return null;

        return Map.of(
                "orderId", orderId,
                "lat", data.get("lat"),
                "lng", data.get("lng"),
                "status", data.getOrDefault("status", "")
        );
    }

    // Tìm Shipper trong vòng bán kính 5km từ Hub
    public List<Map<String, Object>> findNearbyShippers(
            double lat,
            double lng,
            double radiusKm) {

        GeoResults<RedisGeoCommands.GeoLocation<Object>> results =
                redisTemplate.opsForGeo().radius(
                        "ACTIVE_SHIPPERS",
                        new Circle(new Point(lng, lat), new Distance(radiusKm, Metrics.KILOMETERS))
                );

        if (results == null) {
            return List.of();
        }

        return results.getContent()
                .stream()
                .map(r -> {
                    String shipperId = String.valueOf(r.getContent().getName());

                    Map<String, Object> location = getShipperLocation(shipperId);

                    return Map.of(
                            "shipperId", shipperId,
                            "distanceKm",
                            r.getDistance() != null
                                    ? r.getDistance().getValue()
                                    : 0,
                            "location", location
                    );
                })
                .toList();
    }

    // Helper
    // Xác định tên địa điểm theo status
    private String resolveLocationName(OrderStatusChangedEvent event) {
        if (event.newStatus() == null) return "Không xác định";
        return switch (event.newStatus()) {
            case COLLECTED -> "Hub gửi: " + (event.currentHubId() != null ? event.currentHubId() : "");
            case IN_TRANSIT -> "Đang trên đường trung chuyển";
            case AT_HUB -> "Hub đích: " + (event.currentHubId() != null ? event.currentHubId() : "");
            case PICKING -> "Shipper đang đến hub lấy hàng";
            case DELIVERING ->
                    "Đang giao đến: " + (event.receiverLat() != null ? event.receiverLat() + "," + event.receiverLng() : "");
            case COMPLETED -> "Đã giao thành công";
            case RETURNING -> "Đang hoàn hàng về người gửi";
            case CANCELLED -> "Đã hủy";
            default -> event.newStatus().name();
        };
    }

    // Tạo note
    private String buildNote(OrderStatusChangedEvent event) {
        return "Trạng thái: " + event.oldStatus() + " → " + event.newStatus()
                + (event.shipperId() != null ? " | Shipper: " + event.shipperId() : "");
    }

    // Scheduler

    // Xoá toàn bộ TrackingStep của đơn COMPLETED/CANCELLED cũ hơn 6 tháng
    @Scheduled(cron = "0 25 1 * * *")  // 1:25 AM
    @Transactional
    public void cleanupOldTrackingSteps() {
        log.info("DỌN DẸP TRACKING STEP CỦA ĐƠN COMPLETED/CANCELLED CŨ HƠN 6 THÁNG");
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);
            int deleted = trackingRepository.deleteAllForCompletedOrCancelled(cutoffDate);
            log.info("Đã xóa {} tracking steps của đơn COMPLETED/CANCELLED cũ", deleted);
        } catch (Exception e) {
            log.error("Lỗi dọn dẹp tracking steps cũ", e);
        }
    }
}