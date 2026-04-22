package vn.edu.hust.order_service.service;

import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.constant.HanoiDistrict;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.order_service.dto.OrderRequest;
import vn.edu.hust.order_service.dto.PricingResult;

@Service
public class PricingService {

    public PricingResult calculate(OrderRequest req) {
        // Trọng lượng quy đổi(kg) (D x R x C / 5000)
        double volWeight = (req.length() != null && req.width() != null && req.height() != null)
                ? (double) (req.length() * req.width() * req.height()) / 5000 : 0;

        double actualWeight = req.weight() != null ? req.weight() : 0;

        double chargeableWeight = Math.max(actualWeight, volWeight);

        // Cước vận chuyển chính dựa trên khu vực Hà Nội
        double baseFee = calculateHanoiBaseFee(req.senderDistrict(), req.receiverDistrict());

        // Phụ trội mỗi 0.5 kg tiếp theo (2.5k/0.5kg)
        if (chargeableWeight > 0.5) {
            baseFee += Math.ceil((chargeableWeight - 0.5) / 0.5) * 2500;
        }

        double surcharge = 0;

        // Phụ phí theo loại dịch vụ
        if (req.serviceCode() != null) {
            surcharge += switch (req.serviceCode()) {
                case EXPRESS -> 15000;
                case FAST -> 5000;
                case ECONOMY -> 0;
            };
        }

        // Phụ phí vùng sâu vùng xa
        HanoiDistrict start = HanoiDistrict.fromName(req.senderDistrict());
        HanoiDistrict end = HanoiDistrict.fromName(req.receiverDistrict());

        // Nếu một trong hai địa điểm gửi - nhận nằm ở ngoại thành, phụ phí 5k mỗi địa điểm
        if (start != null && !start.isInner()) {
            surcharge += 5000;
        }
        if (end != null && !end.isInner()) {
            surcharge += 5000;
        }

        // Phí COD (0.8%, tối thiểu 15k)
        double codFee = (req.codAmount() != null && req.codAmount() > 0)
                ? Math.max(15000, req.codAmount() * 0.008) : 0;

        // Phí bảo hiểm (0.5% nếu giá trị > 1tr)
        double insuranceFee = (req.orderValue() != null && req.orderValue() > 1000000)
                ? req.orderValue() * 0.005 : 0;

        // Thuế VAT 8% trên tổng cước
        double totalServiceFee = (baseFee + codFee + insuranceFee + surcharge) * 1.08;

        double codToCollect = (req.codAmount() != null ? req.codAmount() : 0);
        double finalCollect = 0;

        if (req.paymentMethod() == PaymentMethod.COD) {
            // Người nhận trả cả tiền hàng và tiền cước vận chuyển cho Shipper
            finalCollect = codToCollect + totalServiceFee;
        } else if (req.paymentMethod() == PaymentMethod.ONLINE_PAYMENT) {
            // Người gửi đã thanh toán cước dịch vụ vận chuyển trực tuyến, Shipper chỉ thu đúng tiền hàng từ người nhận
            finalCollect = codToCollect;
        }

        return new PricingResult(chargeableWeight, baseFee, codFee, insuranceFee, surcharge, totalServiceFee, finalCollect);
    }

    private double calculateHanoiBaseFee(String senderDist, String receiverDist) {
        HanoiDistrict start = HanoiDistrict.fromName(senderDist);
        HanoiDistrict end = HanoiDistrict.fromName(receiverDist);

        if (start == null || end == null) {
            return 35000.0;
        }

        // Cùng Nội thành: 20k
        if (start.isInner() && end.isInner()) {
            return 20000.0;
        }

        // Giữa các huyện Ngoại thành với nhau: 35k
        if (!start.isInner() && !end.isInner()) {
            return 35000.0;
        }

        // Nội thành <-> Ngoại thành: 30k
        return 30000.0;
    }
}