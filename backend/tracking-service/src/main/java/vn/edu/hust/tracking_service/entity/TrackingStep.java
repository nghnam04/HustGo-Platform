package vn.edu.hust.tracking_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tracking_steps")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orderId;
    private String shipperId;
    
    private String status;
    private String locationName;
    private Double lat;
    private Double lng;
    private String note;
    private LocalDateTime timestamp;
}
