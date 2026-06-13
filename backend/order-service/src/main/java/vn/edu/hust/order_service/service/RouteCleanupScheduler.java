package vn.edu.hust.order_service.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.edu.hust.order_service.entity.DeliveryRoute;
import vn.edu.hust.order_service.entity.Order;
import vn.edu.hust.order_service.entity.RoutePaymentSettlement;
import vn.edu.hust.order_service.entity.TransferManifest;
import vn.edu.hust.order_service.repository.DeliveryRouteRepository;
import vn.edu.hust.order_service.repository.OrderRepository;
import vn.edu.hust.order_service.service.FeedbackService;
import vn.edu.hust.order_service.repository.RoutePaymentSettlementRepository;
import vn.edu.hust.order_service.repository.TransferManifestRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteCleanupScheduler {

    @PersistenceContext
    private EntityManager entityManager;

    private final DeliveryRouteRepository routeRepository;
    private final OrderRepository orderRepository;
    private final TransferManifestRepository manifestRepository;
    private final RoutePaymentSettlementRepository settlementRepository;
    private final FeedbackService feedbackService;

    /**
     * Cronjob chạy vào 2:00 sáng mỗi ngày.
     * Dọn dẹp các tuyến đường đã hoàn thành quá 6 tháng (khoảng 180 ngày).
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldRoutes() {
        log.info("Bắt đầu dọn dẹp các tuyến đường cũ...");

        LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);

        // Dọn dẹp DeliveryRoute đã hoàn thành > 6 tháng
        List<DeliveryRoute> oldRoutes = routeRepository.findByCompletedAtBefore(cutoffDate);

        if (oldRoutes.isEmpty()) {
            log.info("Không có tuyến đường nào cần dọn dẹp.");
        } else {
            int deletedCount = 0;
            for (DeliveryRoute route : oldRoutes) {
                String routeId = route.getId();

                // Xóa routeId trong các Order liên quan để tránh lỗi Foreign Key / dữ liệu mồ côi
                List<Order> orders = orderRepository.findByRouteId(routeId);
                for (Order order : orders) {
                    order.setRouteId(null);
                }
                orderRepository.saveAll(orders);

                routeRepository.delete(route);
                deletedCount++;
            }
            log.info("Hoàn tất dọn dẹp DeliveryRoute: Đã xóa {} tuyến hoàn thành trước {}.", deletedCount, cutoffDate);
        }

        // Dọn dẹp TransferManifest cũ
        cleanupOldTransferManifests(cutoffDate);

        // Dọn dẹp RoutePaymentSettlement cũ
        cleanupOldSettlements(cutoffDate);

        // Dọn dẹp Feedback cũ (đã soft-delete trước đó)
        feedbackService.cleanupOldFeedbacks();
    }

    private void cleanupOldTransferManifests(LocalDateTime cutoffDate) {
        log.info("Bắt đầu dọn dẹp TransferManifest cũ...");

        List<TransferManifest> oldManifests = manifestRepository.findByCreatedAtBefore(cutoffDate);

        if (oldManifests.isEmpty()) {
            log.info("Không có TransferManifest nào cần dọn dẹp.");
            return;
        }

        int deletedCount = 0;
        for (TransferManifest manifest : oldManifests) {
            // Xóa luôn các dòng trong bảng con transfer_manifest_orders trước (đề phòng cascade không hoạt động)
            if (manifest.getOrderIds() != null && !manifest.getOrderIds().isEmpty()) {
                entityManager.createNativeQuery(
                        "DELETE FROM transfer_manifest_orders WHERE manifest_id = :mid")
                        .setParameter("mid", manifest.getId())
                        .executeUpdate();
            }
            manifestRepository.delete(manifest);
            deletedCount++;
        }

        log.info("Hoàn tất dọn dẹp TransferManifest: Đã xóa {} bản ghi trước {}.", deletedCount, cutoffDate);
    }

    private void cleanupOldSettlements(LocalDateTime cutoffDate) {
        log.info("Bắt đầu dọn dẹp RoutePaymentSettlement cũ...");

        List<RoutePaymentSettlement> oldSettlements = settlementRepository.findBySettledAtBefore(cutoffDate);

        if (oldSettlements.isEmpty()) {
            log.info("Không có RoutePaymentSettlement nào cần dọn dẹp.");
            return;
        }

        int deletedCount = 0;
        for (RoutePaymentSettlement settlement : oldSettlements) {
            settlementRepository.delete(settlement);
            deletedCount++;
        }

        log.info("Hoàn tất dọn dẹp RoutePaymentSettlement: Đã xóa {} bản ghi trước {}.", deletedCount, cutoffDate);
    }
}
