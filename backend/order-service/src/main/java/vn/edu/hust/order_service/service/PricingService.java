package vn.edu.hust.order_service.service;

import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.constant.HanoiDistrict;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.order_service.dto.OrderRequest;
import vn.edu.hust.order_service.dto.PricingResult;

import java.math.BigDecimal;

@Service
public class PricingService {

    public PricingResult calculate(OrderRequest req) {

        // Trọng lượng quy đổi(kg) (D x R x C / 5000)
        double volWeight = (req.length() != null && req.width() != null && req.height() != null)
                ? (double) (req.length() * req.width() * req.height()) / 5000 : 0;

        double actualWeight = req.weight() != null ? req.weight() : 0;

        double chargeableWeight = Math.max(actualWeight, volWeight);

        // Cước vận chuyển chính dựa trên khu vực Hà Nội
        BigDecimal baseFee = BigDecimal.valueOf(
                calculateHanoiBaseFee(req.senderDistrict(), req.receiverDistrict())
        );

        // Phụ trội mỗi 0.5 kg tiếp theo (2.5k/0.5kg)
        if (chargeableWeight > 0.5) {
            double extraFee = Math.ceil((chargeableWeight - 0.5) / 0.5) * 2500;
            baseFee = baseFee.add(BigDecimal.valueOf(extraFee));
        }

        BigDecimal surcharge = BigDecimal.ZERO;

        // Phụ phí theo loại dịch vụ
        if (req.serviceCode() != null) {
            surcharge = surcharge.add(
                    switch (req.serviceCode()) {
                        case EXPRESS -> BigDecimal.valueOf(15000);
                        case FAST -> BigDecimal.valueOf(5000);
                        case ECONOMY -> BigDecimal.ZERO;
                    }
            );
        }

        // Phụ phí vùng sâu vùng xa
        HanoiDistrict start = req.senderDistrict();
        HanoiDistrict end = req.receiverDistrict();

        if (start != null && !start.isInner()) {
            surcharge = surcharge.add(BigDecimal.valueOf(5000));
        }
        if (end != null && !end.isInner()) {
            surcharge = surcharge.add(BigDecimal.valueOf(5000));
        }

        // Phí COD (0.8%, tối thiểu 15k)
        BigDecimal codAmount = req.codAmount() != null
                ? req.codAmount()
                : BigDecimal.ZERO;

        BigDecimal codFee = BigDecimal.ZERO;

        if (codAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal percentFee = codAmount.multiply(BigDecimal.valueOf(0.008));
            codFee = percentFee.max(BigDecimal.valueOf(15000));
        }

        // Phí bảo hiểm (0.5% nếu giá trị > 1tr)
        BigDecimal orderValue = req.orderValue() != null
                ? req.orderValue()
                : BigDecimal.ZERO;

        BigDecimal insuranceFee = BigDecimal.ZERO;

        if (orderValue.compareTo(BigDecimal.valueOf(1_000_000)) > 0) {
            insuranceFee = orderValue.multiply(BigDecimal.valueOf(0.005));
        }

        // Thuế VAT 8% trên tổng cước
        BigDecimal totalServiceFee = baseFee
                .add(codFee)
                .add(insuranceFee)
                .add(surcharge)
                .multiply(BigDecimal.valueOf(1.08));

        // COD thu hộ
        BigDecimal codCollect = req.codAmount() != null
                ? req.codAmount()
                : BigDecimal.ZERO;

        BigDecimal finalCollect;

        if (req.paymentMethod() == PaymentMethod.COD) {
            finalCollect = codCollect.add(totalServiceFee);
        } else {
            finalCollect = codCollect;
        }

        return new PricingResult(
                chargeableWeight,
                baseFee,
                codFee,
                insuranceFee,
                surcharge,
                totalServiceFee,
                finalCollect
        );
    }

    private double calculateHanoiBaseFee(
            HanoiDistrict start,
            HanoiDistrict end
    ) {
        if (start == null || end == null) {
            return 35000.0;
        }

        if (start.isInner() && end.isInner()) {
            return 20000.0;
        }

        if (!start.isInner() && !end.isInner()) {
            return 35000.0;
        }

        return 30000.0;
    }
}