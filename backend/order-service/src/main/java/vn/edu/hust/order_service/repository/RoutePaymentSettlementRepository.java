package vn.edu.hust.order_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.order_service.entity.RoutePaymentSettlement;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface RoutePaymentSettlementRepository extends JpaRepository<RoutePaymentSettlement, String> {

    boolean existsByRouteId(String routeId);

    // Tổng doanh thu theo tháng
    @Query("SELECT COALESCE(SUM(s.totalCollected), 0) FROM RoutePaymentSettlement s " +
            "WHERE s.settledAt >= :from AND s.settledAt < :to")
    BigDecimal sumRevenueInPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Doanh thu 1 Hub cụ thể
    @Query("SELECT COALESCE(SUM(s.totalCollected), 0) FROM RoutePaymentSettlement s " +
            "WHERE s.hubAdminId = :hubAdminId AND s.settledAt >= :from AND s.settledAt < :to")
    BigDecimal sumRevenueByHubAdminInPeriod(
            @Param("hubAdminId") String hubAdminId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // Doanh thu 1 Hub cụ thể
    @Query("SELECT COALESCE(SUM(s.totalCollected), 0) + COALESCE(SUM(s.totalOnlinePrepaid), 0) " +
            "FROM RoutePaymentSettlement s " +
            "WHERE s.hubAdminId = :hubAdminId AND s.settledAt >= :from AND s.settledAt < :to")
    BigDecimal sumTotalRevenueByHubAdminInPeriod(
            @Param("hubAdminId") String hubAdminId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    List<RoutePaymentSettlement> findByHubAdminIdAndSettledAtBetween(
            String hubAdminId, LocalDateTime from, LocalDateTime to);

    List<RoutePaymentSettlement> findBySettledAtBefore(LocalDateTime cutoffDate);

    // Lấy tất cả settlements trong khoảng thời gian
    List<RoutePaymentSettlement> findBySettledAtBetween(LocalDateTime from, LocalDateTime to);
}