package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;

public record HubRevenueEntry(
    String hubId,
    String hubName,
    BigDecimal hubRevenue,
    int orderCount
) {}