package vn.edu.hust.order_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.base_domain.constant.FeedbackType;
import vn.edu.hust.order_service.entity.Feedback;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, String> {

    // Lấy feedback cho đơn hàng
    List<Feedback> findByOrderId(String orderId);

    // Lấy feedback cho customer
    List<Feedback> findByCustomerId(String customerId);

    // Check customer đã submit feedback cho đơn hàng chưa
    boolean existsByOrderIdAndCustomerId(String orderId, String customerId);

    // lấy feed back theo tuyến
    List<Feedback> findByRouteId(String routeId);

    // Lấy feedback theo loại
    List<Feedback> findByType(FeedbackType type);

    @Query("SELECT f FROM Feedback f WHERE f.deletedAt IS NOT NULL AND f.deletedAt < :date")
    List<Feedback> findByDeletedAtBefore(@Param("date") LocalDateTime date);

}