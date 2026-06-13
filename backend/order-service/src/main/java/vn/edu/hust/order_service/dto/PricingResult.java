package vn.edu.hust.order_service.dto;

import java.math.BigDecimal;

public record PricingResult(double weight,
                            BigDecimal shippingFee,
                            BigDecimal codFee,
                            BigDecimal insuranceFee,
                            BigDecimal surcharge,
                            BigDecimal totalPrice,
                            BigDecimal finalCollect) {
}
