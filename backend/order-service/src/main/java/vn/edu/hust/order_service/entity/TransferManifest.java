package vn.edu.hust.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.order_service.constant.ManifestStatus;

import java.time.LocalDateTime;
import java.util.List;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "transfer_manifests")
public class TransferManifest {

    @Id
    private String id; // MNF-xxxxxxxx

    private String fromHubId;
    private String fromHubName;
    private String toHubId;
    private String toHubName;

    private String createdBy;

    private int orderCount;

    @ElementCollection
    @CollectionTable(name = "transfer_manifest_orders", joinColumns = @JoinColumn(name = "manifest_id"))
    @Column(name = "order_id")
    private List<String> orderIds;

    @Enumerated(EnumType.STRING)
    private ManifestStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime receivedAt;
    private String receivedBy;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = ManifestStatus.CREATED;
    }
}