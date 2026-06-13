package vn.edu.hust.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.base_domain.constant.HanoiDistrict;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.constant.ServiceCode;

import java.math.BigDecimal;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HanoiDistrict receiverDistrict;

    private String receiverWard;
    private Double receiverLat;
    private Double receiverLng;

    // Thông tin người gửi
    private String senderName;
    private String senderPhone;
    private String senderAddress;
    private String senderProvince;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HanoiDistrict senderDistrict;

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

    private BigDecimal codAmount;       // Tiền thu hộ hàng hóa
    private BigDecimal orderValue;      // Giá trị hàng hóa để tính bảo hiểm

    // Dịch vụ & Thanh toán
    @Enumerated(EnumType.STRING)
    private ServiceCode serviceCode;     // Fast, Economy, Express
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
    private String paymentProvider;
    private String note;

    // Chi tiết các loại phí
    private BigDecimal shippingFee;     // Cước chính
    private BigDecimal codFee;          // Phí dịch vụ thu hộ
    private BigDecimal insuranceFee;    // Phí bảo hiểm
    private BigDecimal surcharge;       // Phụ phí
    private BigDecimal totalPrice;      // Tổng phí dịch vụ vận chuyển (= shippingFee + codFee + insuranceFee + surcharge)

    // Tổng tiền Shipper thực tế phải thu
    private BigDecimal finalAmountToCollect;

    // Logistics
    private String currentHubId;   // Hub hiện tại đang giữ hàng
    private String originHubId;    // Hub nguồn đã xuất kho trung chuyển
    private String targetHubId;    // Hub nhận trung chuyển
    private String manifestId;
    private String destinationWard;
    private String proofImageUrl;
    private String failReason;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private Integer failCount = 0;

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