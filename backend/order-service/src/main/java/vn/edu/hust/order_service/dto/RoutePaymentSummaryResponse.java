package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RoutePaymentSummaryResponse(
        String routeId,
        int completedOrderCount,
        BigDecimal totalCollected,      // Tổng tiền Shipper thu
        BigDecimal totalOnlinePrepaid,  // Tổng totalPrice đơn ONLINE
        BigDecimal hubRevenue,          // Doanh thu Hub (= tổng cước ship)
        BigDecimal codAmount,           // COD cần hoàn người gửi
        List<RouteOrderPaymentDetail> orderDetails,
        LocalDateTime settledAt
) {
}