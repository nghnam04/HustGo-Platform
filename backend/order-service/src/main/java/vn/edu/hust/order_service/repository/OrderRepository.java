package vn.edu.hust.order_service.repository;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.order_service.entity.Order;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {

    // Lấy danh sách đơn hàng của một khách hàng
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    // Lấy tất cả đơn hàng thuộc cùng 1 chuyến xe
    List<Order> findByRouteId(String routeId);

    // Lọc các đơn đã thu gom (COLLECTED) tại 1 Hub để tạo Transfer Manifest (Super Admin)
    @Query("SELECT o FROM Order o WHERE o.id IN :ids AND o.currentHubId = :hubId AND o.status = 'COLLECTED'")
    List<Order> findCollectedOrdersForTransfer(@Param("ids") List<String> ids, @Param("hubId") String hubId);

    // Cập nhật trạng thái hàng loạt cho tất cả đơn trong 1 Route (Shipper)
    @Modifying
    @Query("UPDATE Order o SET o.status = :newStatus WHERE o.routeId = :routeId AND o.status = :oldStatus")
    int bulkUpdateStatusByRoute(@Param("routeId") String routeId,
                                @Param("newStatus") OrderStatus newStatus,
                                @Param("oldStatus") OrderStatus oldStatus);

    // Tìm danh sách đơn theo trạng thái
    List<Order> findByStatus(OrderStatus status);

    // Xóa tất cả theo trạng thái
    @Modifying
    @Transactional
    void deleteByStatus(OrderStatus status);
}
