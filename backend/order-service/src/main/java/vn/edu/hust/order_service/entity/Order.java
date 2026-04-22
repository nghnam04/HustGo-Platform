package vn.edu.hust.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.constant.ServiceCode;

import java.time.LocalDateTime;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String customerId;
    private String shipperId;
    private String routeId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    // Thông tin người nhận
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverProvince;
    private String receiverDistrict;
    private String receiverWard;
    private Double receiverLat;
    private Double receiverLng;

    // Thông tin người gửi
    private String senderName;
    private String senderPhone;
    private String senderAddress;
    private String senderProvince;
    private String senderDistrict;
    private String senderWard;
    private Double senderLat;
    private Double senderLng;

    // Chi tiết hàng hóa
    private String productName;
    private Double weight;
    private Integer length;
    private Integer width;
    private Integer height;
    private Double weightConverted; // Khối lượng quy đổi tính cước
    private String imageUrl;

    private Double codAmount;       // Tiền thu hộ hàng hóa
    private Double orderValue;      // Giá trị hàng hóa để tính bảo hiểm

    // Dịch vụ & Thanh toán
    @Enumerated(EnumType.STRING)
    private ServiceCode serviceCode;     // Fast, Economy, Express
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
    private String paymentProvider;
    private String note;

    // Chi tiết các loại phí
    private Double shippingFee;     // Cước chính
    private Double codFee;          // Phí dịch vụ thu hộ
    private Double insuranceFee;    // Phí bảo hiểm
    private Double surcharge;       // Phụ phí
    private Double totalPrice;      // Tổng phí dịch vụ vận chuyển (= shippingFee + codFee + insuranceFee + surcharge)

    // Tổng tiền Shipper thực tế phải thu (= codAmount nếu người gửi đã thanh toán online, hoặc codAmount + totalPrice nếu thanh toán COD)
    private Double finalAmountToCollect;

    // Logistics
    private String currentHubId;
    private String targetHubId;
    private String destinationWard;
    private String proofImageUrl;
    private String failReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = OrderStatus.PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}