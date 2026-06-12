package vn.edu.hust.tracking_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.tracking_service.entity.TrackingStep;

import java.time.LocalDateTime;
import java.util.List;

public interface TrackingRepository extends JpaRepository<TrackingStep, Long> {
    List<TrackingStep> findByOrderIdOrderByTimestampDesc(String orderId);

    TrackingStep findFirstByOrderIdAndStatusOrderByTimestampDesc(String orderId, String status);

    @Modifying
    @Query("DELETE FROM TrackingStep t WHERE t.orderId IN " +
            "(SELECT DISTINCT ts.orderId FROM TrackingStep ts WHERE ts.status IN ('COMPLETED', 'CANCELLED') AND ts.timestamp < :cutoffDate)")
    int deleteAllForCompletedOrCancelled(@Param("cutoffDate") LocalDateTime cutoffDate);

}
