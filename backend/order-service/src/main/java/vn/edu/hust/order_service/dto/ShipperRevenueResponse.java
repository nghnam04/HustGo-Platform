package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;
import java.util.List;

public record ShipperRevenueResponse(
        int month,
        int year,
        BigDecimal baseEarnings,  // 10k × số đơn COMPLETED
        BigDecimal codCommission, // 2% × tổng codAmount
        BigDecimal totalEarnings,  // tổng doanh thu shipper
        int completedOrders,
        List<DailyShipperRevenue> dailyRevenue
) {
}
