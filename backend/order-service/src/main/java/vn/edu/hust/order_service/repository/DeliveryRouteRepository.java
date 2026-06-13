package vn.edu.hust.order_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.base_domain.constant.RouteStatus;
import vn.edu.hust.order_service.entity.DeliveryRoute;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DeliveryRouteRepository extends JpaRepository<DeliveryRoute, String> {
    List<DeliveryRoute> findByCompletedAtBefore(LocalDateTime cutoffDate);

    List<DeliveryRoute> findByHubIdAndStatus(String hubId, RouteStatus status);
}
