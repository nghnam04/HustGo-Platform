package vn.edu.hust.order_service.repository;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import vn.edu.hust.order_service.entity.OrderStatusHistory;

import java.util.List;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, String> {
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAsc(String orderId);

    @Modifying
    @Transactional
    void deleteByOrderIdIn(List<String> orderIds);
}
