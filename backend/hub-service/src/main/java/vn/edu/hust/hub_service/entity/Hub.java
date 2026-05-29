package vn.edu.hust.hub_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.base_domain.constant.HanoiDistrict;

import java.time.LocalDateTime;

@Entity
@Table(name = "hubs")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Hub {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String ward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HanoiDistrict district;

    @Column(nullable = false)
    private String province;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(nullable = false)
    private String managerId;

    @Column(nullable = false)
    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}