package vn.edu.hust.order_service.dto;

public record PricingResult(double weight,
                            double shippingFee,
                            double codFee,
                            double insuranceFee,
                            double surcharge,
                            double totalPrice,
                            double finalCollect) {
}
