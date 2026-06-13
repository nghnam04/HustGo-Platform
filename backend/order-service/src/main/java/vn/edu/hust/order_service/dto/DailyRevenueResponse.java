package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyRevenueResponse(
        LocalDate date,
        BigDecimal totalCollected,
        BigDecimal totalOnlinePrepaid,
        BigDecimal hubRevenue,
        BigDecimal codAmount,
        BigDecimal totalRevenue,
        int orderCount
) {
}