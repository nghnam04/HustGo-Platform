package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;
import java.util.List;

public record SystemRevenueResponse(
    BigDecimal totalRevenue,
    BigDecimal codAmount,
    int totalOrders,
    List<HubRevenueEntry> hubRevenues
) {}