package vn.edu.hust.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "route_payment_settlements")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoutePaymentSettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String routeId;

    @Column(nullable = false)
    private String hubAdminId;

    @Column(nullable = false)
    private BigDecimal totalCollected;  // Tổng tiền thu từ shipper

    @Column(nullable = false)
    private BigDecimal totalOnlinePrepaid; // Tổng cước ship từ đơn ONLINE_PAYMENT

    @Column(nullable = false)
    private BigDecimal hubRevenue;

    @Column(nullable = false)
    private BigDecimal codAmount;

    @Column(nullable = false)
    private Integer orderCount;         // Số đơn COMPLETED trong tuyến

    @Column(nullable = false)
    private LocalDateTime settledAt;
}