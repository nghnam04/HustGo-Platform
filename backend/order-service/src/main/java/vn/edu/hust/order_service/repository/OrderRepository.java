package vn.edu.hust.order_service.repository;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.order_service.entity.Order;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {

    // Lấy danh sách đơn hàng của một khách hàng
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    // Lấy tất cả đơn hàng thuộc cùng 1 chuyến xe
    List<Order> findByRouteId(String routeId);

    // Lấy tất cả đơn hàng thuộc nhiều tuyến
    List<Order> findByRouteIdIn(List<String> routeIds);

    // Lọc các đơn đã thu gom để tạo chuyến trung chuyển
    @Query("SELECT o FROM Order o WHERE o.id IN :ids AND o.currentHubId = :hubId AND o.status = :status")
    List<Order> findCollectedOrdersForTransfer(@Param("ids") List<String> ids, @Param("hubId") String hubId, @Param("status") OrderStatus status);

    // Lấy tất cả đơn hàng đang có mặt tại 1 Hub cụ thể
    Page<Order> findByCurrentHubId(String currentHubId, Pageable pageable);

    // Lọc đơn hàng tại Hub theo trạng thái
    Page<Order> findByCurrentHubIdAndStatus(String currentHubId, OrderStatus status, Pageable pageable);

    // Cập nhật trạng thái cho tất cả đơn trong 1 Route
    @Modifying
    @Query("UPDATE Order o SET o.status = :newStatus WHERE o.routeId = :routeId AND o.status = :oldStatus")
    int bulkUpdateStatusByRoute(@Param("routeId") String routeId,
                                @Param("newStatus") OrderStatus newStatus,
                                @Param("oldStatus") OrderStatus oldStatus);

    List<Order> findByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime date);

    @Modifying
    @Transactional
    void deleteByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime date);

    List<Order> findByPaymentMethodAndStatusAndCreatedAtBefore(
            PaymentMethod paymentMethod,
            OrderStatus status,
            LocalDateTime dateTime
    );

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByCustomerId(String customerId, Pageable pageable);

    Page<Order> findByStatusAndCustomerId(
            OrderStatus status,
            String customerId,
            Pageable pageable);

    List<Order> findByRouteIdAndStatus(String routeId, OrderStatus status);

    // Lấy đơn của shipper theo status
    List<Order> findByShipperIdAndStatus(String shipperId, OrderStatus status);

    // Lấy đơn của shipper theo nhiều status
    List<Order> findByShipperIdAndStatusIn(String shipperId, List<OrderStatus> statuses);

    // Lấy tuyến available chưa có shipper nhận
    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.routeId IS NOT NULL AND o.shipperId IS NULL")
    Page<Order> findAvailableForShipper(@Param("status") OrderStatus status, Pageable pageable);

    // Lấy các đơn IN_TRANSIT đang chờ nhập kho tại hub đích
    List<Order> findByTargetHubIdAndStatus(String targetHubId, OrderStatus status);

    // Lấy đơn COMPLETED của shipper trong khoảng thời gian
    @Query("SELECT o FROM Order o WHERE o.shipperId = :shipperId AND o.status = 'COMPLETED' " +
            "AND o.updatedAt >= :from AND o.updatedAt < :to")
    List<Order> findCompletedByShipperIdAndDateRange(
            @Param("shipperId") String shipperId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
