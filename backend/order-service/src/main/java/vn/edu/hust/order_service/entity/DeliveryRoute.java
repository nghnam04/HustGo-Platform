package vn.edu.hust.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.base_domain.constant.RouteStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_routes")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeliveryRoute {

    @Id
    private String id; // RTE-xxxxxxxx

    @Column(nullable = false)
    private String hubId;

    private String hubAdminId;

    private String shipperId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RouteStatus status;

    private Double totalDistanceMeters;
    private Double totalDurationSeconds;

    @Column(columnDefinition = "TEXT")
    private String routeGeometry;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    private Integer totalOrders;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = RouteStatus.PENDING;
        }
    }
}
