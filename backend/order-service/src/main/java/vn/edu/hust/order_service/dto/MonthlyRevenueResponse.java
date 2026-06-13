package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;

public record MonthlyRevenueResponse(
        int month,
        int year,
        BigDecimal hubRevenue,      // = tổng cước vận chuyển
        BigDecimal codAmount,        // Tổng COD cần hoàn người gửi
        BigDecimal totalRevenue,
        int routeCount,
        int orderCount
) {
}