package vn.edu.hust.hub_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.base_domain.constant.HanoiDistrict;

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

    private String name;
    private String address;

    @Enumerated(EnumType.STRING)
    private HanoiDistrict district;

    private Double lat;
    private Double lng;

    @Column(nullable = false)
    private boolean active = true;

    private String managerId;
}
