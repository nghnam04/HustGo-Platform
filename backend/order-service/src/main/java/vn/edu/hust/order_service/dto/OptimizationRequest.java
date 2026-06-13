package vn.edu.hust.order_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationRequest {
    private LocationPoint startPoint;
    private List<LocationPoint> deliveryPoints;
}
