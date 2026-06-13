package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyShipperRevenue(
    LocalDate date,
    BigDecimal baseEarnings,
    BigDecimal codCommission,
    BigDecimal totalEarnings,
    int orderCount
) {}