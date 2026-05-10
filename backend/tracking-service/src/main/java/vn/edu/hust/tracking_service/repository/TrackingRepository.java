package vn.edu.hust.tracking_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.tracking_service.entity.TrackingStep;

import java.util.List;

public interface TrackingRepository extends JpaRepository<TrackingStep, Long> {
    List<TrackingStep> findByOrderIdOrderByTimestampDesc(String orderId);
}
